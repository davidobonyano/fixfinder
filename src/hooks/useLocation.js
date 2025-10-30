import { useState, useEffect } from 'react';
import { 
  getCurrentLocation, 
  requestLocationPermission,
  isValidCoordinates 
} from '../utils/locationUtils';
import { saveLocation as saveLocationAPI, getAuthToken } from '../utils/api';

const CACHE_KEY = 'ff_detected_location_v1';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function readCachedLocation() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp || !parsed?.value) return null;
    const isFresh = Date.now() - parsed.timestamp < CACHE_TTL_MS;
    return isFresh ? parsed.value : null;
  } catch {
    return null;
  }
}

function writeCachedLocation(value) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ value, timestamp: Date.now() }));
  } catch {}
}

function clearCachedLocation() {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
}

/**
 * Hook for managing user location
 * Provides location state and methods to get/update location
 */
export const useLocation = (autoDetect = false) => {
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Auto-detect location on mount if requested
  useEffect(() => {
    // Seed from cache immediately to avoid UI jank
    const cached = readCachedLocation();
    if (cached) setLocation(cached);

    if (autoDetect && !cached) {
      detectLocation();
    }

    // Check permission status
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermissionGranted(result.state === 'granted');
      });
    }
  }, [autoDetect]);

  /**
   * Detect current location
   */
  const detectLocation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const position = await getCurrentLocation();
      setLocation(position);
      writeCachedLocation(position);
      setPermissionGranted(true);
      
      // Auto-save to backend only if authenticated
      try {
        const token = getAuthToken?.() || localStorage.getItem('token');
        if (token) {
          await saveLocationAPI(position.latitude, position.longitude);
          // Successful save -> refresh cache timestamp
          writeCachedLocation(position);
        }
      } catch (saveError) {
        console.error('Failed to save location:', saveError);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error detecting location:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Request location permission and detect
   */
  const requestAndDetect = async () => {
    try {
      const granted = await requestLocationPermission();
      if (granted) {
        await detectLocation();
      } else {
        setError('Location permission denied');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  /**
   * Update location manually
   */
  const updateLocation = async (latitude, longitude) => {
    if (!isValidCoordinates(latitude, longitude)) {
      setError('Invalid coordinates');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const location = { latitude, longitude };
      setLocation(location);
      writeCachedLocation(location);
      
      // Save to backend
      await saveLocationAPI(latitude, longitude);
      // Successful save -> refresh cache timestamp
      writeCachedLocation(location);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Clear location
   */
  const clearLocation = () => {
    setLocation(null);
    setError(null);
    clearCachedLocation();
  };

  return {
    location,
    isLoading,
    error,
    permissionGranted,
    detectLocation,
    requestAndDetect,
    updateLocation,
    clearLocation
  };
};

