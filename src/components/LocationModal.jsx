import { useState, useEffect } from 'react';
import { 
  FaMapMarkerAlt, 
  FaTimes, 
  FaSpinner, 
  FaLocationArrow,
  FaExclamationTriangle,
  FaCheckCircle
} from 'react-icons/fa';

const LocationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  onCancel,
  otherUserName = 'this person',
  isLoading = false 
}) => {
  const [locationPermission, setLocationPermission] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setLocationPermission(null);
      setUserLocation(null);
      setError(null);
    }
  }, [isOpen]);

  const requestLocationPermission = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      setLocationPermission('denied');
      return;
    }

    try {
      setError(null);
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        });
      });

      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date().toISOString()
      };

      setUserLocation(location);
      setLocationPermission('granted');
    } catch (error) {
      console.error('Error getting location:', error);
      setError('Unable to get your location. Please allow location access.');
      setLocationPermission('denied');
    }
  };

  const handleConfirm = () => {
    if (userLocation) {
      onConfirm(userLocation);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Share Your Location</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center mb-6">
          <FaMapMarkerAlt className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">
            Are you sure you want to share your location with <strong>{otherUserName}</strong>? 
            They will be able to see your current location on the map.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <FaExclamationTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Location Error</span>
            </div>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        )}

        {locationPermission === 'granted' && userLocation && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <FaCheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Location Found</span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              Lat: {userLocation.lat.toFixed(6)}, Lng: {userLocation.lng.toFixed(6)}
            </p>
            <p className="text-xs text-green-500 mt-1">
              Accuracy: {Math.round(userLocation.accuracy)}m
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          
          {locationPermission === null && (
            <button
              onClick={requestLocationPermission}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <FaSpinner className="w-4 h-4 animate-spin" />
              ) : (
                <FaLocationArrow className="w-4 h-4" />
              )}
              {isLoading ? 'Preparing…' : 'Share Location'}
            </button>
          )}

          {locationPermission === 'granted' && userLocation && (
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <FaSpinner className="w-4 h-4 animate-spin" />
              ) : (
                <FaMapMarkerAlt className="w-4 h-4" />
              )}
              {isLoading ? 'Sharing...' : 'Share Location'}
            </button>
          )}

          {locationPermission === 'denied' && (
            <button
              onClick={requestLocationPermission}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationModal;


