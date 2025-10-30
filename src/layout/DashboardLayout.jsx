import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { getMyLocation } from '../utils/api';
import { 
  FaHome, 
  FaUser, 
  FaCog, 
  FaSignOutAlt, 
  FaBell, 
  FaBars, 
  FaTimes,
  FaPlus,
  FaComments,
  FaUsers,
  FaBriefcase,
  FaChartLine,
  FaCalendarAlt,
  FaStar,
  FaHeart,
  FaList
} from 'react-icons/fa';

const DashboardLayout = ({ userType = 'user' }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationDropdown, setNotificationDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, logout } = useAuth();
  const { socket, isConnected } = useSocket();
  const { info } = useToast();
  const navigate = useNavigate();
  const [myLocation, setMyLocation] = useState(null);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
    // Also fetch my current location
    (async () => {
      try {
        const res = await getMyLocation();
        if (res?.location) setMyLocation(res.location);
      } catch (_) {}
    })();
  }, []);

  // Listen for real-time notifications via Socket.IO
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewNotification = (data) => {
      console.log('🔔 New notification received:', data);
      setNotifications(prev => [data, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Get notification emoji based on type
      const emoji = getNotificationEmoji(data.type);
      
      // Show toast notification
      info(`${emoji} ${data.title}`, 5000);

      // Play notification sound
      try {
        const audio = new Audio('/notification-sound.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch (e) {}

      // Vibrate on mobile
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new');
    };
  }, [socket, isConnected, info]);

  // Get notification emoji based on type
  const getNotificationEmoji = (type) => {
    switch (type) {
      case 'job_application':
        return '💼';
      case 'job_accepted':
        return '✅';
      case 'job_completed':
        return '🎉';
      case 'new_message':
        return '💬';
      case 'review_received':
        return '⭐';
      case 'payment_received':
        return '💰';
      case 'connection_request':
        return '👤';
      case 'connection_accepted':
        return '🤝';
      default:
        return '🔔';
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/notifications?limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setNotifications(data.data.notifications || []);
        setUnreadCount(data.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/notifications/read-all`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleNotificationClick = (notification) => {
    if (notification.data?.conversationId) {
      navigate(userType === 'professional' ? '/dashboard/professional/messages' : '/dashboard/messages');
    } else if (notification.data?.jobId) {
      navigate(userType === 'professional' ? '/dashboard/professional/my-jobs' : '/dashboard/my-jobs');
    }
    setNotificationDropdown(false);
  };

  // User Dashboard Navigation
  const userNavItems = [
    { path: '/dashboard', icon: FaUsers, label: 'Discover Pros' },
    { path: '/dashboard/professionals', icon: FaList, label: 'All Professionals' },
    { path: '/dashboard/overview', icon: FaHome, label: 'Overview' },
    { path: '/dashboard/post-job', icon: FaPlus, label: 'Post a Job' },
    { path: '/dashboard/my-jobs', icon: FaBriefcase, label: 'My Jobs' },
    { path: '/dashboard/messages', icon: FaComments, label: 'Messages' },
    { path: '/dashboard/saved', icon: FaHeart, label: 'Saved Pros' },
    { path: '/dashboard/notifications', icon: FaBell, label: 'Notifications' },
    { path: '/dashboard/profile', icon: FaUser, label: 'Profile' }
  ];

  // Professional Dashboard Navigation
  const proNavItems = [
    { path: '/dashboard/professional', icon: FaBriefcase, label: 'Job Feed' },
    { path: '/dashboard/professional/overview', icon: FaHome, label: 'Overview' },
    { path: '/dashboard/professional/connected-users', icon: FaUsers, label: 'Connected Users' },
    { path: '/dashboard/professional/my-jobs', icon: FaBriefcase, label: 'My Jobs' },
    { path: '/dashboard/professional/messages', icon: FaComments, label: 'Messages' },
    { path: '/dashboard/professional/notifications', icon: FaBell, label: 'Notifications' },
    { path: '/dashboard/professional/profile', icon: FaUser, label: 'Profile' },
    { path: '/dashboard/professional/reviews', icon: FaStar, label: 'Reviews' },
    { path: '/dashboard/professional/analytics', icon: FaChartLine, label: 'Analytics' }
  ];

  const navItems = userType === 'professional' ? proNavItems : userNavItems;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <h1 className="text-xl font-bold text-indigo-600">FixFinder</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <FaTimes />
          </button>
        </div>

        {/* User info */}
        <div className="px-6 py-4 border-b">
          <NavLink 
            to={userType === 'professional' ? '/dashboard/professional/profile' : '/dashboard/profile'} 
            className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
              {user?.profilePicture || user?.avatarUrl ? (
                <img
                  src={user.profilePicture || user.avatarUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <FaUser className="text-gray-600" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{userType}</p>
            </div>
          </NavLink>
        </div>

        {/* Navigation */}
        <nav className="mt-6">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-6 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-100 text-gray-900 border-r-2 border-gray-400'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout button */}
        <div className="absolute bottom-0 w-full p-6">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <FaSignOutAlt className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b">
          <div className="flex items-center justify-between h-16 px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <FaBars />
            </button>
            
            <div className="flex items-center space-x-4">
              {/* Current Location Chip */}
              {myLocation && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs border border-blue-200">
                  <span>📍 {myLocation.city || myLocation.state || 'Unknown'}</span>
                  {myLocation.state && myLocation.city ? (
                    <span className="opacity-70">({myLocation.state})</span>
                  ) : null}
                </div>
              )}
              {/* Notifications Bell with Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setNotificationDropdown(!notificationDropdown);
                    if (!notificationDropdown && unreadCount > 0) {
                      markAllAsRead();
                    }
                  }}
                  className="relative p-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <FaBell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {notificationDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 bg-black bg-opacity-20 z-40"
                      onClick={() => setNotificationDropdown(false)}
                    />
                    <div className="absolute right-0 mt-2 w-96 bg-white shadow-2xl rounded-lg border border-gray-200 z-50 max-h-[500px] overflow-hidden flex flex-col">
                      {/* Header */}
                      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                            {unreadCount > 0 && (
                              <p className="text-sm text-gray-500">{unreadCount} unread</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Notifications List */}
                      <div className="overflow-y-auto flex-1">
                        {notifications.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <FaBell className="w-12 h-12 text-gray-300 mb-3" />
                            <p className="text-sm font-medium">No notifications yet</p>
                            <p className="text-xs text-center mt-1">
                              You'll see notifications here when you get updates
                            </p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {notifications.slice(0, 10).map((notification) => (
                              <div
                                key={notification._id}
                                className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                                  !notification.isRead ? 'bg-blue-50' : ''
                                }`}
                                onClick={() => handleNotificationClick(notification)}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">
                                      {notification.title}
                                    </h4>
                                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                      {notification.message}
                                    </p>
                                  </div>
                                  {!notification.isRead && (
                                    <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      {notifications.length > 0 && (
                        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                          <NavLink
                            to={userType === 'professional' ? '/dashboard/professional/notifications' : '/dashboard/notifications'}
                            className="w-full text-center block text-sm text-blue-600 hover:text-blue-800 font-medium"
                            onClick={() => setNotificationDropdown(false)}
                          >
                            View all notifications
                          </NavLink>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              
              {/* User avatar */}
              <NavLink 
                to={userType === 'professional' ? '/dashboard/professional/profile' : '/dashboard/profile'} 
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden hover:bg-gray-200 transition-colors"
              >
                {user?.profilePicture || user?.avatarUrl ? (
                  <img
                    src={user.profilePicture || user.avatarUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FaUser className="text-gray-600" />
                )}
              </NavLink>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
