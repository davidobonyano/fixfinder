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
  FaSearch
} from 'react-icons/fa';
import { useAuth } from '../../context/useAuth';
import { useSocket } from '../../context/SocketContext';

const ProfessionalDashboard = () => {
  const { user } = useAuth();
  const { socket, isConnected, emit } = useSocket();
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

  useEffect(() => {
    loadDashboardData();
    
    // Auto-share location for professionals when they login
    if (user?.role === 'professional') {
      requestLocationPermission();
    }
  }, [user]);

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
      
      // Mock data for now - replace with real API calls later
      setStats({
        totalJobs: 47,
        activeJobs: 3,
        completedJobs: 42,
        totalEarnings: 485000,
        rating: 4.8,
        reviewCount: 127
      });

      setRecentJobs([
        {
          id: 1,
          title: 'Fix Kitchen Sink',
          client: 'Sarah Johnson',
          status: 'In Progress',
          date: '2024-01-15',
          budget: '₦15,000 - ₦25,000',
          location: 'Victoria Island, Lagos',
          priority: 'high'
        },
        {
          id: 2,
          title: 'Bathroom Renovation',
          client: 'Michael Brown',
          status: 'Pending',
          date: '2024-01-20',
          budget: '₦50,000 - ₦80,000',
          location: 'Ikoyi, Lagos',
          priority: 'medium'
        },
        {
          id: 3,
          title: 'Emergency Pipe Repair',
          client: 'Grace Williams',
          status: 'Completed',
          date: '2024-01-10',
          budget: '₦8,000 - ₦12,000',
          location: 'Surulere, Lagos',
          priority: 'high'
        }
      ]);

      setRecentMessages([
        {
          id: 1,
          client: 'Sarah Johnson',
          message: 'Hi David, when can you start the kitchen sink repair?',
          time: '2 hours ago',
          unread: true
        },
        {
          id: 2,
          client: 'Michael Brown',
          message: 'Thanks for the bathroom renovation quote. I\'ll get back to you soon.',
          time: '1 day ago',
          unread: false
        },
        {
          id: 3,
          client: 'Grace Williams',
          message: 'The pipe repair looks great! Thank you so much.',
          time: '2 days ago',
          unread: false
        }
      ]);

      setNotifications([
        {
          id: 1,
          type: 'job_application',
          message: 'New job application for "Fix Kitchen Sink"',
          time: '1 hour ago',
          unread: true
        },
        {
          id: 2,
          type: 'review',
          message: 'Grace Williams left you a 5-star review',
          time: '2 hours ago',
          unread: true
        },
        {
          id: 3,
          type: 'payment',
          message: 'Payment of ₦12,000 received for Emergency Pipe Repair',
          time: '1 day ago',
          unread: false
        }
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
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
              Welcome back, {user?.name || 'Professional'} 👋
            </h1>
            <p className="text-gray-600">
              Here's your professional dashboard with job updates and earnings.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Location Sharing Toggle */}
            <div className="flex items-center gap-2 mr-4">
              <FaMapMarkerAlt className={`w-4 h-4 ${isSharingLocation ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className="text-sm text-gray-600">
                {isSharingLocation ? 'Sharing' : 'Hidden'}
              </span>
              <button
                onClick={toggleLocationSharing}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  isSharingLocation ? 'bg-blue-600' : 'bg-gray-200'
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

      {/* Profile Setup Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FaExclamationTriangle className="w-5 h-5 text-blue-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">Complete Your Professional Profile</h3>
              <p className="text-sm text-blue-600">Set up your profile to start receiving connection requests and job opportunities.</p>
            </div>
          </div>
          <Link
            to="/dashboard/professional/create-profile"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Set Up Profile
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Jobs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalJobs}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FaBriefcase className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Jobs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeJobs}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <FaClock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedJobs}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <FaCheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900">₦{stats.totalEarnings.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <FaMoneyBillWave className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Rating Card */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Your Rating</h3>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <FaStar
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.floor(stats.rating) ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.rating}</span>
              <span className="text-gray-600">({stats.reviewCount} reviews)</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Average rating</p>
            <p className="text-lg font-semibold text-gray-900">Excellent</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/dashboard/my-jobs"
            className="flex items-center p-4 bg-white border-2 border-blue-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="p-3 bg-blue-100 rounded-full mr-4 group-hover:bg-blue-200 transition-colors">
              <FaBriefcase className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">My Jobs</h3>
              <p className="text-sm text-gray-600">View and manage your jobs</p>
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
              <p className="text-sm text-gray-600">Chat with clients</p>
            </div>
          </Link>

          <Link
            to="/dashboard/profile"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            <div className="p-3 bg-gray-100 rounded-full mr-4 group-hover:bg-gray-200 transition-colors">
              <FaUser className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Profile</h3>
              <p className="text-sm text-gray-600">Update your profile</p>
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
              <FaEye className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{job.title}</h3>
                  <p className="text-sm text-gray-600">{job.client} • {job.budget}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <FaMapMarkerAlt className="w-3 h-3" />
                    <span>{job.location}</span>
                    <span className={`font-medium ${getPriorityColor(job.priority)}`}>
                      {job.priority} priority
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Messages */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Messages</h2>
            <Link
              to="/dashboard/messages"
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              View all
              <FaEye className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentMessages.map((message) => (
              <div key={message.id} className="flex items-start p-3 border border-gray-100 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900">{message.client}</h3>
                    {message.unread && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{message.message}</p>
                  <p className="text-xs text-gray-500">{message.time}</p>
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
            <FaEye className="w-3 h-3" />
          </Link>
        </div>
        <div className="space-y-3">
          {notifications.slice(0, 3).map((notification) => (
            <div
              key={notification.id}
              className={`flex items-start p-3 rounded-lg ${
                notification.unread ? 'bg-blue-50 border-l-4 border-blue-400' : 'bg-gray-50'
              }`}
            >
              <div className="flex-1">
                <p className="text-sm text-gray-900">{notification.message}</p>
                <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
              </div>
              {notification.unread && (
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfessionalDashboard;