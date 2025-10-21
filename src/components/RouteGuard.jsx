import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const RouteGuard = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      // Redirect authenticated users to their appropriate dashboard
      if (user?.role === 'professional') {
        navigate('/dashboard/professional', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  // Only render children if user is not authenticated
  if (isAuthenticated) {
    return null; // Will redirect, so don't render anything
  }

  return children;
};

export default RouteGuard;

