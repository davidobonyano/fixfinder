import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FaCheck, FaTimes, FaSpinner } from 'react-icons/fa';
import { verifyEmail, getMe } from '../utils/api';
import { useAuth } from '../context/useAuth';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    const verify = async () => {
      try {
        setStatus('verifying');
        const response = await verifyEmail(token);

        if (response.success) {
          setStatus('success');
          setMessage('Email verified successfully! You can now use all features of FYF.');
          // Send to dedicated success page
          navigate('/verify-email/success', { replace: true });
        } else {
          setStatus('error');
          setMessage(response.message || 'Verification failed');
        }
      } catch (error) {
        // If token is already used/expired or user already verified, treat as success UX
        const msg = (error?.message || '').toLowerCase();
        const likelyAlreadyVerified = msg.includes('already') || msg.includes('verified') || msg.includes('not authorized');
        if (likelyAlreadyVerified) {
          setStatus('success');
          setMessage('Your email is already verified.');
          navigate('/verify-email/success', { replace: true });
          return;
        }
        setStatus('error');
        setMessage(error.message || 'Verification failed. Please try again.');
      }
    };

    verify();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-charcoal flex items-center justify-center px-4 transition-colors">
      <div className="max-w-md w-full bg-white dark:bg-stone-900 rounded-lg shadow-lg p-8 text-center transition-colors">
        {status === 'verifying' && (
          <>
            <FaSpinner className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-stone-50 mb-2">Verifying Email</h1>
            <p className="text-gray-600 dark:text-stone-400">Please wait while we verify your email address...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <FaCheck className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-stone-50 mb-2">Email Verified!</h1>
            <p className="text-gray-600 dark:text-stone-400 mb-4">{message}</p>
            <p className="text-sm text-gray-500 dark:text-stone-500">Redirecting to dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <FaTimes className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/')}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Go Home
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}




