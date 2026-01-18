import { NavLink, useLocation } from 'react-router-dom';
import {
  FiSearch,
  FiUser,
  FiMessageSquare,
  FiBriefcase,
  FiPlusSquare,
  FiTrendingUp,
  FiUsers
} from 'react-icons/fi';
import { useAuth } from '../context/useAuth';
import { useSocket } from '../context/SocketContext';
import { useState, useEffect } from 'react';

const BottomNavigation = ({ userType = 'user' }) => {
  const location = useLocation();
  const { socket, isConnected } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (socket && isConnected) {
      socket.on('notification:new', () => setUnreadCount(prev => prev + 1));
      return () => socket.off('notification:new');
    }
  }, [socket, isConnected]);

  const userNavItems = [
    { path: '/dashboard', icon: FiSearch, label: 'Discover' },
    { path: '/dashboard/overview', icon: FiTrendingUp, label: 'Stats' },
    { path: '/dashboard/post-job', icon: FiPlusSquare, label: 'Post' },
    { path: '/dashboard/messages', icon: FiMessageSquare, label: 'Chat' },
    { path: '/dashboard/profile', icon: FiUser, label: 'Profile' }
  ];

  const proNavItems = [
    { path: '/dashboard/professional', icon: FiSearch, label: 'Jobs' },
    { path: '/dashboard/professional/connected-users', icon: FiUsers, label: 'Network' },
    { path: '/dashboard/professional/messages', icon: FiMessageSquare, label: 'Chat' },
    { path: '/dashboard/professional/profile', icon: FiUser, label: 'Profile' },
    { path: '/dashboard/professional/analytics', icon: FiTrendingUp, label: 'Stats' }
  ];

  const navItems = userType === 'professional' ? proNavItems : userNavItems;

  const isActive = (path) => {
    if (path === '/dashboard' || path === '/dashboard/professional') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-stone-50 border-t border-stone-200 lg:hidden pb-safe-area">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${active ? 'text-trust' : 'text-stone-400'
                }`}
            >
              <item.icon className={`w-5 h-5 mb-1 ${active ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
              {active && <div className="mt-1 w-1 h-1 bg-trust"></div>}
            </NavLink>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)] bg-stone-50" />
    </nav>
  );
};

export default BottomNavigation;


