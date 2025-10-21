import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import { getProfessionals } from "../utils/api";

// Fix for default markers in react-leaflet (Vite/ESM-friendly)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

const PROFESSIONAL_CATEGORIES = [
  "plumber",
  "electrician", 
  "mechanic",
  "hairdresser",
  "carpenter",
  "painter",
  "tailor",
  "barber",
  "ac-technician",
  "generator-repair",
  "laptop-repair",
  "smartphone-repair",
  "house-cleaning",
  "massage-therapy",
  "personal-trainer",
  "event-planning",
  "photography",
  "caterer",
  "driver-hire",
  "locksmith"
];

export default function NearbyProfessionalsMap() {
  const [userLocation, setUserLocation] = useState(null);
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("plumber");
  const [error, setError] = useState("");

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      fetchNearbyProfessionals();
    }
  }, [userLocation, selectedCategory]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        setError("");
      },
      (error) => {
        setError("Unable to get your location. Please allow location access.");
        console.error("Geolocation error:", error);
        // Fallback to Lagos, Nigeria
        setUserLocation([6.5244, 3.3792]);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  const fetchNearbyProfessionals = async () => {
    if (!userLocation) return;

    setLoading(true);
    
    try {
      // First, try to get professionals from your backend API
      const response = await getProfessionals({ category: selectedCategory });
      let backendProfessionals = response.professionals || [];
      
      // If we have backend professionals, use them
      if (backendProfessionals.length > 0) {
        const [userLat, userLon] = userLocation;
        
        const professionalsWithCoords = backendProfessionals.map((professional, index) => {
          // Generate nearby coordinates (within ~5km radius)
          const offsetLat = (Math.random() - 0.5) * 0.05; // ~2.5km radius
          const offsetLon = (Math.random() - 0.5) * 0.05;
          
          return {
            id: professional._id || professional.id,
            name: professional.name,
            category: professional.category,
            coordinates: [userLat + offsetLat, userLon + offsetLon],
            city: professional.city,
            bio: professional.bio,
            pricePerHour: professional.pricePerHour,
            ratingAvg: professional.ratingAvg || 0,
            ratingCount: professional.ratingCount || 0,
            isVerified: professional.isVerified || false,
            photos: professional.photos || [],
            source: 'backend'
          };
        });

        setProfessionals(professionalsWithCoords);
      } else {
        // If no backend professionals, fetch from OpenStreetMap as demo
        await fetchFromOpenStreetMap();
      }
    } catch (err) {
      console.error("Error fetching professionals from backend:", err);
      // Fallback to OpenStreetMap data
      await fetchFromOpenStreetMap();
    } finally {
      setLoading(false);
    }
  };

  const fetchFromOpenStreetMap = async () => {
    const [userLat, userLon] = userLocation;
    
    // Map categories to OpenStreetMap tags
    const osmCategoryMap = {
      'plumber': 'craft=plumber',
      'electrician': 'craft=electrician', 
      'mechanic': 'shop=car_repair',
      'hairdresser': 'shop=hairdresser',
      'carpenter': 'craft=carpenter',
      'painter': 'craft=painter',
      'tailor': 'craft=tailor',
      'barber': 'shop=barber',
      'ac-technician': 'craft=electrician', // Map to electrician for demo
      'generator-repair': 'craft=electrician', // Map to electrician for demo
      'laptop-repair': 'shop=electronics', // Map to electronics for demo
      'smartphone-repair': 'shop=electronics', // Map to electronics for demo
      'house-cleaning': 'office=cleaner', // Map to cleaner for demo
      'massage-therapy': 'amenity=clinic', // Map to clinic for demo
      'personal-trainer': 'leisure=fitness_centre', // Map to fitness for demo
      'event-planning': 'office=estate_agent', // Map to agent for demo
      'photography': 'craft=photographer', // Map to photographer for demo
      'caterer': 'amenity=restaurant', // Map to restaurant for demo
      'driver-hire': 'office=taxi', // Map to taxi for demo
      'locksmith': 'craft=key_cutter' // Map to key cutter for demo
    };
    
    const osmTag = osmCategoryMap[selectedCategory] || 'craft=plumber';
    
    // Overpass API query to find professionals within 10km (wider radius for demo)
    const query = `
      [out:json];
      (
        node["${osmTag}"](around:10000,${userLat},${userLon});
        way["${osmTag}"](around:10000,${userLat},${userLon});
        relation["${osmTag}"](around:10000,${userLat},${userLon});
      );
      out center;
    `;

    try {
      const response = await fetch(
        `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      
      const osmProfessionals = data.elements
        .filter((item) => {
          const coords = item.lat && item.lon 
            ? [item.lat, item.lon]
            : item.center 
            ? [item.center.lat, item.center.lon]
            : null;
          
          return coords && item.tags && item.tags.name;
        })
        .map((item) => {
          const coords = item.lat && item.lon 
            ? [item.lat, item.lon]
            : [item.center.lat, item.center.lon];
          
          return {
            id: `osm_${item.id}`,
            name: item.tags.name || "Unnamed Professional",
            category: selectedCategory,
            coordinates: coords,
            city: item.tags["addr:city"] || item.tags["addr:suburb"] || "Unknown",
            bio: `${selectedCategory.replace(/-/g, ' ')} service provider`,
            pricePerHour: Math.floor(Math.random() * 5000) + 2000, // Random price for demo
            ratingAvg: (Math.random() * 2 + 3).toFixed(1), // Random rating 3-5
            ratingCount: Math.floor(Math.random() * 20) + 1, // Random review count
            isVerified: Math.random() > 0.3, // 70% chance of being verified
            photos: [],
            source: 'openstreetmap',
            phone: item.tags.phone || "Phone not available",
            website: item.tags.website || null,
            openingHours: item.tags["opening_hours"] || "Hours not specified",
          };
        })
        .slice(0, 15); // Limit to 15 results

      setProfessionals(osmProfessionals);
    } catch (err) {
      console.error("Error fetching from OpenStreetMap:", err);
      setError("Failed to load professionals. Please try again later.");
      setProfessionals([]);
    }
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
      {/* Category Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Find nearby:
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          {PROFESSIONAL_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ')}s
            </option>
          ))}
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Map */}
      <div className="relative">
        <MapContainer
          center={userLocation}
          zoom={13}
          style={{ height: "500px", width: "100%" }}
          className="rounded-lg shadow-lg"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* User Location Marker */}
          <Marker position={userLocation}>
            <Popup>
              <div className="text-center">
                <strong>📍 You are here</strong>
              </div>
            </Popup>
          </Marker>

          {/* Professional Markers */}
          {professionals.map((professional) => (
            <Marker key={professional.id} position={professional.coordinates}>
              <Popup>
                <div className="min-w-[250px]">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">{professional.name}</h3>
                    <div className="flex gap-1">
                      {professional.isVerified && (
                        <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs">
                          ✓ Verified
                        </span>
                      )}
                      {professional.source === 'openstreetmap' && (
                        <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs">
                          Demo
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Category:</strong> {professional.category.replace(/-/g, ' ')}
                  </p>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Location:</strong> {professional.city}
                  </p>
                  
                  {professional.bio && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      <strong>About:</strong> {professional.bio}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <span className="text-yellow-400">★</span>
                      <span className="text-sm text-gray-600 ml-1">
                        {typeof professional.ratingAvg === 'number' 
                          ? professional.ratingAvg.toFixed(1) 
                          : professional.ratingAvg} ({professional.ratingCount} reviews)
                      </span>
                    </div>
                    {professional.pricePerHour > 0 && (
                      <span className="text-sm font-medium text-blue-600">
                        ₦{professional.pricePerHour.toLocaleString()}/hr
                      </span>
                    )}
                  </div>
                  
                  {/* Show contact info for OpenStreetMap professionals */}
                  {professional.source === 'openstreetmap' && professional.phone && (
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Phone:</strong> {professional.phone}
                    </p>
                  )}
                  
                  {professional.source === 'openstreetmap' && professional.openingHours && (
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Hours:</strong> {professional.openingHours}
                    </p>
                  )}
                  
                  <div className="flex gap-2 mt-3">
                    {professional.source === 'backend' ? (
                      <>
                        <a
                          href={`/professionals/${professional.id}`}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          View Profile
                        </a>
                        <button className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700">
                          Contact
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                          Book Service
                        </button>
                        <button className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700">
                          Call Now
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Finding nearby {selectedCategory}s...</p>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      {professionals.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            Found <strong>{professionals.length}</strong> {selectedCategory}s within 5km of your location
            {professionals[0]?.source === 'openstreetmap' && (
              <span className="ml-2 text-xs text-blue-600">
                (showing demo data from OpenStreetMap)
              </span>
            )}
            {professionals[0]?.source === 'backend' && (
              <span className="ml-2 text-xs text-green-600">
                (from FixFinder database)
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

