import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaStar, FaClock, FaPhone, FaComments, FaHeart, FaFilter, FaSearch, FaTh, FaList, FaTimes, FaUser } from 'react-icons/fa';
import { getProfessionals, sendConnectionRequest, getConnectionRequests, getConnections, removeConnection, cancelConnectionRequest, createOrGetConversation } from '../../utils/api';
import { useAuth } from '../../context/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import ServiceSelector from '../../components/ServiceSelector';

const ProfessionalsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error } = useToast();
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
  const [connectionRequests, setConnectionRequests] = useState(new Set());
  const [connections, setConnections] = useState(new Map()); // Map of professionalId -> connectionId
  const [showUnfriendModal, setShowUnfriendModal] = useState(false);
  const [professionalToUnfriend, setProfessionalToUnfriend] = useState(null);

  useEffect(() => {
    loadProfessionals();
    getUserLocation();
    checkExistingConnectionRequests();
    checkExistingConnections();
  }, []);

  // Refresh connection status when user changes
  useEffect(() => {
    if (user) {
      checkExistingConnectionRequests();
      checkExistingConnections();
    }
  }, [user]);

  // Refresh connections when page regains focus or becomes visible
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        console.log('🔄 ProfessionalsPage focused - refreshing connections');
        checkExistingConnectionRequests();
        checkExistingConnections();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        console.log('🔄 ProfessionalsPage became visible - refreshing connections');
        checkExistingConnectionRequests();
        checkExistingConnections();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Check existing connection requests
  const checkExistingConnectionRequests = async () => {
    if (!user) return;
    
    try {
      console.log('🔍 Checking existing connection requests for user:', user.id);
      const response = await getConnectionRequests();
      console.log('📡 Connection requests response:', response);
      
      if (response.success) {
        const pendingRequests = response.data
          .filter(req => req.status === 'pending')
          .map(req => req.professional._id);
        console.log('📋 Pending requests:', pendingRequests);
        setConnectionRequests(new Set(pendingRequests));
      }
    } catch (err) {
      console.log('❌ Could not check existing connection requests:', err);
    }
  };

  // Check existing connections (accepted requests)
  const checkExistingConnections = async () => {
    if (!user) return;
    
    try {
      console.log('🔍 All Professionals - Loading connections for user:', user.id);
      const response = await getConnections();
      console.log('🔍 All Professionals - Connections response:', response);
      
      if (response.success) {
        const connectionsMap = new Map();
        response.data.forEach(connection => {
          console.log('🔍 All Professionals - Processing connection:', {
            connectionId: connection._id,
            requesterId: connection.requester._id,
            professionalId: connection.professional._id,
            userId: user.id
          });
          
          // Determine which professional this connection is with
          let professionalId;
          if (connection.requester._id === user.id) {
            // User sent the request, so the professional is the other party
            professionalId = connection.professional._id;
          } else {
            // User is the professional, so the requester is the other party
            // For the All Professionals page, we need to find the professional profile of the requester
            // Since the requester is a user, we need to find their professional profile
            // For now, we'll use the requester's user ID as the key
            professionalId = connection.requester._id;
          }
          
          console.log('🔍 All Professionals - Setting connection:', professionalId, connection._id);
          connectionsMap.set(professionalId, connection._id);
        });
        console.log('🔍 All Professionals - Final connections map:', Array.from(connectionsMap.entries()));
        setConnections(connectionsMap);
      }
    } catch (err) {
      console.log('Could not check existing connections:', err);
    }
  };

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
          const pros = response.professionals.map(pro => {
            // Handle images - use professional photos first, then user profile picture, then placeholder
            let image = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=300&fit=crop';
            if (pro.photos && pro.photos.length > 0 && pro.photos[0] !== '/images/placeholder.jpeg') {
              image = pro.photos[0];
            } else if (pro.user?.profilePicture) {
              image = pro.user.profilePicture;
            }
            
            return {
              ...pro,
              image // Add the processed image
            };
          });
          
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

  const handleCancelRequest = async (professional) => {
    if (!user) return;
    
    try {
      const response = await cancelConnectionRequest(professional._id);
      if (response.success) {
        // Remove from connection requests set
        setConnectionRequests(prev => {
          const newSet = new Set(prev);
          newSet.delete(professional._id);
          return newSet;
        });
        success(`Connection request to ${professional.name} has been cancelled.`);
      } else {
        error('Failed to cancel connection request. Please try again.');
      }
    } catch (err) {
      console.error('Error cancelling connection request:', err);
      error('Failed to cancel connection request. Please try again.');
    }
  };

  const handleUnfriendClick = (professional) => {
    setProfessionalToUnfriend(professional);
    setShowUnfriendModal(true);
  };

  const handleUnfriendConfirm = async () => {
    if (!user || !professionalToUnfriend) return;
    
    const connectionId = connections.get(professionalToUnfriend._id);
    if (!connectionId) {
      error('Connection not found');
      setShowUnfriendModal(false);
      setProfessionalToUnfriend(null);
      return;
    }

    try {
      const response = await removeConnection(connectionId);
      if (response.success) {
        // Remove from connections map
        setConnections(prev => {
          const newMap = new Map(prev);
          newMap.delete(professionalToUnfriend._id);
          return newMap;
        });
        success(`Removed ${professionalToUnfriend.name} from your connections.`);
      } else {
        error('Failed to remove connection. Please try again.');
      }
    } catch (err) {
      console.error('Error removing connection:', err);
      error('Failed to remove connection. Please try again.');
    }
    
    setShowUnfriendModal(false);
    setProfessionalToUnfriend(null);
  };

  const handleStartChat = async (professional) => {
    try {
      console.log('💬 Starting chat with professional:', professional._id);
      console.log('💬 Professional user ID:', professional.user);
      
      // Create or get conversation
      const response = await createOrGetConversation({
        otherUserId: professional.user // Send the User ID, not Professional ID
      });
      
      if (response.success) {
        console.log('✅ Conversation created/found:', response.data);
        // Navigate to the conversation
        navigate(`/dashboard/messages/${response.data._id}`);
      } else {
        error('Failed to create conversation');
        console.error('Error creating conversation:', response);
      }
    } catch (err) {
      error('Failed to start chat');
      console.error('Error starting chat:', err);
    }
  };

  const handleConnect = async (professional) => {
    if (!user) {
      navigate('/login');
      return;
    }

    console.log('🔗 HandleConnect called for professional:', professional._id);
    console.log('📊 Current connectionRequests:', Array.from(connectionRequests));
    console.log('📊 Current connections:', Array.from(connections.keys()));

    // Check if already sent a request or connected
    if (connectionRequests.has(professional._id) || connections.has(professional._id)) {
      console.log('⚠️ Already sent request or connected, returning');
      return;
    }

    try {
      console.log('📤 Sending connection request...');
      // Send connection request instead of immediately creating conversation
      const response = await sendConnectionRequest(professional._id);
      console.log('📥 Connection request response:', response);
      
      if (response.success) {
        // Add to connection requests set immediately
        setConnectionRequests(prev => {
          const newSet = new Set([...prev, professional._id]);
          console.log('✅ Updated connectionRequests:', Array.from(newSet));
          return newSet;
        });
        success(`Connection request sent to ${professional.name}! They'll be notified and can accept your request.`);
      } else {
        // Handle specific error cases
        if (response.message === 'Connection request already sent') {
          setConnectionRequests(prev => {
            const newSet = new Set([...prev, professional._id]);
            console.log('✅ Updated connectionRequests (already sent):', Array.from(newSet));
            return newSet;
          });
          success('Connection request already sent!');
        } else {
          error('Failed to send connection request. Please try again.');
        }
      }
    } catch (err) {
      console.error('Error sending connection request:', err);
      // Check if it's a duplicate request error
      if (err.message && err.message.includes('already sent')) {
        setConnectionRequests(prev => {
          const newSet = new Set([...prev, professional._id]);
          console.log('✅ Updated connectionRequests (error):', Array.from(newSet));
          return newSet;
        });
        success('Connection request already sent!');
      } else {
        error('Failed to send connection request. Please try again.');
      }
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
    // Only show connected professionals
    const isConnected = connections.has(pro._id);
    console.log('🔍 All Professionals - Checking professional:', {
      name: pro.name,
      id: pro._id,
      isConnected,
      connections: Array.from(connections.keys()),
      connectionsMap: connections
    });
    
    if (!isConnected) return false;
    
    const matchesService = !filters.service || 
      pro.category?.toLowerCase().includes(filters.service.toLowerCase());
    const matchesLocation = !filters.location || 
      pro.location?.address?.toLowerCase().includes(filters.location.toLowerCase());
    
    // Handle undefined/null rating - if no rating, treat as 0 (passes any rating filter)
    const proRating = pro.ratingAvg || pro.rating || 0;
    const matchesRating = proRating >= filters.rating;
    
    // Handle undefined/null price - if no price, treat as 0 (passes any price filter)
    const proPrice = pro.pricePerHour || pro.hourlyRate || 0;
    const matchesPrice = proPrice >= filters.priceRange.min && 
      proPrice <= filters.priceRange.max;
    
    console.log('🔍 All Professionals - Filter results for', pro.name, ':', {
      matchesService,
      matchesLocation,
      matchesRating,
      matchesPrice,
      filters,
      proData: {
        category: pro.category,
        location: pro.location?.address,
        originalRating: pro.rating,
        originalPrice: pro.hourlyRate,
        usedRating: proRating,
        usedPrice: proPrice
      }
    });
    
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
              <h1 className="text-2xl font-bold text-gray-900">Connected Professionals</h1>
              <p className="text-gray-600">{filteredProfessionals.length} connected professionals</p>
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
          <div className="flex gap-3">
            <div className="flex-1">
              <ServiceSelector
                value={filters.service}
                onChange={(service) => setFilters(prev => ({ ...prev, service }))}
                placeholder="Search for a service (e.g. Plumber, Electrician, Barber)..."
                showSuggestions={true}
                allowCustom={true}
              />
            </div>
            <div className="flex-1">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by location..."
                  value={filters.location}
                  onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Professionals Grid/List */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProfessionals.map((professional) => (
              <Link
                key={professional._id}
                to={`/dashboard/professional/${professional._id}`}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow block"
              >
                <div className="relative">
                  <img
                    src={professional.image || '/images/placeholder.jpeg'}
                    alt={professional.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSave(professional._id);
                      }}
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
                    {(() => {
                      const isConnected = connections.has(professional._id);
                      const hasRequestSent = connectionRequests.has(professional._id);
                      console.log(`🔍 Button state for ${professional.name} (${professional._id}):`, {
                        isConnected,
                        hasRequestSent,
                        connectionRequests: Array.from(connectionRequests),
                        connections: Array.from(connections.keys())
                      });
                      
                      if (isConnected) {
                        // Connected - show Message and Unfriend buttons
                        return (
                          <>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleStartChat(professional);
                              }}
                              className="flex-1 py-2 rounded-lg flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 transition-colors"
                            >
                              <FaComments className="w-4 h-4" />
                              Message
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleUnfriendClick(professional);
                              }}
                              className="px-4 py-2 rounded-lg flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 transition-colors"
                            >
                              Unfriend
                            </button>
                          </>
                        );
                      } else if (hasRequestSent) {
                        // Request sent - show disabled button
                        return (
                          <button
                            disabled
                            className="flex-1 py-2 rounded-lg flex items-center justify-center gap-2 bg-gray-400 text-white cursor-not-allowed"
                          >
                            <FaComments className="w-4 h-4" />
                            Request Sent
                          </button>
                        );
                      } else {
                        // Not connected - show Connect button
                        return (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleConnect(professional);
                            }}
                            className="flex-1 py-2 rounded-lg flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                          >
                            <FaComments className="w-4 h-4" />
                            Connect
                          </button>
                        );
                      }
                    })()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProfessionals.map((professional) => (
              <Link
                key={professional._id}
                to={`/dashboard/professional/${professional._id}`}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow block"
              >
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
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSave(professional._id);
                          }}
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
                      {(() => {
                        const isConnected = connections.has(professional._id);
                        const hasRequestSent = connectionRequests.has(professional._id);
                        
                        if (isConnected) {
                          // Connected - show Message and Unfriend buttons
                          return (
                            <>
                              <Link
                                to={`/dashboard/messages?professional=${professional._id}`}
                                className="px-6 py-2 rounded-lg flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 transition-colors"
                              >
                                <FaComments className="w-4 h-4" />
                                Message
                              </Link>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleUnfriendClick(professional);
                                }}
                                className="px-4 py-2 rounded-lg flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 transition-colors"
                              >
                                Unfriend
                              </button>
                            </>
                          );
                        } else if (hasRequestSent) {
                          // Request sent - show Cancel Request button
                          return (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleCancelRequest(professional);
                              }}
                              className="px-6 py-2 rounded-lg flex items-center gap-2 bg-orange-600 text-white hover:bg-orange-700 transition-colors"
                            >
                              <FaTimes className="w-4 h-4" />
                              Cancel Request
                            </button>
                          );
                        } else {
                          // Not connected - show Connect button
                          return (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleConnect(professional);
                              }}
                              className="px-6 py-2 rounded-lg flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                            >
                              <FaComments className="w-4 h-4" />
                              Connect
                            </button>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </Link>
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
                  <ServiceSelector
                    value={filters.service}
                    onChange={(service) => setFilters(prev => ({ ...prev, service }))}
                    placeholder="e.g., Electrician, Plumber, Barber"
                    showSuggestions={true}
                    allowCustom={true}
                  />
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

      {/* Unfriend Confirmation Modal */}
      {showUnfriendModal && professionalToUnfriend && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Unfriend {professionalToUnfriend.name}?
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to unfriend {professionalToUnfriend.name}? This action is irreversible and will:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Remove them from your connections</li>
                  <li>Remove you from their connections</li>
                  <li className="text-red-600 font-semibold">Delete all chat history permanently</li>
                  <li>Remove them from your messaging interface</li>
                </ul>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowUnfriendModal(false);
                    setProfessionalToUnfriend(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnfriendConfirm}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Unfriend
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalsPage;
