import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  FaMapMarkerAlt, 
  FaUser, 
  FaLocationArrow, 
  FaCrosshairs,
  FaEye,
  FaEyeSlash,
  FaSpinner
} from 'react-icons/fa';
import { useAuth } from '../context/useAuth';
import { useSocket } from '../context/SocketContext';
import { getConnections } from '../utils/api';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createCustomIcon = (color, isOnline) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 40px;
        height: 40px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        position: relative;
      ">
        <div style="
          color: white;
          font-size: 16px;
          font-weight: bold;
        ">👤</div>
        ${isOnline ? `
          <div style="
            position: absolute;
            bottom: -2px;
            right: -2px;
            width: 12px;
            height: 12px;
            background: #10B981;
            border: 2px solid white;
            border-radius: 50%;
          "></div>
        ` : ''}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
};

// Component to center map on user location
const CenterMapOnUser = ({ userLocation, mapRef }) => {
  const map = useMap();
  
  useEffect(() => {
    if (userLocation && mapRef.current) {
      map.setView([userLocation.latitude, userLocation.longitude], 15);
    }
  }, [userLocation, map]);

  return null;
};

const FriendsMap = ({ isOpen, onClose, conversations = [] }) => {
  const { user } = useAuth();
  const { socket, isConnected, emit, on, off } = useSocket();
  const mapRef = useRef();
  
  const [userLocation, setUserLocation] = useState(null);
  const [friendsLocations, setFriendsLocations] = useState({});
  const [showMyLocation, setShowMyLocation] = useState(true);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationPermission, setLocationPermission] = useState(null);
  const [connections, setConnections] = useState([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [showOnlyFriends, setShowOnlyFriends] = useState(false);

  // Get user's current location
  const getUserLocation = async () => {
    if (!navigator.geolocation) {
      setLocationPermission('denied');
      return;
    }

    setIsLoadingLocation(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        });
      });

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date().toISOString()
      };

      setUserLocation(location);
      setLocationPermission('granted');
      
      // Share location with connected friends
      if (socket && isConnected) {
        emit('shareLocation', {
          userId: user?.id,
          location,
          isSharing: true
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationPermission('denied');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Request location permission and get location
  const requestLocationAccess = async () => {
    if (locationPermission === 'granted') {
      getUserLocation();
      return;
    }

    try {
      await getUserLocation();
    } catch (error) {
      console.error('Location access denied:', error);
    }
  };

  // Socket listeners for real-time location updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleLocationUpdate = (data) => {
      if (data.userId !== user?.id) {
        setFriendsLocations(prev => ({
          ...prev,
          [data.userId]: {
            ...data.location,
            user: data.user,
            isOnline: data.isOnline,
            lastSeen: data.timestamp
          }
        }));
      }
    };

    const handleLocationStop = (data) => {
      setFriendsLocations(prev => {
        const updated = { ...prev };
        delete updated[data.userId];
        return updated;
      });
    };

    on('locationUpdate', handleLocationUpdate);
    on('locationStop', handleLocationStop);

    return () => {
      off('locationUpdate', handleLocationUpdate);
      off('locationStop', handleLocationStop);
    };
  }, [socket, isConnected, user?.id, on, off]);

  // Load connections when map opens
  const loadConnections = async () => {
    try {
      setLoadingConnections(true);
      const response = await getConnections();
      if (response.success) {
        setConnections(response.data || []);
      }
    } catch (error) {
      console.error('Error loading connections:', error);
    } finally {
      setLoadingConnections(false);
    }
  };

  // Get initial location when map opens
  useEffect(() => {
    if (isOpen) {
      if (!userLocation) {
        requestLocationAccess();
      }
      loadConnections();
    }
  }, [isOpen]);

  // Get friends from conversations and connections
  const getFriendsFromConversations = () => {
    const friends = [];
    const friendIds = new Set();
    
    // Add friends from connections (these are your actual friends)
    connections.forEach(conn => {
      const friend = conn.requester._id === user?.id ? conn.professional : conn.requester;
      if (friend && !friendIds.has(friend._id)) {
        friends.push({
          id: friend._id,
          name: friend.name || friend.user?.name,
          email: friend.email || friend.user?.email,
          userType: friend.role || 'professional',
          connectionId: conn._id,
          source: 'connection',
          isFriend: true
        });
        friendIds.add(friend._id);
      }
    });
    
    // Add chat partners from conversations (these are people you're chatting with)
    conversations.forEach(conv => {
      const otherParticipant = conv.participants.find(p => p.user._id !== user?.id);
      if (otherParticipant && !friendIds.has(otherParticipant.user._id)) {
        friends.push({
          id: otherParticipant.user._id,
          name: otherParticipant.user.name,
          email: otherParticipant.user.email,
          userType: otherParticipant.userType,
          conversationId: conv._id,
          source: 'conversation',
          isFriend: false
        });
        friendIds.add(otherParticipant.user._id);
      }
    });
    
    return friends;
  };

  // Calculate distance between two points
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  };

  const allFriends = getFriendsFromConversations();
  const friends = showOnlyFriends ? allFriends.filter(f => f.isFriend) : allFriends;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:text-gray-800"
          >
            ✕
          </button>
          <h2 className="text-lg font-semibold">Friends Map</h2>
          
          {/* Show Only Friends Toggle */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-600">Friends only</span>
            <button
              onClick={() => setShowOnlyFriends(!showOnlyFriends)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                showOnlyFriends ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  showOnlyFriends ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMyLocation(!showMyLocation)}
            className={`p-2 rounded-lg transition-colors ${
              showMyLocation ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
            }`}
            title={showMyLocation ? 'Hide my location' : 'Show my location'}
          >
            {showMyLocation ? <FaEye className="w-4 h-4" /> : <FaEyeSlash className="w-4 h-4" />}
          </button>
          
          <button
            onClick={getUserLocation}
            disabled={isLoadingLocation}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            title="Update my location"
          >
            {isLoadingLocation ? (
              <FaSpinner className="w-4 h-4 animate-spin" />
            ) : (
              <FaCrosshairs className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        {locationPermission === 'denied' ? (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="text-center p-6">
              <FaMapMarkerAlt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Location Access Required</h3>
              <p className="text-gray-600 mb-4">
                To see your friends on the map, please allow location access.
              </p>
              <button
                onClick={requestLocationAccess}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Allow Location Access
              </button>
            </div>
          </div>
        ) : (
          <MapContainer
            center={userLocation ? [userLocation.latitude, userLocation.longitude] : [6.5244, 3.3792]} // Default to Lagos
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {/* Center map on user location */}
            <CenterMapOnUser userLocation={userLocation} mapRef={mapRef} />
            
            {/* User's location marker */}
            {userLocation && showMyLocation && (
              <Marker
                position={[userLocation.latitude, userLocation.longitude]}
                icon={createCustomIcon('#3B82F6', true)}
              >
                <Popup>
                  <div className="text-center">
                    <h4 className="font-semibold">You are here</h4>
                    <p className="text-sm text-gray-600">
                      Accuracy: {Math.round(userLocation.accuracy)}m
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(userLocation.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}
            
            {/* Friends' location markers */}
            {Object.entries(friendsLocations).map(([friendId, location]) => {
              const friend = friends.find(f => f.id === friendId);
              if (!friend) return null;
              
              // Calculate distance if user location is available
              const distance = userLocation ? 
                calculateDistance(
                  userLocation.latitude, 
                  userLocation.longitude, 
                  location.latitude, 
                  location.longitude
                ) : null;
              
              return (
                <Marker
                  key={friendId}
                  position={[location.latitude, location.longitude]}
                  icon={createCustomIcon('#10B981', location.isOnline)}
                >
                  <Popup>
                    <div className="text-center">
                      <h4 className="font-semibold">{friend.name}</h4>
                      <p className="text-sm text-gray-600 capitalize">{friend.userType}</p>
                      {distance && (
                        <p className="text-sm text-blue-600 font-medium">
                          {distance < 1 ? `${Math.round(distance * 1000)}m away` : `${distance.toFixed(1)}km away`}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {location.isOnline ? 'Online' : `Last seen ${new Date(location.lastSeen).toLocaleTimeString()}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        Accuracy: {Math.round(location.accuracy)}m
                      </p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </div>

      {/* Friends List */}
      <div className="bg-white border-t max-h-32 overflow-y-auto">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900">Friends ({friends.length})</h4>
            {loadingConnections && (
              <FaSpinner className="w-4 h-4 animate-spin text-gray-400" />
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {friends.map(friend => {
              const location = friendsLocations[friend.id];
              const distance = userLocation && location ? 
                calculateDistance(
                  userLocation.latitude, 
                  userLocation.longitude, 
                  location.latitude, 
                  location.longitude
                ) : null;
              
              return (
                <div
                  key={friend.id}
                  className="flex-shrink-0 flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                >
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-gray-600">
                      {friend.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-medium">{friend.name}</p>
                      <span className={`text-xs px-1 py-0.5 rounded ${
                        friend.isFriend 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'bg-green-100 text-green-600'
                      }`}>
                        {friend.isFriend ? 'Friend' : 'Chat'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`inline-block w-2 h-2 rounded-full ${
                        location ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                      <span className="text-xs text-gray-500">
                        {location && distance ? 
                          `${distance < 1 ? Math.round(distance * 1000) + 'm' : distance.toFixed(1) + 'km'} away` : 
                          'Not sharing'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FriendsMap;
