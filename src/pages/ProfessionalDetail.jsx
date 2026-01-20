import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  getProfessional,
  uploadProfessionalMedia,
  getProfessionalProfile,
  sendConnectionRequest,
  getConnectionRequests,
  getConnections,
  removeConnection,
  cancelConnectionRequest,
  createOrGetConversation,
  getProfessionalReviews
} from '../utils/api';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/ToastContext';
import {
  FaStar,
  FaMapMarkerAlt,
  FaClock,
  FaCheckCircle,
  FaPhone,
  FaEnvelope,
  FaTools,
  FaPlay,
  FaBriefcase,
  FaAward,
  FaShieldAlt,
  FaComments,
  FaCalendar,
  FaTimes,
  FaSpinner
} from 'react-icons/fa';
import VerifiedBadge from '../components/VerifiedBadge';
import { getVerificationState } from '../utils/verificationUtils';

const ProfessionalDetail = () => {
  const { id } = useParams();
  const locationState = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: showError } = useToast();

  const [professional, setProfessional] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [heroMedia, setHeroMedia] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [showUnfriendModal, setShowUnfriendModal] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [connectionRequestPending, setConnectionRequestPending] = useState(false);
  const [connectionId, setConnectionId] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const API_BASE = useMemo(
    () => import.meta.env.VITE_API_BASE_URL || 'https://fixfinder-backend-8yjj.onrender.com',
    []
  );

  const resolveMediaUrl = (value, fallback = '/images/placeholder.jpeg') => {
    if (!value) return fallback;
    const trimmed = typeof value === 'string' ? value.trim() : value;
    if (!trimmed) return fallback;
    if (
      trimmed.startsWith('http') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('blob:') ||
      trimmed.startsWith('//')
    ) {
      return trimmed;
    }
    const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${API_BASE}${normalized}`;
  };

  const normalizeProfessional = (raw = {}) => {
    if (!raw || typeof raw !== 'object') return {};

    const photos = Array.isArray(raw.photos) ? raw.photos.filter(Boolean) : [];
    const videos = Array.isArray(raw.videos) ? raw.videos.filter(Boolean) : [];
    const servicesFromSource =
      raw.services ||
      raw.categories ||
      raw.specialties ||
      raw.skills ||
      (raw.category ? [raw.category] : []);

    const certifications = Array.isArray(raw.certifications)
      ? raw.certifications.filter(Boolean)
      : [];
    const languages = Array.isArray(raw.languages) ? raw.languages.filter(Boolean) : [];
    const reviews = Array.isArray(raw.reviews) ? raw.reviews : [];

    const hourlyRate =
      raw.pricePerHour ?? raw.hourlyRate ?? raw.rate ?? raw.baseRate ?? raw.pricing?.hourly;
    const ratingValue = Number(raw.ratingAvg ?? raw.rating ?? raw.averageRating ?? 0);
    const ratingCount = Number(raw.ratingCount ?? raw.reviewsCount ?? raw.reviewCount ?? 0);

    const location =
      raw.location && typeof raw.location === 'object'
        ? raw.location
        : {
          address: raw.address || raw.city || raw.state,
          city: raw.city,
          state: raw.state,
          coordinates: raw.coordinates || raw.location?.coordinates
        };

    const userObj =
      typeof raw.user === 'object'
        ? raw.user
        : raw.user
          ? { _id: raw.user }
          : raw.owner
            ? { _id: raw.owner }
            : null;

    const resolvedPhotos = photos.map((p) => resolveMediaUrl(p));
    const resolvedVideos = videos.map((v) => resolveMediaUrl(v));

    return {
      ...raw,
      _id: raw._id || raw.id,
      name: raw.name || raw.fullName || `${raw.firstName || ''} ${raw.lastName || ''}`.trim(),
      category: raw.category || raw.primaryService || raw.profession || raw.title,
      bio: raw.bio || raw.about || raw.description || '',
      photos: resolvedPhotos,
      videos: resolvedVideos,
      services: Array.isArray(servicesFromSource)
        ? servicesFromSource.map((service) => (typeof service === 'string' ? service : service?.name)).filter(Boolean)
        : [],
      certifications,
      languages,
      reviews,
      availability: raw.availability || raw.status || raw.availabilityStatus || null,
      responseTime: raw.responseTime || raw.averageResponseTime || null,
      completedJobs: raw.completedJobs ?? raw.jobsCompleted ?? raw.completedTasks ?? 0,
      yearsOfExperience: raw.yearsOfExperience ?? raw.experienceYears ?? raw.experience,
      hourlyRate: typeof hourlyRate === 'number' ? hourlyRate : Number(hourlyRate) || null,
      rating: ratingValue,
      ratingCount,
      isVerified: Boolean(raw.isVerified || raw.verified),
      location,
      phone:
        raw.phone ||
        raw.contactPhone ||
        raw.user?.phone ||
        raw.contact?.phone ||
        raw.owner?.phone ||
        null,
      email:
        raw.email ||
        raw.contactEmail ||
        raw.user?.email ||
        raw.owner?.email ||
        raw.account?.email ||
        null,
      user: userObj,
      coverImage: resolveMediaUrl(
        raw.coverImage || raw.coverPhoto || raw.bannerImage || resolvedPhotos[0] || raw.image
      ),
      image: resolveMediaUrl(
        raw.profilePicture ||
        raw.avatar ||
        raw.avatarUrl ||
        raw.image ||
        raw.user?.profilePicture ||
        raw.user?.avatarUrl ||
        resolvedPhotos[0]
      )
    };
  };

  const mergeProfessionalData = (base, enriched) => {
    if (!base) return enriched;
    if (!enriched) return base;

    const merged = {
      ...base,
      ...enriched,
      photos: Array.from(new Set([...(base.photos || []), ...(enriched.photos || [])])),
      videos: Array.from(new Set([...(base.videos || []), ...(enriched.videos || [])])),
      services: Array.from(new Set([...(base.services || []), ...(enriched.services || [])])),
      certifications: Array.from(
        new Set([...(base.certifications || []), ...(enriched.certifications || [])])
      ),
      languages: Array.from(new Set([...(base.languages || []), ...(enriched.languages || [])])),
      reviews: enriched.reviews?.length ? enriched.reviews : base.reviews || []
    };

    if (!merged.coverImage) {
      merged.coverImage = enriched.coverImage || base.coverImage;
    }
    if (!merged.image) {
      merged.image = enriched.image || base.image;
    }

    return merged;
  };

  useEffect(() => {
    const fetchProfessional = async () => {
      try {
        setLoading(true);
        setFetchError('');

        let normalizedProfessional = null;

        // Prefer data passed via route state (from list) for immediate paint
        const statePro = locationState?.state?.professional;
        if (statePro && (statePro._id === id || statePro.id === id)) {
          normalizedProfessional = normalizeProfessional(statePro);
        }

        if (!normalizedProfessional) {
          const response = await getProfessional(id, { byUser: false });
          const pro = response?.professional || response;
          if (!pro) throw new Error('Professional not found');
          normalizedProfessional = normalizeProfessional(pro);
        }

        if (user && id) {
          try {
            const profileResponse = await getProfessionalProfile(id);
            const profileData = profileResponse?.data || profileResponse?.professional;
            if (profileResponse?.success && profileData) {
              const normalizedProfile = normalizeProfessional(profileData);
              normalizedProfessional = mergeProfessionalData(
                normalizedProfessional,
                normalizedProfile
              );
            }
          } catch (profileError) {
            console.warn('Unable to load full professional profile:', profileError);
          }
        }

        setProfessional(normalizedProfessional);
      } catch (err) {
        const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
        setProfessional(null);
        setFetchError(
          offline
            ? 'You appear to be offline. Reconnect to view this professional.'
            : err.message || 'Failed to fetch professional details'
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProfessional();
    }
  }, [id]);

  useEffect(() => {
    if (!professional) return;
    const primary =
      professional.coverImage ||
      professional.coverPhoto ||
      professional.bannerImage ||
      (Array.isArray(professional.photos) && professional.photos.length > 0 && professional.photos[0]) ||
      professional.image ||
      '/images/placeholder.jpeg';
    setHeroMedia(resolveMediaUrl(primary));
  }, [professional]);

  // Get user's current location
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      },
      () => { },
      { timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  // Compute distance when we have both locations
  useEffect(() => {
    if (!userLocation || !professional) return;
    let coords = null;
    if (Array.isArray(professional.coordinates)) {
      coords = professional.coordinates;
    } else if (Array.isArray(professional.location?.coordinates)) {
      coords = professional.location.coordinates;
    } else if (
      professional.location?.coordinates &&
      typeof professional.location.coordinates === 'object'
    ) {
      const { lat, lng, latitude, longitude } = professional.location.coordinates;
      const latVal = lat ?? latitude;
      const lngVal = lng ?? longitude;
      if (latVal !== undefined && lngVal !== undefined) {
        coords = [Number(latVal), Number(lngVal)];
      }
    }
    if (!coords || coords.length !== 2) return;

    const toRad = (v) => (v * Math.PI) / 180;
    const [lat1, lon1] = userLocation;
    const [lat2, lon2] = coords;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    setDistanceKm(Math.round(d * 10) / 10);
  }, [userLocation, professional]);

  const authUserId = user?._id || user?.id || null;
  const professionalId = professional?._id || professional?.id || id;

  useEffect(() => {
    if (!professional || !professionalId) return;
    let cancelled = false;

    const loadReviews = async () => {
      try {
        setReviewsLoading(true);
        const response = await getProfessionalReviews(professionalId, { limit: 3, sort: 'recent' });

        let items = [];
        if (Array.isArray(response)) {
          items = response;
        } else if (Array.isArray(response?.data?.reviews)) {
          items = response.data.reviews;
        } else if (Array.isArray(response?.data)) {
          items = response.data;
        } else if (Array.isArray(response?.reviews)) {
          items = response.reviews;
        }

        const normalized = items
          .filter(Boolean)
          .map((rev, idx) => {
            const rating = Number(rev.rating ?? rev.score ?? rev.stars ?? 0);
            const comment = rev.comment || rev.review || rev.feedback || rev.text || '';
            const reviewerName =
              rev.reviewerName ||
              rev.user?.name ||
              rev.userName ||
              rev.customerName ||
              rev.clientName ||
              rev.name ||
              'Anonymous';
            const createdAt = rev.createdAt || rev.date || rev.reviewedAt || null;
            const userPayload =
              rev.user && typeof rev.user === 'object'
                ? rev.user
                : rev.user
                  ? { name: typeof rev.user === 'string' ? rev.user : reviewerName }
                  : { name: reviewerName };

            return {
              ...rev,
              _id: rev._id || rev.id || `${professionalId}-review-${idx}`,
              rating,
              comment,
              createdAt,
              reviewerName,
              user: userPayload
            };
          });

        if (!cancelled) {
          setReviews(normalized.slice(0, 3));
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('Unable to load professional reviews:', err);
          setReviews([]);
        }
      } finally {
        if (!cancelled) {
          setReviewsLoading(false);
        }
      }
    };

    loadReviews();

    return () => {
      cancelled = true;
    };
  }, [professional, professionalId]);

  const baseReviews = reviews.length
    ? reviews
    : Array.isArray(professional?.reviews)
      ? professional.reviews
      : [];
  const reviewCount =
    baseReviews.length ||
    professional?.ratingCount ||
    professional?.reviewCount ||
    professional?.reviews?.length ||
    0;
  const reviewList = baseReviews.slice(0, 3);

  useEffect(() => {
    if (!user || !professionalId) {
      setConnectionRequestPending(false);
      setConnectionId(null);
      return;
    }

    let cancelled = false;
    const refreshConnectionStatus = async () => {
      try {
        setCheckingConnection(true);

        try {
          const requestsResponse = await getConnectionRequests();
          if (!cancelled) {
            if (requestsResponse?.success) {
              const pendingRequest = (requestsResponse.data || []).find((req) => {
                const proId =
                  typeof req.professional === 'string'
                    ? req.professional
                    : req.professional?._id;
                const status = req.status || req.state;
                return (
                  proId === professionalId && (status === 'pending' || status === 'sent')
                );
              });
              setConnectionRequestPending(Boolean(pendingRequest));
            } else {
              setConnectionRequestPending(false);
            }
          }
        } catch (requestError) {
          console.warn('Unable to check connection requests:', requestError);
          if (!cancelled) setConnectionRequestPending(false);
        }

        try {
          const connectionsResponse = await getConnections();
          if (!cancelled) {
            if (connectionsResponse?.success) {
              const activeConnection = (connectionsResponse.data || []).find((connection) => {
                const requesterId =
                  connection?.requester?._id ||
                  connection?.requesterId ||
                  connection?.requester;
                const professionalInConnection =
                  connection?.professional?._id ||
                  connection?.professionalId ||
                  connection?.professional;
                const otherPartyId =
                  requesterId === authUserId ? professionalInConnection : requesterId;
                return otherPartyId === professionalId;
              });
              setConnectionId(activeConnection?._id || null);
            } else {
              setConnectionId(null);
            }
          }
        } catch (connectionsError) {
          console.warn('Unable to check connections:', connectionsError);
          if (!cancelled) setConnectionId(null);
        }
      } finally {
        if (!cancelled) {
          setCheckingConnection(false);
        }
      }
    };

    refreshConnectionStatus();

    return () => {
      cancelled = true;
    };
  }, [user, authUserId, professionalId]);

  const isConnected = Boolean(connectionId);

  const handleConnect = async () => {
    if (!professionalId) return;
    if (!user) {
      navigate('/login');
      return;
    }
    if (connectionRequestPending || isConnected) return;

    try {
      setCheckingConnection(true);
      const response = await sendConnectionRequest(professionalId);
      if (response?.success) {
        setConnectionRequestPending(true);
        success(`Connection request sent to ${professional?.name || 'this professional'}.`);
      } else if (response?.message?.toLowerCase().includes('already')) {
        setConnectionRequestPending(true);
        success('Connection request already sent.');
      } else {
        showError('Failed to send connection request. Please try again.');
      }
    } catch (err) {
      console.error('Error sending connection request:', err);
      if (err?.message?.toLowerCase().includes('already')) {
        setConnectionRequestPending(true);
        success('Connection request already sent.');
      } else {
        showError('Failed to send connection request. Please try again.');
      }
    } finally {
      setCheckingConnection(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!professionalId || !user) return;
    try {
      setCheckingConnection(true);
      const response = await cancelConnectionRequest(professionalId);
      if (response?.success) {
        setConnectionRequestPending(false);
        success(`Connection request to ${professional?.name || 'this professional'} cancelled.`);
      } else {
        showError('Unable to cancel the request. Please try again.');
      }
    } catch (err) {
      console.error('Error cancelling connection request:', err);
      showError('Unable to cancel the request. Please try again.');
    } finally {
      setCheckingConnection(false);
    }
  };

  const performUnfriend = async () => {
    if (!connectionId || !user) return;
    try {
      setCheckingConnection(true);
      const response = await removeConnection(connectionId);
      if (response?.success) {
        setConnectionId(null);
        setConnectionRequestPending(false);
        success(`Removed ${professional?.name || 'this professional'} from your connections.`);
        setShowUnfriendModal(false);
      } else {
        showError('Failed to remove connection. Please try again.');
      }
    } catch (err) {
      console.error('Error removing connection:', err);
      showError('Failed to remove connection. Please try again.');
    } finally {
      setCheckingConnection(false);
    }
  };

  const handleStartChat = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    const otherUserId =
      typeof professional?.user === 'string'
        ? professional.user
        : professional?.user?._id || professional?.user?.id;
    if (!otherUserId) {
      showError('Unable to start chat. Missing professional user id.');
      return;
    }

    try {
      const response = await createOrGetConversation({ otherUserId });
      if (response?.success && response?.data?._id) {
        const basePath = user?.role === 'professional' ? '/dashboard/professional' : '/dashboard';
        navigate(`${basePath}/messages/${response.data._id}`, { state: { conversation: response.data } });
      } else {
        showError('Failed to open chat. Please try again.');
      }
    } catch (err) {
      console.error('Error starting chat:', err);
      showError('Failed to open chat. Please try again.');
    }
  };

  const handleConfirmUnfriend = async () => {
    await performUnfriend();
  };

  const handleDismissUnfriendModal = () => {
    if (checkingConnection) return;
    setShowUnfriendModal(false);
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<FaStar key={i} className="text-amber-400" />);
    }

    if (hasHalfStar) {
      stars.push(<FaStar key="half" className="text-amber-400 opacity-50" />);
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<FaStar key={`empty-${i}`} className="text-gray-300" />);
    }

    return stars;
  };

  const verificationState = useMemo(() => getVerificationState(professional), [professional]);
  const { fullyVerified, emailVerified, faceVerified } = verificationState;

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading professional details...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded">
          {fetchError}
        </div>
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Professional Not Found</h1>
          <Link
            to="/professionals"
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Back to Professionals
          </Link>
        </div>
      </div>
    );
  }

  // Show signup/login requirement for non-authenticated users
  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaCheckCircle className="w-10 h-10 text-indigo-600" />
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Professional Found!
            </h1>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-center mb-4">
                <img
                  src={professional.image || professional.photos?.[0] || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face'}
                  alt={professional.name}
                  className="w-16 h-16 rounded-full object-cover mr-4"
                />
                <div className="text-left">
                  <h2 className="text-xl font-semibold text-gray-900">{professional.name}</h2>
                  <p className="text-gray-600 capitalize">{professional.category}</p>
                  <div className="flex items-center mt-1">
                    <FaStar className="w-4 h-4 text-amber-400 mr-1" />
                    <span className="text-sm text-gray-600">{professional.rating || 4.5}</span>
                    <span className="text-sm text-gray-500 ml-2">({Math.floor(Math.random() * 50) + 10} reviews)</span>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-lg font-semibold text-indigo-600">
                  ₦{professional.hourlyRate?.toLocaleString() || '2,000'}/hour
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <FaMapMarkerAlt className="w-3 h-3 inline mr-1" />
                  {professional.location?.address || professional.city || 'Lagos, Nigeria'}
                </p>
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              Sign up or log in to view full professional details, contact information, and book services.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/auth/register"
                className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Sign Up Free
              </Link>
              <Link
                to="/auth/login"
                className="bg-white text-gray-700 px-8 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors font-medium"
              >
                Log In
              </Link>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Join thousands of users who trust FYF for their professional service needs
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const portfolioPhotos = Array.isArray(professional.photos) ? professional.photos.filter(Boolean) : [];
  const portfolioVideos = Array.isArray(professional.videos) ? professional.videos.filter(Boolean) : [];
  const hasPortfolio = portfolioPhotos.length > 0 || portfolioVideos.length > 0;
  const locationLabel = professional.location?.address || professional.city || 'Location unavailable';
  const hourlyRate = professional.pricePerHour ?? professional.hourlyRate;
  const rateValue = hourlyRate !== undefined && hourlyRate !== null ? Number(hourlyRate) : null;
  const professionalUserId =
    typeof professional.user === 'object' ? professional.user?._id : professional.user;
  const isOwner =
    !!user &&
    !!professional &&
    (authUserId === professionalUserId || authUserId === professional._id);
  const firstName = professional.name?.split(' ')[0] || 'their';
  const ratingValue = Number(professional.rating ?? professional.ratingAvg ?? 0);
  const availabilityLabel = professional.availability || 'Check availability';
  const distanceLabel =
    typeof distanceKm === 'number' ? `${distanceKm}km away` : 'Distance unknown';
  const experienceLabel = professional.yearsOfExperience
    ? `${professional.yearsOfExperience}+ years`
    : professional.experience || 'Not specified';
  const completedJobs = professional.completedJobs ?? 0;
  const responseTimeLabel = professional.responseTime || 'Not specified';
  const serviceList = Array.isArray(professional.services) ? professional.services.filter(Boolean) : [];
  const certificationList = Array.isArray(professional.certifications)
    ? professional.certifications.filter(Boolean)
    : [];
  const languageList = Array.isArray(professional.languages) ? professional.languages.filter(Boolean) : [];
  const primaryActionLabel = connectionRequestPending
    ? 'Request pending'
    : isConnected
      ? 'Connected'
      : 'Connect';
  const primaryActionDisabled = checkingConnection || connectionRequestPending || isConnected || isOwner;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          to={-1}
          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
        >
          <span aria-hidden="true">←</span>
          Back to Professionals
        </Link>
      </div>

      <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-10">
        <div className="relative h-44 md:h-56 bg-slate-200">
          {heroMedia ? (
            <img
              src={heroMedia}
              alt={`${professional.name} showcase`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-slate-300" />
          )}
        </div>

        <div className="px-6 pb-6 sm:px-10 sm:pb-10">
          <div className="-mt-16 sm:-mt-20 flex flex-col md:flex-row md:items-end gap-6">
            <div className="relative">
              <img
                src={professional.image || heroMedia || '/images/placeholder.jpeg'}
                alt={professional.name}
                className="h-28 w-28 sm:h-36 sm:w-36 rounded-2xl border-4 border-white shadow-xl object-cover"
                onError={(e) => (e.currentTarget.src = '/images/placeholder.jpeg')}
              />
              {fullyVerified && (
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
                  <VerifiedBadge size="sm" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                      {professional.name}
                    </h1>
                    {fullyVerified && <VerifiedBadge size="md" />}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                    {professional.category && (
                      <span className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-medium capitalize">
                        <FaTools className="w-3 h-3" />
                        {professional.category}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-medium">
                      <FaMapMarkerAlt className="w-3 h-3" />
                      {locationLabel}
                      <span className="ml-2 text-xs font-semibold">
                        • {distanceLabel}
                      </span>
                    </span>
                    {professional.yearsOfExperience ? (
                      <span className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium">
                        <FaClock className="w-3 h-3" />
                        {professional.yearsOfExperience}+ yrs experience
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col items-start lg:items-end gap-4">
                  {typeof rateValue === 'number' && !Number.isNaN(rateValue) && (
                    <div className="text-2xl font-bold text-indigo-600">
                      ₦{rateValue.toLocaleString()}/hour
                    </div>
                  )}
                  <div className="flex flex-col items-start lg:items-end gap-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        {renderStars(ratingValue || 0)}
                      </div>
                      <span className="font-medium text-gray-700">
                        {ratingValue ? ratingValue.toFixed(1) : 'N/A'}
                      </span>
                      <span className="text-gray-400">
                        • {reviewCount} reviews
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <FaBriefcase className="w-3 h-3 text-gray-400" />
                        {completedJobs} completed jobs
                      </span>
                      <span className="flex items-center gap-1">
                        <FaClock className="w-3 h-3 text-gray-400" />
                        {responseTimeLabel}
                      </span>
                      <span className="flex items-center gap-1">
                        <FaCalendar className="w-3 h-3 text-gray-400" />
                        {availabilityLabel}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {emailVerified && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-50 px-2.5 py-1 font-semibold uppercase tracking-wide text-emerald-700">
                          <FaCheckCircle className="w-3 h-3" />
                          Email verified
                        </span>
                      )}
                      {faceVerified && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/50 bg-sky-50 px-2.5 py-1 font-semibold uppercase tracking-wide text-sky-700">
                          <FaShieldAlt className="w-3 h-3" />
                          Face verified
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {!isOwner && (
                      <button
                        type="button"
                        onClick={handleConnect}
                        disabled={primaryActionDisabled}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-sm ${primaryActionDisabled
                            ? 'bg-indigo-100 text-indigo-400 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                      >
                        <FaCalendar className="w-4 h-4" />
                        {primaryActionLabel}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleStartChat}
                      disabled={!isConnected}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-sm ${isConnected
                          ? 'bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50'
                          : 'bg-white text-gray-400 border border-gray-200 cursor-not-allowed'
                        }`}
                    >
                      <FaComments className="w-4 h-4" />
                      Message
                    </button>
                    {!isOwner && (
                      <button
                        type="button"
                        onClick={() => {
                          if (isConnected) {
                            setShowUnfriendModal(true);
                          } else {
                            handleCancelRequest();
                          }
                        }}
                        disabled={checkingConnection || (!isConnected && !connectionRequestPending)}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-sm ${isConnected || connectionRequestPending
                            ? 'bg-white text-red-600 border border-red-100 hover:bg-red-50'
                            : 'bg-white text-gray-400 border border-gray-200 cursor-not-allowed'
                          }`}
                      >
                        <FaTimes className="w-4 h-4" />
                        {isConnected ? 'Unfriend' : 'Cancel request'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-8">
        <div className="space-y-8">
          {professional.bio && (
            <section className="bg-white rounded-2xl shadow-md p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">About</h2>
              <p className="text-gray-600 leading-relaxed">{professional.bio}</p>
            </section>
          )}

          <section className="bg-white rounded-2xl shadow-md p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Professional Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-slate-50 rounded-xl p-5">
                <p className="text-sm text-gray-500 uppercase tracking-wide">Experience</p>
                <p className="mt-2 text-lg font-semibold text-gray-900">
                  {experienceLabel}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-5">
                <p className="text-sm text-gray-500 uppercase tracking-wide">Completed Jobs</p>
                <p className="mt-2 text-lg font-semibold text-gray-900">
                  {completedJobs || 'Not specified'}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-5">
                <p className="text-sm text-gray-500 uppercase tracking-wide">Response Time</p>
                <p className="mt-2 text-lg font-semibold text-gray-900">
                  {responseTimeLabel}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-5">
                <p className="text-sm text-gray-500 uppercase tracking-wide">Availability</p>
                <p className="mt-2 text-lg font-semibold text-gray-900">
                  {availabilityLabel}
                </p>
              </div>
            </div>
          </section>

          {serviceList.length > 0 && (
            <section className="bg-white rounded-2xl shadow-md p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Services</h2>
              <p className="text-sm text-gray-500 mb-4">
                What {firstName} can help you with
              </p>
              <div className="flex flex-wrap gap-2">
                {serviceList.map((service, index) => (
                  <span
                    key={`${service}-${index}`}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium capitalize"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </section>
          )}

          {hasPortfolio && (
            <section className="bg-white rounded-2xl shadow-md p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Portfolio</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    A glimpse into {firstName}'s recent work
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {portfolioPhotos.map((photo, index) => (
                  <button
                    key={`photo-${index}`}
                    type="button"
                    onClick={() => setHeroMedia(photo)}
                    className="group relative aspect-[4/3] rounded-2xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <img
                      src={photo}
                      alt={`${professional.name} portfolio ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
                {portfolioVideos.map((video, index) => (
                  <div
                    key={`video-${index}`}
                    className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-900"
                  >
                    <video
                      src={video}
                      preload="metadata"
                      controls
                      className="pointer-events-auto h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-black/30 transition-colors group-hover:bg-black/10" />
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-indigo-600 shadow-lg transition-transform group-hover:scale-105">
                        <FaPlay className="ml-0.5 h-4 w-4" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="bg-white rounded-2xl shadow-md p-6 sm:p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Reviews</h2>
              <span className="text-sm text-gray-500">{reviewCount} total reviews</span>
            </div>
            {reviewsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <FaSpinner className="animate-spin text-indigo-500" />
                Fetching recent feedback...
              </div>
            ) : reviewList.length > 0 ? (
              <div className="space-y-4">
                {reviewList.map((review, index) => {
                  const reviewerName =
                    typeof review.user === 'object'
                      ? review.user?.name || review.reviewerName || 'Anonymous'
                      : review.user || review.reviewerName || 'Anonymous';
                  const reviewDate = review.createdAt
                    ? new Date(review.createdAt).toLocaleDateString()
                    : review.date || '';
                  return (
                    <div
                      key={review._id || review.id || index}
                      className="border-b border-gray-100 pb-4 last:border-b-0"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900">{reviewerName}</p>
                          {reviewDate && <p className="text-xs text-gray-400">{reviewDate}</p>}
                        </div>
                        <div className="flex items-center gap-1 text-amber-500">
                          {[...Array(5)].map((_, i) => (
                            <FaStar
                              key={i}
                              className={`w-4 h-4 ${i < Number(review.rating || 0) ? '' : 'text-gray-300'
                                }`}
                            />
                          ))}
                          <span className="text-sm font-medium text-gray-600 ml-2">
                            {Number(review.rating || 0).toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-3 leading-relaxed">
                        {review.comment || review.feedback || review.testimonial || 'No detailed feedback provided.'}
                      </p>
                      {(review.jobId?.title || review.jobTitle || review.job) && (
                        <p className="mt-2 text-xs text-indigo-600">
                          {(typeof review.jobId === 'object' && review.jobId?.title) ||
                            review.jobTitle ||
                            review.job}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                This professional hasn’t collected any public reviews yet. Be the first to share feedback after your booking.
              </p>
            )}
          </section>

          {isOwner && (
            <section className="bg-white rounded-2xl shadow-md p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Photos/Videos</h2>
              {uploadError && (
                <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg">
                  {uploadError}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex items-center gap-3 px-4 py-2.5 bg-slate-100 rounded-lg cursor-pointer hover:bg-slate-200 border border-slate-200 text-sm font-medium text-gray-700 transition-colors">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (!files.length) return;
                      try {
                        setUploading(true);
                        setUploadError('');
                        const formData = new FormData();
                        files.forEach((f) => formData.append('files', f));
                        const res = await uploadProfessionalMedia(
                          professional._id || professional.id,
                          formData
                        );
                        if (res?.professional) {
                          setProfessional(res.professional);
                        }
                      } catch (err) {
                        setUploadError(err.message || 'Upload failed');
                      } finally {
                        setUploading(false);
                        e.target.value = '';
                      }
                    }}
                  />
                  <span>Select files</span>
                </label>
                <button
                  disabled
                  className="px-4 py-2.5 rounded-lg text-sm bg-indigo-100 text-indigo-500 cursor-not-allowed"
                  title="Drag & drop not implemented in this demo"
                >
                  Drag & drop coming soon
                </button>
                {uploading && <span className="text-sm text-gray-500">Uploading…</span>}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Max 10 files. Supported: images and videos.
              </p>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="bg-white rounded-2xl shadow-md p-6 sm:p-8 sticky top-24 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Info</h2>
              <div className="space-y-3 text-sm text-gray-700">
                {(professional.phone || professional.user?.phone) && (
                  <div className="flex items-center gap-3">
                    <FaPhone className="w-4 h-4 text-gray-500" />
                    <span>{professional.phone || professional.user?.phone}</span>
                  </div>
                )}
                {professional.email && (
                  <div className="flex items-center gap-3">
                    <FaEnvelope className="w-4 h-4 text-gray-500" />
                    <span>{professional.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <FaMapMarkerAlt className="w-4 h-4 text-gray-500" />
                  <span>{locationLabel}</span>
                </div>
                <div className="flex items-center gap-3">
                  <FaClock className="w-4 h-4 text-gray-500" />
                  <span>{availabilityLabel}</span>
                </div>
                <div className="flex items-center gap-3">
                  <FaMapMarkerAlt className="w-4 h-4 text-gray-500" />
                  <span>{distanceLabel}</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200">
              <h3 className="font-medium text-gray-800 mb-3">Quick Stats</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Rating</span>
                  <span className="font-semibold text-gray-900">
                    {ratingValue ? ratingValue.toFixed(1) : 'N/A'}/5
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Reviews</span>
                  <span className="font-semibold text-gray-900">
                    {reviewCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Experience</span>
                  <span className="font-semibold text-gray-900">
                    {experienceLabel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Status</span>
                  <span className="font-semibold">
                    {professional.isActive ? (
                      <span className="text-indigo-600">Actively accepting clients</span>
                    ) : (
                      <span className="text-gray-500">Currently unavailable</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200">
              <h3 className="font-medium text-gray-800 mb-3">Experience & Credentials</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center gap-3">
                  <FaAward className="w-4 h-4 text-indigo-500" />
                  <span>{experienceLabel}</span>
                </div>
                <div className="flex items-center gap-3">
                  <FaBriefcase className="w-4 h-4 text-amber-500" />
                  <span>{completedJobs} jobs completed</span>
                </div>
                {fullyVerified && (
                  <div className="flex items-center gap-3">
                    <FaShieldAlt className="w-4 h-4 text-emerald-500" />
                    <span>Verified professional</span>
                  </div>
                )}
              </div>
            </div>

            {!isOwner && connectionRequestPending && (
              <div className="pt-6 border-t border-slate-200">
                <p className="text-sm text-gray-500">
                  Your connection request is pending approval. You’ll be notified once {firstName} responds.
                </p>
              </div>
            )}

            {isOwner && (
              <div className="pt-6 border-t border-slate-200 space-y-2">
                <h3 className="font-medium text-gray-800">Owner Shortcuts</h3>
                <Link
                  to={`/professionals/${professional._id}/edit`}
                  className="block w-full px-4 py-2.5 text-sm font-semibold text-indigo-600 border border-indigo-100 rounded-lg hover:bg-indigo-50 transition-colors text-center"
                >
                  Edit profile
                </Link>
                <Link
                  to={`/professionals/${professional._id}/reviews`}
                  className="block w-full px-4 py-2.5 text-sm font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
                >
                  View reviews
                </Link>
              </div>
            )}
          </section>

          {certificationList.length > 0 && (
            <section className="bg-white rounded-2xl shadow-md p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Certifications</h3>
              <div className="space-y-2">
                {certificationList.map((cert, index) => (
                  <div key={`${cert}-${index}`} className="flex items-center gap-2 text-sm text-gray-700">
                    <FaCheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>{cert}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {languageList.length > 0 && (
            <section className="bg-white rounded-2xl shadow-md p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Languages</h3>
              <div className="flex flex-wrap gap-2">
                {languageList.map((language, index) => (
                  <span
                    key={`${language}-${index}`}
                    className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium capitalize"
                  >
                    {language}
                  </span>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>

      {showUnfriendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Remove {professional?.name || 'this professional'} from your connections?
            </h3>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">
              This will end your connection and clear your shared chat history. You can always reconnect later if you choose.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleConfirmUnfriend}
                disabled={checkingConnection}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400 sm:w-auto"
              >
                {checkingConnection ? <FaSpinner className="h-4 w-4 animate-spin" /> : null}
                Confirm remove
              </button>
              <button
                type="button"
                onClick={handleDismissUnfriendModal}
                disabled={checkingConnection}
                className="inline-flex w-full items-center justify-center rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400 sm:w-auto"
              >
                Keep connection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalDetail;
