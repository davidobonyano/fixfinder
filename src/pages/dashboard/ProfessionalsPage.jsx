import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaStar, FaClock, FaPhone, FaComments, FaFilter, FaSearch, FaTh, FaList, FaTimes, FaUser } from 'react-icons/fa';
import { getProfessionals, sendConnectionRequest, getConnectionRequests, getConnections, removeConnection, cancelConnectionRequest, createOrGetConversation, getProfessional } from '../../utils/api';
import { useAuth } from '../../context/useAuth';
import { useLocation as useLocationHook } from '../../hooks/useLocation';
import { calculateDistance as haversineDistance, formatDistance } from '../../utils/locationUtils';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import ServiceSelector from '../../components/ServiceSelector';
import VerifiedBadge from '../../components/VerifiedBadge';
import { getVerificationState } from '../../utils/verificationUtils';

const ProfessionalsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const { location: detectedLocation } = useLocationHook(false);
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
  const [connectedProDetails, setConnectedProDetails] = useState(new Map()); // Map of professionalId -> professional payload
  const [errorMessage, setErrorMessage] = useState('');
  const [showUnfriendModal, setShowUnfriendModal] = useState(false);
  const [professionalToUnfriend, setProfessionalToUnfriend] = useState(null);

  useEffect(() => {
    // prefer detected center, fallback to saved, then default; no auto prompt
    const fromDetected = detectedLocation?.latitude && detectedLocation?.longitude
      ? { lat: detectedLocation.latitude, lng: detectedLocation.longitude }
      : null;
    const fromUser = user?.location?.coordinates?.lat && user?.location?.coordinates?.lng
      ? { lat: Number(user.location.coordinates.lat), lng: Number(user.location.coordinates.lng) }
      : (user?.location?.latitude && user?.location?.longitude
          ? { lat: Number(user.location.latitude), lng: Number(user.location.longitude) }
          : null);
    setUserLocation(fromDetected || fromUser || { lat: 6.5244, lng: 3.3792 });
    try {
      console.log('📌 Connected Pros center:', fromDetected ? 'detected' : fromUser ? 'user.saved' : 'default', fromDetected || fromUser || { lat: 6.5244, lng: 3.3792 });
    } catch (e) {}
    loadProfessionals();
    checkExistingConnectionRequests();
    checkExistingConnections();
  }, []);

  // Update center when detected location arrives later
  useEffect(() => {
    if (detectedLocation?.latitude && detectedLocation?.longitude) {
      const center = { lat: detectedLocation.latitude, lng: detectedLocation.longitude };
      setUserLocation(center);
      try { console.log('📌 Connected Pros center (detected update):', center); } catch (e) {}
    }
  }, [detectedLocation?.latitude, detectedLocation?.longitude]);

  // Update center if saved user location becomes available later
  useEffect(() => {
    if (!detectedLocation?.latitude && (user?.location?.coordinates?.lat && user?.location?.coordinates?.lng)) {
      const center = { lat: Number(user.location.coordinates.lat), lng: Number(user.location.coordinates.lng) };
      setUserLocation(center);
      try { console.log('📌 Connected Pros center (user.saved update):', center); } catch (e) {}
    }
  }, [user?.location?.coordinates?.lat, user?.location?.coordinates?.lng]);

  // Reload list whenever center changes
  useEffect(() => {
    if (userLocation) {
      loadProfessionals();
    }
  }, [userLocation]);

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
        const pendingRequests = (response.data || [])
          .filter(req => req && req.status === 'pending' && req.professional && req.professional._id)
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
        const detailsMap = new Map();
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
          if (connection.professional?._id) {
            detailsMap.set(connection.professional._id, connection.professional);
          }
        });
        console.log('🔍 All Professionals - Final connections map:', Array.from(connectionsMap.entries()));
        setConnections(connectionsMap);
        setConnectedProDetails(detailsMap);
      }
    } catch (err) {
      console.log('Could not check existing connections:', err);
    }
  };

  const getUserLocation = () => {};

  const loadProfessionals = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await getProfessionals({ limit: 50 });
      if (response?.success && Array.isArray(response.professionals) && response.professionals.length > 0) {
        const pros = response.professionals.map(pro => {
          const image = pro.user?.profilePicture
            || pro.user?.avatarUrl
            || pro.profilePicture
            || pro.avatarUrl
            || pro.image
            || '/images/placeholder.jpeg';

          return {
            ...pro,
            image
          };
        });

        if (userLocation) {
          const prosWithDistance = await Promise.all(pros.map(async (pro) => {
            let loc = pro.location;
            const connDetail = connectedProDetails.get(pro._id);
            if (!loc && connDetail?.location) loc = connDetail.location;
            if (!loc?.coordinates?.lat || !loc?.coordinates?.lng) {
              try {
                const detail = await getProfessional(pro._id, { byUser: false });
                const payload = detail?.data || detail;
                if (payload?.location) loc = payload.location;
              } catch {}
            }
            const distance = (loc?.coordinates?.lat && loc?.coordinates?.lng)
              ? haversineDistance(
                  userLocation.lat,
                  userLocation.lng,
                  Number(loc.coordinates.lat),
                  Number(loc.coordinates.lng)
                )
              : undefined;
            try {
              console.log('📍 Connected Pro card:', pro.name, loc?.coordinates, '→', distance);
            } catch (e) {}
            return { ...pro, location: loc || pro.location, distance };
          }));
          setProfessionals(prosWithDistance.sort((a,b) => (a.distance ?? 999) - (b.distance ?? 999)));
        } else {
          setProfessionals(pros);
        }
        return;
      }

      setProfessionals([]);
      setErrorMessage('No professionals are available yet. When new providers join, they’ll appear here.');
    } catch (error) {
      console.error('Error loading professionals:', error);
      setProfessionals([]);
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      setErrorMessage(
        offline
          ? 'You are currently offline. Reconnect to the internet and try again.'
          : 'We couldn’t reach the server to load your professionals. Please try again in a moment.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Using shared utils for distance formatting

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
    <div className="min-h-screen bg-slate-100/60 dark:bg-slate-950/80 backdrop-blur-sm overflow-x-hidden transition-colors">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10 dark:bg-gray-900 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Connected Professionals</h1>
              <p className="text-gray-600 dark:text-gray-400">
                {errorMessage ? 'Unable to load professionals right now.' : `${filteredProfessionals.length} connected professionals`}
              </p>
            </div>
            <div className="flex items-center gap-3">
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
              </div>
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
      <div className="bg-white/80 backdrop-blur border-b border-white/50 dark:bg-gray-900/80 dark:border-gray-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
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
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by location..."
                  value={filters.location}
                  onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Professionals Grid/List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {errorMessage ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-200">
            <div>
              <h2 className="text-lg font-semibold">We couldn’t load your professionals</h2>
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
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-6">
            {filteredProfessionals.map((professional) => {
              const verificationState = getVerificationState(professional);
              const fullyVerified = verificationState.fullyVerified;
              return (
              <Link
                key={professional._id}
                to={`/dashboard/professional/${professional._id}`}
                className="group relative block h-full overflow-hidden rounded-3xl border border-white/40 bg-white/80 shadow-[0_25px_45px_-25px_rgba(15,23,42,0.25)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_55px_-25px_rgba(15,23,42,0.35)] dark:bg-gray-900/80 dark:border-gray-800 dark:shadow-[0_25px_45px_-25px_rgba(15,15,30,0.55)] dark:hover:shadow-[0_35px_65px_-30px_rgba(15,15,40,0.7)]"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={professional.image || '/images/placeholder.jpeg'}
                    alt={professional.name}
                    className="h-64 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Badge removed from image per request */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm dark:bg-gray-900/85 dark:text-gray-100">
                    <FaMapMarkerAlt className="h-3 w-3 text-emerald-500 dark:text-emerald-300" />
                    <span>
                      {formatDistance(professional.distance)}
                    </span>
                  </div>
                </div>
                
                <div className="flex h-full flex-col gap-4 p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-gray-100 flex items-center gap-2">
                        {professional.name}
                        {fullyVerified && <VerifiedBadge size="sm" />}
                      </h3>
                      <p className="text-sm font-medium uppercase tracking-wide text-slate-500 dark:text-gray-400">{professional.category}</p>
                    </div>
                    <span className="flex items-center gap-1 rounded-full bg-amber-100/80 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
                      <FaStar className="h-3 w-3" />
                      {professional.rating || '4.5'}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <FaClock className="h-3 w-3 text-slate-400 dark:text-gray-500" />
                      <span>Available now</span>
                    </span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-300">
                      ₦{professional.hourlyRate || '2,000'}/hr
                    </span>
                  </div>

                  <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-500 ring-1 ring-slate-200/80 dark:bg-slate-800/60 dark:text-gray-300 dark:ring-slate-700/60">
                    Trusted by <span className="font-semibold text-slate-700 dark:text-gray-200">{professional.ratingCount || 0}</span> clients in your network
                  </div>

                  <div className="mt-auto flex gap-2 pt-3">
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
                              className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                            >
                              Message
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleUnfriendClick(professional);
                              }}
                              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-slate-800"
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
                            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
                          >
                            Pending
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
                            className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 dark:hover:bg-emerald-500"
                          >
                            Connect
                          </button>
                        );
                      }
                    })()}
                  </div>
                </div>
              </Link>
            )})}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProfessionals.map((professional) => {
              const verificationState = getVerificationState(professional);
              const fullyVerified = verificationState.fullyVerified;
              return (
              <Link
                key={professional._id}
                to={`/dashboard/professional/${professional._id}`}
                className="group relative block overflow-hidden rounded-3xl border border-white/40 bg-white/85 p-6 shadow-[0_20px_45px_-25px_rgba(15,23,42,0.25)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_55px_-25px_rgba(15,23,42,0.35)] dark:bg-gray-900/80 dark:border-gray-800 dark:shadow-[0_25px_45px_-25px_rgba(15,15,30,0.55)] dark:hover:shadow-[0_35px_65px_-30px_rgba(15,15,40,0.7)]"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                  <div className="relative h-24 w-full flex-shrink-0 overflow-hidden rounded-2xl sm:h-24 sm:w-24">
                    <img
                      src={professional.image || '/images/placeholder.jpeg'}
                      alt={professional.name}
                      className="h-full w-full object-cover"
                    />
                    {/* Badge removed from image per request */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-gray-900/85 dark:text-gray-100">
                      <FaMapMarkerAlt className="h-3 w-3 text-emerald-500 dark:text-emerald-300" />
                      {formatDistance(professional.distance)}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-gray-100 flex items-center gap-2">
                          {professional.name}
                          {fullyVerified && <VerifiedBadge size="sm" />}
                        </h3>
                        <p className="text-sm font-medium uppercase tracking-wide text-slate-500 dark:text-gray-400">{professional.category}</p>
                      </div>
                      <div className="flex items-center gap-2 rounded-full bg-amber-100/80 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
                        <FaStar className="h-3 w-3" />
                        {professional.rating || '4.5'}
                      </div>
                    </div>
                    
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <FaClock className="h-3 w-3 text-slate-400 dark:text-gray-500" />
                        Available now
                      </span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-300">
                        ₦{professional.hourlyRate || '2,000'}/hr
                      </span>
                      <span className="text-xs uppercase tracking-wider text-slate-400 dark:text-gray-500">
                        {professional.ratingCount || 0} repeat clients
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      {(() => {
                        const isConnected = connections.has(professional._id);
                        const hasRequestSent = connectionRequests.has(professional._id);
                        
                        if (isConnected) {
                          // Connected - show Message and Unfriend buttons
                          return (
                            <>
                              <Link
                                to={`/dashboard/messages?professional=${professional._id}`}
                                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                              >
                                Message
                              </Link>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleUnfriendClick(professional);
                                }}
                                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-slate-800"
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
                            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-slate-800"
                            >
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
                          className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400 dark:hover:bg-emerald-500"
                            >
                              Connect
                            </button>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </div>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Location</label>
                  <input
                    type="text"
                    placeholder="e.g., Lagos, Victoria Island"
                    value={filters.location}
                    onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
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
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
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
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
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
                    onClick={() => setShowFilterModal(false)}
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-700 dark:text-gray-300 dark:hover:bg-slate-800"
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

export default ProfessionalsPage;
