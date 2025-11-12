import { NavLink, useLocation } from 'react-router-dom';
import { 
  FaHome, 
  FaUser, 
  FaBell, 
  FaComments, 
  FaBriefcase,
  FaUsers,
  FaSearch,
  FaPlus,
  FaChartLine,
  FaStar,
  FaList
} from 'react-icons/fa';
import { useAuth } from '../context/useAuth';
import { useSocket } from '../context/SocketContext';
import { useState, useEffect } from 'react';

const BottomNavigation = ({ userType = 'user' }) => {
  const location = useLocation();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread notification count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://fixfinder-backend-8yjj.onrender.com'}/api/notifications?limit=1`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (data.success) {
          setUnreadCount(data.data.unreadCount || 0);
        }
      } catch (err) {
        console.error('Error fetching unread count:', err);
      }
    };

    fetchUnreadCount();

    // Listen for real-time notifications
    if (socket && isConnected) {
      const handleNewNotification = () => {
        setUnreadCount(prev => prev + 1);
      };

      socket.on('notification:new', handleNewNotification);

      return () => {
        socket.off('notification:new');
      };
    }
  }, [socket, isConnected]);

  // User Dashboard Navigation Items
  const userNavItems = [
    { 
      path: '/dashboard', 
      icon: FaHome, 
      label: 'Home',
      exact: true
    },
    { 
      path: '/dashboard/professionals', 
      icon: FaSearch, 
      label: 'Discover' 
    },
    { 
      path: '/dashboard/post-job', 
      icon: FaPlus, 
      label: 'Post',
      highlight: true
    },
    { 
      path: '/dashboard/messages', 
      icon: FaComments, 
      label: 'Messages' 
    },
    { 
      path: '/dashboard/profile', 
      icon: FaUser, 
      label: 'Profile' 
    }
  ];

  // Professional Dashboard Navigation Items
  const proNavItems = [
    { 
      path: '/dashboard/professional', 
      icon: FaBriefcase, 
      label: 'Jobs',
      exact: true
    },
    { 
      path: '/dashboard/professional/connected-users', 
      icon: FaUsers, 
      label: 'Network' 
    },
    { 
      path: '/dashboard/professional/my-jobs', 
      icon: FaList, 
      label: 'My Jobs' 
    },
    { 
      path: '/dashboard/professional/messages', 
      icon: FaComments, 
      label: 'Messages' 
    },
    { 
      path: '/dashboard/professional/profile', 
      icon: FaUser, 
      label: 'Profile' 
    }
  ];

  const navItems = userType === 'professional' ? proNavItems : userNavItems;

  const isActive = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 lg:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive: navActive }) => {
                const isItemActive = item.exact 
                  ? location.pathname === item.path 
                  : location.pathname.startsWith(item.path);
                
                return `
                  flex flex-col items-center justify-center 
                  flex-1 h-full 
                  transition-all duration-200
                  ${isItemActive 
                    ? 'text-indigo-600' 
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `;
              }}
            >
              <div className="relative">
                {item.highlight ? (
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center
                    transition-all duration-200
                    ${isActive(item) 
                      ? 'bg-indigo-600 text-white shadow-lg' 
                      : 'bg-gray-100 text-gray-600'
                    }
                  `}>
                    <Icon className="w-5 h-5" />
                  </div>
                ) : (
                  <Icon className={`w-6 h-6 transition-transform ${isActive(item) ? 'scale-110' : ''}`} />
                )}
              </div>
              <span className={`text-xs mt-1 font-medium ${isActive(item) ? 'text-indigo-600' : 'text-gray-500'}`}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
      
      {/* Safe area for devices with home indicator */}
      <div className="h-safe-area-inset-bottom bg-white" style={{ height: 'env(safe-area-inset-bottom, 0.5rem)' }} />
    </nav>
  );
};

export default BottomNavigation;

