import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiCamera, FiTrash2, FiLoader, FiCheck, FiEdit, FiSave, FiX, FiCalendar, FiRefreshCw, FiBriefcase, FiAward, FiMapPin, FiPhone, FiMail, FiStar, FiShield, FiFileText, FiVideo, FiImage, FiUpload, FiPlus, FiLock, FiTrash, FiArrowRight } from 'react-icons/fi';
import { getUserProfile, updateUserProfile, uploadProfilePicture, removeProfilePicture, sendEmailVerification, getProfessional, updateProfessional, uploadProfessionalMedia, deleteProfessionalMedia, changePassword, sendProfessionalEmailVerification, deleteAccount, snapToLGAApi } from '../../utils/api';
import { compressImage, validateImageFile } from '../../utils/imageCompression';
import { compressVideo, validateVideoFile, getFileSizeString } from '../../utils/videoCompression';
import { useAuth } from '../../context/useAuth';
import ServiceSelector from '../../components/ServiceSelector';
import VerifiedBadge from '../../components/VerifiedBadge';
import { validateProfessionalForm, validatePortfolioUpload } from '../../utils/validation';
import { useLocation as useLocationHook } from '../../hooks/useLocation';
import { getVerificationState } from '../../utils/verificationUtils';

export default function ProProfile() {
  const navigate = useNavigate();
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
  const { emailVerified, faceVerified, fullyVerified } = getVerificationState(user);
  const faceStatus = user?.faceVerification?.status || "not_started";

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
      <div className="flex flex-col items-center justify-center py-32 card-premium bg-white border-dashed">
        <FiLoader className="w-12 h-12 animate-spin text-trust mb-4" />
        <p className="font-tight text-graphite text-lg">Retrieving profile credentials...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Premium Header */}
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <div className="label-caps mb-2">Professional Identity</div>
          <h1 className="text-4xl md:text-5xl font-tight font-bold text-charcoal tracking-tight flex items-center gap-4">
            Consultant Profile
            {fullyVerified && <VerifiedBadge size="sm" />}
          </h1>
          <p className="mt-3 text-lg text-graphite max-w-xl leading-relaxed">
            Manage your professional presence and maintain your credentials for the FixFinder ecosystem.
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="btn-primary py-4 px-10 flex items-center gap-2 group transition-all"
          >
            <FiEdit className="w-5 h-5" /> Edit Profile
          </button>
        )}
      </div>

      {/* Verification Status Banner */}
      <div className="card-premium bg-paper p-10 mb-12 flex flex-col lg:flex-row gap-10 items-center border-stone-200">
        <div className="flex-1">
          <div className="label-caps text-trust mb-3">Trust Score enhancement</div>
          <h2 className="text-2xl font-tight font-bold text-charcoal mb-4">Validate Your Identity</h2>
          <p className="text-graphite leading-relaxed max-w-2xl">
            Complete the verification matrix to unlock the <span className="text-trust font-bold italic underline underline-offset-4">Verified Professional</span> status. This significantly increases your visibility and consumer confidence rankings.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <StatusBadge icon={<FiMail />} label="Email Registry" status={emailVerified} />
            <StatusBadge icon={<FiShield />} label="Face Recognition" status={faceVerified} />
          </div>
        </div>

        <div className="w-full lg:w-72 shrink-0">
          {!faceVerified ? (
            <button
              onClick={() => navigate("/dashboard/professional/verify-face")}
              className="btn-primary w-full py-5 flex items-center justify-center gap-3 bg-charcoal"
            >
              <FiShield className="w-5 h-5 text-trust" />
              <span>Initiate Audit</span>
            </button>
          ) : (
            <div className="p-5 rounded-2xl bg-trust/5 border border-trust/20 text-center">
              <FiCheck className="w-8 h-8 text-trust mx-auto mb-2" />
              <div className="text-xs font-bold uppercase tracking-widest text-trust">Identity Authenticated</div>
              {user?.faceVerification?.verifiedAt && (
                <div className="text-[10px] text-stone-400 mt-1 uppercase tracking-tighter">Verified {new Date(user.faceVerification.verifiedAt).toLocaleDateString()}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Registry Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <StatCard
          icon={<FiBriefcase className="text-trust" />}
          label="Registry Classification"
          value={user?.role || "Specialist"}
          subValue="Active Professional"
        />
        <StatCard
          icon={<FiShield className={user?.emailVerification?.isVerified ? 'text-trust' : 'text-clay'} />}
          label="Verification Index"
          value={user?.emailVerification?.isVerified ? "Authenticated" : "Pending"}
          action={!user?.emailVerification?.isVerified && (
            <button
              onClick={() => loadProfile(true)}
              disabled={refreshing}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-charcoal transition-colors disabled:opacity-50"
            >
              <FiRefreshCw className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Syncing...' : 'Refresh Status'}
            </button>
          )}
        />
        <StatCard
          icon={<FiCalendar className="text-stone-400" />}
          label="Network Tenure"
          value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : "N/A"}
          subValue="Ecosystem Entry"
        />
      </div>

      {/* Visual Identity Section */}
      <div className="card-premium bg-white p-10 mb-12 border-stone-200">
        <div className="label-caps text-stone-400 mb-6">Visual Identification</div>
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="relative group">
            {user?.profilePicture || user?.avatarUrl ? (
              <img
                src={user.profilePicture || user.avatarUrl}
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border-4 border-paper shadow-xl group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-stone-100 flex items-center justify-center border-4 border-paper shadow-xl">
                <FiUser className="w-12 h-12 text-stone-300" />
              </div>
            )}

            <label className="absolute inset-0 w-32 h-32 rounded-full bg-charcoal/40 backdrop-blur-[2px] flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <FiCamera className="w-8 h-8 text-white" />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl font-tight font-bold text-charcoal mb-2">Display Manifest</h3>
            <p className="text-graphite mb-6 max-w-md">Your primary visual credential. High-fidelity portraits are recommended for trust optimization.</p>

            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <label className="btn-secondary py-3 px-8 text-xs font-bold uppercase tracking-widest cursor-pointer flex items-center gap-2">
                {uploading ? <FiLoader className="animate-spin" /> : <FiUpload />}
                {uploading ? "Synchronizing..." : "Update Asset"}
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
              {(user?.profilePicture || user?.avatarUrl) && (
                <button
                  onClick={handleRemovePicture}
                  className="btn-secondary py-3 px-8 text-xs font-bold uppercase tracking-widest text-clay border-clay/20 hover:bg-clay/5 flex items-center gap-2"
                >
                  <FiTrash2 /> Purge Asset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Professional Information Registry */}
      <div className="space-y-12">
        {/* Location Coordination */}
        <div className="card-premium bg-white p-10 border-stone-200">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10">
            <div className="flex-1">
              <div className="label-caps text-stone-400 mb-6">Geospatial Registry</div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-stone-50 flex items-center justify-center text-trust shadow-sm">
                  <FiMapPin />
                </div>
                <div>
                  <h3 className="text-xl font-tight font-bold text-charcoal mb-2">Geospatial Registry</h3>
                  <p className="text-graphite leading-relaxed max-w-md">
                    {user?.location?.address || `${user?.location?.city || ''}${user?.location?.city && user?.location?.state ? ', ' : ''}${user?.location?.state || ''}` || 'Coordinates not yet synchronized.'}
                  </p>
                  {user?.location?.coordinates && (
                    <div className="text-[10px] font-bold text-stone-300 mt-2 uppercase tracking-widest">
                      Locus: {user.location.coordinates.lat.toFixed(4)}, {user.location.coordinates.lng.toFixed(4)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleUpdateLocation}
              disabled={updatingLocation}
              className="btn-secondary w-full md:w-auto py-4 px-10 flex items-center justify-center gap-3 transition-all"
            >
              {updatingLocation ? (
                <FiLoader className="w-5 h-5 animate-spin" />
              ) : (
                <FiMapPin className="w-5 h-5" />
              )}
              <span className="text-xs font-bold uppercase tracking-widest">
                {updatingLocation ? 'Recalibrating...' : 'Sync Current Location'}
              </span>
            </button>
          </div>
        </div>

        <div className="card-premium bg-white p-10 mb-12 border-stone-200">
          <div className="flex items-center justify-between mb-10 pb-8 border-b border-stone-50">
            <div>
              <div className="label-caps text-stone-400 mb-2">Professional Profile</div>
              <h2 className="text-2xl font-tight font-bold text-charcoal">Registry Classification</h2>
            </div>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="btn-secondary py-3 px-8 text-xs font-bold uppercase tracking-widest flex items-center gap-2"
              >
                <FiEdit /> Amend Profile
              </button>
            ) : (
              <div className="flex gap-4">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="btn-primary py-3 px-8 text-xs font-bold uppercase tracking-widest flex items-center gap-2"
                >
                  {saving ? <FiLoader className="animate-spin" /> : <FiSave />}
                  {saving ? "Commiting..." : "Commit Changes"}
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
                  className="btn-secondary py-3 px-8 text-xs font-bold uppercase tracking-widest flex items-center gap-2"
                >
                  <FiX /> Discard
                </button>
              </div>
            )}
          </div>

          <div className="space-y-12">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              <div className="space-y-2">
                <label className="label-caps text-stone-400 block mb-2">Legal Identity</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`input-field ${validationErrors.name ? 'border-clay' : ''}`}
                  />
                ) : (
                  <div className="text-charcoal font-bold text-lg">{user?.name || "Unidentified"}</div>
                )}
              </div>

              <div className="space-y-2">
                <label className="label-caps text-stone-400 block mb-2">Electronic Correspondence</label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`input-field ${validationErrors.email ? 'border-clay' : ''}`}
                  />
                ) : (
                  <div className="text-charcoal font-bold text-lg">{user?.email || "No direct link"}</div>
                )}
              </div>

              <div className="space-y-2">
                <label className="label-caps text-stone-400 block mb-2">Telecommunications</label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`input-field ${validationErrors.phone ? 'border-clay' : ''}`}
                  />
                ) : (
                  <div className="text-charcoal font-bold text-lg">{user?.phone || "Private line"}</div>
                )}
              </div>

              <div className="space-y-2">
                <label className="label-caps text-stone-400 block mb-2">Allocation Rate (₦)</label>
                {isEditing ? (
                  <input
                    type="number"
                    name="hourlyRate"
                    value={formData.hourlyRate}
                    onChange={handleInputChange}
                    className="input-field"
                  />
                ) : (
                  <div className="text-charcoal font-bold text-lg">₦{user?.hourlyRate?.toLocaleString() || "Market variable"}</div>
                )}
              </div>
            </div>

            {/* Bio */}
            {/* Narrative Overview */}
            <div className="space-y-4">
              <label className="label-caps text-stone-400 block mb-2">Professional Narrative</label>
              {isEditing ? (
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows={4}
                  className={`input-field min-h-[120px] ${validationErrors.bio ? 'border-clay' : ''}`}
                  placeholder="Explicate your professional trajectory and specialized competencies..."
                />
              ) : (
                <p className="text-graphite text-lg leading-relaxed whitespace-pre-wrap">{user?.bio || "Narrative missing from registry."}</p>
              )}
            </div>

            {/* Domain Expertise */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12">
              <div className="space-y-6">
                <label className="label-caps text-stone-400 block mb-4">Service Specializations</label>
                {isEditing ? (
                  <div className="space-y-4">
                    {formData.services.map((service, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="flex-1">
                          <ServiceSelector
                            value={service}
                            onChange={(value) => handleArrayInputChange('services', index, value)}
                            placeholder="Select classification..."
                            className="w-full"
                          />
                        </div>
                        <button
                          onClick={() => removeArrayItem('services', index)}
                          className="p-3 text-clay hover:bg-stone-50 rounded-xl transition-colors"
                        >
                          <FiTrash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addArrayItem('services')}
                      className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-trust hover:gap-3 transition-all"
                    >
                      <FiPlus /> Integrate New Domain
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {user?.services?.map((service, index) => (
                      <span key={index} className="px-5 py-2 text-xs font-bold uppercase tracking-widest text-charcoal bg-stone-50 border border-stone-100 rounded-full">
                        {service}
                      </span>
                    )) || <div className="text-stone-300 italic">No domains registered.</div>}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <label className="label-caps text-stone-400 block mb-4">Tenure in Discipline</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="experience"
                    value={formData.experience}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="e.g., 5+ Cycles"
                  />
                ) : (
                  <div className="text-charcoal font-bold text-lg">{user?.experience || "Tenure undefined"}</div>
                )}
              </div>
            </div>

            {/* Official Endorsements */}
            <div className="pt-12 border-t border-stone-50">
              <label className="label-caps text-stone-400 block mb-8">Authentication Protocols</label>
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {formData.certifications.map((cert, index) => (
                    <div key={index} className="p-8 bg-stone-50 rounded-2xl border border-stone-100 relative group">
                      <button
                        onClick={() => removeArrayItem('certifications', index)}
                        className="absolute top-4 right-4 p-2 text-stone-300 hover:text-clay transition-colors"
                      >
                        <FiTrash2 className="w-5 h-5" />
                      </button>
                      <div className="space-y-6">
                        <div>
                          <label className="label-caps text-[10px] text-stone-400 mb-1 block">Credential Name</label>
                          <input
                            type="text"
                            value={cert.name || ''}
                            onChange={(e) => handleArrayInputChange('certifications', index, { ...cert, name: e.target.value })}
                            className="input-field py-2 bg-white"
                            placeholder="e.g., Technical Certificate A"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="col-span-2">
                            <label className="label-caps text-[10px] text-stone-400 mb-1 block">Issuing Authority</label>
                            <input
                              type="text"
                              value={cert.school || ''}
                              onChange={(e) => handleArrayInputChange('certifications', index, { ...cert, school: e.target.value })}
                              className="input-field py-2 bg-white"
                              placeholder="Institution"
                            />
                          </div>
                          <div>
                            <label className="label-caps text-[10px] text-stone-400 mb-1 block">Cycle</label>
                            <input
                              type="text"
                              value={cert.year || ''}
                              onChange={(e) => handleArrayInputChange('certifications', index, { ...cert, year: e.target.value })}
                              className="input-field py-2 bg-white"
                              placeholder="Year"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => addArrayItem('certifications')}
                    className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-stone-200 rounded-2xl hover:border-trust hover:bg-trust/5 transition-all text-stone-400 hover:text-trust group"
                  >
                    <FiPlus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold uppercase tracking-widest">Append Documentation</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {user?.certifications?.map((cert, index) => (
                    <div key={index} className="flex items-center gap-4 p-6 bg-paper rounded-2xl border border-stone-100">
                      <div className="w-12 h-12 rounded-xl bg-trust/5 flex items-center justify-center text-trust">
                        <FiAward className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-bold text-charcoal">{cert.name || cert}</div>
                        <div className="text-xs text-graphite opacity-75">{cert.school} {cert.year && `• ${cert.year}`}</div>
                      </div>
                    </div>
                  )) || <div className="text-stone-300 italic">No formal credentials recorded.</div>}
                </div>
              )}
            </div>

            {/* Linguistic Proficiency */}
            <div className="pt-12 border-t border-stone-50">
              <label className="label-caps text-stone-400 block mb-8">Linguistic Nodes</label>
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formData.languages.map((lang, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <input
                        type="text"
                        value={lang}
                        onChange={(e) => handleArrayInputChange('languages', index, e.target.value)}
                        className="input-field"
                        placeholder="e.g. English, Yoruba"
                      />
                      <button
                        onClick={() => removeArrayItem('languages', index)}
                        className="p-3 text-clay hover:bg-stone-50 rounded-xl transition-colors"
                      >
                        <FiTrash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addArrayItem('languages')}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-trust hover:gap-3 transition-all"
                  >
                    <FiPlus /> Register Language
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {user?.languages?.map((lang, index) => (
                    <span key={index} className="px-5 py-2 text-xs font-bold uppercase tracking-widest text-charcoal bg-stone-50 border border-stone-100 rounded-full">
                      {lang}
                    </span>
                  )) || <div className="text-stone-300 italic">No languages registered.</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio Showcase */}
      <div className="card-premium bg-white p-10 mb-12 border-stone-200">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-12">
          <div className="flex-1">
            <div className="label-caps text-stone-400 mb-6">Work Portfolio</div>
            <h2 className="text-2xl font-tight font-bold text-charcoal mb-4">Visual Evidence.</h2>
            <p className="text-graphite leading-relaxed max-w-xl">
              Showcase your technical proficiency through high-resolution captures. We recommend at least 3 distinct projects for optimal trust conversion.
            </p>
          </div>

          <div className="w-full md:w-auto">
            <label
              className={`flex items-center justify-center gap-3 py-4 px-10 rounded-2xl border transition-all cursor-pointer ${uploadingMedia || portfolio.length >= 4
                ? 'bg-stone-50 border-stone-100 text-stone-300 cursor-not-allowed'
                : 'bg-white border-stone-200 text-charcoal hover:border-charcoal'
                }`}
            >
              {uploadingMedia ? <FiLoader className="animate-spin" /> : <FiUpload />}
              <span className="text-xs font-bold uppercase tracking-widest">
                {uploadingMedia ? "Uploading..." : portfolio.length >= 4 ? "Portfolio Full" : "Upload Evidence"}
              </span>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaUpload}
                className="hidden"
                disabled={uploadingMedia || portfolio.length >= 4}
              />
            </label>
          </div>
        </div>

        {/* Portfolio Feedback */}
        {(portfolioError || portfolioSuccess) && (
          <div className={`p-6 rounded-2xl mb-10 border flex items-center gap-4 ${portfolioError ? 'bg-clay/5 border-clay/10 text-clay' : 'bg-trust/5 border-trust/10 text-trust'
            }`}>
            {portfolioError ? <FiX className="shrink-0" /> : <FiCheck className="shrink-0" />}
            <span className="text-sm font-bold uppercase tracking-wider">{portfolioError || portfolioSuccess}</span>
          </div>
        )}

        {/* Metrics Bar */}
        <div className="flex gap-10 mb-10 py-6 border-y border-stone-50">
          <div className="flex items-center gap-3">
            <FiVideo className="text-trust" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Videos: {portfolio.filter(item => item.type === 'video').length}/1</span>
          </div>
          <div className="flex items-center gap-3">
            <FiImage className="text-stone-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Images: {portfolio.filter(item => item.type === 'image').length}/3</span>
          </div>
        </div>

        {portfolio.length === 0 ? (
          <div className="py-24 text-center border-2 border-dashed border-stone-100 rounded-3xl">
            <FiImage className="w-16 h-16 text-stone-100 mx-auto mb-6" />
            <h3 className="text-xl font-tight font-bold text-stone-300">Portfolio Empty</h3>
            <p className="text-stone-200 mt-2">Initialize your gallery to improve consumer trust.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {portfolio.map((item, index) => (
              <div key={item._id || index} className="relative group rounded-3xl overflow-hidden border border-stone-100 shadow-sm aspect-video">
                {item.type === 'video' ? (
                  <video src={item.url} className="w-full h-full object-cover" />
                ) : (
                  <img src={item.url} alt="Work Evidence" className="w-full h-full object-cover" />
                )}

                <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center grayscale hover:grayscale-0">
                  <div className="scale-110 group-hover:scale-100 transition-all duration-500 flex flex-col items-center">
                    <button
                      onClick={() => handleDeleteMedia(item._id)}
                      className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-clay hover:bg-clay hover:text-white transition-colors"
                    >
                      <FiTrash2 />
                    </button>
                    <span className="mt-3 text-[10px] font-bold uppercase tracking-widest text-white">{item.type}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Infrastructure */}
      <div className="card-premium bg-white p-10 mb-12 border-stone-200">
        <div className="label-caps text-stone-400 mb-8">Access Control & Security</div>

        <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between p-8 bg-stone-50 rounded-2xl border border-stone-100">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FiLock className="text-stone-300" />
                <h3 className="font-bold text-charcoal">Authentication Matrix</h3>
              </div>
              <p className="text-xs text-graphite">Persistent password for registry access. Last synchronized {user?.passwordUpdatedAt ? new Date(user.passwordUpdatedAt).toLocaleDateString() : 'initially'}.</p>
            </div>
            <button onClick={() => setShowPasswordModal(true)} className="btn-secondary py-3 px-8 text-[10px]">Modify Protocol</button>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between p-8 bg-stone-50 rounded-2xl border border-stone-100">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FiMail className={user?.emailVerified ? 'text-trust' : 'text-clay'} />
                <h3 className="font-bold text-charcoal">Registry Verification</h3>
              </div>
              <p className="text-xs text-graphite">{user?.emailVerified ? "Electronic address authenticated." : "Identity verification protocol pending."}</p>
            </div>
            {!user?.emailVerified && (
              <button
                onClick={handleEmailVerification}
                disabled={emailVerifying}
                className="btn-primary py-3 px-8 text-[10px]"
              >
                {emailVerifying ? <FiLoader className="animate-spin" /> : "Initiate Verification"}
              </button>
            )}
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between p-8 bg-paper rounded-2xl border border-clay/10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FiTrash2 className="text-clay" />
                <h3 className="font-bold text-clay uppercase tracking-widest text-xs">Registry Disposal</h3>
              </div>
              <p className="text-xs text-graphite opacity-75">Permanently purge your professional credentials from the network. This action is irreversible.</p>
            </div>
            <button onClick={() => setShowDeleteAccountModal(true)} className="btn-secondary border-clay/20 text-clay hover:bg-clay/5 py-3 px-8 text-[10px]">Deactivate Node</button>
          </div>
        </div>
      </div>

      {/* Confirmation & Entry Modals */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm flex items-center justify-center z-[100] p-6">
          <div className="card-premium bg-white p-10 max-w-md w-full animate-in fade-in zoom-in duration-300">
            <div className="label-caps text-trust mb-6">Security Protocol</div>
            <h2 className="text-2xl font-tight font-bold text-charcoal mb-8">Update Sequence</h2>
            <div className="space-y-6">
              <input
                type="password"
                placeholder="CURRENT PROTOCOL"
                className="input-field"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
              />
              <input
                type="password"
                placeholder="NEW PROTOCOL"
                className="input-field"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
              />
              <input
                type="password"
                placeholder="CONFIRM NEW PROTOCOL"
                className="input-field"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              />
            </div>
            <div className="flex gap-4 mt-12">
              <button onClick={() => setShowPasswordModal(false)} className="btn-secondary flex-1 py-4">ABORT</button>
              <button onClick={handlePasswordChange} className="btn-primary flex-1 py-4">STORE</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteAccountModal && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-md flex items-center justify-center z-[100] p-6">
          <div className="card-premium bg-white p-10 max-w-md w-full border-clay/30">
            <div className="label-caps text-clay mb-6">Critical Sequence</div>
            <h2 className="text-2xl font-tight font-bold text-charcoal mb-4">Node Termination</h2>
            <p className="text-graphite mb-8 leading-relaxed">You are about to purge your professional node. This will irreversibly erase your reputation index and history.</p>

            <div className="space-y-6">
              <div>
                <label className="label-caps text-[10px] mb-2 block text-stone-400">Type "DELETE" to authorize</label>
                <input
                  type="text"
                  className="input-field border-clay/20 focus:border-clay"
                  placeholder="AUTHORIZATION STRING"
                  value={deleteAccountData.confirmText}
                  onChange={(e) => setDeleteAccountData(prev => ({ ...prev, confirmText: e.target.value }))}
                />
              </div>
              <input
                type="password"
                className="input-field"
                placeholder="AUTHENTICATION PASSWORD"
                value={deleteAccountData.password}
                onChange={(e) => setDeleteAccountData(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>

            <div className="flex gap-4 mt-12">
              <button onClick={() => setShowDeleteAccountModal(false)} className="btn-secondary flex-1 py-4">RETAIN</button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteAccountData.confirmText !== 'DELETE'}
                className="btn-primary bg-clay border-clay flex-1 py-4 disabled:opacity-30"
              >
                PURGE
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm flex items-center justify-center z-[100] p-6">
          <div className="card-premium bg-white p-10 max-w-sm w-full">
            <div className="label-caps text-clay mb-6">Asset Removal</div>
            <h2 className="text-xl font-tight font-bold text-charcoal mb-4">Purge Evidence?</h2>
            <p className="text-graphite mb-8">This asset will be permanently removed from your digital showcase.</p>
            <div className="flex gap-4">
              <button onClick={cancelDeleteMedia} className="btn-secondary flex-1 py-3 px-6">CANCEL</button>
              <button onClick={confirmDeleteMedia} className="btn-primary bg-clay border-clay flex-1 py-3 px-6 text-xs font-bold uppercase tracking-widest">CONFIRM</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const StatusBadge = ({ icon, label, status }) => (
  <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all ${status
    ? "bg-trust/5 border-trust/20 text-trust"
    : "bg-paper border-stone-200 text-stone-400"
    }`}>
    <span className={status ? "text-trust" : "text-stone-300"}>{icon}</span>
    <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
    {status ? (
      <FiCheck className="w-4 h-4 ml-2" />
    ) : (
      <div className="w-2 h-2 rounded-full bg-stone-300 ml-2 animate-pulse" />
    )}
  </div>
);

const StatCard = ({ icon, label, value, subValue, action }) => (
  <div className="card-premium bg-white p-8 flex flex-col justify-between hover:border-stone-400 transition-all duration-300">
    <div>
      <div className="flex justify-between items-start mb-6">
        <div className="w-12 h-12 rounded-2xl bg-stone-50 flex items-center justify-center text-2xl shadow-sm">
          {icon}
        </div>
        {action}
      </div>
      <div className="label-caps text-stone-400 mb-2">{label}</div>
      <div className="text-2xl font-tight font-bold text-charcoal truncate">{value}</div>
    </div>
    {subValue && (
      <div className="mt-4 pt-4 border-t border-stone-50 text-[10px] font-bold uppercase tracking-widest text-stone-300">
        {subValue}
      </div>
    )}
  </div>
);
