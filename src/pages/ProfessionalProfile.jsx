import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FaMapMarkerAlt, 
  FaStar, 
  FaClock, 
  FaPhone, 
  FaComments, 
  FaHeart, 
  FaCheckCircle, 
  FaUser,
  FaBriefcase,
  FaAward,
  FaPlay,
  FaImages,
  FaArrowLeft,
  FaShare,
  FaFlag,
  FaCalendar,
  FaMoneyBillWave,
  FaShieldAlt,
  FaEdit,
  FaCamera,
  FaVideo,
  FaUpload,
  FaCertificate,
  FaSpinner,
  FaSave,
  FaTimes,
  FaPlus,
  FaTrash
} from 'react-icons/fa';
import { getProfessionalProfile, sendConnectionRequest, getConnectionRequests, getConnections, removeConnection, cancelConnectionRequest, getUser, createOrGetConversation } from '../utils/api';
import { compressImage, validateImageFile } from '../utils/imageCompression';
import { compressVideo, validateVideoFile } from '../utils/videoCompression';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';

const ProfessionalProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();
  const { socket, isConnected: socketConnected, emit } = useSocket();
  const [professional, setProfessional] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectionRequestSent, setConnectionRequestSent] = useState(false);
  const [checkingConnectionStatus, setCheckingConnectionStatus] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionId, setConnectionId] = useState(null);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState({});
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);

  // Normalize/resolve image URLs
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
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
    const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${API_BASE}${normalized}`;
  };

  useEffect(() => {
    loadProfessionalProfile();
    
    // Get user location if this is the current user's profile
    if (user?.id === id) {
      getUserLocation();
    }
  }, [id, user]);

  // Get user's current location
  const getUserLocation = async () => {
    if (!navigator.geolocation) return;

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        });
      });

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date().toISOString()
      };

      setUserLocation(location);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  // Toggle location sharing
  const toggleLocationSharing = async () => {
    if (!userLocation) {
      await getUserLocation();
      if (!userLocation) {
        error('Unable to get your location. Please check location permissions.');
        return;
      }
    }

    if (isSharingLocation) {
      // Stop sharing
      if (socket && socketConnected) {
        emit('shareLocation', {
          userId: user?.id,
          isSharing: false
        });
      }
      setIsSharingLocation(false);
      success('Location sharing stopped');
    } else {
      // Start sharing
      if (socket && socketConnected) {
        emit('shareLocation', {
          userId: user?.id,
          location: userLocation,
          isSharing: true
        });
      }
      setIsSharingLocation(true);
      success('Location sharing started');
    }
  };

  // Check if connection request already exists
  const checkConnectionStatus = async () => {
    if (!user || !professional) return;
    
    try {
      setCheckingConnectionStatus(true);
      console.log('🔍 Checking connection status for professional:', professional._id);
      
      // Check for pending requests
      const requestsResponse = await getConnectionRequests();
      console.log('📡 Connection requests response:', requestsResponse);
      
      if (requestsResponse.success) {
        const existingRequest = (requestsResponse.data || []).find((req) => {
          const proId = typeof req.professional === 'string' ? req.professional : req.professional?._id;
          const status = req.status || req.state;
          return proId === professional._id && (status === 'pending' || status === 'sent');
        });
        console.log('📋 Existing request:', existingRequest);
        if (existingRequest) {
          setConnectionRequestSent(true);
          console.log('✅ Set connectionRequestSent to true');
        }
      }
      
      // Check for existing connections
      const connectionsResponse = await getConnections();
      console.log('📡 Connections response:', connectionsResponse);
      
      if (connectionsResponse.success) {
        const existingConnection = (connectionsResponse.data || []).find((connection) => {
          const requesterId = connection?.requester?._id || connection?.requesterId || connection?.requester;
          const proIdInConn = connection?.professional?._id || connection?.professionalId || connection?.professional;
          const professionalId = requesterId === user.id ? proIdInConn : requesterId;
          return professionalId === professional._id;
        });
        console.log('🔗 Existing connection:', existingConnection);
        if (existingConnection) {
          setIsConnected(true);
          setConnectionId(existingConnection._id);
          console.log('✅ Set isConnected to true, connectionId:', existingConnection._id);
        }
      }
    } catch (err) {
      console.log('❌ Could not check connection status:', err);
    } finally {
      setCheckingConnectionStatus(false);
    }
  };

  // Check connection status after professional loads
  useEffect(() => {
    if (professional && user) {
      checkConnectionStatus();
    }
  }, [professional, user]);

  // Refresh connection status when user changes
  useEffect(() => {
    if (user && professional) {
      checkConnectionStatus();
    }
  }, [user]);

  const loadProfessionalProfile = async () => {
    try {
      setLoading(true);
      
      const response = await getProfessionalProfile(id);
      if (response.success) {
        const professionalData = response.data;
        
        // Transform the data to match the expected structure
        const transformedProfessional = {
          ...professionalData,
          // Ensure photos array exists
          photos: professionalData.photos || [],
          // Ensure videos array exists
          videos: professionalData.videos || [],
          // Create portfolio from photos and videos
          portfolio: [
            ...(professionalData.photos || []).map((photo, index) => ({
              id: `photo_${index}`,
              type: 'image',
              url: resolveImageUrl(photo),
              title: `Portfolio Image ${index + 1}`,
              description: 'Professional work sample'
            })),
            ...(professionalData.videos || []).map((video, index) => ({
              id: `video_${index}`,
              type: 'video',
              url: resolveImageUrl(video),
              title: `Portfolio Video ${index + 1}`,
              description: 'Professional work demonstration'
            }))
          ],
          // Ensure services array exists (you might want to add this to the backend model)
          services: professionalData.services 
            || professionalData.categories 
            || (professionalData.category ? [professionalData.category] : [])
            || professionalData.skills 
            || [],
          // Ensure reviews array exists
          reviews: professionalData.reviews || [],
          // Ensure languages array exists
          languages: professionalData.languages || [],
          // Ensure certifications array exists
          certifications: professionalData.certifications || [],
          // Map rating fields
          rating: professionalData.ratingAvg || 0,
          reviewCount: professionalData.ratingCount || 0,
          // Map hourly rate
          hourlyRate: professionalData.pricePerHour || 0,
          // Map experience
          experience: professionalData.yearsOfExperience ? `${professionalData.yearsOfExperience} years` : 'Not specified',
          // Set default values for missing fields
          completedJobs: professionalData.completedJobs || 0,
          responseTime: professionalData.responseTime || 'Not specified',
          availability: professionalData.availability || 'Check availability',
          // Avatar should be the user's profile picture (not portfolio)
          image: resolveImageUrl(
            professionalData.user?.profilePicture
            || professionalData.user?.avatarUrl
            || professionalData.profilePicture
            || professionalData.avatarUrl
            || professionalData.image
          ),
          // Cover should be the first portfolio photo if available
          coverImage: resolveImageUrl(
            (professionalData.photos && professionalData.photos[0])
            || professionalData.coverImage
          ),
          // Attach user object if present (for contact info)
          user: professionalData.user || professionalData.account || professionalData.owner || null,
          // Phone normalization
          phone: professionalData.phone || professionalData.contactPhone || professionalData.user?.phone || null,
        };
        
        setProfessional(transformedProfessional);

        // Enrich avatar from user if missing
        const userId = typeof professionalData.user === 'string' 
          ? professionalData.user 
          : professionalData.user?._id;
        if ((!transformedProfessional.image || transformedProfessional.image === '/images/placeholder.jpeg') && userId) {
          try {
            const userResp = await getUser(userId);
            const userPayload = userResp?.data || userResp;
            const rawImage = userPayload?.profilePicture 
              || userPayload?.avatarUrl 
              || userPayload?.image 
              || userPayload?.photo;
            const resolved = resolveImageUrl(rawImage);
            if (rawImage) {
              setProfessional(prev => ({ ...prev, image: resolved }));
            }
          } catch (e) {
            // ignore
          }
        }
      } else {
        throw new Error('Professional not found');
      }
    } catch (error) {
      console.error('Error loading professional profile:', error);
      // Don't set professional to null, let the error handling show the not found message
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (connectionRequestSent || isConnected) {
      return;
    }

    try {
      setConnecting(true);
      // Send connection request instead of immediately creating conversation
      const response = await sendConnectionRequest(professional._id);
      
      if (response.success) {
        setConnectionRequestSent(true);
        success(`Connection request sent to ${professional.name}! They'll be notified and can accept your request.`);
      } else {
        // Handle specific error cases
        if (response.message === 'Connection request already sent') {
          setConnectionRequestSent(true);
          success('Connection request already sent!');
        } else {
          error('Failed to send connection request. Please try again.');
        }
      }
    } catch (err) {
      console.error('Error sending connection request:', err);
      // Check if it's a duplicate request error
      if (err.message && err.message.includes('already sent')) {
        setConnectionRequestSent(true);
        success('Connection request already sent!');
      } else {
        error('Failed to send connection request. Please try again.');
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!user || !professional) return;
    
    try {
      const response = await cancelConnectionRequest(professional._id);
      if (response.success) {
        setConnectionRequestSent(false);
        success(`Connection request to ${professional.name} has been cancelled.`);
      } else {
        error('Failed to cancel connection request. Please try again.');
      }
    } catch (err) {
      console.error('Error cancelling connection request:', err);
      error('Failed to cancel connection request. Please try again.');
    }
  };

  const handleUnfriend = async () => {
    if (!connectionId) return;

    try {
      const response = await removeConnection(connectionId);
      if (response.success) {
        setIsConnected(false);
        setConnectionId(null);
        success(`Removed ${professional.name} from your connections.`);
      } else {
        error('Failed to remove connection. Please try again.');
      }
    } catch (err) {
      console.error('Error removing connection:', err);
      error('Failed to remove connection. Please try again.');
    }
  };

  const handleStartChat = async () => {
    try {
      const otherUserId = (typeof professional.user === 'string')
        ? professional.user
        : (professional.user?._id || professional.user?.id);
      if (!otherUserId) {
        error('Unable to open chat: missing professional user id.');
        return;
      }
      const resp = await createOrGetConversation({ otherUserId });
      if (resp?.success && resp?.data?._id) {
        const basePath = user?.role === 'professional' ? '/dashboard/professional' : '/dashboard';
        navigate(`${basePath}/messages/${resp.data._id}`, { state: { conversation: resp.data } });
      } else {
        error('Failed to open chat. Please try again.');
      }
    } catch (e) {
      console.error('Error starting chat from ProfessionalProfile:', e);
      error('Failed to open chat. Please try again.');
    }
  };

  const handleSave = () => {
    setSaved(!saved);
    // TODO: Implement save/unsave functionality
  };

  const handleEditProfile = () => {
    setIsEditing(true);
    setEditingData({
      bio: professional.bio,
      services: professional.services,
      hourlyRate: professional.hourlyRate,
      experience: professional.experience,
      certifications: professional.certifications,
      languages: professional.languages
    });
  };

  const handleSaveProfile = async () => {
    try {
      // TODO: Implement API call to save profile
      console.log('Saving profile:', editingData);
      setIsEditing(false);
      success('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      error('Failed to save profile. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingData({});
  };

  const handleMediaUpload = async (files) => {
    setUploadingMedia(true);
    try {
      if (!files || files.length === 0) {
        error('Please select files to upload.');
        return;
      }

      // Check portfolio limits
      const currentVideos = professional.portfolio.filter(item => item.type === 'video');
      const currentImages = professional.portfolio.filter(item => item.type === 'image');
      
      let videoCount = 0;
      let imageCount = 0;
      
      // Count new media types
      Array.from(files).forEach(file => {
        if (file.type.startsWith('video/')) {
          videoCount++;
        } else if (file.type.startsWith('image/')) {
          imageCount++;
        }
      });
      
      if (videoCount > 0 && currentVideos.length + videoCount > 1) {
        error('You can only upload 1 video maximum to your portfolio.');
        return;
      }
      
      if (imageCount > 0 && currentImages.length + imageCount > 3) {
        error('You can only upload 3 images maximum to your portfolio.');
        return;
      }
      
      // Process and validate each file
      const processedFiles = [];
      for (const file of files) {
        const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
        
        let processedFile = file;
        if (mediaType === 'video') {
          validateVideoFile(file);
          processedFile = await compressVideo(file, 50); // 50MB max for videos
        } else {
          validateImageFile(file);
          processedFile = await compressImage(file, 500); // 500KB max for images
        }
        
        processedFiles.push(processedFile);
      }
      
      // TODO: Implement actual API upload
      console.log('Uploading processed media:', processedFiles);
      success(`${processedFiles.length} media file(s) uploaded successfully!`);
    } catch (error) {
      console.error('Error uploading media:', error);
      error(error.message || 'Failed to upload media. Please try again.');
    } finally {
      setUploadingMedia(false);
      setShowMediaUpload(false);
    }
  };

  const formatDistance = (distance) => {
    if (!distance) return 'Distance unknown';
    if (distance < 1) return `${Math.round(distance * 1000)}m away`;
    return `${distance.toFixed(1)}km away`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading professional profile...</p>
        </div>
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Professional Not Found</h2>
          <p className="text-gray-600 mb-4">The professional you're looking for doesn't exist.</p>
          <Link to="/dashboard/professionals" className="text-blue-600 hover:text-blue-800">
            Browse other professionals
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <FaArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="flex items-center gap-3">
              <button className="p-2 text-gray-600 hover:text-gray-900">
                <FaShare className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-gray-900">
                <FaFlag className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Cover Image */}
        <div className="relative mb-6">
          <img
            src={professional.coverImage}
            alt="Cover"
            className="w-full h-48 object-cover rounded-lg"
          />
          <div className="absolute inset-0 bg-black bg-opacity-20 rounded-lg"></div>
          <div className="absolute bottom-4 left-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <FaMapMarkerAlt className="w-4 h-4" />
              <span className="text-sm">{professional.location.address}</span>
              <span className="text-sm">• {formatDistance(professional.distance)}</span>
            </div>
          </div>
        </div>

            {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start gap-6">
                  {(professional.image && professional.image !== '/images/placeholder.jpeg') ? (
                    <img
                      src={professional.image}
                      alt={professional.name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                      onError={(e) => { e.currentTarget.src = '/images/placeholder.jpeg'; }}
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-200 border-4 border-white shadow-lg flex items-center justify-center">
                      <span className="text-xl font-semibold text-gray-500">
                        {professional.name?.charAt(0)?.toUpperCase() || 'P'}
                      </span>
                    </div>
                  )}
                <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-2xl font-bold text-gray-900">{professional.name}</h1>
                    {professional.isVerified && (
                      <FaCheckCircle className="w-6 h-6 text-green-500" />
                    )}
                  </div>
                  <p className="text-lg text-gray-600 mb-2">{professional.category}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-1">
                      <FaStar className="w-4 h-4 text-yellow-400" />
                      <span className="font-medium">{professional.rating}</span>
                      <span>({professional.reviewCount} reviews)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FaBriefcase className="w-4 h-4" />
                      <span>{professional.completedJobs} completed jobs</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FaClock className="w-4 h-4" />
                      <span>{professional.responseTime}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl font-bold text-green-600">
                      ₦{professional.hourlyRate.toLocaleString()}/hr
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      {professional.availability}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {/* Edit Profile Button - Only show for own profile */}
                  {user?.id === id && (
                    <button
                      onClick={handleEditProfile}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <FaEdit className="w-4 h-4" />
                      Edit Profile
                    </button>
                  )}
                  
                  {/* Location Sharing Toggle - Only show for own profile */}
                  {user?.id === id && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                      <FaMapMarkerAlt className={`w-4 h-4 ${isSharingLocation ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className="text-sm text-gray-700">
                        {isSharingLocation ? 'Sharing location' : 'Location hidden'}
                      </span>
                      <button
                        onClick={toggleLocationSharing}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          isSharingLocation ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            isSharingLocation ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  )}
                  
                  <button
                    onClick={handleSave}
                    className={`p-3 rounded-lg flex items-center gap-2 ${
                      saved 
                        ? 'bg-red-500 text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <FaHeart className="w-4 h-4" />
                    {saved ? 'Saved' : 'Save'}
                  </button>
                  
                  {(() => {
                    console.log('🔍 ProfessionalProfile button state:', {
                      isConnected,
                      connectionRequestSent,
                      professionalId: professional._id,
                      connectionId
                    });
                    
                    if (isConnected) {
                      // Connected - show Message and Unfriend buttons
                      return (
                        <>
                          <button
                            onClick={handleStartChat}
                            className="px-6 py-3 rounded-lg flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 transition-colors"
                          >
                            <FaComments className="w-4 h-4" />
                            Message
                          </button>
                          <button
                            onClick={handleUnfriend}
                            className="px-6 py-3 rounded-lg flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 transition-colors"
                          >
                            Unfriend
                          </button>
                        </>
                      );
                    } else if (connectionRequestSent) {
                      // Request sent - show Cancel Request button
                      return (
                        <button
                          onClick={handleCancelRequest}
                          className="px-6 py-3 rounded-lg flex items-center gap-2 bg-orange-600 text-white hover:bg-orange-700 transition-colors"
                        >
                          <FaTimes className="w-4 h-4" />
                          Cancel Request
                        </button>
                      );
                    } else {
                      // Not connected - show Connect button
                      return (
                        <button
                          onClick={handleConnect}
                          disabled={connecting || checkingConnectionStatus}
                          className={`px-6 py-3 rounded-lg flex items-center gap-2 transition-colors ${
                            connecting || checkingConnectionStatus
                              ? 'bg-blue-400 text-white cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          <FaComments className="w-4 h-4" />
                          {connecting 
                            ? 'Connecting...' 
                            : checkingConnectionStatus
                            ? 'Checking...'
                            : 'Connect'
                          }
                        </button>
                      );
                    }
                  })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">About</h2>
                {isEditing && user?.id === id && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveProfile}
                      className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      <FaSave className="w-3 h-3" />
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex items-center gap-1 px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                    >
                      <FaTimes className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              {isEditing && user?.id === id ? (
                <textarea
                  value={editingData.bio || ''}
                  onChange={(e) => setEditingData(prev => ({ ...prev, bio: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Tell us about yourself and your experience..."
                />
              ) : (
                <p className="text-gray-600 leading-relaxed">{professional.bio}</p>
              )}
            </div>

            {/* Services */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Services</h2>
                {isEditing && user?.id === id && (
                  <button
                    onClick={() => setEditingData(prev => ({ 
                      ...prev, 
                      services: [...(prev.services || []), ''] 
                    }))}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    <FaPlus className="w-3 h-3" />
                    Add Service
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {isEditing && user?.id === id ? (
                  (editingData.services || professional.services).map((service, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <FaCheckCircle className="w-4 h-4 text-green-500" />
                      <input
                        type="text"
                        value={service}
                        onChange={(e) => {
                          const newServices = [...(editingData.services || professional.services)];
                          newServices[index] = e.target.value;
                          setEditingData(prev => ({ ...prev, services: newServices }));
                        }}
                        className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter service name"
                      />
                      <button
                        onClick={() => {
                          const newServices = (editingData.services || professional.services).filter((_, i) => i !== index);
                          setEditingData(prev => ({ ...prev, services: newServices }));
                        }}
                        className="p-1 text-red-600 hover:text-red-800"
                      >
                        <FaTrash className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                ) : (
                  professional.services.map((service, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <FaCheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-gray-700">{service}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Portfolio */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Portfolio</h2>
                {user?.id === id && (
                  <button
                    onClick={() => setShowMediaUpload(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FaUpload className="w-4 h-4" />
                    Add Media
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {professional.portfolio.map((item) => (
                  <div key={item.id} className="relative group">
                    {item.type === 'video' ? (
                      <div className="relative">
                        <video
                          src={item.url}
                          className="w-full h-48 object-cover rounded-lg"
                          controls
                          preload="metadata"
                          poster={professional.photos?.[0]} // Use first photo as poster
                        >
                          Your browser does not support the video tag.
                        </video>
                        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs pointer-events-none">
                          📹 Video
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <img
                          src={item.url}
                          alt={item.title}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                          📷 Image
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white p-3 rounded-b-lg">
                      <h3 className="font-medium">{item.title}</h3>
                      <p className="text-sm text-gray-200">{item.description}</p>
                    </div>
                  </div>
                ))}
                </div>
            </div>

            {/* Reviews */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Reviews</h2>
              <div className="space-y-4">
                {professional.reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{review.user}</span>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <FaStar
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating ? 'text-yellow-400' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">{review.date}</span>
                    </div>
                    <p className="text-gray-600 mb-2">{review.comment}</p>
                    <span className="text-sm text-blue-600">{review.job}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Info</h3>
              <div className="space-y-3">
                {(professional.phone || professional.user?.phone) && (
                  <div className="flex items-center gap-3">
                    <FaPhone className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">{professional.phone || professional.user?.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <FaMapMarkerAlt className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">{professional.location?.address || professional.city || 'Location not specified'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <FaClock className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">{professional.availability || 'Check availability'}</span>
                </div>
              </div>
              </div>
              
            {/* Experience & Certifications */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Experience</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <FaAward className="w-4 h-4 text-blue-500" />
                  <span className="text-gray-700">{professional.experience} experience</span>
                </div>
                <div className="flex items-center gap-3">
                  <FaBriefcase className="w-4 h-4 text-green-500" />
                  <span className="text-gray-700">{professional.completedJobs} jobs completed</span>
                </div>
                {professional.isVerified && (
                  <div className="flex items-center gap-3">
                    <FaShieldAlt className="w-4 h-4 text-purple-500" />
                    <span className="text-gray-700">Verified professional</span>
                  </div>
                )}
              </div>
            </div>

            {/* Certifications */}
              <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Certifications</h3>
                <div className="space-y-2">
                  {professional.certifications.map((cert, index) => (
                  <div key={index} className="flex items-center gap-2">
                      <FaCheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-700">{cert}</span>
                    </div>
                  ))}
                </div>
              </div>

            {/* Languages */}
              <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Languages</h3>
                <div className="flex flex-wrap gap-2">
                  {professional.languages.map((lang, index) => (
                    <span
                      key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
          </div>
        </div>
      </div>

      {/* Media Upload Modal */}
      {showMediaUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Media to Portfolio</h3>
              <button
                onClick={() => setShowMediaUpload(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Images or Videos
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={(e) => handleMediaUpload(e.target.files)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="mt-2 text-sm text-gray-600">
                  <p>• Max 1 video (50MB) and 3 images (500KB each)</p>
                  <p>• Supported: MP4, AVI, MOV, WMV, WebM for videos</p>
                  <p>• Supported: JPEG, PNG, WebP for images</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowMediaUpload(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalProfile;