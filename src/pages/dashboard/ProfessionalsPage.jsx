import { useState, useEffect } from 'react';
import { FaMapMarkerAlt, FaStar, FaClock, FaPhone, FaComments, FaHeart, FaFilter, FaSearch, FaTh, FaList, FaTimes } from 'react-icons/fa';
import { getProfessionals, createOrGetConversation } from '../../utils/api';
import { useAuth } from '../../context/useAuth';
import { useNavigate } from 'react-router-dom';

const ProfessionalsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [filters, setFilters] = useState({
    service: '',
    location: '',
    priceRange: { min: 0, max: 100000 },
    rating: 0,
    availability: 'all'
  });
  const [savedProfessionals, setSavedProfessionals] = useState(new Set());

  useEffect(() => {
    loadProfessionals();
    getUserLocation();
  }, []);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Location access denied:', error);
          setUserLocation({ lat: 6.5244, lng: 3.3792 });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setUserLocation({ lat: 6.5244, lng: 3.3792 });
    }
  };

  const loadProfessionals = async () => {
    try {
      setLoading(true);
      
      // Try to get real professionals first
      try {
        const response = await getProfessionals({ limit: 50 });
        if (response.success && response.professionals && response.professionals.length > 0) {
          const pros = response.professionals;
          if (userLocation) {
            const prosWithDistance = pros.map(pro => ({
              ...pro,
              distance: calculateDistance(userLocation, pro.location)
            })).sort((a, b) => a.distance - b.distance);
            setProfessionals(prosWithDistance);
          } else {
            setProfessionals(pros);
          }
          return;
        }
      } catch (apiError) {
        console.log('API failed, using fake data:', apiError);
      }

      // Fallback to fake professionals data
      const fakeProfessionals = [
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
          isVerified: true
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
          isVerified: true
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
          isVerified: false
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
          isVerified: true
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
          isVerified: true
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
          isVerified: true
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
          isVerified: false
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
          isVerified: true
        }
      ];

      if (userLocation) {
        const prosWithDistance = fakeProfessionals.map(pro => ({
          ...pro,
          distance: calculateDistance(userLocation, pro.location)
        })).sort((a, b) => a.distance - b.distance);
        setProfessionals(prosWithDistance);
      } else {
        setProfessionals(fakeProfessionals);
      }
    } catch (error) {
      console.error('Error loading professionals:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (userLoc, proLoc) => {
    if (!userLoc || !proLoc?.coordinates) return 999;
    
    const R = 6371; // Earth's radius in kilometers
    const dLat = (proLoc.coordinates.lat - userLoc.lat) * Math.PI / 180;
    const dLng = (proLoc.coordinates.lng - userLoc.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(userLoc.lat * Math.PI / 180) * Math.cos(proLoc.coordinates.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const formatDistance = (distance) => {
    if (!distance || distance === undefined) return 'Distance unknown';
    if (distance < 1) return `${Math.round(distance * 1000)}m away`;
    return `${distance.toFixed(1)}km away`;
  };

  const handleConnect = async (professional) => {
    try {
      const response = await createOrGetConversation({
        otherUserId: professional.user._id,
        jobId: null
      });
      
      if (response.success) {
        navigate(`/dashboard/messages/${response.data._id}`);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleSave = (professionalId) => {
    setSavedProfessionals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(professionalId)) {
        newSet.delete(professionalId);
      } else {
        newSet.add(professionalId);
      }
      return newSet;
    });
  };

  const filteredProfessionals = professionals.filter(pro => {
    const matchesService = !filters.service || 
      pro.category?.toLowerCase().includes(filters.service.toLowerCase());
    const matchesLocation = !filters.location || 
      pro.location?.address?.toLowerCase().includes(filters.location.toLowerCase());
    const matchesRating = pro.rating >= filters.rating;
    const matchesPrice = pro.hourlyRate >= filters.priceRange.min && 
      pro.hourlyRate <= filters.priceRange.max;
    
    return matchesService && matchesLocation && matchesRating && matchesPrice;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading professionals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Professionals</h1>
              <p className="text-gray-600">{filteredProfessionals.length} professionals found</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                  title="Grid View"
                >
                  <FaTh className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
                  title="List View"
                >
                  <FaList className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setShowFilterModal(true)}
                className="p-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                title="Filter professionals"
              >
                <FaFilter className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search professionals by service or location..."
              value={filters.service}
              onChange={(e) => setFilters(prev => ({ ...prev, service: e.target.value }))}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Professionals Grid/List */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProfessionals.map((professional) => (
              <div key={professional._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative">
                  <img
                    src={professional.image || '/images/placeholder.jpeg'}
                    alt={professional.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button
                      onClick={() => handleSave(professional._id)}
                      className={`p-2 rounded-full ${
                        savedProfessionals.has(professional._id)
                          ? 'bg-red-500 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <FaHeart className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="absolute bottom-3 left-3 bg-white bg-opacity-90 rounded-full px-3 py-1 flex items-center gap-1">
                    <FaMapMarkerAlt className="w-3 h-3 text-gray-600" />
                    <span className="text-sm font-medium text-gray-800">
                      {formatDistance(professional.distance)}
                    </span>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{professional.name}</h3>
                    <div className="flex items-center gap-1">
                      <FaStar className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-medium text-gray-700">
                        {professional.rating || '4.5'}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-2">{professional.category}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-1">
                      <FaClock className="w-3 h-3" />
                      <span>Available now</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-green-600">
                        ₦{professional.hourlyRate || '2,000'}/hr
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConnect(professional)}
                      className="flex-1 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
                    >
                      <FaComments className="w-4 h-4" />
                      Connect
                    </button>
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                      <FaPhone className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProfessionals.map((professional) => (
              <div key={professional._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <img
                    src={professional.image || '/images/placeholder.jpeg'}
                    alt={professional.name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{professional.name}</h3>
                        <p className="text-gray-600">{professional.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <FaStar className="w-4 h-4 text-yellow-400" />
                          <span className="text-sm font-medium text-gray-700">
                            {professional.rating || '4.5'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleSave(professional._id)}
                          className={`p-2 rounded-full ${
                            savedProfessionals.has(professional._id)
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <FaHeart className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-500 mb-4">
                      <div className="flex items-center gap-1">
                        <FaMapMarkerAlt className="w-3 h-3" />
                        <span>{formatDistance(professional.distance)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FaClock className="w-3 h-3" />
                        <span>Available now</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-green-600">
                          ₦{professional.hourlyRate || '2,000'}/hr
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleConnect(professional)}
                        className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                      >
                        <FaComments className="w-4 h-4" />
                        Connect
                      </button>
                      <button className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                        <FaPhone className="w-4 h-4" />
                        Call
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
          <div className="bg-white rounded-t-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Filter Professionals</h2>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Service Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service</label>
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="e.g., Electrician, Plumber, Barber"
                      value={filters.service}
                      onChange={(e) => setFilters(prev => ({ ...prev, service: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <input
                    type="text"
                    placeholder="e.g., Lagos, Victoria Island"
                    value={filters.location}
                    onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price Range (₦/hr)</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.priceRange.min}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        priceRange: { ...prev.priceRange, min: parseInt(e.target.value) || 0 }
                      }))}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.priceRange.max}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        priceRange: { ...prev.priceRange, max: parseInt(e.target.value) || 100000 }
                      }))}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                    />
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Rating</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setFilters(prev => ({ ...prev, rating: star }))}
                        className={`p-2 rounded-lg ${
                          filters.rating >= star 
                            ? 'bg-yellow-100 text-yellow-600' 
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        <FaStar className="w-5 h-5" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Apply Filters */}
                <div className="pt-4 border-t">
                  <button
                    onClick={() => setShowFilterModal(false)}
                    className="w-full py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 font-medium"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalsPage;
