import { FaCheck } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

export default function VerifyEmailSuccess() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <FaCheck className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Verified</h1>
        <p className="text-gray-600 mb-6">You have successfully verified your email. Please go back home and login to continue.</p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Go Home
          </button>
          <button
            onClick={() => navigate('/login')}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
}



