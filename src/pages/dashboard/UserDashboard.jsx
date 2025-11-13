import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FaSearch, 
  FaMapMarkerAlt, 
  FaStar, 
  FaPlus, 
  FaBriefcase, 
  FaComments, 
  FaHeart,
  FaBell,
  FaClock,
  FaCheckCircle,
  FaUser,
  FaArrowRight,
  FaEye,
  FaEnvelope,
  FaUsers,
  FaSync,
  FaMagic,
  FaRocket,
  FaChartLine
} from 'react-icons/fa';
import { useAuth } from '../../context/useAuth';
import { getMyJobs, getProfessionals, getNotifications, saveLocation } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { getCurrentLocation } from '../../utils/locationUtils';
import ServiceSelector from '../../components/ServiceSelector';

const UserDashboard = () => {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const { error: showError, success: showSuccess } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [nearbyPros, setNearbyPros] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0
  });
  const [loading, setLoading] = useState(true);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  
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

  // Image resolution helper
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fixfinder-backend-8yjj.onrender.com';
  const resolveImageUrl = (url) => {
    if (!url) return '/images/placeholder.jpeg';
    const trimmed = typeof url === 'string' ? url.trim() : url;
    if (
      trimmed.startsWith('http') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('blob:') ||
      trimmed.startsWith('//')
    ) {
      return trimmed;
    }
    const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${API_BASE}${normalized}`;
  };

  // Load dashboard data from API
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      
      try {
        // Load recent jobs
        const jobsResponse = await getMyJobs({ limit: 3 });
        if (jobsResponse.success) {
          setRecentJobs(jobsResponse.data.jobs.map(job => ({
            id: job._id,
            title: job.title,
            status: job.status,
            date: new Date(job.createdAt).toLocaleDateString(),
            pro: job.professional?.name || null,
            category: job.category,
            budget: `₦${job.budget.min.toLocaleString()} - ₦${job.budget.max.toLocaleString()}`
          })));

          // Calculate stats
          const totalJobs = jobsResponse.data.pagination.total;
          const activeJobs = jobsResponse.data.jobs.filter(job => job.status === 'In Progress').length;
          const completedJobs = jobsResponse.data.jobs.filter(job => job.status === 'Completed').length;
          
          setStats(prev => ({
            ...prev,
            totalJobs,
            activeJobs,
            completedJobs
          }));
        }

        // Load nearby professionals
        const prosResponse = await getProfessionals({ limit: 3 });
        if (prosResponse.success) {
          setNearbyPros(prosResponse.professionals.map(pro => {
            const imageUrl = pro.user?.profilePicture
              || pro.user?.avatarUrl
              || pro.profilePicture
              || pro.avatarUrl
              || pro.image
              || '/images/placeholder.jpeg';
            
            return {
              id: pro._id,
              name: pro.name,
              service: pro.category,
              rating: pro.rating || 0,
              distance: 'Nearby',
              verified: pro.isVerified || false,
              image: resolveImageUrl(imageUrl)
            };
          }));
        }

        // Load notifications
        const notificationsResponse = await getNotifications({ limit: 3 });
        if (notificationsResponse.success) {
          setNotifications(notificationsResponse.data.notifications.map(notif => ({
            id: notif._id,
            message: notif.message,
            time: notif.age || 'Just now',
            unread: !notif.isRead,
            type: notif.type
          })));
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        
        if (handleAuthError(error)) {
          return;
        }
        
        showError('Failed to load dashboard data. Please try again.', 3000);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const handleSearch = (service) => {
    if (service.trim()) {
      navigate(`/dashboard/professionals?search=${encodeURIComponent(service)}`);
    }
  };

  const handleUpdateLocation = async () => {
    try {
      setUpdatingLocation(true);
      
      const position = await getCurrentLocation();
      const lat = position.latitude;
      const lng = position.longitude;

      const response = await saveLocation(lat, lng);
      
      if (response.success) {
        showSuccess('Location updated successfully!', 3000);
        if (response.data?.location && user) {
          login(user.token || localStorage.getItem('token'), {
            ...user,
            location: response.data.location
          });
        }
      } else {
        throw new Error(response.message || 'Failed to update location');
      }
    } catch (error) {
      console.error('Error updating location:', error);
      const errorMessage = error.message || 'Failed to update location. Please ensure location permissions are granted and try again.';
      showError(errorMessage, 5000);
    } finally {
      setUpdatingLocation(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Completed': 'bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-700 border border-indigo-200',
      'In Progress': 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border border-amber-200',
      'Pending': 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200'
    };
    return styles[status] || styles['Pending'];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <FaMagic className="w-5 h-5 text-indigo-600 animate-pulse" />
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
                <span className="text-amber-300">{user?.name?.split(' ')[0] || 'User'}</span>
                <FaMagic className="w-6 h-6 text-amber-300 animate-pulse" />
              </h1>
              <p className="text-indigo-100 text-lg">
                Let's get things done today
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard/notifications"
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
                to="/dashboard/profile"
                className="p-3 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-sm transition-all"
              >
                <FaUser className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Search - Modern Design */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <FaSearch className="w-5 h-5 text-indigo-500" />
          <h2 className="text-xl font-bold text-gray-900">Find a Professional</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <ServiceSelector
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="What service do you need?"
              showSuggestions={true}
              allowCustom={true}
            />
          </div>
          <button
            onClick={() => handleSearch(searchQuery)}
            className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-105"
          >
            <FaSearch className="w-4 h-4" />
            <span>Search</span>
          </button>
        </div>
      </div>

      {/* Stats Cards - Clean Design */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <FaBriefcase className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.totalJobs}</p>
          <p className="text-sm text-gray-500 font-medium">Total Jobs</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <FaClock className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.activeJobs}</p>
          <p className="text-sm text-gray-500 font-medium">Active</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <FaCheckCircle className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.completedJobs}</p>
          <p className="text-sm text-gray-500 font-medium">Completed</p>
        </div>
      </div>

      {/* Location Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <FaMapMarkerAlt className="w-6 h-6 text-indigo-500 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Your Location</h3>
              <p className="text-gray-600">
                {user?.location?.city && user?.location?.state ? (
                  <span className="font-medium">{user.location.city}, {user.location.state}</span>
                ) : (
                  <span className="text-gray-400">Location not set</span>
                )}
              </p>
              {user?.location?.address && (
                <p className="text-sm text-gray-500 mt-1">{user.location.address}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleUpdateLocation}
            disabled={updatingLocation}
            className="px-6 py-3 border border-indigo-200 text-indigo-600 rounded-xl font-semibold hover:border-indigo-400 hover:text-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updatingLocation ? (
              <>
                <FaSync className="w-4 h-4 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <FaMapMarkerAlt className="w-4 h-4" />
                <span>Update</span>
              </>
            )}
          </button>
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
            to="/dashboard/professionals"
            className="group bg-white border border-gray-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <FaUsers className="w-6 h-6 text-indigo-500" />
              <FaArrowRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">Discover Pros</h3>
            <p className="text-sm text-gray-600">Find professionals near you</p>
          </Link>

          <Link
            to="/dashboard/post-job"
            className="group bg-white border border-gray-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <FaPlus className="w-6 h-6 text-indigo-500" />
              <FaArrowRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">Post a Job</h3>
            <p className="text-sm text-gray-600">Find professionals for your project</p>
          </Link>

          <Link
            to="/dashboard/messages"
            className="group bg-white border border-gray-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <FaComments className="w-6 h-6 text-indigo-500" />
              <FaArrowRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">Messages</h3>
            <p className="text-sm text-gray-600">Chat with professionals</p>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl">
                <FaBriefcase className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Recent Jobs</h2>
            </div>
            <Link
              to="/dashboard/my-jobs"
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
                to={`/dashboard/my-jobs/${job.id}`}
                className="group block p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors truncate">{job.title}</h3>
                    <p className="text-sm text-gray-600 mb-2 truncate">{job.category} • {job.budget}</p>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadge(job.status)}`}>
                        {job.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        <FaClock className="w-3 h-3 inline mr-1" />
                        {job.date}
                      </span>
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

        {/* Nearby Professionals */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl">
                <FaUsers className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Nearby Professionals</h2>
            </div>
            <Link
              to="/dashboard/professionals"
              className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm flex items-center gap-1 group"
            >
              View all
              <FaArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="space-y-3">
            {nearbyPros.length > 0 ? nearbyPros.map((pro) => (
              <div
                key={pro.id}
                className="group p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={pro.image || '/images/placeholder.jpeg'}
                      alt={pro.name}
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white shadow-md group-hover:ring-indigo-200 transition-all"
                      onError={(e) => { e.currentTarget.src = '/images/placeholder.jpeg'; }}
                    />
                    {pro.verified && (
                      <div className="absolute -bottom-1 -right-1 bg-indigo-600 rounded-full p-1">
                        <FaCheckCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900 truncate">{pro.name}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 truncate">{pro.service}</p>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1 text-amber-500">
                        <FaStar className="w-3 h-3" />
                        <span className="font-semibold text-gray-700">{pro.rating}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <FaMapMarkerAlt className="w-3 h-3" />
                        <span>{pro.distance}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all">
                      <FaHeart className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                      <FaEnvelope className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-400">
                <FaUsers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No professionals found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl">
              <FaBell className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Recent Notifications</h2>
          </div>
          <Link
            to="/dashboard/notifications"
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

export default UserDashboard;
