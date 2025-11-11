import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaUser, FaCamera, FaTrash, FaSpinner, FaCheck, FaEdit, FaSave, FaTimes, FaCalendarAlt, FaSync, FaMapMarkerAlt } from "react-icons/fa";
import { getUserProfile, updateUserProfile, uploadProfilePicture, removeProfilePicture, sendEmailVerification, deleteAccount, saveLocation } from "../utils/api";
import { compressImage, validateImageFile } from "../utils/imageCompression";
import { useAuth } from "../context/useAuth";
import { getCurrentLocation } from "../utils/locationUtils";
import { useToast } from "../context/ToastContext";

export default function Profile() {
  const { user: authUser, login, logout } = useAuth();
  const navigate = useNavigate();
  const { success: showSuccess } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: ""
  });

  const loadProfile = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const response = await getUserProfile();
      if (response.success) {
        // Get current verification status before updating state
        setUser(prevUser => {
          const wasVerified = prevUser?.emailVerification?.isVerified;
          const isNowVerified = response.data.emailVerification?.isVerified;
          
          // Only update auth context if email verification status actually changed
          // This prevents unnecessary rerenders when status hasn't changed
          if (authUser && wasVerified !== isNowVerified) {
            login(authUser.token || localStorage.getItem('token'), {
              ...authUser,
              emailVerification: response.data.emailVerification
            });
          }
          
          return response.data;
        });
        
        setFormData({
          name: response.data.name || "",
          email: response.data.email || "",
          phone: response.data.phone || ""
        });
        // location shown read-only from response.data.location
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
  }, [authUser, login]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await updateUserProfile(formData);
      if (response.success) {
        setUser(response.data);
        setIsEditing(false);
        setSuccess("Profile updated successfully!");
        
        // Update auth context if needed
        if (authUser) {
          login(authUser.token, response.data);
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLocation = async () => {
    try {
      setUpdatingLocation(true);
      setError("");
      setSuccess("");
      
      // Get current location directly from geolocation API
      const position = await getCurrentLocation();
      const lat = position.latitude;
      const lng = position.longitude;

      // Save location to backend (backend will snap to LGA automatically)
      const response = await saveLocation(lat, lng);
      
      if (response.success) {
        setSuccess('Location updated successfully!');
        showSuccess('Location updated successfully!', 3000);
        // Update user in auth context if location data is returned
        if (response.data?.location && authUser) {
          login(authUser.token || localStorage.getItem('token'), {
            ...authUser,
            location: response.data.location
          });
        }
        // Reload profile to show updated location
        await loadProfile(true);
      } else {
        throw new Error(response.message || 'Failed to update location');
      }
    } catch (error) {
      console.error('Error updating location:', error);
      const errorMessage = error.message || 'Failed to update location. Please ensure location permissions are granted and try again.';
      setError(errorMessage);
    } finally {
      setUpdatingLocation(false);
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

      const response = await sendEmailVerification();
      if (response.success) {
        setSuccess("Verification email sent! Check your inbox and click the link to verify your email.");
      }
    } catch (error) {
      console.error('Error sending verification email:', error);
      setError(error.message || "Failed to send verification email");
    } finally {
      setEmailVerifying(false);
    }
  };

  // Check for verification status updates
  useEffect(() => {
    // Only poll if user exists and is not verified
    if (!user || user.emailVerification?.isVerified) {
      return; // Don't set up polling if verified or no user
    }

    // Reload profile data every 20 seconds if not verified
    const interval = setInterval(() => {
      loadProfile(true); // Use refresh mode to avoid showing loading spinner
    }, 20000);
    
    return () => clearInterval(interval);
  }, [user?.emailVerification?.isVerified, loadProfile]);

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") {
      setError("Please type 'DELETE' to confirm account deletion");
      return;
    }

    try {
      setDeleting(true);
      setError("");
      
      const response = await deleteAccount();
      if (response.success) {
        // Logout and redirect
        logout();
        navigate('/');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setError(error.message || "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
        <p className="text-gray-600">Manage your account settings and profile information</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg flex items-center gap-2">
          <FaCheck className="w-5 h-5" />
          {success}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg">
          {error}
        </div>
      )}

      {/* Profile Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FaUser className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Account Type</p>
              <p className="text-2xl font-bold text-gray-900 capitalize">{user?.role || "User"}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${user?.emailVerification?.isVerified ? 'bg-indigo-100' : 'bg-amber-100'}`}>
              <FaCheck className={`w-6 h-6 ${user?.emailVerification?.isVerified ? 'text-indigo-600' : 'text-amber-600'}`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Verification</p>
              <p className={`text-2xl font-bold ${user?.emailVerification?.isVerified ? 'text-indigo-700' : 'text-amber-700'}`}>
                {user?.emailVerification?.isVerified ? "Verified" : "Pending"}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {user?.emailVerification?.isVerified ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
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
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
                className="flex items-center gap-2 px-4 py-2 border-2 border-gray-200 text-gray-700 rounded-lg hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <FaTrash className="w-4 h-4 text-gray-500" />
                Remove picture
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Information Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg shadow-sm transition-all"
            >
              <FaEdit className="w-4 h-4" />
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
                    phone: user.phone || ""
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 border-2 border-gray-200 text-gray-700 rounded-lg hover:border-gray-300 transition-all"
              >
                <FaTimes className="w-4 h-4" />
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            {isEditing ? (
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900">{user?.name || "Not provided"}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            {isEditing ? (
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900">{user?.email || "Not provided"}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            {isEditing ? (
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900">{user?.phone || "Not provided"}</p>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <p className="text-gray-900 capitalize">{user?.role || "Not specified"}</p>
          </div>

          {/* Verification Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Verification Status</label>
            <p className="text-gray-900">
              {user?.emailVerification?.isVerified ? (
                <span className="text-green-600 font-medium">Verified</span>
              ) : (
                <span className="text-yellow-600 font-medium">Not Verified</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Location Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
        {/* Location quick update */}
        <div className="mb-6 p-4 rounded-lg border border-gray-200 bg-gray-50">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
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
                    ({user.location.coordinates.lat?.toFixed(4) || user.location.coordinates.latitude?.toFixed(4)}, {user.location.coordinates.lng?.toFixed(4) || user.location.coordinates.longitude?.toFixed(4)})
                  </div>
                )}
              </div>
            </div>
            <div className="md:shrink-0">
              <button
                onClick={handleUpdateLocation}
                disabled={updatingLocation}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 w-full md:w-auto justify-center"
              >
                {updatingLocation ? <FaSpinner className="w-4 h-4 animate-spin" /> : <FaMapMarkerAlt className="w-4 h-4" />}
                {updatingLocation ? 'Updating…' : 'Update Location (Use my GPS)'}
              </button>
            </div>
          </div>
        </div>
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
            <button onClick={() => navigate('/dashboard/security')} className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg transition-colors">
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
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Account</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <h3 className="font-medium text-gray-900">Delete Account</h3>
              <p className="text-sm text-gray-600">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>
            <button 
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 border-2 border-red-300 text-red-700 rounded-lg hover:border-red-400 transition-colors"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <FaTrash className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Account</h3>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-600 mb-3">
                This will permanently delete your account and all associated data including:
              </p>
              <ul className="text-sm text-gray-500 list-disc list-inside space-y-1">
                <li>Your profile and personal information</li>
                <li>All jobs you've posted or applied to</li>
                <li>All messages and conversations</li>
                <li>All reviews and ratings</li>
                <li>All notifications and activity</li>
              </ul>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="font-bold text-red-600">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Type DELETE to confirm"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirm !== "DELETE"}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {deleting ? (
                  <>
                    <FaSpinner className="w-4 h-4 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  'Delete Account'
                )}
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirm("");
                  setError("");
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}