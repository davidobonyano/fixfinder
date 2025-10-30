import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  FaMapMarkerAlt, 
  FaExternalLinkAlt, 
  FaTimes,
  FaSpinner,
  FaRuler
} from 'react-icons/fa';
import { Polyline } from 'react-leaflet';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createCustomIcon = (color, isOwn = false, avatarUrl = null) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 40px;
        height: 40px;
        background: ${avatarUrl ? 'transparent' : color};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        position: relative;
        overflow: hidden;
      ">
        ${avatarUrl ? 
          `<img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />` :
          `<div style="
            color: white;
            font-size: 16px;
            font-weight: bold;
          ">${isOwn ? '👤' : '📍'}</div>`
        }
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
};

// Component to center map on locations
const CenterMapOnLocations = ({ locations, mapRef }) => {
  const map = useMap();
  
  useEffect(() => {
    if (locations.length > 0 && mapRef.current) {
      if (locations.length === 1) {
        map.setView([locations[0].lat, locations[0].lng], 15);
      } else {
        // Fit bounds to show all locations
        const group = new L.featureGroup();
        locations.forEach(location => {
          group.addLayer(L.marker([location.lat, location.lng]));
        });
        map.fitBounds(group.getBounds().pad(0.1));
      }
    }
  }, [locations, map]);

  return null;
};

const MapView = ({ 
  isOpen, 
  onClose, 
  locations = [], 
  userLocation = null,
  onStopSharing = null,
  isSharing = false,
  onStartSharing = null 
}) => {
  const mapRef = useRef();
  const [isLoading, setIsLoading] = useState(false);
  const [showTrails, setShowTrails] = useState(true);
  const trailsRef = useRef({}); // key -> [{lat,lng}]
  const lastPosRef = useRef({}); // key -> {lat,lng}

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

  const openInMaps = (lat, lng, label = '') => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    let mapsUrl;
    if (isIOS) {
      mapsUrl = `http://maps.apple.com/?q=${lat},${lng}${label ? `&ll=${lat},${lng}&t=m` : ''}`;
    } else if (isAndroid) {
      mapsUrl = `geo:${lat},${lng}?q=${lat},${lng}${label ? ` (${label})` : ''}`;
    } else {
      mapsUrl = `https://www.google.com/maps?q=${lat},${lng}${label ? ` (${label})` : ''}`;
    }
    
    window.open(mapsUrl, '_blank');
  };

  // Combine user location and unique others
  let ownId = null;
  if (userLocation && (userLocation.user?._id || userLocation._id)) {
    ownId = userLocation.user?._id || userLocation._id;
  }
  const otherLocations = (locations || []).filter(loc => (loc.userId || loc.user?._id) !== ownId);
  const allLocations = [
    userLocation && ownId ? {
      ...userLocation,
      user: {
        name: 'You',
        profilePicture: userLocation.avatarUrl || userLocation.user?.profilePicture
      },
      isOwn: true,
      userId: ownId
    } : null,
    ...otherLocations,
  ].filter(Boolean);

  // Update trails when positions change
  useEffect(() => {
    const MAX_POINTS = 60;
    const nextTrails = { ...trailsRef.current };
    const nextLast = { ...lastPosRef.current };
    allLocations.forEach((loc) => {
      const key = loc.user?._id || (loc.isOwn ? 'me' : `${loc.lat},${loc.lng}`);
      const prev = nextLast[key];
      const changed = !prev || prev.lat !== loc.lat || prev.lng !== loc.lng;
      if (changed) {
        const trail = nextTrails[key] ? [...nextTrails[key]] : [];
        trail.push({ lat: loc.lat, lng: loc.lng });
        if (trail.length > MAX_POINTS) trail.splice(0, trail.length - MAX_POINTS);
        nextTrails[key] = trail;
        nextLast[key] = { lat: loc.lat, lng: loc.lng };
      }
    });
    trailsRef.current = nextTrails;
    lastPosRef.current = nextLast;
  }, [allLocations.map(l => `${l.user?._id||'me'}:${l.lat},${l.lng}`).join('|')]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-40 flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold">Location Map</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTrails(v => !v)}
            className="px-3 py-1 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            title="Toggle movement trails"
          >
            {showTrails ? 'Hide Trails' : 'Show Trails'}
          </button>
          {!isSharing && onStartSharing && (
            <button
              onClick={onStartSharing}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Share My Location
            </button>
          )}
          {isSharing && onStopSharing && (
            <button
              onClick={onStopSharing}
              className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              Stop Sharing
            </button>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        {allLocations.length === 0 ? (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="text-center p-6">
              <FaMapMarkerAlt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Locations</h3>
              <p className="text-gray-600">
                No locations are currently being shared.
              </p>
            </div>
          </div>
        ) : (
          <MapContainer
            center={allLocations[0] ? [allLocations[0].lat, allLocations[0].lng] : [6.5244, 3.3792]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {/* Center map on locations */}
            <CenterMapOnLocations locations={allLocations} mapRef={mapRef} />

            {/* Movement Trails */}
            {showTrails && Object.entries(trailsRef.current).map(([key, points]) => (
              points && points.length > 1 ? (
                <Polyline
                  key={`trail-${key}`}
                  positions={points.map(p => [p.lat, p.lng])}
                  pathOptions={{ color: key === 'me' ? '#3B82F6' : '#10B981', weight: 3, opacity: 0.6 }}
                />
              ) : null
            ))}
            
            {/* User's location marker */}
            {userLocation && ownId && (
              <Marker
                position={[userLocation.lat, userLocation.lng]}
                icon={createCustomIcon('#3B82F6', true, userLocation.avatarUrl)}
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
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => openInMaps(userLocation.lat, userLocation.lng, 'Your Location')}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors flex items-center gap-1"
                      >
                        <FaExternalLinkAlt className="w-3 h-3" />
                        Open in Maps
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Other users' location markers */}
            {otherLocations.map((location, index) => {
              const dist = userLocation
                ? calculateDistance(userLocation.lat, userLocation.lng, location.lat, location.lng)
                : null;
              return (
                <Marker
                  key={location.userId || index}
                  position={[location.lat, location.lng]}
                  icon={createCustomIcon('#10B981', false, location.user?.profilePicture || location.user?.avatarUrl)}
                >
                  <Popup>
                    <div className="text-center">
                      <h4 className="font-semibold">{location.user?.name || 'Unknown User'}</h4>
                      {dist !== null && (
                        <p className="text-sm text-blue-600 font-medium flex items-center justify-center gap-1">
                          <FaRuler className="w-3 h-3" />
                          {dist < 1 ? `${Math.round(dist * 1000)}m away` : `${dist.toFixed(1)}km away`}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        Accuracy: {Math.round(location.accuracy)}m
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(location.timestamp).toLocaleTimeString()}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => openInMaps(location.lat, location.lng, location.user?.name)}
                          className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors flex items-center gap-1"
                        >
                          <FaExternalLinkAlt className="w-3 h-3" />
                          Open in Maps
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </div>

      {/* Location Info */}
      {allLocations.length > 0 && (
        <div className="bg-white border-t max-h-32 overflow-y-auto">
          <div className="p-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Shared Locations ({allLocations.length})
            </h4>
            <div className="space-y-2">
              {allLocations.map((location, index) => {
                const isOwn = location.isOwn;
                const dist = userLocation && !isOwn
                  ? calculateDistance(userLocation.lat, userLocation.lng, location.lat, location.lng)
                  : null;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isOwn ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      {location.user?.profilePicture
                        ? <img src={location.user.profilePicture} alt={location.user?.name||'Avatar'} className="w-8 h-8 object-cover rounded-full" />
                        : <span className={`text-sm font-semibold ${isOwn ? 'text-blue-600' : 'text-green-600'}`}>{isOwn ? '👤' : '📍'}</span>
                      }
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {isOwn ? 'You' : (location.user?.name || 'Unknown User')}
                        </p>
                        {dist !== null && !isOwn && (
                          <span className="text-xs text-blue-600 font-medium">
                            {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`} away
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(location.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <button
                      onClick={() => openInMaps(location.lat, location.lng, isOwn ? 'Your Location' : location.user?.name)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <FaExternalLinkAlt className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
