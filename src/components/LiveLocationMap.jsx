import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import { FaMapMarkerAlt, FaPhone, FaComments, FaExternalLinkAlt, FaWalking, FaCar, FaClock } from 'react-icons/fa';
import { formatAddressShort } from '../utils/locationUtils';

// Fix for default markers in react-leaflet (Vite/ESM-friendly)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

// Custom icons for different professional types
const createCustomIcon = (color, icon) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="
        background-color: ${color};
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 16px;
        font-weight: bold;
      ">
        ${icon}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
};

// Live location tracking component
const LiveLocationTracker = ({ professional, onLocationUpdate }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [lastSeen, setLastSeen] = useState(new Date());
  const intervalRef = useRef();

  useEffect(() => {
    // Simulate live location updates every 30 seconds
    intervalRef.current = setInterval(() => {
      if (isOnline) {
        // Simulate small movement (like walking/driving)
        const movement = {
          lat: professional.location.coordinates.lat + (Math.random() - 0.5) * 0.001,
          lng: professional.location.coordinates.lng + (Math.random() - 0.5) * 0.001
        };
        
        onLocationUpdate(professional._id, movement);
        setLastSeen(new Date());
      }
    }, 30000);

    return () => clearInterval(intervalRef.current);
  }, [professional._id, isOnline, onLocationUpdate]);

  // Simulate going offline/online
  useEffect(() => {
    const onlineInterval = setInterval(() => {
      setIsOnline(prev => Math.random() > 0.1); // 90% chance of staying online
    }, 120000); // Check every 2 minutes

    return () => clearInterval(onlineInterval);
  }, []);

  return null;
};

// Map component that updates when professionals move
const MapUpdater = ({ professionals }) => {
  const map = useMap();

  useEffect(() => {
    if (professionals.length > 0) {
      const bounds = L.latLngBounds(professionals.map(p => [p.location.coordinates.lat, p.location.coordinates.lng]));
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [professionals, map]);

  return null;
};

const LiveLocationMap = ({ professionals = [], userLocation, onConnect, onCall, onChat }) => {
  const [liveProfessionals, setLiveProfessionals] = useState(professionals);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [showLiveTracking, setShowLiveTracking] = useState(true);

  // Update professional location in real-time
  const handleLocationUpdate = (professionalId, newLocation) => {
    setLiveProfessionals(prev => 
      prev.map(pro => 
        pro._id === professionalId 
          ? { ...pro, location: { ...pro.location, coordinates: newLocation } }
          : pro
      )
    );
  };

  // Calculate distance and travel time
  const calculateDistance = (userLoc, proLoc) => {
    if (!userLoc || !proLoc) return { distance: 0, walkingTime: 0, drivingTime: 0 };
    
    const R = 6371; // Earth's radius in kilometers
    const dLat = (proLoc.lat - userLoc.lat) * Math.PI / 180;
    const dLon = (proLoc.lng - userLoc.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(userLoc.lat * Math.PI / 180) * Math.cos(proLoc.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return {
      distance: distance.toFixed(1),
      walkingTime: Math.round(distance * 12), // 5km/h walking speed
      drivingTime: Math.round(distance * 2.4) // 25km/h average city speed
    };
  };

  // Open in external maps
  const openInMaps = (professional) => {
    const { lat, lng } = professional.location.coordinates;
    const address = encodeURIComponent(professional.location.address);
    
    // Check if mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Try to open in native maps app
      const mapsUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=15`;
      window.open(mapsUrl, '_blank');
    } else {
      // Desktop - open Google Maps
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
      window.open(mapsUrl, '_blank');
    }
  };

  // Get category icon and color
  const getCategoryInfo = (category) => {
    const categoryMap = {
      'Electrician': { icon: '⚡', color: '#f59e0b' },
      'Plumber': { icon: '🔧', color: '#3b82f6' },
      'Carpenter': { icon: '🔨', color: '#8b5cf6' },
      'Hair Stylist': { icon: '💇', color: '#ec4899' },
      'Mechanic': { icon: '🔩', color: '#6b7280' },
      'Makeup Artist': { icon: '💄', color: '#f97316' },
      'Painter': { icon: '🎨', color: '#10b981' },
      'Tailor': { icon: '✂️', color: '#ef4444' }
    };
    
    return categoryMap[category] || { icon: '👤', color: '#6b7280' };
  };

  if (!userLocation) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Getting your location...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Map Controls */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900">Live Professional Locations</h3>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Live tracking enabled</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLiveTracking(!showLiveTracking)}
            className={`px-3 py-1 rounded-full text-sm ${
              showLiveTracking 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {showLiveTracking ? 'Live ON' : 'Live OFF'}
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="relative">
        <MapContainer
          center={[userLocation.lat, userLocation.lng]}
          zoom={13}
          style={{ height: "600px", width: "100%" }}
          className="rounded-lg shadow-lg"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* User Location Marker */}
          <Marker 
            position={[userLocation.lat, userLocation.lng]}
            icon={L.divIcon({
              className: 'user-location-marker',
              html: `
                <div style="
                  background-color: #3b82f6;
                  width: 50px;
                  height: 50px;
                  border-radius: 50%;
                  border: 4px solid white;
                  box-shadow: 0 2px 15px rgba(59, 130, 246, 0.4);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-size: 20px;
                  animation: pulse 2s infinite;
                ">
                  📍
                </div>
              `,
              iconSize: [50, 50],
              iconAnchor: [25, 25]
            })}
          >
            <Popup>
              <div className="text-center">
                <strong>📍 You are here</strong>
                <p className="text-sm text-gray-600 mt-1">Your current location</p>
              </div>
            </Popup>
          </Marker>

          {/* Professional Markers with Live Tracking */}
          {liveProfessionals.map((professional) => {
            const categoryInfo = getCategoryInfo(professional.category);
            const distanceInfo = calculateDistance(userLocation, professional.location.coordinates);
            
            return (
              <div key={professional._id}>
                {/* Live Location Tracker */}
                {showLiveTracking && (
                  <LiveLocationTracker 
                    professional={professional}
                    onLocationUpdate={handleLocationUpdate}
                  />
                )}
                
                <Marker 
                  position={[professional.location.coordinates.lat, professional.location.coordinates.lng]}
                  icon={createCustomIcon(categoryInfo.color, categoryInfo.icon)}
                >
                  <Popup>
                    <div className="min-w-[280px]">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={professional.image}
                            alt={professional.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <h3 className="font-semibold text-lg">{professional.name}</h3>
                            <p className="text-sm text-gray-600 capitalize">{professional.category}</p>
                          </div>
                        </div>
                        {professional.isVerified && (
                          <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs">
                            ✓ Verified
                          </span>
                        )}
                      </div>
                      
                      {/* Distance and Travel Time */}
                      <div className="bg-blue-50 p-3 rounded-lg mb-3">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1">
                            <FaMapMarkerAlt className="w-3 h-3 text-blue-600" />
                            <span className="font-medium">{distanceInfo.distance} km away</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <FaWalking className="w-3 h-3" />
                            <span>{distanceInfo.walkingTime} min walk</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FaCar className="w-3 h-3" />
                            <span>{distanceInfo.drivingTime} min drive</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Rating and Price */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <span className="text-yellow-400">★</span>
                          <span className="text-sm text-gray-600 ml-1">
                            {professional.rating} ({Math.floor(Math.random() * 50) + 10} reviews)
                          </span>
                        </div>
                        <span className="text-sm font-medium text-blue-600">
                          ₦{professional.hourlyRate?.toLocaleString()}/hr
                        </span>
                      </div>
                      
                      {/* Location */}
                      <div className="text-sm text-gray-600 mb-3">
                        <FaMapMarkerAlt className="w-3 h-3 inline mr-1" />
                        {formatAddressShort(professional.location.address)}
                      </div>
                      
                      {/* Live Status */}
                      {showLiveTracking && (
                        <div className="flex items-center gap-2 mb-3 text-xs">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-green-600">Live location active</span>
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => onConnect(professional)}
                          className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 flex items-center justify-center gap-1"
                        >
                          <FaComments className="w-3 h-3" />
                          Connect
                        </button>
                        <button
                          onClick={() => onCall(professional)}
                          className="p-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          <FaPhone className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => openInMaps(professional)}
                          className="p-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                          title="Open in Maps"
                        >
                          <FaExternalLinkAlt className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </div>
            );
          })}
          
          <MapUpdater professionals={liveProfessionals} />
        </MapContainer>

        {/* Map Legend */}
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 text-xs">
          <div className="font-semibold mb-2">Legend</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Your Location</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live Professional</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <span>Offline Professional</span>
            </div>
          </div>
        </div>
      </div>

      {/* Professional List Summary */}
      {liveProfessionals.length > 0 && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-800">
                <strong>{liveProfessionals.length}</strong> professionals nearby
                {showLiveTracking && (
                  <span className="ml-2 text-xs text-green-600">
                    • Live tracking active
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-600">
              <FaClock className="w-3 h-3" />
              <span>Updates every 30s</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveLocationMap;
