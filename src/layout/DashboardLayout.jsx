import { useState, useEffect } from 'react';
import { NavLink, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  FiSearch, FiTrendingUp, FiPlusSquare, FiBriefcase, FiMessageSquare,
  FiUser, FiLogOut, FiBell, FiMapPin, FiUsers, FiMoon, FiSun
} from 'react-icons/fi';
import { useAuth } from '../context/useAuth';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import { getMyLocation } from '../utils/api';
import BottomNavigation from '../components/BottomNavigation';

const DashboardLayout = ({ userType = 'user' }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { socket, isConnected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [myLocation, setMyLocation] = useState(null);

  useEffect(() => {
    if (user) {
      const isProfessionalRoute = /^\/dashboard\/professional(?:\/|$)/.test(location.pathname);
      const isProfessional = user.role === 'professional';
      const isViewingProfessionalDetail = /^\/dashboard\/professional\/[^\/]+$/.test(location.pathname);

      if (isProfessional && !isProfessionalRoute && !/professionals/.test(location.pathname)) {
        navigate('/dashboard/professional', { replace: true });
      } else if (!isProfessional && isProfessionalRoute && !isViewingProfessionalDetail) {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate, location.pathname]);

  useEffect(() => {
    (async () => {
      try {
        const res = await getMyLocation();
        if (res?.location) setMyLocation(res.location);
      } catch (_) { }
    })();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userNavItems = [
    { path: '/dashboard', icon: FiSearch, label: 'Discover' },
    { path: '/dashboard/overview', icon: FiTrendingUp, label: 'Overview' },
    { path: '/dashboard/professionals', icon: FiUsers, label: 'Professionals' },
    { path: '/dashboard/post-job', icon: FiPlusSquare, label: 'Post a Job' },
    { path: '/dashboard/my-jobs', icon: FiBriefcase, label: 'My Jobs' },
    { path: '/dashboard/messages', icon: FiMessageSquare, label: 'Messages' },
    { path: '/dashboard/profile', icon: FiUser, label: 'Profile' }
  ];

  const proNavItems = [
    { path: '/dashboard/professional', icon: FiSearch, label: 'Job Feed' },
    { path: '/dashboard/professional/connected-users', icon: FiUsers, label: 'Connected' },
    { path: '/dashboard/professional/my-jobs', icon: FiBriefcase, label: 'My Jobs' },
    { path: '/dashboard/professional/messages', icon: FiMessageSquare, label: 'Messages' },
    { path: '/dashboard/professional/profile', icon: FiUser, label: 'Profile' },
    { path: '/dashboard/professional/analytics', icon: FiTrendingUp, label: 'Performance' }
  ];

  const navItems = userType === 'professional' ? proNavItems : userNavItems;

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-charcoal font-sans text-charcoal dark:text-stone-100 flex transition-colors duration-500">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-stone-50 dark:bg-stone-100/5 border-r border-stone-200 dark:border-stone-800 fixed h-full z-50 transition-colors">
        <div className="p-8 border-b border-stone-200 dark:border-stone-800">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="h-4 w-4 bg-trust group-hover:scale-110 transition-transform"></div>
            <span className="font-tight text-xl font-bold tracking-tight text-charcoal dark:text-stone-50 uppercase">FYF</span>
          </Link>
          <p className="mt-2 text-[10px] font-bold text-stone-400 tracking-widest uppercase">
            {userType === 'professional' ? 'Professional Portal' : 'Customer Console'}
          </p>
        </div>

        <nav className="flex-1 py-8 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard' || item.path === '/dashboard/professional'}
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-3 text-sm font-medium transition-all ${isActive
                  ? 'bg-stone-200 dark:bg-stone-800 text-charcoal dark:text-stone-50 border-l-4 border-trust -ml-4 pl-7'
                  : 'text-graphite dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-charcoal dark:hover:text-stone-50'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-6 border-t border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-3 mb-6 p-2">
            <div className="w-10 h-10 bg-stone-200 dark:bg-stone-800 overflow-hidden border border-stone-300 dark:border-stone-700">
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-400">
                  <FiUser />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{user?.name}</p>
              <p className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Account Active</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2 text-sm font-bold text-clay hover:bg-clay/5 transition-colors"
          >
            <FiLogOut className="w-4 h-4" />
            <span className="uppercase tracking-widest text-[10px]">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Wrapper */}
      <div className="flex-1 flex flex-col lg:pl-72">
        {/* Top Header */}
        <header className="h-20 bg-stone-50 dark:bg-charcoal border-b border-stone-200 dark:border-stone-800 sticky top-0 z-40 flex items-center justify-between px-6 lg:px-12 transition-colors">
          <div className="flex items-center gap-6">
            {/* Mobile Logo Visibility */}
            <Link to="/" className="lg:hidden flex items-center gap-2">
              <div className="h-4 w-4 bg-trust"></div>
              <span className="font-tight text-lg font-bold tracking-tight text-charcoal dark:text-white uppercase">FYF</span>
            </Link>
            <div className="h-8 w-[1px] bg-stone-200 dark:bg-stone-800 lg:hidden"></div>
            {myLocation && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                <FiMapPin className="text-trust h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-graphite dark:text-stone-400">
                  {myLocation.lga || myLocation.state || 'Local Area'}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 sm:gap-8">
            <button
              onClick={toggleTheme}
              className="p-2 text-charcoal dark:text-stone-300 hover:text-trust transition-colors"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <FiSun className="w-5 h-5" /> : <FiMoon className="w-5 h-5" />}
            </button>

            <NavLink
              to={userType === 'professional' ? '/dashboard/professional/notifications' : '/dashboard/notifications'}
              className="relative p-2 text-charcoal dark:text-stone-300 hover:text-trust transition-colors"
            >
              <FiBell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-trust rounded-full"></span>
              )}
            </NavLink>
            <div className="h-8 w-[1px] bg-stone-200 dark:bg-stone-800 hidden sm:block"></div>
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">{isDark ? 'Stealth' : 'verified'} status</span>
              <span className="text-xs font-bold text-trust">Trust Level 1</span>
            </div>
          </div>
        </header>

        {/* Interior Page Content */}
        <main className="flex-1 p-6 lg:p-12 pb-32 lg:pb-12 max-w-[1600px] mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* Mobile Nav */}
      <div className="lg:hidden">
        <BottomNavigation userType={userType} />
      </div>
    </div>
  );
};

export default DashboardLayout;
