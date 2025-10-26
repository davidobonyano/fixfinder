import { useState, useEffect } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes, FaBell } from 'react-icons/fa';

const NotificationToast = ({ notification, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleRemove = () => {
    setIsVisible(false);
    setTimeout(() => onRemove(notification.id), 300);
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <FaCheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <FaExclamationCircle className="w-5 h-5 text-red-500" />;
      case 'info':
        return <FaInfoCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <FaBell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBgColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm w-full transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className={`p-4 rounded-lg border shadow-lg ${getBgColor()}`}>
        <div className="flex items-start gap-3">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 text-sm">
              {notification.title}
            </h4>
            {notification.message && (
              <p className="text-sm text-gray-600 mt-1">
                {notification.message}
              </p>
            )}
            {notification.action && (
              <button
                onClick={notification.action.onClick}
                className="text-sm text-blue-600 hover:text-blue-800 mt-1"
              >
                {notification.action.label}
              </button>
            )}
          </div>
          <button
            onClick={handleRemove}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationToast;

