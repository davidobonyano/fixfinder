import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const RouteGuard = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Allow authenticated users to access certain public pages (e.g., professional/user detail)
    const path = location.pathname || '';
    const allowlist = [
      '/professionals',      // professional detail and nested
      '/professional/',      // user-view professional profile
      '/user/',              // user public profile
      '/services',
      '/verify',
      '/verify-email'
    ];
    const isAllowed = allowlist.some(prefix => path.startsWith(prefix));
    if (isAllowed) return; // don't redirect from allowed public routes

    // Redirect authenticated users to their appropriate dashboard for other public routes
    if (user?.role === 'professional') {
      navigate('/dashboard/professional', { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate, location.pathname]);

  // Only render children if user is not authenticated
  if (isAuthenticated) {
    // For allowed paths, we return children above; for others we redirect and render nothing here
    const path = location.pathname || '';
    const allowlist = ['/professionals', '/professional/', '/user/', '/services', '/verify', '/verify-email'];
    const isAllowed = allowlist.some(prefix => path.startsWith(prefix));
    if (!isAllowed) return null;
  }

  return children;
};

export default RouteGuard;

