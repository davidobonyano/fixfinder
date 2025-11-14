import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaStar, FaClock, FaPhone, FaComments, FaTimes, FaFilter, FaSearch, FaMap, FaTh, FaList, FaSortAmountDown, FaSync, FaUser } from 'react-icons/fa';
import { getProfessionals, sendConnectionRequest, getConnectionRequests, getConnections, removeConnection, cancelConnectionRequest, createOrGetConversation } from '../utils/api';
import { calculateDistance as haversineDistance, formatDistance } from '../utils/locationUtils';
import { useLocation as useLocationHook } from '../hooks/useLocation';
import { useAuth } from '../context/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import LiveLocationMap from '../components/LiveLocationMap';
import ServiceSelector from '../components/ServiceSelector';
import { searchServices, normalizeService } from '../data/services';
import VerifiedBadge from '../components/VerifiedBadge';
import { getVerificationState } from '../utils/verificationUtils';

const ProfessionalDiscovery = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const { location: detectedLocation } = useLocationHook(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list', or 'map'
  const [sortBy, setSortBy] = useState('distance'); // 'distance', 'price', 'rating'
  const [savedProfessionals, setSavedProfessionals] = useState(new Set());
  const [connectionRequests, setConnectionRequests] = useState(new Map()); // Map of professionalId -> requestId
  const [connections, setConnections] = useState(new Map()); // Map of professionalId -> connectionId
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    service: '',
    location: '',
    priceRange: { min: 0, max: 100000 },
    rating: 0,
    verified: false
  });
  const [lastRefreshedAt, setLastRefreshedAt] = useState(Date.now());
  const [showUnfriendModal, setShowUnfriendModal] = useState(false);
  const [professionalToUnfriend, setProfessionalToUnfriend] = useState(null);

  // Service catalog and synonyms for better matching
  const serviceCatalog = [
    'Electrician', 'Plumber', 'Hair Stylist', 'Hairdresser', 'Hair Dresser', 'Barber',
    'Mechanic', 'Carpenter', 'Painter', 'Makeup Artist', 'Tailor', 'AC Technician',
    'Generator Repair', 'Cleaner', 'Driver', 'Gardener', 'Welder', 'Cook', 'Nanny'
  ];

  const normalizeService = (value) => {
    if (!value) return '';
    const v = String(value).toLowerCase().trim();
    if (['hairdresser', 'hair dresser'].includes(v)) return 'hair stylist';
    if (v === 'ac' || v === 'ac repair' || v === 'ac technician') return 'ac technician';
    if (v === 'generator' || v === 'gen repair' || v === 'generator repair') return 'generator repair';
    if (v === 'makeup' || v === 'mua') return 'makeup artist';
    return v;
  };

  const suggestedServices = (() => {
    const q = normalizeService(searchQuery);
    if (!q) return serviceCatalog.slice(0, 8);
    const startsWith = serviceCatalog.filter(s => s.toLowerCase().startsWith(q));
    const contains = serviceCatalog.filter(s => !startsWith.includes(s) && s.toLowerCase().includes(q));
    return [...startsWith, ...contains].slice(0, 8);
  })();

  // Initialize location from detectedLocation or saved user coords (no auto geolocation calls)
  useEffect(() => {
    const fromDetected = detectedLocation?.latitude && detectedLocation?.longitude
      ? { lat: detectedLocation.latitude, lng: detectedLocation.longitude }
      : null;
    // Try multiple shapes from saved user profile
    const fromUser = user?.location?.coordinates?.lat && user?.location?.coordinates?.lng
      ? { lat: Number(user.location.coordinates.lat), lng: Number(user.location.coordinates.lng) }
      : (user?.location?.latitude && user?.location?.longitude
          ? { lat: Number(user.location.latitude), lng: Number(user.location.longitude) }
          : null);

    const chosen = fromDetected || fromUser;
    if (chosen) {
      try { console.log('📌 Discovery center source:', fromDetected ? 'detected' : 'user.saved', chosen); } catch (e) {}
      setUserLocation(chosen);
    }
    checkExistingConnectionRequests();
    checkExistingConnections();
  }, []);

  // Keep in sync if detected location changes later
  useEffect(() => {
    if (detectedLocation?.latitude && detectedLocation?.longitude) {
      setUserLocation({ lat: detectedLocation.latitude, lng: detectedLocation.longitude });
    }
  }, [detectedLocation?.latitude, detectedLocation?.longitude]);

  // Late fallback to a safe default if no source arrives (prevents indefinite loading)
  useEffect(() => {
    const t = setTimeout(() => {
      if (!userLocation && !detectedLocation?.latitude) {
        // Also check saved user now (in case it loaded later)
        const fromUser = user?.location?.coordinates?.lat && user?.location?.coordinates?.lng
          ? { lat: Number(user.location.coordinates.lat), lng: Number(user.location.coordinates.lng) }
          : (user?.location?.latitude && user?.location?.longitude
              ? { lat: Number(user.location.latitude), lng: Number(user.location.longitude) }
              : null);
        if (fromUser) {
          try { console.log('📌 Discovery center late source: user.saved', fromUser); } catch (e) {}
          setUserLocation(fromUser);
        } else {
          setUserLocation({ lat: 6.5244, lng: 3.3792 });
        }
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [userLocation, detectedLocation?.latitude, user?.location?.coordinates?.lat, user?.location?.coordinates?.lng, user?.location?.latitude, user?.location?.longitude]);

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
        console.log('🔄 Page focused - refreshing connections');
        checkExistingConnectionRequests();
        checkExistingConnections();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        console.log('🔄 Page became visible - refreshing connections');
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

  // Refresh connections when component mounts or userLocation changes
  useEffect(() => {
    if (user && userLocation) {
      console.log('🔄 UserLocation changed - refreshing connections');
      checkExistingConnectionRequests();
      checkExistingConnections();
    }
  }, [userLocation, user]);

  // Load professionals after userLocation is available (or defaulted)
  useEffect(() => {
    // Only proceed once we have attempted setting location (non-null)
    if (userLocation) {
      loadProfessionals();
    }
  }, [userLocation]); // Remove loadProfessionals from deps to prevent loops

  // Refresh connection states when professionals are loaded
  useEffect(() => {
    if (professionals.length > 0 && user) {
      console.log('🔄 Refreshing connection states after professionals loaded...');
      checkExistingConnectionRequests();
      checkExistingConnections();
    }
  }, [professionals, user]);

  // Filter and sort professionals
  const filteredAndSortedProfessionals = professionals
    .filter(professional => {
      const matchesSearch = !searchQuery || 
        professional.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        normalizeService(professional.category).includes(normalizeService(searchQuery)) ||
        professional.location?.address?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesService = !filters.service ||
        normalizeService(professional.category).includes(normalizeService(filters.service));
      
      const matchesLocation = !filters.location || 
        professional.location?.address?.toLowerCase().includes(filters.location.toLowerCase());
      
      const price = typeof professional.hourlyRate === 'number' ? professional.hourlyRate : 0;
      const matchesPrice = price >= filters.priceRange.min && price <= filters.priceRange.max;
      
      const ratingVal = typeof professional.rating === 'number' ? professional.rating : 0;
      const matchesRating = ratingVal >= filters.rating;
      
      const verificationState = getVerificationState(professional);
      const matchesVerified = !filters.verified || verificationState.fullyVerified;
      
      const passes = matchesSearch && matchesService && matchesLocation && matchesPrice && matchesRating && matchesVerified;
      
      // Debug logging for filtering
      if (!passes) {
        console.log(`❌ Filtered out ${professional.name}:`, {
          matchesSearch, matchesService, matchesLocation, matchesPrice, matchesRating, matchesVerified,
          searchQuery, filters
        });
      }
      
      return passes;
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
    // Intentionally no-op to avoid auto geolocation without user gesture
    // Left here for potential future button-triggered use
  };

  // Check existing connection requests
  const checkExistingConnectionRequests = async () => {
    if (!user) return;
    
    try {
      console.log('🔍 ProfessionalDiscovery: Checking existing connection requests for user:', user.id);
      const response = await getConnectionRequests();
      console.log('📡 ProfessionalDiscovery: Connection requests response:', response);
      
      if (response.success) {
        const pendingRequestsMap = new Map();
        response.data
          .filter(req => req && req.status === 'pending' && req.professional && req.professional._id)
          .forEach(req => {
            console.log('📋 Processing request:', {
              requestId: req._id,
              professionalId: req.professional._id,
              professionalName: req.professional.name,
              status: req.status
            });
            try { pendingRequestsMap.set(req.professional._id, req._id); } catch (e) {}
          });
        console.log('📋 ProfessionalDiscovery: Final pending requests map:', Array.from(pendingRequestsMap.entries()));
        setConnectionRequests(pendingRequestsMap);
      } else {
        console.log('❌ ProfessionalDiscovery: Failed to get connection requests:', response);
      }
    } catch (err) {
      console.log('❌ ProfessionalDiscovery: Could not check existing connection requests:', err);
    }
  };

  // Check existing connections (accepted requests)
  const checkExistingConnections = async () => {
    if (!user) return;
    
    try {
      console.log('🔍 ProfessionalDiscovery: Checking existing connections for user:', user.id);
      const response = await getConnections();
      console.log('📡 ProfessionalDiscovery: Connections response:', response);
      
      if (response.success) {
        const connectionsMap = new Map();
        response.data.forEach(connection => {
          // Add the professional ID to our connections set
          if (connection.requester._id === user.id) {
            // User sent the request, so the professional is the other party
            connectionsMap.set(connection.professional._id, connection._id);
          } else {
            // User is the professional, so the requester is the other party
            // We need to find the professional profile of the requester
            // For now, we'll use the requester's user ID
            // This might need adjustment based on your data structure
            connectionsMap.set(connection.requester._id, connection._id);
          }
        });
        console.log('🔗 ProfessionalDiscovery: Final connections map:', Array.from(connectionsMap.entries()));
        setConnections(connectionsMap);
      } else {
        console.log('❌ ProfessionalDiscovery: Failed to get connections:', response);
      }
    } catch (err) {
      console.log('❌ ProfessionalDiscovery: Could not check existing connections:', err);
    }
  };

  const loadProfessionals = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      console.log('📌 Discovery using userLocation:', userLocation);
      
      // Try to get real professionals first
      console.log('🔍 Fetching professionals from API...');
      const response = await getProfessionals({ limit: 50 });
      console.log('📡 API Response:', response);
      console.log('📊 Response structure:', {
        success: response.success,
        professionalsCount: response.professionals?.length,
        hasProfessionals: !!response.professionals,
        firstProfessional: response.professionals?.[0]
      });
      console.log('🔍 All professionals from API:', response.professionals?.map(p => ({ name: p.name, category: p.category, city: p.city, isActive: p.isActive })));
      
      if (response.success && response.professionals && response.professionals.length > 0) {
          console.log('✅ Found', response.professionals.length, 'real professionals');
          let pros = response.professionals;
          
          // Remove duplicates based on _id or name + category
          pros = pros.filter((pro, index, self) => 
            index === self.findIndex(p => p._id === pro._id || (p.name === pro.name && p.category === pro.category))
          );
          
          console.log('✅ After deduplication:', pros.length, 'unique professionals');
          
          // Normalize backend fields to UI expectations and always calculate distance
          const prosWithDistance = pros.map(pro => {
            // Use backend-provided coordinates only; do not inject defaults
            const location = pro.location;
            if (!location?.coordinates?.lat || !location?.coordinates?.lng) {
              try {
                console.warn('⚠️ Missing pro coordinates; skipping distance calc for', pro.name, location);
              } catch (e) {}
            }
            
            // Handle images - prioritize profile picture like other pages, then fallback to placeholder
            const image = pro.user?.profilePicture
              || pro.user?.avatarUrl
              || pro.profilePicture
              || pro.avatarUrl
              || pro.image
              || '/images/placeholder.jpeg';
            
            const normalizedPro = {
              ...pro,
              location,
              image, // Add the processed image
              // Normalize price/rating keys expected by UI
              hourlyRate: pro.hourlyRate ?? pro.pricePerHour ?? 0,
              rating: pro.rating ?? pro.ratingAvg ?? 0,
              ratingCount: pro.ratingCount ?? 0,
              likes: pro.likes ?? 0,
              // Ensure nested user object shape for chat/connect action
              user: typeof pro.user === 'string' ? { _id: pro.user } : (pro.user || {}),
              distance: (userLocation && location?.coordinates?.lat && location?.coordinates?.lng)
                ? haversineDistance(
                    userLocation.lat,
                    userLocation.lng,
                    Number(location.coordinates.lat),
                    Number(location.coordinates.lng)
                  )
                : 999
            };
            
            try {
              const addr = location?.address || `${location?.city || ''}, ${location?.state || ''}` || 'Unknown';
              const plat = location?.coordinates?.lat;
              const plng = location?.coordinates?.lng;
              console.log(`📍 ${pro.name}: ${addr} (${plat ?? 'n/a'}, ${plng ?? 'n/a'}) - Distance: ${Number.isFinite(normalizedPro.distance) ? normalizedPro.distance.toFixed(1) : 'n/a'}km`);
            } catch (e) {}
            console.log(`📊 Professional data:`, {
              name: normalizedPro.name,
              category: normalizedPro.category,
              city: normalizedPro.city,
              hourlyRate: normalizedPro.hourlyRate,
              rating: normalizedPro.rating,
              ratingCount: normalizedPro.ratingCount,
              isActive: normalizedPro.isActive,
              userProfilePicture: pro.user?.profilePicture,
              finalImage: image
            });
            
            return normalizedPro;
          });
          
          // Sort by distance if userLocation is available
          if (userLocation) {
            prosWithDistance.sort((a, b) => a.distance - b.distance);
          }
          
          setProfessionals(prosWithDistance);
          return;
        } else {
          setProfessionals([]);
          setErrorMessage('No professionals match your filters yet. Try adjusting your search or check back soon.');
        }
    } catch (error) {
      console.error('❌ Error loading professionals:', error);
      setProfessionals([]);
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      setErrorMessage(
        offline
          ? 'You appear to be offline. Reconnect to keep discovering professionals.'
          : 'We couldn’t reach the server. Please refresh in a moment.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Distance helpers now use shared utils

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
    if (!user) {
      navigate('/login');
      return;
    }

    console.log('🔗 ProfessionalDiscovery: HandleConnect called for professional:', professional._id);
    console.log('📊 ProfessionalDiscovery: Current connectionRequests:', Array.from(connectionRequests.keys()));
    console.log('📊 ProfessionalDiscovery: Current connections:', Array.from(connections.keys()));

    // Check if already sent a request or connected
    if (connectionRequests.has(professional._id) || connections.has(professional._id)) {
      console.log('⚠️ ProfessionalDiscovery: Already sent request or connected, returning');
      return;
    }

    try {
      console.log('📤 ProfessionalDiscovery: Sending connection request...');
      // Send connection request instead of immediately creating conversation
      const response = await sendConnectionRequest(professional._id);
      console.log('📥 ProfessionalDiscovery: Connection request response:', response);
      
      if (response.success) {
        // Add to connection requests map immediately
        setConnectionRequests(prev => {
          const newMap = new Map(prev);
          newMap.set(professional._id, response.data?._id || 'pending');
          console.log('✅ ProfessionalDiscovery: Updated connectionRequests:', Array.from(newMap.keys()));
          return newMap;
        });
        success(`Connection request sent to ${professional.name}! They'll be notified and can accept your request.`);
      } else {
        // Handle specific error cases
        if (response.message === 'Connection request already sent') {
          setConnectionRequests(prev => {
            const newMap = new Map(prev);
            newMap.set(professional._id, 'pending');
            console.log('✅ ProfessionalDiscovery: Updated connectionRequests (already sent):', Array.from(newMap.keys()));
            return newMap;
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
          const newMap = new Map(prev);
          newMap.set(professional._id, 'pending');
          console.log('✅ ProfessionalDiscovery: Updated connectionRequests (error):', Array.from(newMap.keys()));
          return newMap;
        });
        success('Connection request already sent!');
      } else {
        error('Failed to send connection request. Please try again.');
      }
    }
  };

  const handleCancelRequest = async (professional) => {
    if (!user) return;
    
    try {
      const response = await cancelConnectionRequest(professional._id);
      if (response.success) {
        // Remove from connection requests map
        setConnectionRequests(prev => {
          const newMap = new Map(prev);
          newMap.delete(professional._id);
          return newMap;
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

  const handleCall = (professional) => {
    // For now, just show an alert. In a real app, this would initiate a call
    alert(`Calling ${professional.name}...`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Finding professionals near you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/60 dark:bg-slate-950/80 backdrop-blur-sm overflow-x-hidden transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Discover Professionals</h1>
              <p className="text-gray-600 dark:text-gray-400">
                {errorMessage ? 'Unable to load professionals right now.' : `${filteredAndSortedProfessionals.length} professionals found`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { 
                  console.log('🔄 Force refreshing professionals and connection states...');
                  setProfessionals([]);
                  setLastRefreshedAt(Date.now()); 
                  loadProfessionals();
                  // Also refresh connection states
                  if (user) {
                    checkExistingConnectionRequests();
                    checkExistingConnections();
                  }
                }}
                className="p-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800"
                title="Refresh"
              >
                <FaSync className="w-4 h-4" />
              </button>
              <div className="flex items-center bg-gray-100 rounded-lg p-1 dark:bg-gray-800">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-white shadow-sm dark:bg-gray-700' : 'dark:text-gray-300'}`}
                  title="Grid View"
                >
                  <FaTh className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-white shadow-sm dark:bg-gray-700' : 'dark:text-gray-300'}`}
                  title="List View"
                >
                  <FaList className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`p-2 rounded-md ${viewMode === 'map' ? 'bg-white shadow-sm dark:bg-gray-700' : 'dark:text-gray-300'}`}
                  title="Map View"
                >
                  <FaMap className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setShowSearchModal(true)}
                className="p-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800"
                title="Search professionals"
              >
                <FaSearch className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowFilterModal(true)}
                className="p-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800"
                title="Filter professionals"
              >
                <FaFilter className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-white/50 dark:border-gray-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <ServiceSelector
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search for a service (e.g. Plumber, Electrician, Barber)..."
              showSuggestions={true}
              allowCustom={true}
              className="w-full"
            />
            <div className="flex items-center gap-2 text-sm">
              <FaSortAmountDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {errorMessage ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-200">
            <div>
              <h2 className="text-lg font-semibold">We couldn’t load professionals</h2>
              <p className="text-sm mt-1 text-amber-700 dark:text-amber-200">{errorMessage}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadProfessionals}
                className="px-4 py-2 rounded-lg bg-amber-500 text-indigo-900 font-medium hover:bg-amber-400 transition-colors dark:text-gray-900"
              >
                Retry
              </button>
            </div>
          </div>
        ) : viewMode === 'map' ? (
          // Map View
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 dark:bg-gray-900 dark:border-gray-800">
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
            <div className="text-gray-400 text-6xl mb-4 dark:text-gray-600">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2 dark:text-gray-100">No professionals found</h3>
            <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-6"
                : "space-y-4"
            }>
            {filteredAndSortedProfessionals.map((professional) => {
              const verificationState = getVerificationState(professional);
              const fullyVerified = verificationState.fullyVerified;
              console.log('✅ Verification state for', professional.name, {
                professionalId: professional._id,
                isVerified: professional?.isVerified,
                verified: professional?.verified,
                userIsVerified: professional?.user?.isVerified,
                userVerified: professional?.user?.verified,
                emailVerification: professional?.emailVerification,
                faceVerification: professional?.faceVerification,
                computed: verificationState,
              });
              return (
              <Link
                key={professional._id}
                to={`/dashboard/professional/${professional._id}`}
                className={`group relative block overflow-hidden rounded-3xl border border-white/40 bg-white/80 shadow-[0_25px_45px_-25px_rgba(15,23,42,0.25)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_55px_-25px_rgba(15,23,42,0.35)] dark:bg-gray-900/80 dark:border-gray-800 dark:shadow-[0_25px_45px_-25px_rgba(15,15,30,0.55)] dark:hover:shadow-[0_35px_65px_-30px_rgba(15,15,40,0.7)] ${
                  viewMode === 'list' ? 'flex flex-col gap-4 p-5 sm:flex-row sm:items-center' : 'p-0'
                }`}
              >
                {viewMode === 'grid' ? (
                  // Grid View
                  <>
                    <div className="relative overflow-hidden">
                      <img
                        src={professional.image || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=300&fit=crop'}
                        alt={professional.name}
                        className="h-64 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {/* Badge removed from image per request */}
                      <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm dark:bg-gray-900/90 dark:text-gray-100">
                        <FaMapMarkerAlt className="h-3 w-3 text-emerald-500 dark:text-emerald-300" />
                        <span>
                          {formatDistance(professional.distance)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex h-full flex-col gap-4 p-6">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-gray-100 flex items-center gap-2">
                            {professional.name}
                            {fullyVerified && <VerifiedBadge size="sm" />}
                          </h3>
                          <span className="flex items-center gap-1 rounded-full bg-amber-100/80 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
                            <FaStar className="h-3 w-3" />
                            {professional.rating || 0}
                          </span>
                        </div>
                        <p className="text-sm font-medium uppercase tracking-wide text-slate-500 dark:text-gray-400">
                          {professional.category}
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <FaClock className="h-3 w-3 text-slate-400 dark:text-gray-500" />
                          <span>Responds in under an hour</span>
                        </div>
                        <span className="font-semibold text-indigo-600 dark:text-indigo-300">
                          ₦{professional.hourlyRate?.toLocaleString()}/hr
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-500 ring-1 ring-slate-200/80 dark:bg-slate-800/60 dark:text-gray-300 dark:ring-slate-700/60">
                        <FaMapMarkerAlt className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-300" />
                        <span className="line-clamp-1">{professional.location?.address || 'Location on request'}</span>
                      </div>
                      
                      <div className="mt-auto flex gap-2 pt-3">
                        {(() => {
                          const isConnected = connections.has(professional._id);
                          const hasRequestSent = connectionRequests.has(professional._id);
                          console.log(`🔍 ProfessionalDiscovery Grid: Button state for ${professional.name} (${professional._id}):`, {
                            isConnected,
                            hasRequestSent,
                            connectionRequests: Array.from(connectionRequests.keys()),
                            connections: Array.from(connections.keys()),
                            professionalId: professional._id,
                            allConnectionRequests: connectionRequests,
                            allConnections: connections,
                            currentUser: user?.id,
                            professionalUserId: professional.user?._id
                          });
                          
                          if (isConnected) {
                            // Connected - show Message button only
                            return (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleStartChat(professional);
                                }}
                                className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                              >
                                Chat
                              </button>
                            );
                          } else if (hasRequestSent) {
                            // Request sent - show "Request Sent" with three dots menu
                            return (
                              <>
                                <button
                                  disabled
                                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
                                >
                                  Pending
                                </button>
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      // Toggle menu (we'll implement this)
                                      console.log('Three dots clicked for:', professional.name);
                                    }}
                                    className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 transition-colors dark:border-gray-700 dark:hover:bg-gray-800"
                                  >
                                    <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                    </svg>
                                  </button>
                                  {/* Dropdown menu */}
                                  <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg dark:bg-gray-900 dark:border-gray-700">
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleCancelRequest(professional);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg dark:text-gray-300 dark:hover:bg-gray-800"
                                    >
                                      Cancel Request
                                    </button>
                                  </div>
                                </div>
                              </>
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
                                className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                              >
                                Connect
                              </button>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  </>
                ) : (
                  // List View
                  <>
                    <div className="relative h-24 w-full flex-shrink-0 overflow-hidden rounded-2xl sm:h-24 sm:w-24">
                      <img
                        src={professional.image || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face'}
                        alt={professional.name}
                        className="h-full w-full object-cover"
                      />
                      {/* Badge removed from image per request */}
                    </div>
                    
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="truncate text-lg font-semibold text-slate-900 dark:text-gray-100 flex items-center gap-2">
                            {professional.name}
                            {fullyVerified && <VerifiedBadge size="sm" />}
                          </h3>
                          <p className="text-sm font-medium uppercase tracking-wide text-slate-500 dark:text-gray-400">{professional.category}</p>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-lg font-semibold text-indigo-600 dark:text-indigo-300">
                            ₦{professional.hourlyRate?.toLocaleString()}/hr
                          </div>
                          <div className="mt-2 flex gap-2">
                            {(() => {
                              const isConnected = connections.has(professional._id);
                              const hasRequestSent = connectionRequests.has(professional._id);
                              
                              if (isConnected) {
                                // Connected - show Message button only
                                return (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleStartChat(professional);
                                    }}
                                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 transition dark:bg-indigo-500 dark:hover:bg-indigo-400"
                                  >
                                    Chat
                                  </button>
                                );
                              } else if (hasRequestSent) {
                                // Request sent - show "Request Sent" with three dots menu
                                return (
                                  <>
                                    <button
                                      disabled
                                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400"
                                    >
                                      Pending
                                    </button>
                                    <div className="relative">
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          console.log('Three dots clicked for:', professional.name);
                                        }}
                                        className="rounded border border-gray-300 p-1.5 hover:bg-gray-50 transition dark:border-gray-700 dark:hover:bg-gray-800"
                                      >
                                        <svg className="h-3 w-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                        </svg>
                                      </button>
                                      {/* Dropdown menu */}
                                      <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-gray-200 bg-white shadow-lg dark:bg-gray-900 dark:border-gray-700">
                                        <button
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleCancelRequest(professional);
                                          }}
                                          className="w-full rounded-lg px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                                        >
                                          Cancel Request
                                        </button>
                                      </div>
                                    </div>
                                  </>
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
                                    className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-400 dark:hover:bg-emerald-500"
                                  >
                                    Connect
                                  </button>
                                );
                              }
                            })()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-gray-400">
                        <span className="flex items-center gap-1 rounded-full bg-amber-100/80 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
                          <FaStar className="h-3 w-3" />
                          {professional.rating || 0} · {professional.ratingCount || 0}
                        </span>
                        <div className="flex items-center gap-1">
                          <FaMapMarkerAlt className="h-3 w-3 text-emerald-500 dark:text-emerald-300" />
                          <span className="truncate text-sm">{professional.location?.address}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </Link>
            )})}
          </div>
        )}
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center">
          <div className="w-full max-w-lg overflow-hidden rounded-t-3xl bg-white shadow-2xl md:rounded-3xl dark:bg-gray-900 dark:shadow-2xl dark:shadow-black/60">
            <div className="space-y-6 p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Filter Professionals</h2>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6 pb-2">
                {/* Service Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Service</label>
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <input
                      type="text"
                      placeholder="e.g., Electrician, Plumber, Barber"
                      value={filters.service}
                      onChange={(e) => setFilters(prev => ({ ...prev, service: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Location</label>
                  <input
                    type="text"
                    placeholder="e.g., Lagos, Victoria Island"
                    value={filters.location}
                    onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                  />
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Price Range (₦/hr)</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.priceRange.min}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        priceRange: { ...prev.priceRange, min: parseInt(e.target.value) || 0 }
                      }))}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                    />
                    <span className="text-gray-500 dark:text-gray-400">to</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.priceRange.max}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        priceRange: { ...prev.priceRange, max: parseInt(e.target.value) || 100000 }
                      }))}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                    />
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Minimum Rating</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setFilters(prev => ({ ...prev, rating: star }))}
                        className={`p-2 rounded-lg ${
                          filters.rating >= star 
                            ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-300' 
                            : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                        }`}
                      >
                        <FaStar className="w-5 h-5" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Apply Filters */}
                <div className="border-t pt-4">
                  <button
                    onClick={() => {
                      // Apply filters logic here
                      setShowFilterModal(false);
                    }}
                    className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-900 dark:shadow-2xl dark:shadow-black/60">
            <div className="space-y-6 p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Search Professionals</h2>
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>

                <div className="space-y-6">
                {/* Search Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">What service do you need?</label>
                  <ServiceSelector
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search for any service (e.g., Electrician, Hair Stylist, Tutor, DJ...)"
                    allowCustom={true}
                    className="w-full dark:bg-gray-900"
                  />
                </div>

                {/* Popular Services */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3 dark:text-gray-300">Popular Services</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Electrician', 'Plumber', 'Hair Stylist', 'Hairdresser', 'Mechanic', 'Carpenter', 'Painter', 'Makeup Artist', 'Tailor', 'AC Technician', 'Generator Repair'].map((service) => (
                      <button
                        key={service}
                        onClick={() => setSearchQuery(service)}
                        className={`p-3 text-left rounded-lg border transition-colors ${
                          searchQuery === service
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800'
                        }`}
                      >
                        {service}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Location</label>
                  <input
                    type="text"
                    placeholder="e.g., Lagos, Victoria Island, Abuja..."
                    value={filters.location}
                    onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                  />
                </div>

                {/* Apply Search */}
                <div className="border-t pt-4">
                  <button
                    onClick={() => setShowSearchModal(false)}
                    className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                  >
                    Search Professionals
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
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 dark:bg-gray-900 dark:shadow-2xl dark:shadow-black/60">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 dark:text-gray-100">
                Unfriend {professionalToUnfriend.name}?
              </h3>
              <p className="text-gray-600 mb-6 dark:text-gray-300">
                Are you sure you want to unfriend {professionalToUnfriend.name}? This action is irreversible and will:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Remove them from your connections</li>
                  <li>Remove you from their connections</li>
                  <li className="text-red-600 font-semibold dark:text-red-400">Delete all chat history permanently</li>
                  <li>Remove them from your messaging interface</li>
                </ul>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowUnfriendModal(false);
                    setProfessionalToUnfriend(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnfriendConfirm}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors dark:bg-red-500 dark:hover:bg-red-400"
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

export default ProfessionalDiscovery;
