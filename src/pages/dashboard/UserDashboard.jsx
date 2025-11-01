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
  FaHands,
  FaFilter,
  FaArrowRight,
  FaEye,
  FaEnvelope,
  FaUsers
} from 'react-icons/fa';
import { useAuth } from '../../context/useAuth';
import { getMyJobs, getProfessionals, getNotifications } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import ServiceSelector from '../../components/ServiceSelector';

const UserDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { error: showError } = useToast();
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
            // Prefer user's profile picture/avatar, then professional's profile picture, then placeholder
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
              distance: 'Nearby', // This would be calculated based on location
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

    loadDashboardData();
  }, []);

  const handleSearch = (service) => {
    if (service.trim()) {
      navigate(`/dashboard/professionals?search=${encodeURIComponent(service)}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-gray-100 text-gray-800';
      case 'In Progress': return 'bg-gray-200 text-gray-900';
      case 'Pending': return 'bg-gray-50 text-gray-700';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Hi {user?.name || 'User'} 👋
            </h1>
            <p className="text-gray-600">
              Welcome back! Here's what's happening with your jobs and services.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              to="/dashboard/notifications"
              className="p-2 text-gray-400 hover:text-gray-600 relative"
            >
              <FaBell className="w-6 h-6" />
              {notifications.filter(n => n.unread).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {notifications.filter(n => n.unread).length}
                </span>
              )}
            </Link>
            <Link
              to="/dashboard/profile"
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <FaUser className="w-6 h-6" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Search */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Search</h2>
        <div className="flex gap-3">
          <div className="flex-1">
            <ServiceSelector
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search for a service (e.g. Plumber, Electrician, Barber)..."
              showSuggestions={true}
              allowCustom={true}
            />
          </div>
          <button
            onClick={() => handleSearch(searchQuery)}
            className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <FaSearch className="w-4 h-4" />
            Search
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Jobs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalJobs}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-full">
              <FaBriefcase className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Jobs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeJobs}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-full">
              <FaClock className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedJobs}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-full">
              <FaCheckCircle className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/dashboard"
            className="flex items-center p-4 bg-white border-2 border-indigo-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all group"
          >
            <div className="p-3 bg-indigo-100 rounded-full mr-4 group-hover:bg-indigo-200 transition-colors">
              <FaUsers className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Discover Pros</h3>
              <p className="text-sm text-gray-600">Find professionals near you</p>
            </div>
          </Link>

          <Link
            to="/dashboard/post-job"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            <div className="p-3 bg-gray-100 rounded-full mr-4 group-hover:bg-gray-200 transition-colors">
              <FaPlus className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Post a Job</h3>
              <p className="text-sm text-gray-600">Find professionals for your project</p>
            </div>
          </Link>

          <Link
            to="/dashboard/messages"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            <div className="p-3 bg-gray-100 rounded-full mr-4 group-hover:bg-gray-200 transition-colors">
              <FaComments className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Messages</h3>
              <p className="text-sm text-gray-600">Chat with professionals</p>
            </div>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Jobs</h2>
            <Link
              to="/dashboard/my-jobs"
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              View all
              <FaArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{job.title}</h3>
                  <p className="text-sm text-gray-600">{job.category} • {job.budget}</p>
                  <p className="text-xs text-gray-500">{job.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                  <Link
                    to={`/dashboard/my-jobs/${job.id}`}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <FaEye className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nearby Professionals */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Nearby Professionals</h2>
            <Link
              to="/dashboard/professionals"
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              View all
              <FaArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {nearbyPros.map((pro) => (
              <div key={pro.id} className="flex items-center p-3 border border-gray-100 rounded-lg">
                <img
                  src={pro.image || '/images/placeholder.jpeg'}
                  alt={pro.name}
                  className="w-10 h-10 rounded-full object-cover mr-3"
                  onError={(e) => { e.currentTarget.src = '/images/placeholder.jpeg'; }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{pro.name}</h3>
                    {pro.verified && (
                      <FaCheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{pro.service}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <FaStar className="w-3 h-3 text-yellow-400" />
                    <span>{pro.rating}</span>
                    <FaMapMarkerAlt className="w-3 h-3" />
                    <span>{pro.distance}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <FaHeart className="w-4 h-4" />
                  </button>
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <FaEnvelope className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Notifications</h2>
          <Link
            to="/dashboard/notifications"
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            View all
            <FaArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="space-y-3">
          {notifications.slice(0, 3).map((notification) => (
            <div
              key={notification.id}
              className={`flex items-start p-3 rounded-lg ${
                notification.unread ? 'bg-gray-100 border-l-4 border-gray-400' : 'bg-gray-50'
              }`}
            >
              <div className="flex-1">
                <p className="text-sm text-gray-900">{notification.message}</p>
                <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
              </div>
              {notification.unread && (
                <div className="w-2 h-2 bg-gray-600 rounded-full mt-2"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;