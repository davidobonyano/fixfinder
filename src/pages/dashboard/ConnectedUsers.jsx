import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaStar, FaClock, FaComments, FaHeart, FaFilter, FaSearch, FaTh, FaList, FaTimes } from 'react-icons/fa';
import { getConnections, removeConnection, createOrGetConversation, getUser, getProfessional, getProfessionalReviews } from '../../utils/api';
import UserFullProfileModal from '../../components/UserFullProfileModal';
import { useAuth } from '../../context/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { useLocation as useLocationHook } from '../../hooks/useLocation';
import { calculateDistance as haversineDistance, formatDistance, formatAddressShort } from '../../utils/locationUtils';

const ConnectedUsers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [filters, setFilters] = useState({
    service: '',
    location: '',
    rating: 0
  });
  const [showUnfriendModal, setShowUnfriendModal] = useState(false);
  const [userToUnfriend, setUserToUnfriend] = useState(null);
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [fullProfileUser, setFullProfileUser] = useState(null);
  const { location: detectedLocation } = useLocationHook(false);
  const savedLat = (user?.location?.coordinates?.lat ?? user?.location?.latitude);
  const savedLng = (user?.location?.coordinates?.lng ?? user?.location?.longitude);
  const userLat = detectedLocation?.latitude ?? (savedLat != null ? Number(savedLat) : undefined);
  const userLng = detectedLocation?.longitude ?? (savedLng != null ? Number(savedLng) : undefined);

  // Debug: log each connected professional's coords and computed distance whenever list or user location changes
  useEffect(() => {
    try {
      if (!Array.isArray(connections) || !userLat || !userLng) return;
      connections.forEach((c) => {
        if (c?.userType === 'professional' && c?.location?.coordinates) {
          const d = haversineDistance(
            Number(userLat),
            Number(userLng),
            Number(c.location.coordinates.lat),
            Number(c.location.coordinates.lng)
          );
          console.log('🧭 Connected Pro distance debug:', {
            name: c.name,
            userLat, userLng,
            proLat: c.location.coordinates.lat,
            proLng: c.location.coordinates.lng,
            distanceKm: d
          });
        }
      });
    } catch (e) {}
  }, [connections, userLat, userLng]);

  // Use same image resolution approach as chat: prefer profilePicture, then avatarUrl
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fixfinder-backend-8yjj.onrender.com';
  const resolveImageUrl = (url) => {
    if (!url) return '/images/placeholder.jpeg';
    const trimmed = typeof url === 'string' ? url.trim() : url;
    if (
      trimmed.startsWith('http') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('blob:') ||
      trimmed.startsWith('//')
    ) {
      return trimmed;
    }
    // Handle relative paths with or without leading slash (e.g., "uploads/.." or "/uploads/..")
    const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${API_BASE}${normalized}`;
  };

  useEffect(() => {
    if (!user?.role) return; // Wait for role to be available to avoid wrong mapping
    loadConnections();
  }, [user?.role]);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const response = await getConnections();
      if (response.success) {
        // Normalize connected counterpart based on current user's role (stable and explicit)
        const userConnections = (response.data || [])
          .map((conn) => {
            try {
              console.log('🧩 Raw connection item:', {
                requester: {
                  id: conn?.requester?._id,
                  name: conn?.requester?.name || conn?.requester?.fullName,
                  profilePicture: conn?.requester?.profilePicture,
                  avatarUrl: conn?.requester?.avatarUrl,
                  imageUrl: conn?.requester?.imageUrl,
                  photoUrl: conn?.requester?.photoUrl
                },
                professional: {
                  id: conn?.professional?._id,
                  name: conn?.professional?.name || conn?.professional?.businessName,
                  photos: Array.isArray(conn?.professional?.photos) ? conn.professional.photos.slice(0, 1) : conn?.professional?.photos,
                  profilePicture: conn?.professional?.profilePicture,
                  avatarUrl: conn?.professional?.avatarUrl,
                  image: conn?.professional?.image,
                  user_profilePicture: conn?.professional?.user?.profilePicture,
                  user_avatarUrl: conn?.professional?.user?.avatarUrl
                }
              });
            } catch (e) {}
            if (user?.role === 'professional') {
              // Show the requester (a user document)
              const requester = conn?.requester || {};
              const image = requester.profilePicture
                || requester.avatarUrl
                || requester.imageUrl
                || requester.photoUrl
                || requester.user?.profilePicture
                || requester.user?.avatarUrl
                || requester.profile?.profilePicture
                || requester.picture
                || requester.image
                || requester.photo;
              return {
                _id: requester._id || requester.id || conn?.requesterId,
                name: requester.name || requester.fullName || 'Unknown',
                // Keep legacy field for compatibility, but render with image
                profilePicture: requester.profilePicture || requester.avatarUrl || requester.imageUrl || requester.photoUrl || requester.user?.profilePicture || requester.user?.avatarUrl || requester.profile?.profilePicture || requester.picture || requester.image || requester.photo,
                image,
                rating: requester.rating,
                category: 'User',
                connectionId: conn?._id,
                userType: 'user',
                location: requester.location
              };
            }
            // Current user is a user; show the professional profile
            const pro = conn?.professional || {};
            // For cards, prefer profile avatar, not portfolio; portfolio can be used as cover elsewhere
            const proImage = pro.user?.profilePicture
              || pro.user?.avatarUrl
              || pro.profilePicture
              || pro.avatarUrl
              || pro.image
              || (Array.isArray(pro.photos) && pro.photos[0]);
            return {
              _id: pro._id || pro.id || conn?.professionalId,
              name: pro.name || pro.businessName || 'Unknown',
              // Prefer portfolio photo, then pro.profilePicture/avatarUrl, then nested user.profilePicture
              profilePicture: (Array.isArray(pro.photos) && pro.photos[0]) 
                || pro.profilePicture 
                || pro.avatarUrl 
                || pro.image 
                || pro.user?.profilePicture 
                || pro.user?.avatarUrl,
              image: proImage,
              rating: pro.rating,
              category: pro.category || 'Professional',
              connectionId: conn?._id,
              userType: 'professional',
              location: pro.location
            };
          })
          .filter(c => c && c.connectionId && c._id);
        try {
          console.log('🔎 ConnectedUsers mapped:', userConnections.map(u => ({
            id: u._id,
            name: u.name,
            profilePicture: u.profilePicture,
            image: u.image,
            userType: u.userType,
            category: u.category
          })));
        } catch (e) {}

        setConnections(userConnections);

        // Enrich missing media and locations
        const needsEnrichment = userConnections.filter(u => (!u.image && !u.profilePicture) || !u.location || !u.location?.coordinates || (u.userType === 'professional' && (u.rating == null || u.ratingCount == null)));
        if (needsEnrichment.length > 0) {
          try {
            const enriched = await Promise.all(userConnections.map(async (u) => {
              const hasMedia = !!(u.image || u.profilePicture);
              const hasCoords = !!(u.location?.coordinates?.lat && u.location?.coordinates?.lng);
              if (hasMedia && hasCoords) return u;
              try {
                if (u.userType === 'user') {
                  const userData = await getUser(u._id);
                  try { console.log('👤 getUser response:', userData); } catch (e) {}
                  const userPayload = userData?.data || userData; // handle wrapped responses
                  const rawImage = userPayload?.profilePicture
                    || userPayload?.avatarUrl
                    || userPayload?.imageUrl
                    || userPayload?.photoUrl
                    || userPayload?.profile?.profilePicture
                    || userPayload?.picture
                    || userPayload?.image
                    || userPayload?.photo;
                  const image = resolveImageUrl(rawImage);
                  try { console.log('👤 chosen user image:', rawImage, '→', image); } catch (e) {}
                  const location = userPayload?.location || u.location;
                  return { ...u, image: rawImage ? image : u.image, location };
                } else if (u.userType === 'professional') {
                  const proData = await getProfessional(u._id, { byUser: false });
                  try { console.log('🧑‍🔧 getProfessional response:', proData); } catch (e) {}
                  const proPayload = proData?.data || proData; // handle wrapped responses
                  const rawImage = (Array.isArray(proPayload?.photos) && proPayload.photos[0])
                    || proPayload?.user?.profilePicture
                    || proPayload?.user?.avatarUrl
                    || proPayload?.profilePicture
                    || proPayload?.avatarUrl
                    || proPayload?.image;
                  const image = resolveImageUrl(rawImage);
                  try { console.log('🧑‍🔧 chosen pro image:', rawImage, '→', image); } catch (e) {}
                  const location = proPayload?.location || u.location;
                  let ratingAvg = proPayload?.ratingAvg || proPayload?.rating || 0;
                  let ratingCount = proPayload?.ratingCount || proPayload?.reviewCount || 0;
                  try {
                    // fetch 2 recent reviews
                    const r = await getProfessionalReviews(proPayload?._id || u._id, { limit: 2 });
                    const items = r?.data?.reviews || r?.data || [];
                    return { ...u, image: rawImage ? image : u.image, location, ratingAvg, ratingCount, reviews: items };
                  } catch (_) {
                    return { ...u, image: rawImage ? image : u.image, location, ratingAvg, ratingCount };
                  }
                }
              } catch (e) {
                // Ignore enrichment errors per entry
              }
              return u;
            }));
            setConnections(enriched);
          } catch (e) {
            // Ignore enrichment batch errors
          }
        }
      }
    } catch (err) {
      console.error('Error loading connections:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnfriendClick = (connectedUser) => {
    setUserToUnfriend(connectedUser);
    setShowUnfriendModal(true);
  };

  const handleUnfriendConfirm = async () => {
    if (!userToUnfriend) return;
    
    try {
      const response = await removeConnection(userToUnfriend.connectionId);
      if (response.success) {
        setConnections(prev => prev.filter(c => c.connectionId !== userToUnfriend.connectionId));
        success(`Removed ${userToUnfriend.name} from your connections.`);
      } else {
        error('Failed to remove connection. Please try again.');
      }
    } catch (err) {
      console.error('Error removing connection:', err);
      error('Failed to remove connection. Please try again.');
    }
    
    setShowUnfriendModal(false);
    setUserToUnfriend(null);
  };

  const handleStartChat = async (connectedUser) => {
    try {
      console.log('💬 Starting chat with user:', connectedUser._id);
      
      const response = await createOrGetConversation({
        otherUserId: connectedUser._id
      });
      
      if (response.success) {
        console.log('✅ Conversation created/found:', response.data);
        // Use the correct dashboard route based on user type
        const basePath = user?.role === 'professional' ? '/dashboard/professional' : '/dashboard';
        navigate(`${basePath}/messages/${response.data._id}`, { state: { conversation: response.data } });
      } else {
        error('Failed to create conversation');
      }
    } catch (err) {
      error('Failed to start chat');
      console.error('Error starting chat:', err);
    }
  };

  const handleViewFullProfile = async (connectedUser) => {
    try {
      if (connectedUser.userType === 'user') {
        const resp = await getUser(connectedUser._id);
        const payload = resp?.data || resp;
        setFullProfileUser(payload || connectedUser);
        setShowFullProfile(true);
      } else {
        // For professionals, navigate to dashboard professional profile route
        console.log('Navigating to professional profile:', connectedUser._id);
        const path = `/dashboard/professional/${connectedUser._id}`;
        navigate(path);
      }
    } catch (e) {
      console.error('Error in handleViewFullProfile:', e);
      // Fallback: try navigating directly if it's a professional
      if (connectedUser.userType === 'professional') {
        navigate(`/dashboard/professional/${connectedUser._id}`);
      } else {
        setFullProfileUser(connectedUser);
        setShowFullProfile(true);
      }
    }
  };

  const filteredConnections = connections.filter(conn => {
    const matchesService = !filters.service || 
      conn.category?.toLowerCase().includes(filters.service.toLowerCase());
    const matchesLocation = !filters.location || 
      conn.location?.address?.toLowerCase().includes(filters.location.toLowerCase());
    const matchesRating = (conn.rating || 0) >= filters.rating;
    
    return matchesService && matchesLocation && matchesRating;
  });

  if (loading || !user?.role) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading connected users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10 dark:bg-gray-900/85 dark:border-gray-800 dark:shadow-none backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 text-gray-900 dark:text-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Connected Users</h1>
              <p className="text-gray-600 dark:text-gray-400">{filteredConnections.length} connected users</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-gray-100 rounded-lg p-1 dark:bg-gray-800 dark:border dark:border-gray-700">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md ${
                    viewMode === 'grid'
                      ? 'bg-white shadow-sm dark:bg-gray-700 dark:shadow-none'
                      : 'dark:text-gray-300'
                  }`}
                  title="Grid View"
                >
                  <FaTh className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md ${
                    viewMode === 'list'
                      ? 'bg-white shadow-sm dark:bg-gray-700 dark:shadow-none'
                      : 'dark:text-gray-300'
                  }`}
                  title="List View"
                >
                  <FaList className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-b dark:bg-gray-900/80 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by name or service..."
                  value={filters.service}
                  onChange={(e) => setFilters(prev => ({ ...prev, service: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by location..."
                  value={filters.location}
                  onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Users Grid/List */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredConnections.map((connectedUser) => (
              <div
                key={connectedUser._id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer dark:bg-gray-900 dark:border-gray-800 dark:hover:shadow-lg dark:hover:shadow-black/40"
                onClick={(e) => {
                  // Only navigate if clicking on the card itself, not buttons
                  if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
                    handleViewFullProfile(connectedUser);
                  }
                }}
              >
                <div className="relative">
                  <img
                    src={resolveImageUrl(connectedUser.image || connectedUser.profilePicture)}
                    alt={connectedUser.name}
                    className="w-full h-48 object-cover"
                    onError={(e) => { e.currentTarget.src = '/images/placeholder.jpeg'; }}
                  />
                </div>
                
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{connectedUser.name}</h3>
                    {connectedUser.location?.coordinates && userLat && userLng && (
                      <span className="text-sm font-medium text-indigo-600 dark:text-indigo-300">
                        {formatDistance(haversineDistance(
                          Number(userLat),
                          Number(userLng),
                          Number(connectedUser.location.coordinates.lat),
                          Number(connectedUser.location.coordinates.lng)
                        ))}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-600 mb-2 dark:text-gray-400">{connectedUser.category || 'User'}</p>
                {connectedUser.userType === 'professional' && connectedUser.location?.coordinates && userLat && userLng && (
                  <div className="text-sm text-gray-700 mb-2 dark:text-gray-300">
                    {formatDistance(
                      haversineDistance(
                        Number(userLat),
                        Number(userLng),
                        Number(connectedUser.location.coordinates.lat),
                        Number(connectedUser.location.coordinates.lng)
                      )
                    )}
                  </div>
                )}
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <FaClock className="w-3 h-3" />
                      <span>Available</span>
                    </div>
                    {connectedUser.location?.address && (
                      <div className="truncate" title={formatAddressShort(connectedUser.location.address)}>
                        <span className="text-gray-500">{formatAddressShort(connectedUser.location.address)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStartChat(connectedUser)}
                      className="flex-1 py-2 rounded-lg flex items-center justify-center gap-2 border border-indigo-200 text-indigo-600 hover:border-indigo-400 hover:text-indigo-700 transition-colors dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:border-indigo-400 dark:hover:text-indigo-200"
                    >
                      <FaComments className="w-4 h-4" />
                      Message
                    </button>
                    <button
                      onClick={() => handleUnfriendClick(connectedUser)}
                      className="px-4 py-2 rounded-lg flex items-center gap-2 border border-red-300 text-red-600 hover:border-red-400 hover:text-red-700 transition-colors dark:border-red-500/40 dark:text-red-400 dark:hover:border-red-500 dark:hover:text-red-300"
                    >
                      Unfriend
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredConnections.map((connectedUser) => (
              <div
                key={connectedUser._id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer dark:bg-gray-900 dark:border-gray-800 dark:hover:shadow-lg dark:hover:shadow-black/40"
                onClick={(e) => {
                  // Only navigate if clicking on the card itself, not buttons
                  if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
                    handleViewFullProfile(connectedUser);
                  }
                }}
              >
                <div className="flex items-start gap-4">
                  <img
                    src={resolveImageUrl(connectedUser.image || connectedUser.profilePicture)}
                    alt={connectedUser.name}
                    className="w-20 h-20 object-cover rounded-lg"
                    onError={(e) => { e.currentTarget.src = '/images/placeholder.jpeg'; }}
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{connectedUser.name}</h3>
                        <p className="text-gray-600 dark:text-gray-400">{connectedUser.category || 'User'}</p>
                      </div>
                      <div className="flex items-center gap-2" />
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-500 mb-4 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <FaClock className="w-3 h-3" />
                      <span>Available</span>
                    </div>
                    {connectedUser.location?.coordinates && userLat && userLng && (
                      <div className="flex items-center gap-1">
                        <span className="text-indigo-600 font-medium dark:text-indigo-300">
                          {formatDistance(haversineDistance(
                            Number(userLat),
                            Number(userLng),
                            Number(connectedUser.location.coordinates.lat),
                            Number(connectedUser.location.coordinates.lng)
                          ))}
                        </span>
                      </div>
                    )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleStartChat(connectedUser)}
                        className="px-6 py-2 rounded-lg flex items-center gap-2 border border-indigo-200 text-indigo-600 hover:border-indigo-400 hover:text-indigo-700 transition-colors dark:border-indigo-500/40 dark:text-indigo-300 dark:hover:border-indigo-400 dark:hover:text-indigo-200"
                      >
                        <FaComments className="w-4 h-4" />
                        Message
                      </button>
                      <button
                        onClick={() => handleUnfriendClick(connectedUser)}
                        className="px-4 py-2 rounded-lg flex items-center gap-2 border border-red-300 text-red-600 hover:border-red-400 hover:text-red-700 transition-colors dark:border-red-500/40 dark:text-red-400 dark:hover:border-red-500 dark:hover:text-red-300"
                      >
                        Unfriend
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unfriend Confirmation Modal */}
      {showUnfriendModal && userToUnfriend && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 dark:bg-gray-900 dark:border dark:border-gray-700">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 dark:text-gray-100">
                Unfriend {userToUnfriend.name}?
              </h3>
              <p className="text-gray-600 mb-6 dark:text-gray-300">
                Are you sure you want to unfriend {userToUnfriend.name}? This action is irreversible and will:
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
                    setUserToUnfriend(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnfriendConfirm}
                  className="flex-1 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:border-red-400 hover:text-red-700 transition-colors dark:border-red-500/40 dark:text-red-400 dark:hover:border-red-500 dark:hover:text-red-300"
                >
                  Unfriend
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Profile Modal */}
      <UserFullProfileModal
        isOpen={showFullProfile}
        onClose={() => setShowFullProfile(false)}
        user={fullProfileUser}
      />
    </div>
  );
};

export default ConnectedUsers;
