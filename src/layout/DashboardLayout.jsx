import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
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
    { path: '/dashboard', icon: FaHome, label: 'Overview' },
    { path: '/dashboard/job-feed', icon: FaBriefcase, label: 'Job Feed' },
    { path: '/dashboard/my-jobs', icon: FaBriefcase, label: 'My Jobs' },
    { path: '/dashboard/messages', icon: FaComments, label: 'Messages' },
    { path: '/dashboard/portfolio', icon: FaUser, label: 'Portfolio' },
    { path: '/dashboard/reviews', icon: FaStar, label: 'Reviews' },
    { path: '/dashboard/schedule', icon: FaCalendarAlt, label: 'Schedule' },
    { path: '/dashboard/analytics', icon: FaChartLine, label: 'Analytics' },
    { path: '/dashboard/settings', icon: FaCog, label: 'Settings' }
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
            to="/dashboard/profile" 
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
              {/* Notifications */}
              <button className="relative p-2 text-gray-500 hover:text-gray-700">
                <FaBell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>
              
              {/* User avatar */}
              <NavLink 
                to="/dashboard/profile" 
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
