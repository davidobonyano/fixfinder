import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/useAuth';

const LocationSharingTest = () => {
  const { socket, isConnected, emit, on, off } = useSocket();
  const { user } = useAuth();
  const [sharedLocations, setSharedLocations] = useState([]);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleLocationShared = (data) => {
      console.log('🎯 Location shared received:', data);
      setSharedLocations(prev => [...prev, {
        ...data.coordinates,
        user: data.user,
        userId: data.senderId,
        timestamp: data.timestamp
      }]);
    };

    const handleLocationSharingStarted = (data) => {
      console.log('🎯 Location sharing started for sender:', data);
      // This is confirmation that the sender is now sharing
      // Don't add to sharedLocations, just show confirmation
    };

    const handleLocationUpdated = (data) => {
      console.log('Location updated:', data);
      setSharedLocations(prev => prev.map(loc => 
        loc.userId === data.userId 
          ? { ...loc, lat: data.lat, lng: data.lng, timestamp: data.timestamp }
          : loc
      ));
    };

    // Debug: Log all socket events
    const handleAnyEvent = (data) => {
      console.log('Socket event received:', data);
    };

    const handleTestResponse = (data) => {
      console.log('Test response received:', data);
    };

    on('locationShared', handleLocationShared);
    on('locationSharingStarted', handleLocationSharingStarted);
    on('locationUpdated', handleLocationUpdated);
    on('test_response', handleTestResponse);

    return () => {
      off('locationShared', handleLocationShared);
      off('locationSharingStarted', handleLocationSharingStarted);
      off('locationUpdated', handleLocationUpdated);
      off('test_response', handleTestResponse);
    };
  }, [socket, isConnected, on, off]);

  const shareLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      return;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        });
      });

      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      };

      // Test basic socket emit first
      if (socket && isConnected) {
        console.log('🚀 Emitting shareLocation event...');
        const eventData = {
          senderId: user?.id,
          receiverId: '68f4c31c604c44156168dce3', // Simulate a different user/professional
          conversationId: 'test-conversation-123', // Simulate conversation ID
          coordinates: {
            lat: location.lat,
            lng: location.lng
          }
        };
        console.log('📤 Event data:', eventData);
        emit('shareLocation', eventData);
        
        // Also test a simple event
        emit('test_event', { message: 'Hello from client' });
      } else {
        console.log('Socket not connected:', { socket: !!socket, isConnected });
      }

      setIsSharing(true);
      console.log('Location shared:', location);
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Error getting location: ' + error.message);
    }
  };

  const stopSharing = () => {
    if (socket && isConnected) {
      emit('stopLocationShare', {
        userId: user?.id,
        chatRoom: 'test-chat-room'
      });
    }
    setIsSharing(false);
    setSharedLocations([]);
  };

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Location Sharing Test</h3>
      
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              if (socket && isConnected) {
                emit('test_event', { message: 'Test from button' });
              }
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Test Socket
          </button>
          
          <button
            onClick={shareLocation}
            disabled={isSharing}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isSharing ? 'Sharing...' : 'Share Location'}
          </button>
          
          <button
            onClick={stopSharing}
            disabled={!isSharing}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            Stop Sharing
          </button>
        </div>

        <div>
          <h4 className="font-medium mb-2">Shared Locations ({sharedLocations.length})</h4>
          {sharedLocations.length === 0 ? (
            <p className="text-gray-500">No locations shared yet</p>
          ) : (
            <div className="space-y-2">
              {sharedLocations.map((location, index) => (
                <div key={index} className="p-2 bg-white rounded border">
                  <p><strong>User:</strong> {location.user?.name || 'Unknown'}</p>
                  <p><strong>Location:</strong> {location.lat.toFixed(6)}, {location.lng.toFixed(6)}</p>
                  <p><strong>Accuracy:</strong> {Math.round(location.accuracy)}m</p>
                  <p><strong>Time:</strong> {new Date(location.timestamp).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4 className="font-medium mb-2">Socket Status</h4>
          <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
          <p>User ID: {user?.id || 'Not logged in'}</p>
        </div>
      </div>
    </div>
  );
};

export default LocationSharingTest;
