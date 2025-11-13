import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaBell, 
  FaUser, 
  FaBriefcase, 
  FaComments, 
  FaStar, 
  FaMoneyBillWave,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaEye,
  FaPlus,
  FaChartLine,
  FaCalendar,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaHeart,
  FaFilter,
  FaSearch,
  FaArrowRight,
  FaRocket
} from 'react-icons/fa';
import { useAuth } from '../../context/useAuth';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { getMyJobs, getNotifications, getProfessional } from '../../utils/api';

const ProfessionalDashboard = () => {
  const { user, logout } = useAuth();
  const { socket, isConnected, emit } = useSocket();
  const { error: showError } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    totalEarnings: 0,
    rating: 0,
    reviewCount: 0
  });
  const [recentJobs, setRecentJobs] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [locationPermission, setLocationPermission] = useState(null);
  
  // Helper function to handle authentication errors
  const handleAuthError = (err) => {
    if (err?.status === 401 || err?.status === 403) {
      const errorMessage = err?.data?.message || 'Your session has expired. Please log in again.';
      showError(errorMessage, 5000);
      logout();
      setTimeout(() => {
        navigate('/login');
      }, 1500);
      return true;
    }
    return false;
  };

  useEffect(() => {
    // Ensure user is a professional, redirect if not
    if (user && user.role !== 'professional') {
      console.warn('Non-professional user accessing professional dashboard, redirecting...');
      navigate('/dashboard');
      return;
    }
    
    loadDashboardData();
    
    // Auto-share location for professionals when they login
    if (user?.role === 'professional') {
      requestLocationPermission();
    }
  }, [user, navigate]);

  // Auto-share location for professionals
  const requestLocationPermission = async () => {
    if (!navigator.geolocation) {
      setLocationPermission('denied');
      return;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        });
      });

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date().toISOString()
      };

      setLocationPermission('granted');
      
      // Share location with connected users
      if (socket && isConnected) {
        emit('shareLocation', {
          userId: user?.id,
          location,
          isSharing: true
        });
        setIsSharingLocation(true);
        console.log('📍 Professional location shared automatically');
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationPermission('denied');
    }
  };

  const toggleLocationSharing = async () => {
    if (isSharingLocation) {
      // Stop sharing
      if (socket && isConnected) {
        emit('shareLocation', {
          userId: user?.id,
          isSharing: false
        });
      }
      setIsSharingLocation(false);
    } else {
      // Start sharing
      await requestLocationPermission();
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load professional stats and jobs
      const jobsResponse = await getMyJobs({ limit: 3 });
      if (jobsResponse.success) {
        const jobs = jobsResponse.data.jobs || [];
        const totalJobs = jobsResponse.data.pagination?.total || 0;
        const activeJobs = jobs.filter(job => job.status === 'In Progress' || job.status === 'Active').length;
        const completedJobs = jobs.filter(job => job.status === 'Completed').length;
        
        setRecentJobs(jobs.map(job => ({
          id: job._id,
          title: job.title,
          client: job.client?.name || job.requester?.name || 'Unknown',
          status: job.status,
          date: new Date(job.createdAt).toLocaleDateString(),
          budget: job.budget ? `₦${job.budget.min?.toLocaleString() || '0'} - ₦${job.budget.max?.toLocaleString() || '0'}` : 'Not specified',
          location: job.location?.address || 'Location not specified',
          priority: job.priority || 'medium'
        })));
        
        setStats(prev => ({
          ...prev,
          totalJobs,
          activeJobs,
          completedJobs
        }));
      }
      
      // Load professional profile for rating and earnings
      if (user?.id) {
        try {
          const proResponse = await getProfessional(user.id, { byUser: true });
          if (proResponse.success) {
            const proData = proResponse.data;
            setStats(prev => ({
              ...prev,
              rating: proData.ratingAvg || proData.rating || 0,
              reviewCount: proData.ratingCount || 0,
              totalEarnings: proData.totalEarnings || 0
            }));
          }
        } catch (err) {
          // If professional profile doesn't exist yet, that's okay
          if (!handleAuthError(err)) {
            console.log('Professional profile not found yet');
          }
        }
      }
      
      // Load notifications
      try {
        const notificationsResponse = await getNotifications({ limit: 3 });
        if (notificationsResponse.success) {
          setNotifications(notificationsResponse.data.notifications.map(notif => ({
            id: notif._id,
            type: notif.type,
            message: notif.message,
            time: notif.age || 'Just now',
            unread: !notif.isRead
          })));
        }
      } catch (err) {
        if (!handleAuthError(err)) {
          console.error('Error loading notifications:', err);
        }
      }
      
      // Note: Recent messages would typically come from a messages API
      // For now, we'll leave it empty until that API is available
      setRecentMessages([]);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      
      // Handle authentication errors
      if (handleAuthError(error)) {
        return; // Don't set loading to false, let the redirect happen
      }
      
      // Show error message for other errors
      showError('Failed to load dashboard data. Please try again.', 3000);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-700 border border-indigo-200';
      case 'In Progress': return 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border border-amber-200';
      case 'Pending': return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200';
      default: return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <FaBriefcase className="w-5 h-5 text-indigo-600 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 -mx-4 lg:mx-0">
      {/* Hero Welcome Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-400 opacity-10 rounded-full -ml-24 -mb-24"></div>
        
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl lg:text-4xl font-bold mb-2 flex items-center gap-2">
                <span>Welcome back,</span>
                <span className="text-amber-300">{user?.name?.split(' ')[0] || 'Professional'}</span>
                <FaBriefcase className="w-6 h-6 text-amber-300 animate-pulse" />
              </h1>
              <p className="text-indigo-100 text-lg">
                Manage your jobs and grow your business
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Location Sharing Toggle */}
              <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-sm transition-all">
                <FaMapMarkerAlt className={`w-4 h-4 ${isSharingLocation ? 'text-amber-300' : 'text-indigo-200'}`} />
                <span className="text-sm text-indigo-100">
                  {isSharingLocation ? 'Sharing' : 'Hidden'}
                </span>
                <button
                  onClick={toggleLocationSharing}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    isSharingLocation ? 'bg-amber-400' : 'bg-white/30'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      isSharingLocation ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <Link
                to="/dashboard/professional/notifications"
                className="relative p-3 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-sm transition-all"
              >
                <FaBell className="w-5 h-5" />
                {notifications.filter(n => n.unread).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-400 text-indigo-900 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {notifications.filter(n => n.unread).length > 9 ? '9+' : notifications.filter(n => n.unread).length}
                  </span>
                )}
              </Link>
              <Link
                to="/dashboard/professional/profile"
                className="p-3 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-sm transition-all"
              >
                <FaUser className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Setup Alert - Modern Design */}
      <div className="bg-gradient-to-r from-amber-50 to-amber-100 border-2 border-amber-200 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center flex-1 gap-4">
            <FaExclamationTriangle className="w-6 h-6 text-amber-500" />
            <div>
              <h3 className="text-lg font-bold text-amber-900 mb-1">Complete Your Professional Profile</h3>
              <p className="text-sm text-amber-700 hidden sm:block">Set up your profile to start receiving connection requests and job opportunities.</p>
            </div>
          </div>
          <Link
            to="/dashboard/professional/create-profile"
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-semibold shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all duration-300 whitespace-nowrap transform hover:scale-105"
          >
            Set Up Profile
          </Link>
        </div>
      </div>

      {/* Stats Cards - Beautiful Gradient Design */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="group relative overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-300 transform hover:scale-105">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative z-10 text-center">
            <div className="flex items-center justify-center mb-2">
              <FaBriefcase className="w-6 h-6 text-amber-300" />
            </div>
            <p className="text-4xl font-bold mb-1">{stats.totalJobs}</p>
            <p className="text-indigo-100 text-sm font-medium">Total Jobs</p>
          </div>
        </div>

        <div className="group relative overflow-hidden bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all duration-300 transform hover:scale-105">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative z-10 text-center">
            <div className="flex items-center justify-center mb-2">
              <FaClock className="w-6 h-6 text-amber-100" />
            </div>
            <p className="text-4xl font-bold mb-1">{stats.activeJobs}</p>
            <p className="text-amber-100 text-sm font-medium">Active</p>
          </div>
        </div>

        <div className="group relative overflow-hidden bg-gradient-to-br from-indigo-400 to-indigo-500 rounded-2xl p-6 text-white shadow-lg shadow-indigo-400/30 hover:shadow-xl hover:shadow-indigo-400/40 transition-all duration-300 transform hover:scale-105">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative z-10 text-center">
            <div className="flex items-center justify-center mb-2">
              <FaCheckCircle className="w-6 h-6 text-amber-300" />
            </div>
            <p className="text-4xl font-bold mb-1">{stats.completedJobs}</p>
            <p className="text-indigo-100 text-sm font-medium">Completed</p>
          </div>
        </div>

        <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-300 transform hover:scale-105">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative z-10 text-center">
            <div className="flex items-center justify-center mb-2">
              <FaMoneyBillWave className="w-6 h-6 text-amber-300" />
            </div>
            <p className="text-3xl font-bold mb-1">₦{stats.totalEarnings.toLocaleString()}</p>
            <p className="text-emerald-100 text-sm font-medium">Earnings</p>
          </div>
        </div>
      </div>

      {/* Rating Card - Modern Design */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl">
                <FaStar className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Your Rating</h3>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <FaStar
                    key={i}
                    className={`w-6 h-6 ${
                      i < Math.floor(stats.rating) ? 'text-amber-400' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-3xl font-bold text-gray-900">{stats.rating.toFixed(1)}</span>
              <span className="text-sm text-gray-600">({stats.reviewCount} reviews)</span>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-sm text-gray-600 mb-1">Average rating</p>
            <p className="text-xl font-bold text-indigo-600">Excellent</p>
          </div>
        </div>
      </div>

      {/* Quick Actions - Modern Card Design */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <FaRocket className="w-5 h-5 text-indigo-500" />
          <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/dashboard/professional/my-jobs"
            className="group relative overflow-hidden bg-white border border-gray-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gray-100 text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                <FaBriefcase className="w-6 h-6" />
              </div>
              <FaArrowRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">My Jobs</h3>
            <p className="text-sm text-gray-600">View and manage your jobs</p>
          </Link>

          <Link
            to="/dashboard/professional/messages"
            className="group relative overflow-hidden bg-white border border-gray-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gray-100 text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                <FaComments className="w-6 h-6" />
              </div>
              <FaArrowRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">Messages</h3>
            <p className="text-sm text-gray-600">Chat with clients</p>
          </Link>

          <Link
            to="/dashboard/professional/profile"
            className="group relative overflow-hidden bg-white border border-gray-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gray-100 text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                <FaUser className="w-6 h-6" />
              </div>
              <FaArrowRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">Profile</h3>
            <p className="text-sm text-gray-600">Update your profile</p>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FaBriefcase className="w-5 h-5 text-indigo-500" />
              <h2 className="text-xl font-bold text-gray-900">Recent Jobs</h2>
            </div>
            <Link
              to="/dashboard/professional/my-jobs"
              className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm flex items-center gap-1 group"
            >
              View all
              <FaArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentJobs.length > 0 ? recentJobs.map((job) => (
              <Link
                key={job.id}
                to={`/dashboard/professional/my-jobs/${job.id}`}
                className="group block p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors truncate">{job.title}</h3>
                    <p className="text-sm text-gray-600 mb-2 truncate">{job.client} • {job.budget}</p>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <FaMapMarkerAlt className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{job.location}</span>
                      </div>
                    </div>
                  </div>
            <div className="p-2 bg-white rounded-lg group-hover:bg-indigo-50 transition-colors">
              <FaEye className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                  </div>
                </div>
              </Link>
            )) : (
              <div className="text-center py-8 text-gray-400">
                <FaBriefcase className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No jobs yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Messages */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FaComments className="w-5 h-5 text-indigo-500" />
              <h2 className="text-xl font-bold text-gray-900">Recent Messages</h2>
            </div>
            <Link
              to="/dashboard/professional/messages"
              className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm flex items-center gap-1 group"
            >
              View all
              <FaArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentMessages.length > 0 ? recentMessages.map((message) => (
              <div
                key={message.id}
                className={`p-4 rounded-xl border-l-4 transition-all duration-300 ${
                  message.unread 
                    ? 'bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-indigo-500 shadow-sm' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-900 truncate">{message.client}</h3>
                  {message.unread && (
                    <div className="w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0"></div>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{message.message}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <FaClock className="w-3 h-3" />
                  {message.time}
                </p>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-400">
                <FaComments className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No messages yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FaBell className="w-5 h-5 text-indigo-500" />
            <h2 className="text-xl font-bold text-gray-900">Recent Notifications</h2>
          </div>
          <Link
            to="/dashboard/professional/notifications"
            className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm flex items-center gap-1 group"
          >
            View all
            <FaArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        <div className="space-y-3">
          {notifications.length > 0 ? notifications.slice(0, 3).map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-xl border-l-4 transition-all duration-300 ${
                notification.unread 
                  ? 'bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-indigo-500 shadow-sm' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <p className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">{notification.message}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <FaClock className="w-3 h-3" />
                {notification.time}
              </p>
            </div>
          )) : (
            <div className="text-center py-8 text-gray-400">
              <FaBell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No notifications yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfessionalDashboard;