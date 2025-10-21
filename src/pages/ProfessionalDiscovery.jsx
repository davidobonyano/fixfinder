import { useState, useEffect } from 'react';
import { FaMapMarkerAlt, FaStar, FaClock, FaPhone, FaComments, FaHeart, FaTimes, FaFilter, FaSearch, FaMap, FaTh, FaList, FaSortAmountDown } from 'react-icons/fa';
import { getProfessionals, createOrGetConversation } from '../utils/api';
import { useAuth } from '../context/useAuth';
import { useNavigate } from 'react-router-dom';
import LiveLocationMap from '../components/LiveLocationMap';

const ProfessionalDiscovery = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list', or 'map'
  const [sortBy, setSortBy] = useState('distance'); // 'distance', 'price', 'rating'
  const [savedProfessionals, setSavedProfessionals] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    service: '',
    location: '',
    priceRange: { min: 0, max: 100000 },
    rating: 0,
    verified: false
  });

  useEffect(() => {
    loadProfessionals();
    getUserLocation();
  }, []);

  // Filter and sort professionals
  const filteredAndSortedProfessionals = professionals
    .filter(professional => {
      const matchesSearch = !searchQuery || 
        professional.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        professional.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        professional.location?.address?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesService = !filters.service || 
        professional.category.toLowerCase().includes(filters.service.toLowerCase());
      
      const matchesLocation = !filters.location || 
        professional.location?.address?.toLowerCase().includes(filters.location.toLowerCase());
      
      const matchesPrice = professional.hourlyRate >= filters.priceRange.min && 
        professional.hourlyRate <= filters.priceRange.max;
      
      const matchesRating = professional.rating >= filters.rating;
      
      const matchesVerified = !filters.verified || professional.isVerified;
      
      return matchesSearch && matchesService && matchesLocation && matchesPrice && matchesRating && matchesVerified;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.hourlyRate - b.hourlyRate;
        case 'rating':
          return b.rating - a.rating;
        case 'distance':
        default:
          return (a.distance || 999) - (b.distance || 999);
      }
    });

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
          // Default to Lagos coordinates
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
          // Always calculate distance, even if userLocation is not available
          const prosWithDistance = pros.map(pro => ({
            ...pro,
            distance: userLocation ? calculateDistance(userLocation, pro.location) : 999
          }));
          
          // Sort by distance if userLocation is available
          if (userLocation) {
            prosWithDistance.sort((a, b) => a.distance - b.distance);
          }
          
          setProfessionals(prosWithDistance);
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
        }
      ];

      // Always calculate distance, even if userLocation is not available
      const prosWithDistance = fakeProfessionals.map(pro => ({
        ...pro,
        distance: userLocation ? calculateDistance(userLocation, pro.location) : 999
      }));
      
      // Sort by distance if userLocation is available
      if (userLocation) {
        prosWithDistance.sort((a, b) => a.distance - b.distance);
      }
      
      setProfessionals(prosWithDistance);
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

  const handleSave = (professional) => {
    setSavedProfessionals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(professional._id)) {
        newSet.delete(professional._id);
      } else {
        newSet.add(professional._id);
      }
      return newSet;
    });
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

  const handleCall = (professional) => {
    // For now, just show an alert. In a real app, this would initiate a call
    alert(`Calling ${professional.name}...`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Finding professionals near you...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Discover Professionals</h1>
              <p className="text-gray-600">{filteredAndSortedProfessionals.length} professionals found</p>
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
                <button
                  onClick={() => setViewMode('map')}
                  className={`p-2 rounded-md ${viewMode === 'map' ? 'bg-white shadow-sm' : ''}`}
                  title="Map View"
                >
                  <FaMap className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setShowSearchModal(true)}
                className="p-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                title="Search professionals"
              >
                <FaSearch className="w-4 h-4" />
              </button>
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
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search professionals by service or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <FaSortAmountDown className="w-4 h-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="distance">Sort by Distance</option>
                <option value="price">Sort by Price</option>
                <option value="rating">Sort by Rating</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Professionals Grid/List/Map */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {viewMode === 'map' ? (
          // Map View
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <LiveLocationMap 
              professionals={filteredAndSortedProfessionals}
              userLocation={userLocation}
              onConnect={handleConnect}
              onCall={handleCall}
              onChat={handleConnect}
            />
          </div>
        ) : filteredAndSortedProfessionals.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No professionals found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
              : "space-y-4"
          }>
            {filteredAndSortedProfessionals.map((professional) => (
              <div
                key={professional._id}
                className={`bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow ${
                  viewMode === 'list' ? 'flex items-center p-4' : 'p-6'
                }`}
              >
                {viewMode === 'grid' ? (
                  // Grid View
                  <>
                    <div className="relative mb-4">
                      <img
                        src={professional.image || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=300&fit=crop'}
                        alt={professional.name}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      {professional.isVerified && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                          ✓ Verified
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 bg-white bg-opacity-90 rounded-full px-2 py-1 flex items-center gap-1">
                        <FaMapMarkerAlt className="w-3 h-3 text-gray-600" />
                        <span className="text-xs font-medium text-gray-800">
                          {formatDistance(professional.distance)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">{professional.name}</h3>
                        <p className="text-gray-600 capitalize">{professional.category}</p>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FaStar className="w-4 h-4 text-yellow-400 mr-1" />
                          <span className="text-sm text-gray-600">{professional.rating}</span>
                        </div>
                        <span className="text-lg font-semibold text-blue-600">
                          ₦{professional.hourlyRate?.toLocaleString()}/hr
                        </span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-500">
                        <FaMapMarkerAlt className="w-3 h-3 text-gray-600 mr-1" />
                        <span className="truncate">{professional.location?.address}</span>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleConnect(professional)}
                          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          Connect
                        </button>
                        <button
                          onClick={() => handleCall(professional)}
                          className="p-2 text-gray-600 hover:text-blue-600 border border-gray-300 rounded-lg hover:border-blue-300"
                        >
                          <FaPhone className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSave(professional)}
                          className={`p-2 border rounded-lg transition-colors ${
                            savedProfessionals.has(professional._id)
                              ? 'text-red-600 border-red-300 bg-red-50'
                              : 'text-gray-600 hover:text-red-600 border-gray-300 hover:border-red-300'
                          }`}
                        >
                          <FaHeart className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  // List View
                  <>
                    <div className="relative w-20 h-20 flex-shrink-0 mr-4">
                      <img
                        src={professional.image || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face'}
                        alt={professional.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      {professional.isVerified && (
                        <div className="absolute -top-1 -right-1 bg-green-500 text-white px-1 py-0.5 rounded-full text-xs">
                          ✓
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg text-gray-900 truncate">{professional.name}</h3>
                          <p className="text-gray-600 capitalize">{professional.category}</p>
                          
                          <div className="flex items-center mt-1">
                            <FaStar className="w-4 h-4 text-yellow-400 mr-1" />
                            <span className="text-sm text-gray-600 mr-4">{professional.rating}</span>
                            <FaMapMarkerAlt className="w-3 h-3" />
                            <span className="text-sm text-gray-500 ml-1 truncate">{professional.location?.address}</span>
                          </div>
                        </div>
                        
                        <div className="text-right ml-4">
                          <div className="text-lg font-semibold text-blue-600">
                            ₦{professional.hourlyRate?.toLocaleString()}/hr
                          </div>
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleConnect(professional)}
                              className="bg-blue-600 text-white py-1 px-3 rounded text-sm hover:bg-blue-700"
                            >
                              Connect
                            </button>
                            <button
                              onClick={() => handleCall(professional)}
                              className="p-1 text-gray-600 hover:text-blue-600"
                            >
                              <FaPhone className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSave(professional)}
                              className={`p-1 transition-colors ${
                                savedProfessionals.has(professional._id)
                                  ? 'text-red-600'
                                  : 'text-gray-600 hover:text-red-600'
                              }`}
                            >
                              <FaHeart className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
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
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    onClick={() => {
                      // Apply filters logic here
                      setShowFilterModal(false);
                    }}
                    className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Search Professionals</h2>
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Search Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">What service do you need?</label>
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="e.g., Electrician, Plumber, Barber, Hair Stylist..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Popular Services */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Popular Services</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Electrician', 'Plumber', 'Hair Stylist', 'Mechanic', 'Carpenter', 'Painter', 'Makeup Artist', 'Tailor'].map((service) => (
                      <button
                        key={service}
                        onClick={() => setSearchQuery(service)}
                        className={`p-3 text-left rounded-lg border transition-colors ${
                          searchQuery === service
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {service}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <input
                    type="text"
                    placeholder="e.g., Lagos, Victoria Island, Abuja..."
                    value={filters.location}
                    onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Apply Search */}
                <div className="pt-4 border-t">
                  <button
                    onClick={() => setShowSearchModal(false)}
                    className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                  >
                    Search Professionals
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

export default ProfessionalDiscovery;
