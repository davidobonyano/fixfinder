import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { stopLocationShare } from '../utils/api';

const useLocationSessionManager = (conversationId, isSharing, settings) => {
  const { socket, isConnected, emit } = useSocket();
  const [sessionTimer, setSessionTimer] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const intervalRef = useRef(null);

  // Start location sharing session
  const startSession = () => {
    if (!settings.autoStopLocationSharing || !settings.locationSharingDuration) return;

    const duration = settings.locationSharingDuration * 60 * 1000; // Convert to milliseconds
    setTimeRemaining(duration);

    // Clear existing timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Start countdown
    intervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1000) {
          // Time's up, stop sharing
          stopSession();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    setSessionTimer(Date.now() + duration);
  };

  // Stop location sharing session
  const stopSession = async () => {
    if (!conversationId) return;

    try {
      // Clear timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      setSessionTimer(null);
      setTimeRemaining(0);

      // Stop sharing via API
      await stopLocationShare(conversationId);

      // Emit stop via Socket.IO
      if (socket && isConnected) {
        emit('stop_location_share', {
          userId: null, // Will be set by the hook user
          conversationId
        });
      }
    } catch (error) {
      console.error('Error stopping location session:', error);
    }
  };

  // Start session when sharing begins
  useEffect(() => {
    if (isSharing && settings.autoStopLocationSharing) {
      startSession();
    } else if (!isSharing) {
      // Clear timer when not sharing
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setSessionTimer(null);
      setTimeRemaining(0);
    }
  }, [isSharing, settings.autoStopLocationSharing, settings.locationSharingDuration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Format time remaining
  const formatTimeRemaining = () => {
    if (timeRemaining <= 0) return '00:00';
    
    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    sessionTimer,
    timeRemaining,
    formatTimeRemaining,
    stopSession,
    startSession
  };
};

export default useLocationSessionManager;



