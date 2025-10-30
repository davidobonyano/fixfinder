import { useState, useEffect } from 'react';
import { 
  FaUser, 
  FaCamera, 
  FaTrash, 
  FaSpinner, 
  FaCheck, 
  FaEdit, 
  FaSave, 
  FaTimes, 
  FaCalendarAlt, 
  FaSync,
  FaBriefcase,
  FaAward,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaStar,
  FaShieldAlt,
  FaCertificate,
  FaVideo,
  FaImages,
  FaUpload,
  FaPlus,
  FaLock
} from 'react-icons/fa';
import { getUserProfile, updateUserProfile, uploadProfilePicture, removeProfilePicture, sendEmailVerification, getProfessional, updateProfessional, uploadProfessionalMedia, deleteProfessionalMedia, changePassword, sendProfessionalEmailVerification, deleteAccount, snapToLGAApi } from '../../utils/api';
import { compressImage, validateImageFile } from '../../utils/imageCompression';
import { compressVideo, validateVideoFile, getFileSizeString } from '../../utils/videoCompression';
import { useAuth } from '../../context/useAuth';
import ServiceSelector from '../../components/ServiceSelector';
import { validateProfessionalForm, validatePortfolioUpload } from '../../utils/validation';
import { useLocation as useLocationHook } from '../../hooks/useLocation';

export default function ProProfile() {
  const { user: authUser, login, logout, isLoading: authLoading } = useAuth();
  const [user, setUser] = useState(null);
  const [professionalData, setProfessionalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [portfolio, setPortfolio] = useState([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [portfolioError, setPortfolioError] = useState("");
  const [portfolioSuccess, setPortfolioSuccess] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteAccountData, setDeleteAccountData] = useState({
    confirmText: "",
    password: ""
  });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    bio: "",
    services: [],
    hourlyRate: 0,
    experience: "",
    certifications: [],
    languages: []
  });
  const { location: detectedLocation } = useLocationHook(false);
  const [updatingLocation, setUpdatingLocation] = useState(false);

  const handleUpdateLocation = async () => {
    try {
      setUpdatingLocation(true);
      setError("");
      setSuccess("");
      const lat = detectedLocation?.latitude;
      const lng = detectedLocation?.longitude;
      if (!lat || !lng) {
        throw new Error('Location not available yet. Please use the Use My Location button elsewhere or try again.');
      }
      // Snap to LGA/State on backend
      const snap = await snapToLGAApi(lat, lng);
      const lga = snap?.data?.lga;
      const state = snap?.data?.state;
      const address = snap?.data?.address || (lga && state ? `${lga}, ${state}` : undefined);
      const city = lga || snap?.data?.city;

      const proId = professionalData?._id || user?.professionalId || authUser?.professionalId;
      if (!proId) throw new Error('Professional profile not found.');

      const update = {
        location: {
          address,
          city,
          state,
          coordinates: { lat, lng }
        }
      };
      const resp = await updateProfessional(proId, update);
      if (resp?.success) {
        setProfessionalData(prev => ({ ...(prev || {}), ...resp.data }));
        setUser(prev => ({ ...(prev || {}), location: resp.data?.location || update.location }));
        setSuccess('Location updated successfully. Your cards will now show accurate distance.');
      } else {
        throw new Error(resp?.message || 'Failed to update location');
      }
    } catch (e) {
      setError(e.message || 'Failed to update location');
    } finally {
      setUpdatingLocation(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Get user profile for basic info
      const userResponse = await getUserProfile();
      if (!userResponse.success) {
        throw new Error("Failed to load user profile");
      }
      
      // Get professional profile for professional-specific data
      let fetchedProfessionalData = null;
      try {
        const proResponse = await getProfessional(userResponse.data._id, { byUser: true });
        if (proResponse.success) {
          fetchedProfessionalData = proResponse.data;
          setProfessionalData(fetchedProfessionalData);
        }
      } catch (error) {
        console.log('No professional profile found, using user data only');
      }
      
      // Merge user and professional data
      const mergedData = {
        ...userResponse.data,
        ...fetchedProfessionalData,
        // Ensure professional fields are available
        bio: fetchedProfessionalData?.bio || userResponse.data.bio || "",
        services: fetchedProfessionalData?.category ? [fetchedProfessionalData.category] : (userResponse.data.services || []),
        hourlyRate: fetchedProfessionalData?.pricePerHour || userResponse.data.hourlyRate || 0,
        experience: fetchedProfessionalData?.yearsOfExperience || userResponse.data.experience || "",
        certifications: fetchedProfessionalData?.certifications || userResponse.data.certifications || [],
        languages: fetchedProfessionalData?.languages || userResponse.data.languages || [],
        portfolio: [
          ...(fetchedProfessionalData?.photosMeta || []).map((meta, index) => ({ _id: meta.publicId || `photo-${index}`, url: meta.url, type: 'image' })),
          ...(fetchedProfessionalData?.videosMeta || []).map((meta, index) => ({ _id: meta.publicId || `video-${index}`, url: meta.url, type: 'video' }))
        ]
      };
      
      console.log('🔍 Professional data loaded:', {
        photos: fetchedProfessionalData?.photos,
        videos: fetchedProfessionalData?.videos,
        photosMeta: fetchedProfessionalData?.photosMeta,
        videosMeta: fetchedProfessionalData?.videosMeta,
        portfolio: mergedData.portfolio
      });
      
      setUser(mergedData);
      setPortfolio(mergedData.portfolio || []);
      setFormData({
        name: mergedData.name || "",
        email: mergedData.email || "",
        phone: mergedData.phone || "",
        bio: mergedData.bio || "",
        services: mergedData.services || [],
        hourlyRate: mergedData.hourlyRate || 0,
        experience: mergedData.experience || "",
        certifications: mergedData.certifications || [],
        languages: mergedData.languages || []
      });
      
      // Update auth context if email verification status changed
      if (authUser && mergedData.emailVerification?.isVerified !== authUser.emailVerification?.isVerified) {
        login(authUser.token, {
          ...authUser,
          emailVerification: mergedData.emailVerification
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setError(error.message || "Failed to load profile");
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleArrayInputChange = (field, index, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'certifications' 
        ? [...prev[field], { name: '', school: '', year: '' }]
        : [...prev[field], '']
    }));
  };

  const removeArrayItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      setValidationErrors({});

      // Validate form data
      console.log('🔍 Form data being validated:', formData);
      const validation = validateProfessionalForm(formData);
      console.log('🔍 Validation result:', validation);
      if (!validation.isValid) {
        console.log('🔍 Setting validation errors:', validation.errors);
        setValidationErrors(validation.errors);
        setError("Please fix the validation errors below");
        return;
      }

      // Update user profile for basic info (name, email, phone)
      const userUpdateData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone
      };
      
      const userResponse = await updateUserProfile(userUpdateData);
      if (!userResponse.success) {
        throw new Error("Failed to update user profile");
      }

      // Update professional profile for professional-specific fields
      const professionalUpdateData = {
        name: formData.name, // Update professional name too
        bio: formData.bio,
        category: formData.services[0] || '', // Use first service as category
        pricePerHour: formData.hourlyRate,
        yearsOfExperience: formData.experience,
        certifications: formData.certifications,
        languages: formData.languages
      };

      try {
        const proId = professionalData?._id || user?.professionalId || authUser?.professionalId;
        if (!proId) {
          throw new Error("Professional profile not found. Please create a professional profile first.");
        }
        
        const proResponse = await updateProfessional(proId, professionalUpdateData);
        if (proResponse.success) {
          // Merge the updated data
          const updatedData = {
            ...userResponse.data,
            ...proResponse.data,
            // Ensure professional fields are available in the merged data
            bio: proResponse.data.bio || userResponse.data.bio || "",
            services: proResponse.data.category ? [proResponse.data.category] : (userResponse.data.services || []),
            hourlyRate: proResponse.data.pricePerHour || userResponse.data.hourlyRate || 0,
            experience: proResponse.data.yearsOfExperience || userResponse.data.experience || "",
            certifications: proResponse.data.certifications || userResponse.data.certifications || [],
            languages: proResponse.data.languages || userResponse.data.languages || [],
            portfolio: proResponse.data.photos || userResponse.data.portfolio || []
          };
          
          setUser(updatedData);
          setProfessionalData(proResponse.data);
          setPortfolio(proResponse.data.photos || []);
          
          // Update form data to reflect the changes
          setFormData({
            name: updatedData.name || "",
            email: updatedData.email || "",
            phone: updatedData.phone || "",
            bio: updatedData.bio || "",
            services: updatedData.services || [],
            hourlyRate: updatedData.hourlyRate || 0,
            experience: updatedData.experience || "",
            certifications: updatedData.certifications || [],
            languages: updatedData.languages || []
          });
          
          setIsEditing(false);
          setSuccess("Profile updated successfully!");
          
          // Update auth context if needed
          if (authUser) {
            login(authUser.token, updatedData);
          }
        } else {
          throw new Error("Failed to update professional profile");
        }
      } catch (proError) {
        console.error('Error updating professional profile:', proError);
        // If professional update fails, still show success for user data
        setUser(userResponse.data);
        setIsEditing(false);
        setSuccess("Basic profile updated successfully! Professional details may need to be updated separately.");
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      setError("");
      setSuccess("");

      // Validate and compress image
      validateImageFile(file);
      const compressedFile = await compressImage(file, 500); // 500KB max for profile pics

      const response = await uploadProfilePicture(compressedFile);
      if (response.success) {
        setUser(prev => ({
          ...prev,
          profilePicture: response.data.profilePicture,
          avatarUrl: response.data.avatarUrl
        }));
        setSuccess("Profile picture updated successfully!");
        
        // Update auth context
        if (authUser) {
          login(authUser.token, {
            ...authUser,
            profilePicture: response.data.profilePicture,
            avatarUrl: response.data.avatarUrl
          });
        }
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setError(error.message || "Failed to upload profile picture");
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleRemovePicture = async () => {
    try {
      setUploading(true);
      setError("");
      setSuccess("");

      const response = await removeProfilePicture();
      if (response.success) {
        setUser(prev => ({
          ...prev,
          profilePicture: null,
          avatarUrl: null
        }));
        setSuccess("Profile picture removed successfully!");
        
        // Update auth context
        if (authUser) {
          login(authUser.token, {
            ...authUser,
            profilePicture: null,
            avatarUrl: null
          });
        }
      }
    } catch (error) {
      console.error('Error removing picture:', error);
      setError(error.message || "Failed to remove profile picture");
    } finally {
      setUploading(false);
    }
  };

  const handleEmailVerification = async () => {
    try {
      setEmailVerifying(true);
      setError("");
      setSuccess("");

      const response = await sendProfessionalEmailVerification();
      if (response.success) {
        if (response.verificationUrl) {
          // Email service unavailable, show manual verification URL
          setSuccess(`Email service unavailable. Please copy this verification link and open it in your browser: ${response.verificationUrl}`);
        } else {
          setSuccess("Verification email sent! Check your inbox and click the link to verify your email.");
        }
      } else {
        setError(response.message || "Failed to send verification email");
      }
    } catch (error) {
      console.error('Error sending verification email:', error);
      setError(error.message || "Failed to send verification email");
    } finally {
      setEmailVerifying(false);
    }
  };

  const handleMediaUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingMedia(true);
      setError("");
      setSuccess("");
      setPortfolioError("");
      setPortfolioSuccess("");

      // Determine media type
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      console.log('🎬 Media type detected:', mediaType, 'from file type:', file.type);
      
      // Immediate check for media type limits
      if (!canUploadMediaType(mediaType)) {
        const limitMessage = mediaType === 'video' 
          ? "You can only upload 1 video maximum to your portfolio."
          : "You can only upload 3 images maximum to your portfolio.";
        setPortfolioError(limitMessage);
        throw new Error(limitMessage);
      }
      
      // Check portfolio limits with validation
      const currentVideos = portfolio.filter(item => item.type === 'video');
      const currentImages = portfolio.filter(item => item.type === 'image');
      console.log('📊 Current portfolio:', { videos: currentVideos.length, images: currentImages.length });
      console.log('📊 Portfolio items:', portfolio.map(item => ({ type: item.type, id: item._id })));
      
      const portfolioValidation = validatePortfolioUpload(mediaType, currentVideos.length, currentImages.length);
      console.log('🔍 Portfolio validation result:', portfolioValidation);
      if (!portfolioValidation.isValid) {
        console.log('❌ Portfolio validation failed:', portfolioValidation.errors);
        throw new Error(Object.values(portfolioValidation.errors)[0]);
      }
      
      // Validate and compress the file
      let processedFile = file;
      if (mediaType === 'video') {
        validateVideoFile(file);
        processedFile = await compressVideo(file, 50); // 50MB max for videos
      } else {
        validateImageFile(file);
        processedFile = await compressImage(file, 500); // 500KB max for images
      }
      
      const proId = professionalData?._id || user?.professionalId || authUser?.professionalId;
      console.log("🔍 Professional ID sources:", {
        professionalDataId: professionalData?._id,
        userProfessionalId: user?.professionalId,
        authUserProfessionalId: authUser?.professionalId,
        finalProId: proId
      });
      
      if (!proId) {
        throw new Error("Professional profile not found. Please create a professional profile first.");
      }
      
      console.log("📤 Uploading media with professional ID:", proId);
      const response = await uploadProfessionalMedia(proId, processedFile, mediaType);
      if (response.success) {
        // Add to portfolio with the correct structure
        const newMediaItem = {
          _id: response.data._id || response.data.publicId,
          url: response.data.url,
          type: response.data.type || mediaType
        };
        setPortfolio(prev => [...prev, newMediaItem]);
        setSuccess(`${mediaType === 'video' ? 'Video' : 'Image'} uploaded successfully!`);
        setPortfolioSuccess(`${mediaType === 'video' ? 'Video' : 'Image'} uploaded successfully!`);
      }
    } catch (error) {
      console.error('Error uploading media:', error);
      setError(error.message || `Failed to upload ${file.type.startsWith('video/') ? 'video' : 'image'}`);
      setPortfolioError(error.message || `Failed to upload ${file.type.startsWith('video/') ? 'video' : 'image'}`);
    } finally {
      setUploadingMedia(false);
      e.target.value = '';
    }
  };

  const handleDeleteMedia = (mediaId) => {
    const mediaItem = portfolio.find(item => item._id === mediaId);
    if (mediaItem) {
      setMediaToDelete(mediaItem);
      setShowDeleteModal(true);
    }
  };

  const confirmDeleteMedia = async () => {
    if (!mediaToDelete) return;
    
    try {
      setUploadingMedia(true);
      setError("");
      setSuccess("");

      const proId = professionalData?._id || user?.professionalId || authUser?.professionalId;
      if (!proId) {
        throw new Error("Professional profile not found. Please create a professional profile first.");
      }

      console.log('🗑️ Deleting media:', { mediaId: mediaToDelete._id, type: mediaToDelete.type });

      const response = await deleteProfessionalMedia(proId, mediaToDelete._id, mediaToDelete.type);
      console.log('🗑️ Delete response:', response);
      
      // Check for success in different possible response formats
      if (response.success || response.message || response.publicId) {
        setPortfolio(prev => prev.filter(item => item._id !== mediaToDelete._id));
        setSuccess("Media deleted successfully!");
        setShowDeleteModal(false);
        setMediaToDelete(null);
      } else {
        throw new Error(response.error || "Failed to delete media");
      }
    } catch (error) {
      console.error('Error deleting media:', error);
      setError(error.message || "Failed to delete media");
    } finally {
      setUploadingMedia(false);
    }
  };

  const cancelDeleteMedia = () => {
    setShowDeleteModal(false);
    setMediaToDelete(null);
  };

  // Check if we can upload more of a specific media type
  const canUploadMediaType = (mediaType) => {
    const currentVideos = portfolio.filter(item => item.type === 'video');
    const currentImages = portfolio.filter(item => item.type === 'image');
    
    if (mediaType === 'video') {
      return currentVideos.length < 1;
    } else if (mediaType === 'image') {
      return currentImages.length < 3;
    }
    return false;
  };

  // Auto-dismiss success message after 3 seconds
  useEffect(() => {
    if (portfolioSuccess) {
      const timer = setTimeout(() => {
        setPortfolioSuccess("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [portfolioSuccess]);

  // Preserve portfolio state during re-renders
  useEffect(() => {
    if (portfolio.length > 0) {
      console.log('🔍 Portfolio state preserved:', portfolio.map(item => ({ id: item._id, type: item.type })));
    }
  }, [portfolio]);

  // Password change handler
  const handlePasswordChange = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      // Validate password data
      if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        setError("All password fields are required");
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError("New passwords do not match");
        return;
      }

      if (passwordData.newPassword.length < 6) {
        setError("New password must be at least 6 characters long");
        return;
      }

      const response = await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (response.success) {
        setSuccess("Password changed successfully!");
        setShowPasswordModal(false);
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
      } else {
        setError(response.message || "Failed to change password");
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setError(error.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  // Delete account handler
  const handleDeleteAccount = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      // Validate delete account data
      if (deleteAccountData.confirmText !== "DELETE") {
        setError("Please type 'DELETE' to confirm account deletion");
        return;
      }

      if (!deleteAccountData.password) {
        setError("Please enter your password to confirm account deletion");
        return;
      }

      const response = await deleteAccount();
      if (response.success) {
        setSuccess("Account deleted successfully. You will be redirected to the login page.");
        // Redirect to login after 3 seconds
        setTimeout(() => {
          window.location.href = '/login';
        }, 3000);
      } else {
        setError(response.message || "Failed to delete account");
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setError(error.message || "Failed to delete account");
    } finally {
      setSaving(false);
    }
  };

  // Removed auto-refresh polling to prevent unnecessary re-renders.
  // Users can manually refresh verification status using the Refresh button.

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <FaSpinner className="w-8 h-8 animate-spin text-gray-600" />
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button 
            onClick={loadProfile}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Professional Profile</h1>
        <p className="text-gray-600">Manage your professional profile and showcase your expertise</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center gap-2">
          <FaCheck className="w-5 h-5" />
          {success}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Profile Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FaBriefcase className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Account Type</p>
              <p className="text-2xl font-bold text-gray-900 capitalize">{user?.role || "Professional"}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${user?.emailVerification?.isVerified ? 'bg-green-100' : 'bg-yellow-100'}`}>
              <FaCheck className={`w-6 h-6 ${user?.emailVerification?.isVerified ? 'text-green-600' : 'text-yellow-600'}`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Verification</p>
              <p className={`text-2xl font-bold ${user?.emailVerification?.isVerified ? 'text-green-600' : 'text-yellow-600'}`}>
                {user?.emailVerification?.isVerified ? "Verified" : "Pending"}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {user?.emailVerification?.isVerified ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  ✓ Email Verified
                </span>
              ) : (
                <button
                  onClick={() => loadProfile(true)}
                  disabled={refreshing}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 disabled:opacity-50"
                  title="Refresh verification status"
                >
                  <FaSync className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Checking...' : 'Refresh'}
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <FaCalendarAlt className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Member Since</p>
              <p className="text-2xl font-bold text-gray-900">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Picture Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Picture</h2>
        
        <div className="flex items-center gap-6">
          {/* Profile Picture Display */}
          <div className="relative">
            {user?.profilePicture || user?.avatarUrl ? (
              <img
                src={user.profilePicture || user.avatarUrl}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-200">
                <FaUser className="w-8 h-8 text-gray-400" />
              </div>
            )}
            
            {/* Upload Overlay */}
            <label className="absolute inset-0 w-24 h-24 rounded-full bg-black bg-opacity-50 flex items-center justify-center cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
              <FaCamera className="w-6 h-6 text-white" />
            </label>
            
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="profile-picture-upload"
            />
          </div>

          {/* Upload Controls */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="profile-picture-upload"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <FaSpinner className="w-4 h-4 animate-spin" />
              ) : (
                <FaCamera className="w-4 h-4" />
              )}
              {uploading ? "Uploading..." : "Change Picture"}
            </label>
            
            {(user?.profilePicture || user?.avatarUrl) && (
              <button
                onClick={handleRemovePicture}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaTrash className="w-4 h-4" />
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Professional Information Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Location quick update */}
        <div className="mb-6 p-4 rounded-lg border border-gray-200 bg-gray-50">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FaMapMarkerAlt className="w-4 h-4" /> Location
              </h3>
              <div className="text-sm text-gray-700 mt-1">
                <div>
                  Current: {user?.location?.address || `${user?.location?.city || ''}${user?.location?.city && user?.location?.state ? ', ' : ''}${user?.location?.state || ''}` || 'Not set'}
                </div>
                {user?.location?.coordinates && (
                  <div className="text-gray-500">
                    ({user.location.coordinates.lat}, {user.location.coordinates.lng})
                  </div>
                )}
              </div>
            </div>
            <div className="shrink-0">
              <button
                onClick={handleUpdateLocation}
                disabled={updatingLocation}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {updatingLocation ? <FaSpinner className="w-4 h-4 animate-spin" /> : <FaMapMarkerAlt className="w-4 h-4" />}
                {updatingLocation ? 'Updating…' : 'Update Location (Use my GPS)'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Professional Information</h2>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <FaEdit className="w-4 h-4" />
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <FaSpinner className="w-4 h-4 animate-spin" />
                ) : (
                  <FaSave className="w-4 h-4" />
                )}
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    name: user.name || "",
                    email: user.email || "",
                    phone: user.phone || "",
                    bio: user.bio || "",
                    services: user.services || [],
                    hourlyRate: user.hourlyRate || 0,
                    experience: user.experience || "",
                    certifications: user.certifications || [],
                    languages: user.languages || []
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                <FaTimes className="w-4 h-4" />
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              {isEditing ? (
                <div>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      validationErrors.name 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  {validationErrors.name && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.name}</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-900">{user?.name || "Not provided"}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              {isEditing ? (
                <div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      validationErrors.email 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  {validationErrors.email && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-900">{user?.email || "Not provided"}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              {isEditing ? (
                <div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      validationErrors.phone 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  {validationErrors.phone && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.phone}</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-900">{user?.phone || "Not provided"}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate (₦)</label>
              {isEditing ? (
                <input
                  type="number"
                  name="hourlyRate"
                  value={formData.hourlyRate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-900">₦{user?.hourlyRate?.toLocaleString() || "Not set"}</p>
              )}
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            {isEditing ? (
              <div>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    validationErrors.bio 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="Tell us about yourself and your experience..."
                />
                {validationErrors.bio && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.bio}</p>
                )}
              </div>
            ) : (
              <p className="text-gray-900">{user?.bio || "Not provided"}</p>
            )}
          </div>

          {/* Services */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Services</label>
            {isEditing ? (
              <div className="space-y-2">
                {formData.services.map((service, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex-1">
                      <ServiceSelector
                        value={service}
                        onChange={(value) => handleArrayInputChange('services', index, value)}
                        placeholder="Search for a service..."
                        className="w-full"
                      />
                    </div>
                    <button
                      onClick={() => removeArrayItem('services', index)}
                      className="p-2 text-red-600 hover:text-red-800"
                    >
                      <FaTrash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addArrayItem('services')}
                  className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:text-blue-800"
                >
                  <FaPlus className="w-4 h-4" />
                  Add Service
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {user?.services?.map((service, index) => (
                  <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                    {service}
                  </span>
                )) || <p className="text-gray-500">No services added</p>}
              </div>
            )}
          </div>

          {/* Experience */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
            {isEditing ? (
              <input
                type="text"
                name="experience"
                value={formData.experience}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 5+ years"
              />
            ) : (
              <p className="text-gray-900">{user?.experience || "Not provided"}</p>
            )}
          </div>

          {/* Certifications */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Certifications</label>
            {isEditing ? (
              <div className="space-y-3">
                {formData.certifications.map((cert, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={cert.name || ''}
                        onChange={(e) => handleArrayInputChange('certifications', index, { ...cert, name: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Certification name (e.g., Certified Plumber)"
                      />
                      <button
                        onClick={() => removeArrayItem('certifications', index)}
                        className="p-2 text-red-600 hover:text-red-800"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={cert.school || ''}
                        onChange={(e) => handleArrayInputChange('certifications', index, { ...cert, school: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="School/Institution (e.g., Lagos State Technical College)"
                      />
                      <input
                        type="text"
                        value={cert.year || ''}
                        onChange={(e) => handleArrayInputChange('certifications', index, { ...cert, year: e.target.value })}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Year"
                      />
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => addArrayItem('certifications')}
                  className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:text-blue-800"
                >
                  <FaPlus className="w-4 h-4" />
                  Add Certification
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {user?.certifications?.map((cert, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                    <FaCertificate className="w-4 h-4 text-green-500 mt-1" />
                    <div className="flex-1">
                      <span className="text-gray-900 font-medium">{cert.name || cert}</span>
                      {cert.school && (
                        <p className="text-sm text-gray-600">{cert.school}</p>
                      )}
                      {cert.year && (
                        <p className="text-xs text-gray-500">{cert.year}</p>
                      )}
                    </div>
                  </div>
                )) || <p className="text-gray-500">No certifications added</p>}
              </div>
            )}
          </div>

          {/* Languages */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Languages</label>
            {isEditing ? (
              <div className="space-y-2">
                {formData.languages.map((lang, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={lang}
                      onChange={(e) => handleArrayInputChange('languages', index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter language"
                    />
                    <button
                      onClick={() => removeArrayItem('languages', index)}
                      className="p-2 text-red-600 hover:text-red-800"
                    >
                      <FaTrash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addArrayItem('languages')}
                  className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:text-blue-800"
                >
                  <FaPlus className="w-4 h-4" />
                  Add Language
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {user?.languages?.map((lang, index) => (
                  <span key={index} className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                    {lang}
                  </span>
                )) || <p className="text-gray-500">No languages added</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Portfolio Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Portfolio</h2>
            <p className="text-sm text-gray-600 mt-1">
              Showcase your work with up to 1 video and 3 images (max 50MB for videos, 500KB for images)
            </p>
          </div>
          <div className="flex gap-2">
            <label
              htmlFor="media-upload"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                uploadingMedia || portfolio.length >= 4
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {uploadingMedia ? (
                <FaSpinner className="w-4 h-4 animate-spin" />
              ) : (
                <FaUpload className="w-4 h-4" />
              )}
              {uploadingMedia ? "Uploading..." : portfolio.length >= 4 ? "Portfolio Full" : "Add Media"}
            </label>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleMediaUpload}
              className="hidden"
              id="media-upload"
              disabled={uploadingMedia || portfolio.length >= 4}
            />
          </div>
        </div>

        {/* Portfolio Error Display */}
        {portfolioError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 text-red-600">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-red-700 text-sm font-medium">{portfolioError}</p>
              </div>
              <button
                onClick={() => setPortfolioError("")}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Portfolio Success Display */}
        {portfolioSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 text-green-600">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-green-700 text-sm font-medium">{portfolioSuccess}</p>
            </div>
          </div>
        )}

        {/* Portfolio Stats */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FaVideo className="w-4 h-4 text-blue-600" />
                <span className="text-gray-700">
                  Videos: {portfolio.filter(item => item.type === 'video').length}/1
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FaImages className="w-4 h-4 text-green-600" />
                <span className="text-gray-700">
                  Images: {portfolio.filter(item => item.type === 'image').length}/3
                </span>
              </div>
            </div>
            <div className="text-gray-500">
              Total: {portfolio.length}/4 items
            </div>
          </div>
        </div>

        {portfolio.length === 0 ? (
          <div className="text-center py-8">
            <FaImages className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No portfolio items yet</h3>
            <p className="text-gray-500 mb-4">Upload up to 1 video and 3 images to showcase your work</p>
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <p>• Videos: Max 50MB (MP4, AVI, MOV, WMV, WebM)</p>
              <p>• Images: Max 500KB (JPEG, PNG, WebP)</p>
            </div>
            <label
              htmlFor="media-upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
            >
              <FaPlus className="w-4 h-4" />
              Add Your First Media
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {portfolio.map((item, index) => (
              <div key={item._id || `portfolio-${index}-${item.type}`} className="relative group">
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  {item.type === 'video' ? (
                    <video
                      src={item.url}
                      controls
                      className="w-full h-full object-cover"
                      onError={(e) => console.error('Video load error:', e)}
                      onLoadStart={() => console.log('Video loading:', item.url)}
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt={item.title || 'Portfolio item'}
                      className="w-full h-full object-cover"
                      onError={(e) => console.error('Image load error:', e)}
                      onLoad={() => console.log('Image loaded:', item.url)}
                    />
                  )}
                </div>
                
                {/* Media type indicator */}
                <div className="absolute top-2 left-2">
                  {item.type === 'video' ? (
                    <div className="bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                      <FaVideo className="w-3 h-3" />
                      Video
                    </div>
                  ) : (
                    <div className="bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                      <FaImages className="w-3 h-3" />
                      Image
                    </div>
                  )}
                </div>
                
                {/* Delete button - positioned to not block video controls */}
                <div className="absolute top-2 right-2">
                  <button
                    onClick={() => handleDeleteMedia(item._id)}
                    disabled={uploadingMedia}
                    className="opacity-0 group-hover:opacity-100 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all duration-300 disabled:opacity-50 delay-200"
                    title="Delete media"
                  >
                    <FaTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account Security Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Security</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Password</h3>
              <p className="text-sm text-gray-600">
                Last updated: {user?.passwordUpdatedAt 
                  ? new Date(user.passwordUpdatedAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : 'Never'
                }
              </p>
            </div>
            <button onClick={() => setShowPasswordModal(true)} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
              Change Password
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Email Verification</h3>
              <p className="text-sm text-gray-600">
                {user?.emailVerification?.isVerified ? "Your email is verified" : "Verify your email address"}
              </p>
            </div>
            {!user?.emailVerification?.isVerified && (
              <button 
                onClick={handleEmailVerification}
                disabled={emailVerifying}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {emailVerifying ? (
                  <>
                    <FaSpinner className="inline mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Verify Email'
                )}
              </button>
            )}
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Professional Verification</h3>
              <p className="text-sm text-gray-600">
                {professionalData?.isVerified ? "Your professional profile is verified" : "Get your professional profile verified"}
              </p>
            </div>
            {!professionalData?.isVerified && (
              <button 
                onClick={() => setSuccess("Professional verification request sent! Our team will review your profile and get back to you within 24-48 hours.")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Request Verification
              </button>
            )}
            {professionalData?.isVerified && (
              <div className="flex items-center gap-2 text-green-600">
                <FaShieldAlt className="w-4 h-4" />
                <span className="text-sm font-medium">Verified Professional</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
            <div>
              <h3 className="font-medium text-red-900">Delete Account</h3>
              <p className="text-sm text-red-600">
                Permanently delete your account and all associated data
              </p>
            </div>
            <button 
              onClick={() => setShowDeleteAccountModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <FaTrash className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Media</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this {mediaToDelete?.type}? This action cannot be undone.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDeleteMedia}
                disabled={uploadingMedia}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteMedia}
                disabled={uploadingMedia}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {uploadingMedia ? (
                  <>
                    <FaSpinner className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-full">
                <FaLock className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter current password"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter new password"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: ""
                  });
                }}
                disabled={saving}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordChange}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <FaSpinner className="w-4 h-4 animate-spin" />
                    Changing...
                  </>
                ) : (
                  'Change Password'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <FaTrash className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Account</h3>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">
                  <strong>Warning:</strong> This action cannot be undone. This will permanently delete your account and remove all data from our servers.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type <span className="font-bold text-red-600">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteAccountData.confirmText}
                  onChange={(e) => setDeleteAccountData(prev => ({ ...prev, confirmText: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Type DELETE to confirm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={deleteAccountData.password}
                  onChange={(e) => setDeleteAccountData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Enter your password"
                />
              </div>
            </div>
            
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowDeleteAccountModal(false);
                  setDeleteAccountData({
                    confirmText: "",
                    password: ""
                  });
                }}
                disabled={saving}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={saving || deleteAccountData.confirmText !== "DELETE" || !deleteAccountData.password}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <FaSpinner className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Account'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
