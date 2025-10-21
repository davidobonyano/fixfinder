import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import { FaMapMarkerAlt, FaStar, FaClock, FaPhone, FaComments, FaExternalLinkAlt } from 'react-icons/fa';

// Fix for default markers in react-leaflet (Vite/ESM-friendly)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

// Dummy professionals data for services page
const DUMMY_PROFESSIONALS = [
  {
    _id: '1',
    name: 'John Electrician',
    category: 'Electrician',
    rating: 4.8,
    hourlyRate: 2500,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    location: {
      address: 'Victoria Island, Lagos',
      coordinates: { lat: 6.4281, lng: 3.4219 }
    },
    isVerified: true,
    user: { _id: 'user1' }
  },
  {
    _id: '2',
    name: 'Sarah Plumber',
    category: 'Plumber',
    rating: 4.9,
    hourlyRate: 2000,
    image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
    location: {
      address: 'Ikoyi, Lagos',
      coordinates: { lat: 6.4474, lng: 3.4203 }
    },
    isVerified: true,
    user: { _id: 'user2' }
  },
  {
    _id: '3',
    name: 'Mike Carpenter',
    category: 'Carpenter',
    rating: 4.7,
    hourlyRate: 3000,
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
    location: {
      address: 'Surulere, Lagos',
      coordinates: { lat: 6.4995, lng: 3.3550 }
    },
    isVerified: false,
    user: { _id: 'user3' }
  },
  {
    _id: '4',
    name: 'Grace Hair Stylist',
    category: 'Hair Stylist',
    rating: 4.9,
    hourlyRate: 1500,
    image: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&h=400&fit=crop&crop=face',
    location: {
      address: 'Lekki, Lagos',
      coordinates: { lat: 6.4654, lng: 3.5653 }
    },
    isVerified: true,
    user: { _id: 'user4' }
  },
  {
    _id: '5',
    name: 'David Mechanic',
    category: 'Mechanic',
    rating: 4.6,
    hourlyRate: 4000,
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
    location: {
      address: 'Apapa, Lagos',
      coordinates: { lat: 6.4488, lng: 3.3596 }
    },
    isVerified: true,
    user: { _id: 'user5' }
  },
  {
    _id: '6',
    name: 'Lisa Makeup Artist',
    category: 'Makeup Artist',
    rating: 4.8,
    hourlyRate: 5000,
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=400&fit=crop&crop=face',
    location: {
      address: 'Garki, Abuja',
      coordinates: { lat: 9.0765, lng: 7.3986 }
    },
    isVerified: true,
    user: { _id: 'user6' }
  },
  {
    _id: '7',
    name: 'James Painter',
    category: 'Painter',
    rating: 4.5,
    hourlyRate: 1800,
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face',
    location: {
      address: 'Yaba, Lagos',
      coordinates: { lat: 6.5031, lng: 3.3803 }
    },
    isVerified: false,
    user: { _id: 'user7' }
  },
  {
    _id: '8',
    name: 'Maria Tailor',
    category: 'Tailor',
    rating: 4.7,
    hourlyRate: 1200,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&crop=face',
    location: {
      address: 'Port Harcourt',
      coordinates: { lat: 4.8156, lng: 7.0498 }
    },
    isVerified: true,
    user: { _id: 'user8' }
  },
  {
    _id: '9',
    name: 'Alex AC Technician',
    category: 'AC Technician',
    rating: 4.6,
    hourlyRate: 3500,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    location: {
      address: 'Maitama, Abuja',
      coordinates: { lat: 9.0833, lng: 7.4833 }
    },
    isVerified: true,
    user: { _id: 'user9' }
  },
  {
    _id: '10',
    name: 'Emma Cleaner',
    category: 'House Cleaner',
    rating: 4.8,
    hourlyRate: 2000,
    image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
    location: {
      address: 'Asokoro, Abuja',
      coordinates: { lat: 9.0500, lng: 7.5167 }
    },
    isVerified: true,
    user: { _id: 'user10' }
  },
  {
    _id: '11',
    name: 'Peter Barber',
    category: 'Barber',
    rating: 4.7,
    hourlyRate: 1200,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    location: {
      address: 'Ikeja, Lagos',
      coordinates: { lat: 6.6018, lng: 3.3515 }
    },
    isVerified: true,
    user: { _id: 'user11' }
  },
  {
    _id: '12',
    name: 'Ruth Massage Therapist',
    category: 'Massage Therapist',
    rating: 4.9,
    hourlyRate: 4000,
    image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
    location: {
      address: 'Banana Island, Lagos',
      coordinates: { lat: 6.4333, lng: 3.4167 }
    },
    isVerified: true,
    user: { _id: 'user12' }
  },
  {
    _id: '13',
    name: 'Tony Locksmith',
    category: 'Locksmith',
    rating: 4.6,
    hourlyRate: 3000,
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
    location: {
      address: 'Gwarinpa, Abuja',
      coordinates: { lat: 9.1000, lng: 7.4500 }
    },
    isVerified: true,
    user: { _id: 'user13' }
  },
  {
    _id: '14',
    name: 'Blessing Event Planner',
    category: 'Event Planner',
    rating: 4.8,
    hourlyRate: 5000,
    image: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&h=400&fit=crop&crop=face',
    location: {
      address: 'Wuse 2, Abuja',
      coordinates: { lat: 9.0667, lng: 7.4833 }
    },
    isVerified: true,
    user: { _id: 'user14' }
  },
  {
    _id: '15',
    name: 'Chinedu Photographer',
    category: 'Photographer',
    rating: 4.7,
    hourlyRate: 6000,
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
    location: {
      address: 'Ajah, Lagos',
      coordinates: { lat: 6.4667, lng: 3.5833 }
    },
    isVerified: true,
    user: { _id: 'user15' }
  },
  {
    _id: '16',
    name: 'Funmi Caterer',
    category: 'Caterer',
    rating: 4.9,
    hourlyRate: 2500,
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=400&fit=crop&crop=face',
    location: {
      address: 'Kaduna',
      coordinates: { lat: 10.5200, lng: 7.4383 }
    },
    isVerified: true,
    user: { _id: 'user16' }
  },
  {
    _id: '17',
    name: 'Ibrahim Driver',
    category: 'Driver',
    rating: 4.5,
    hourlyRate: 2000,
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face',
    location: {
      address: 'Kano',
      coordinates: { lat: 12.0000, lng: 8.5167 }
    },
    isVerified: false,
    user: { _id: 'user17' }
  },
  {
    _id: '18',
    name: 'Aisha Personal Trainer',
    category: 'Personal Trainer',
    rating: 4.8,
    hourlyRate: 4000,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&crop=face',
    location: {
      address: 'Jos',
      coordinates: { lat: 9.9167, lng: 8.9000 }
    },
    isVerified: true,
    user: { _id: 'user18' }
  },
  {
    _id: '19',
    name: 'Emmanuel Generator Repair',
    category: 'Generator Repair',
    rating: 4.6,
    hourlyRate: 3500,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    location: {
      address: 'Enugu',
      coordinates: { lat: 6.4500, lng: 7.5167 }
    },
    isVerified: true,
    user: { _id: 'user19' }
  },
  {
    _id: '20',
    name: 'Patience Laptop Repair',
    category: 'Laptop Repair',
    rating: 4.7,
    hourlyRate: 3000,
    image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
    location: {
      address: 'Ibadan',
      coordinates: { lat: 7.4000, lng: 3.9167 }
    },
    isVerified: true,
    user: { _id: 'user20' }
  },
  {
    _id: '21',
    name: 'Kemi Smartphone Repair',
    category: 'Smartphone Repair',
    rating: 4.5,
    hourlyRate: 2500,
    image: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&h=400&fit=crop&crop=face',
    location: {
      address: 'Abeokuta',
      coordinates: { lat: 7.1500, lng: 3.3500 }
    },
    isVerified: false,
    user: { _id: 'user21' }
  },
  {
    _id: '22',
    name: 'Segun House Cleaning',
    category: 'House Cleaning',
    rating: 4.8,
    hourlyRate: 1500,
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
    location: {
      address: 'Owerri',
      coordinates: { lat: 5.4833, lng: 7.0333 }
    },
    isVerified: true,
    user: { _id: 'user22' }
  },
  {
    _id: '23',
    name: 'Ngozi Nail Technician',
    category: 'Nail Technician',
    rating: 4.9,
    hourlyRate: 2000,
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
    location: {
      address: 'Uyo',
      coordinates: { lat: 5.0500, lng: 7.9333 }
    },
    isVerified: true,
    user: { _id: 'user23' }
  },
  {
    _id: '24',
    name: 'Bola Interior Designer',
    category: 'Interior Designer',
    rating: 4.7,
    hourlyRate: 5000,
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=400&fit=crop&crop=face',
    location: {
      address: 'Calabar',
      coordinates: { lat: 4.9500, lng: 8.3167 }
    },
    isVerified: true,
    user: { _id: 'user24' }
  }
];

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
    'Tailor': { icon: '✂️', color: '#ef4444' },
    'AC Technician': { icon: '❄️', color: '#06b6d4' },
    'House Cleaner': { icon: '🧹', color: '#84cc16' },
    'Barber': { icon: '💇‍♂️', color: '#8b5cf6' },
    'Massage Therapist': { icon: '💆', color: '#f59e0b' },
    'Locksmith': { icon: '🔐', color: '#6b7280' },
    'Event Planner': { icon: '🎉', color: '#ec4899' },
    'Photographer': { icon: '📸', color: '#3b82f6' },
    'Caterer': { icon: '🍽️', color: '#f97316' },
    'Driver': { icon: '🚗', color: '#10b981' },
    'Personal Trainer': { icon: '💪', color: '#ef4444' },
    'Generator Repair': { icon: '⚙️', color: '#6b7280' },
    'Laptop Repair': { icon: '💻', color: '#3b82f6' },
    'Smartphone Repair': { icon: '📱', color: '#8b5cf6' },
    'House Cleaning': { icon: '🧽', color: '#84cc16' },
    'Nail Technician': { icon: '💅', color: '#ec4899' },
    'Interior Designer': { icon: '🏠', color: '#f59e0b' }
  };
  
  return categoryMap[category] || { icon: '👤', color: '#6b7280' };
};

const ServicesMap = () => {
  const [professionals, setProfessionals] = useState(DUMMY_PROFESSIONALS);
  const [mapCenter] = useState([6.5244, 3.3792]); // Lagos center

  // Open in external maps
  const openInMaps = (professional) => {
    const { lat, lng } = professional.location.coordinates;
    
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

  return (
    <div className="w-full">
      {/* Map Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Professional Services Map</h3>
        <p className="text-sm text-gray-600">
          Explore 20+ verified professionals across Nigeria
        </p>
      </div>

      {/* Map */}
      <div className="relative">
        <MapContainer
          center={mapCenter}
          zoom={6}
          style={{ height: "500px", width: "100%" }}
          className="rounded-lg shadow-lg"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Professional Markers */}
          {professionals.map((professional) => {
            const categoryInfo = getCategoryInfo(professional.category);
            
            return (
              <Marker 
                key={professional._id}
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
                      {professional.location.address}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          // Redirect to category professionals page
                          window.location.href = `/services/${professional.category.toLowerCase()}`;
                        }}
                        className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 flex items-center justify-center gap-1"
                      >
                        <FaComments className="w-3 h-3" />
                        View {professional.category}s
                      </button>
                      <button
                        onClick={() => {
                          // Redirect to category professionals page
                          window.location.href = `/services/${professional.category.toLowerCase()}`;
                        }}
                        className="p-2 bg-green-600 text-white rounded hover:bg-green-700"
                        title="Browse Professionals"
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
            );
          })}
        </MapContainer>

        {/* Map Legend */}
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 text-xs">
          <div className="font-semibold mb-2">Service Types</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Electrician</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Plumber</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span>Carpenter</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
              <span>Hair Stylist</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <span>Other Services</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ServicesMap;
