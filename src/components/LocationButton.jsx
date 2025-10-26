import { useState, useEffect } from 'react';
import { 
  FaMapMarkerAlt, 
  FaStop, 
  FaSpinner,
  FaLocationArrow
} from 'react-icons/fa';

const LocationButton = ({ 
  onShareLocation, 
  onStopSharing, 
  isSharing = false,
  isLoading = false,
  disabled = false 
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = () => {
    if (disabled || isLoading) return;
    
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 150);
    
    if (isSharing) {
      onStopSharing?.();
    } else {
      onShareLocation?.();
    }
  };

  const getButtonContent = () => {
    if (isLoading) {
      return <FaSpinner className="w-4 h-4 animate-spin" />;
    }
    
    if (isSharing) {
      return <FaStop className="w-4 h-4" />;
    }
    
    return <FaMapMarkerAlt className="w-4 h-4" />;
  };

  const getButtonClass = () => {
    const baseClass = "p-2 rounded-lg transition-all duration-150 transform";
    
    if (disabled || isLoading) {
      return `${baseClass} text-gray-400 cursor-not-allowed`;
    }
    
    if (isSharing) {
      return `${baseClass} text-red-600 hover:text-red-700 hover:bg-red-50 ${
        isPressed ? 'scale-95' : 'hover:scale-105'
      }`;
    }
    
    return `${baseClass} text-gray-400 hover:text-gray-600 hover:bg-gray-100 ${
      isPressed ? 'scale-95' : 'hover:scale-105'
    }`;
  };

  const getTooltip = () => {
    if (isLoading) return 'Processing...';
    if (isSharing) return 'Stop sharing location';
    return 'Share location';
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={getButtonClass()}
      title={getTooltip()}
    >
      {getButtonContent()}
    </button>
  );
};

export default LocationButton;


