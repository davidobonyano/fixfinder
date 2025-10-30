/**
 * Location Utilities for FixFinder
 * Handles geolocation, distance calculations, and formatting
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Format distance for display
 * @param {number} distanceKm 
 * @returns {string}
 */
export const formatDistance = (distanceKm) => {
  if (!distanceKm && distanceKm !== 0) return 'Unknown';
  
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m away`;
  }
  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km away`;
  }
  return `${Math.round(distanceKm)} km away`;
};

/**
 * Get current user location
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
};

/**
 * Request location permission
 * @returns {Promise<boolean>}
 */
export const requestLocationPermission = async () => {
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state === 'granted';
  } catch (error) {
    console.error('Permission API not supported:', error);
    return false;
  }
};

/**
 * Check if geolocation is available
 * @returns {boolean}
 */
export const isGeolocationSupported = () => {
  return 'geolocation' in navigator;
};

/**
 * Watch user position for real-time tracking
 * @param {Function} callback 
 * @returns {number} watchId
 */
export const watchPosition = (callback) => {
  if (!navigator.geolocation) {
    console.error('Geolocation is not supported');
    return null;
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      callback({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      });
    },
    (error) => {
      console.error('Error watching position:', error);
    },
    {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 10000
    }
  );

  return watchId;
};

/**
 * Clear position watch
 * @param {number} watchId 
 */
export const clearPositionWatch = (watchId) => {
  if (watchId !== null && 'geolocation' in navigator) {
    navigator.geolocation.clearWatch(watchId);
  }
};

/**
 * Validate coordinates
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {boolean}
 */
export const isValidCoordinates = (latitude, longitude) => {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
};

/**
 * Format location as "City, State"
 * @param {Object} location 
 * @returns {string}
 */
export const formatLocation = (location) => {
  if (!location) return 'Location not set';
  
  if (location.city && location.state) {
    return `${location.city}, ${location.state}`;
  }
  if (location.city) {
    return location.city;
  }
  if (location.state) {
    return location.state;
  }
  if (location.address) {
    return location.address;
  }
  return 'Location not set';
};

/**
 * Generate map URL for OpenStreetMap
 * @param {number} lat 
 * @param {number} lng 
 * @param {number} zoom 
 * @returns {string}
 */
export const generateMapUrl = (lat, lng, zoom = 13) => {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=${zoom}`;
};

