import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiMapPin,
  FiStar,
  FiClock,
  FiMessageSquare,
  FiX,
  FiFilter,
  FiSearch,
  FiGrid,
  FiList,
  FiRefreshCw,
  FiUser,
  FiShield,
  FiLoader,
  FiArrowRight,
  FiChevronDown
} from 'react-icons/fi';
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
      try { console.log('📌 Discovery center source:', fromDetected ? 'detected' : 'user.saved', chosen); } catch (e) { }
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
          try { console.log('📌 Discovery center late source: user.saved', fromUser); } catch (e) { }
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
            try { pendingRequestsMap.set(req.professional._id, req._id); } catch (e) { }
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
            } catch (e) { }
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
          } catch (e) { }
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
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <FiLoader className="w-12 h-12 animate-spin text-trust mb-6" />
        <p className="label-caps text-stone-400 tracking-widest text-[11px]">Synchronizing Local Nodes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Header Architecture */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-6 border-b border-stone-200">
        <div className="flex-1">
          <label className="label-caps mb-4 block">Professional Directory</label>
          <h1 className="text-4xl lg:text-5xl font-tight font-bold text-charcoal leading-tight tracking-tight">
            Connect with Experts.
          </h1>
          <p className="mt-4 text-lg text-graphite max-w-2xl leading-relaxed">
            {errorMessage
              ? 'Unable to resolve professional nodes at this time.'
              : `Discovered ${filteredAndSortedProfessionals.length} authenticated professionals within your current sector.`
            }
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setProfessionals([]);
              setLastRefreshedAt(Date.now());
              loadProfessionals();
              if (user) {
                checkExistingConnectionRequests();
                checkExistingConnections();
              }
            }}
            className="p-4 bg-white border border-stone-200 rounded-2xl hover:border-trust transition-all text-stone-400 hover:text-trust group"
            title="Refresh Directory"
          >
            <FiRefreshCw className="w-5 h-5 group-active:rotate-180 transition-transform duration-500" />
          </button>

          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-1 flex">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-3 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-trust shadow-sm border border-stone-100' : 'text-stone-300'}`}
              title="Grid Perspective"
            >
              <FiGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-3 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-trust shadow-sm border border-stone-100' : 'text-stone-300'}`}
              title="List Perspective"
            >
              <FiList className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={() => setShowFilterModal(true)}
            className="p-4 bg-charcoal text-white rounded-2xl hover:bg-stone-800 transition-all shadow-sm flex items-center gap-2"
          >
            <FiFilter className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Advanced Filters</span>
          </button>
        </div>
      </section>

      {/* Global Search Interface */}
      <section className="card-premium p-6 bg-white overflow-visible">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <ServiceSelector
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search for services (e.g. Plumber, Electrician, Barber)..."
              showSuggestions={true}
              allowCustom={true}
              className="h-14 border-stone-100 focus:border-trust rounded-xl"
            />
          </div>

          <div className="flex items-center gap-4 px-4 h-14 bg-stone-50 border border-stone-100 rounded-xl min-w-[200px]">
            <FiMapPin className="text-trust w-5 h-5 flex-shrink-0" />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest leading-none mb-1">Sorting strategy</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent border-none p-0 text-sm font-bold text-charcoal focus:ring-0 cursor-pointer appearance-none"
              >
                <option value="distance">Proximity Units</option>
                <option value="price">Budget Spectrum</option>
                <option value="rating">Reputation Index</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Registry Content */}
      <section>
        {errorMessage ? (
          <div className="p-12 border border-dashed border-stone-300 text-center rounded-3xl bg-stone-50/50">
            <FiUser className="w-12 h-12 mx-auto mb-6 text-stone-200" />
            <h3 className="text-xl font-tight font-bold text-charcoal mb-2">Registry Connection Failure</h3>
            <p className="text-graphite mb-8 max-w-sm mx-auto">{errorMessage}</p>
            <button
              onClick={loadProfessionals}
              className="btn-primary text-[11px]"
            >
              RETRY CONNECTION
            </button>
          </div>
        ) : filteredAndSortedProfessionals.length === 0 ? (
          <div className="p-20 border border-dashed border-stone-300 text-center rounded-3xl">
            <FiSearch className="w-16 h-16 mx-auto mb-6 text-stone-200" />
            <h3 className="text-2xl font-tight font-bold text-stone-400">Zero Nodes Identified</h3>
            <p className="text-stone-400 mt-2">No professionals match your current search parameters.</p>
          </div>
        ) : (
          <div
            className={viewMode === 'grid'
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              : "space-y-6"
            }
          >
            {filteredAndSortedProfessionals.map((professional) => {
              const verificationState = getVerificationState(professional);
              const fullyVerified = verificationState.fullyVerified;

              return (
                <Link
                  key={professional._id}
                  to={`/dashboard/professional/${professional._id}`}
                  className={`group card-premium overflow-hidden flex transition-all duration-500 ${viewMode === 'grid' ? 'flex-col' : 'flex-row items-center p-6 gap-8'
                    }`}
                >
                  <div className={`relative overflow-hidden ${viewMode === 'grid' ? 'h-72 w-full' : 'w-32 h-32 rounded-2xl flex-shrink-0'
                    }`}>
                    <img
                      src={professional.image || '/images/placeholder.jpeg'}
                      alt={professional.name}
                      className="w-full h-full object-cover transition-all duration-700 grayscale group-hover:grayscale-0 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-charcoal/5 group-hover:bg-transparent transition-colors"></div>

                    {viewMode === 'grid' && (
                      <div className="absolute top-6 right-6 flex flex-col gap-2">
                        <div className="px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-[10px] font-bold text-charcoal shadow-sm border border-stone-100 flex items-center gap-1.5">
                          <FiStar className="text-trust fill-trust w-3 h-3" />
                          {professional.rating || '4.5'}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={`flex-1 ${viewMode === 'grid' ? 'p-8' : ''}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="label-caps text-trust mb-1.5">{professional.category}</div>
                        <h3 className="text-2xl font-tight font-bold text-charcoal group-hover:text-trust transition-colors flex items-center gap-2">
                          {professional.name}
                          {fullyVerified && <FiShield className="w-5 h-5 text-trust fill-trust/5" />}
                        </h3>
                      </div>
                      {viewMode === 'list' && (
                        <div className="px-3 py-1.5 bg-stone-50 border border-stone-100 rounded-xl text-xs font-bold text-charcoal flex items-center gap-1.5">
                          <FiStar className="text-trust fill-trust w-3 h-3" />
                          {professional.rating || '4.5'}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-6">
                      <div className="flex items-center gap-1.5">
                        <FiMapPin className="text-trust" />
                        {formatDistance(professional.distance)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FiClock className="text-stone-300" />
                        Responds fast
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-6 border-y border-stone-50 font-tight">
                      <div>
                        <div className="text-2xl font-bold text-charcoal">
                          ₦{professional.hourlyRate?.toLocaleString() || '2,500'}
                        </div>
                        <div className="label-caps text-[9px] text-stone-400 mt-1">Starting Rate</div>
                      </div>

                      <div className="flex gap-2">
                        {(() => {
                          const isConnected = connections.has(professional._id);
                          const hasRequestSent = connectionRequests.has(professional._id);

                          if (isConnected) {
                            return (
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStartChat(professional); }}
                                className="p-4 bg-trust text-white rounded-2xl hover:bg-trust/90 transition-all shadow-sm"
                              >
                                <FiMessageSquare className="w-5 h-5" />
                              </button>
                            );
                          } else if (hasRequestSent) {
                            return (
                              <div className="px-4 py-2 bg-stone-100 text-stone-500 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-stone-200 flex items-center gap-2">
                                <FiClock className="w-3 h-3" /> PENDING
                              </div>
                            );
                          } else {
                            return (
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleConnect(professional); }}
                                className="p-4 bg-charcoal text-white rounded-2xl hover:bg-stone-800 transition-all group/btn"
                              >
                                <FiArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                              </button>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Filter Architecture */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="card-premium bg-white p-10 max-w-lg w-full animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-start mb-10">
              <div>
                <label className="label-caps text-trust mb-2 block">Registry Refining</label>
                <h2 className="text-3xl font-tight font-bold text-charcoal">Filter Parameters</h2>
              </div>
              <button
                onClick={() => setShowFilterModal(false)}
                className="p-3 hover:bg-stone-50 rounded-2xl transition-all"
              >
                <FiX className="w-6 h-6 text-stone-300" />
              </button>
            </div>

            <div className="space-y-8">
              {/* Category Search */}
              <div>
                <label className="label-caps text-stone-400 block mb-4">Service Category</label>
                <div className="relative group">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-trust transition-colors" />
                  <input
                    type="text"
                    placeholder="e.g. Electrician, Plumber..."
                    value={filters.service}
                    onChange={(e) => setFilters(prev => ({ ...prev, service: e.target.value }))}
                    className="input-field pl-12 h-14 bg-stone-50/50 border-stone-100"
                  />
                </div>
              </div>

              {/* Location Context */}
              <div>
                <label className="label-caps text-stone-400 block mb-4">Geographic Focus</label>
                <div className="relative group">
                  <FiMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-trust transition-colors" />
                  <input
                    type="text"
                    placeholder="e.g. Lagos, Victoria Island"
                    value={filters.location}
                    onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                    className="input-field pl-12 h-14 bg-stone-50/50 border-stone-100"
                  />
                </div>
              </div>

              {/* Price Spectrum */}
              <div>
                <label className="label-caps text-stone-400 block mb-4">Budget Spectrum (₦/hr)</label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-stone-300 uppercase tracking-tighter">Minimum</span>
                    <input
                      type="number"
                      value={filters.priceRange.min}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        priceRange: { ...prev.priceRange, min: parseInt(e.target.value) || 0 }
                      }))}
                      className="input-field h-12 bg-stone-50/50 border-stone-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-stone-300 uppercase tracking-tighter">Maximum</span>
                    <input
                      type="number"
                      value={filters.priceRange.max}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        priceRange: { ...prev.priceRange, max: parseInt(e.target.value) || 100000 }
                      }))}
                      className="input-field h-12 bg-stone-50/50 border-stone-100"
                    />
                  </div>
                </div>
              </div>

              {/* Reputation Index */}
              <div>
                <label className="label-caps text-stone-400 block mb-4">Min Reputation Index</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setFilters(prev => ({ ...prev, rating: star }))}
                      className={`flex-1 py-4 rounded-xl border transition-all flex items-center justify-center gap-2 font-bold ${filters.rating >= star
                        ? 'bg-trust/5 text-trust border-trust/20'
                        : 'bg-stone-50 border-stone-100 text-stone-300'
                        }`}
                    >
                      <FiStar className={`w-4 h-4 ${filters.rating >= star ? 'fill-trust' : ''}`} />
                      <span className="text-sm">{star}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-12 flex gap-4">
              <button
                onClick={() => {
                  setFilters({ service: '', location: '', priceRange: { min: 0, max: 100000 }, rating: 0, verified: false });
                  setShowFilterModal(false);
                }}
                className="flex-1 py-4 text-[11px] font-bold uppercase tracking-widest text-stone-400 hover:text-charcoal transition-colors"
              >
                Reset
              </button>
              <button
                onClick={() => setShowFilterModal(false)}
                className="flex-[2] btn-primary py-4 text-[11px]"
              >
                APPLY PARAMETERS
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Unfriend Negotiation */}
      {showUnfriendModal && professionalToUnfriend && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
          <div className="card-premium bg-white p-10 max-w-md w-full animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-clay/10 rounded-full flex items-center justify-center mb-6">
              <FiUser className="w-8 h-8 text-clay" />
            </div>

            <h3 className="text-2xl font-tight font-bold text-charcoal mb-4">
              Unfriend {professionalToUnfriend.name?.split(' ')[0]}?
            </h3>

            <div className="text-graphite mb-8 leading-relaxed space-y-4">
              <p>Are you certain you wish to terminate this connection? This action is permanent and will execute the following:</p>
              <ul className="space-y-2 text-[11px] font-bold uppercase tracking-widest text-stone-400">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                  Flush connection history
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                  Wipe secure chat logs
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                  Revoke mutual access
                </li>
              </ul>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowUnfriendModal(false);
                  setProfessionalToUnfriend(null);
                }}
                className="flex-1 label-caps text-stone-400 hover:text-charcoal transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleUnfriendConfirm}
                className="flex-1 bg-clay text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[11px] hover:bg-clay/90 transition-all"
              >
                CONFIRM WIPE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalDiscovery;
