import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUser,
  FiCamera,
  FiTrash2,
  FiLoader,
  FiCheck,
  FiEdit3,
  FiSave,
  FiX,
  FiCalendar,
  FiRefreshCw,
  FiMapPin,
  FiShield,
  FiSmartphone,
  FiMail,
  FiLock,
  FiAlertCircle
} from "react-icons/fi";
import { getUserProfile, updateUserProfile, uploadProfilePicture, removeProfilePicture, sendEmailVerification, deleteAccount, saveLocation } from "../utils/api";
import { compressImage, validateImageFile } from "../utils/imageCompression";
import { useAuth } from "../context/useAuth";
import { getCurrentLocation } from "../utils/locationUtils";
import { useToast } from "../context/ToastContext";

export default function Profile() {
  const { user: authUser, login, logout } = useAuth();
  const navigate = useNavigate();
  const { success: showSuccess, error: showErrorMsg } = useToast();
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
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await getUserProfile();
      if (response.success) {
        setUser(response.data);
        setFormData({
          name: response.data.name || "",
          email: response.data.email || "",
          phone: response.data.phone || ""
        });

        // Update auth if verified status changed
        if (authUser && authUser.emailVerification?.isVerified !== response.data.emailVerification?.isVerified) {
          login(authUser.token || localStorage.getItem('token'), response.data);
        }
      }
    } catch (error) {
      setError(error.message || "Registry synchronization failure.");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [authUser, login]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError("");
      const response = await updateUserProfile(formData);
      if (response.success) {
        setUser(response.data);
        setIsEditing(false);
        setSuccess("Profile identification updated.");
        if (authUser) login(authUser.token, response.data);
      }
    } catch (error) {
      setError(error.message || "Transmission error.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLocation = async () => {
    try {
      setUpdatingLocation(true);
      setError("");
      const position = await getCurrentLocation();
      const response = await saveLocation(position.latitude, position.longitude);
      if (response.success) {
        showSuccess('Geolocation synchronized.', 3000);
        await loadProfile(true);
      }
    } catch (error) {
      setError("Geolocation access denied or timed out.");
    } finally {
      setUpdatingLocation(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploading(true);
      validateImageFile(file);
      const compressedFile = await compressImage(file, 500);
      const response = await uploadProfilePicture(compressedFile);
      if (response.success) {
        await loadProfile(true);
        setSuccess("Visual identifier updated.");
      }
    } catch (error) {
      setError(error.message || "Asset upload failure.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePicture = async () => {
    try {
      setUploading(true);
      const response = await removeProfilePicture();
      if (response.success) {
        await loadProfile(true);
        setSuccess("Visual identifier removed.");
      }
    } catch (error) {
      setError("Removal failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleEmailVerification = async () => {
    try {
      setEmailVerifying(true);
      const response = await sendEmailVerification();
      if (response.success) {
        setSuccess("Verification protocol initiated. Check your inbox.");
      }
    } catch (error) {
      setError("Verification trigger failed.");
    } finally {
      setEmailVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <FiLoader className="w-12 h-12 animate-spin text-trust mb-4" />
        <p className="label-caps text-stone-400">Synchronizing Identity...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-6">
      {/* Header Section */}
      <section className="mb-12">
        <div className="label-caps mb-4 text-trust">Account Management</div>
        <h1 className="text-4xl md:text-6xl font-tight font-bold text-charcoal tracking-tight">Personal Profile</h1>
        <p className="mt-4 text-lg text-graphite max-w-xl">
          Manage your secure identification, contact channels, and system preferences.
        </p>
      </section>

      {/* Status Messages */}
      {success && (
        <div className="mb-8 p-6 bg-trust/5 border border-trust/20 text-trust rounded-2xl flex items-center gap-3 font-bold text-xs uppercase tracking-widest">
          <FiCheck className="w-5 h-5" /> {success}
        </div>
      )}
      {error && (
        <div className="mb-8 p-6 bg-clay/5 border border-clay/20 text-clay rounded-2xl flex items-center gap-3 font-bold text-xs uppercase tracking-widest">
          <FiAlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

        {/* Left Column: Avatar & Stats */}
        <div className="lg:col-span-1 space-y-10">
          <div className="card-premium bg-white p-8 text-center flex flex-col items-center">
            <div className="relative group mb-8">
              <div className="w-40 h-40 rounded-[2.5rem] overflow-hidden border-4 border-stone-50 shadow-sm bg-stone-100">
                {user?.profilePicture || user?.avatarUrl ? (
                  <img src={user.profilePicture || user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-300">
                    <FiUser size={64} />
                  </div>
                )}
              </div>
              <label className="absolute inset-0 rounded-[2.5rem] bg-charcoal/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white">
                <FiCamera size={32} />
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
              {uploading && (
                <div className="absolute inset-0 rounded-[2.5rem] bg-white/80 flex items-center justify-center">
                  <FiLoader className="w-8 h-8 animate-spin text-trust" />
                </div>
              )}
            </div>

            <h3 className="text-2xl font-tight font-bold text-charcoal mb-1">{user?.name}</h3>
            <p className="label-caps text-stone-400 mb-8 lowercase tracking-normal">{user?.email}</p>

            <div className="w-full pt-8 border-t border-stone-100 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-400 font-medium">Account Status</span>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${user?.emailVerification?.isVerified ? 'bg-trust/10 text-trust' : 'bg-clay/10 text-clay'}`}>
                  {user?.emailVerification?.isVerified ? 'Verified' : 'Pending'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-400 font-medium">Member Since</span>
                <span className="text-charcoal font-bold">{new Date(user?.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
              </div>
            </div>

            {(user?.profilePicture || user?.avatarUrl) && (
              <button
                onClick={handleRemovePicture}
                className="mt-8 text-[10px] font-bold uppercase tracking-widest text-clay hover:underline flex items-center gap-2"
              >
                <FiTrash2 /> Remove Identifier
              </button>
            )}
          </div>

          <div className="card-premium bg-stone-50 border-stone-200 p-8">
            <div className="flex items-center gap-4 mb-6">
              <FiMapPin className="text-trust w-5 h-5" />
              <h4 className="text-sm font-bold uppercase tracking-widest text-charcoal">Deployment Node</h4>
            </div>
            <p className="text-xl font-tight font-bold text-charcoal mb-6">
              {user?.location?.city || 'Region unassigned'}
            </p>
            <button
              onClick={handleUpdateLocation}
              disabled={updatingLocation}
              className="w-full py-4 text-[10px] font-bold uppercase tracking-widest bg-charcoal text-white rounded-xl hover:bg-trust transition-colors flex items-center justify-center gap-3"
            >
              {updatingLocation ? <FiLoader className="animate-spin" /> : <FiRefreshCw />}
              {updatingLocation ? 'Synchronizing...' : 'Sync GPS Coordinates'}
            </button>
          </div>
        </div>

        {/* Right Column: Information & Security */}
        <div className="lg:col-span-2 space-y-10">
          <div className="card-premium bg-white p-10 md:p-12">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100">
                  <FiShield className="w-6 h-6 text-trust" />
                </div>
                <h2 className="text-2xl font-tight font-bold text-charcoal">Core Identification</h2>
              </div>
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="btn-secondary px-6 py-2 text-[10px] uppercase tracking-widest flex items-center gap-2">
                  <FiEdit3 /> Modify
                </button>
              ) : (
                <div className="flex gap-3">
                  <button onClick={handleSaveProfile} disabled={saving} className="btn-primary py-2 px-6 text-[10px] uppercase tracking-widest flex items-center gap-2">
                    {saving ? <FiLoader className="animate-spin" /> : <FiSave />} Save
                  </button>
                  <button onClick={() => setIsEditing(false)} className="btn-secondary py-2 px-6 text-[10px] uppercase tracking-widest">Cancel</button>
                </div>
              )}
            </div>

            <div className="space-y-10">
              <ProfileField
                label="Full Legal Name"
                icon={<FiUser />}
                isEditing={isEditing}
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                displayValue={user?.name}
              />
              <ProfileField
                label="Electronic Mail"
                icon={<FiMail />}
                isEditing={isEditing}
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                displayValue={user?.email}
              />
              <ProfileField
                label="Mobile Terminal"
                icon={<FiSmartphone />}
                isEditing={isEditing}
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                displayValue={user?.phone || 'Not registered'}
              />
            </div>
          </div>

          <div className="card-premium bg-white p-10 md:p-12">
            <div className="flex items-center gap-4 mb-12">
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100">
                <FiLock className="w-6 h-6 text-trust" />
              </div>
              <h2 className="text-2xl font-tight font-bold text-charcoal">Security Access</h2>
            </div>

            <div className="space-y-6">
              <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h4 className="font-bold text-charcoal mb-1">Access Credentials</h4>
                  <p className="text-sm text-stone-400">Regularly updated passwords ensure enterprise-level security.</p>
                </div>
                <button
                  onClick={() => navigate('/dashboard/security')}
                  className="btn-secondary py-3 px-8 text-[10px] uppercase tracking-widest whitespace-nowrap"
                >
                  Reset Password
                </button>
              </div>

              {!user?.emailVerification?.isVerified && (
                <div className="p-6 bg-clay/5 rounded-2xl border border-clay/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h4 className="font-bold text-clay mb-1">Unverified Channel</h4>
                    <p className="text-sm text-stone-500">Your email remains unverified in our trust registry.</p>
                  </div>
                  <button
                    onClick={handleEmailVerification}
                    disabled={emailVerifying}
                    className="btn-primary bg-clay border-clay py-3 px-8 text-[10px] uppercase tracking-widest whitespace-nowrap"
                  >
                    {emailVerifying ? 'Initiating...' : 'Verify Identity'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Deletion Zone */}
          <div className="pt-10 border-t border-stone-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h4 className="text-sm font-bold text-clay uppercase tracking-widest mb-1">Registry Deletion</h4>
              <p className="text-xs text-stone-400">Permanently terminate your account and wipe associated vault data.</p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="text-[10px] font-bold uppercase tracking-widest text-clay/60 hover:text-clay transition-colors"
            >
              Purge My Records
            </button>
          </div>
        </div>
      </div>

      {/* Modern Deletion Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-charcoal/80 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-10 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-clay/10 rounded-full flex items-center justify-center mx-auto mb-8 text-clay">
              <FiTrash2 size={32} />
            </div>
            <h3 className="text-3xl font-tight font-bold text-charcoal text-center mb-4">Confirm Purge</h3>
            <p className="text-graphite text-center mb-8 leading-relaxed">
              You are about to initiate a terminal deletion. All records, assets, and credentials will be permanently destroyed.
            </p>

            <div className="mb-8">
              <label className="label-caps mb-3 block text-center">Type <span className="text-clay font-black">DELETE</span> to confirm</label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                className="input-field h-14 text-center rounded-xl font-bold border-stone-100 focus:border-clay"
                placeholder="..."
              />
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirm !== "DELETE"}
                className="btn-primary bg-clay border-clay py-4 text-[11px] font-bold tracking-[0.2em] shadow-xl shadow-clay/10"
              >
                {deleting ? 'EXECUTING...' : 'PURGE RECORDS'}
              </button>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirm(""); }}
                className="btn-secondary py-4 text-[11px] font-bold tracking-[0.2em]"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ProfileField = ({ label, icon, isEditing, name, value, onChange, displayValue }) => (
  <div className="group">
    <label className="label-caps mb-3 block text-stone-400 group-focus-within:text-trust transition-colors">
      {label}
    </label>
    <div className="flex items-center gap-4">
      <div className="text-stone-300 group-focus-within:text-trust transition-colors">
        {icon}
      </div>
      {isEditing ? (
        <input
          type="text"
          name={name}
          value={value}
          onChange={onChange}
          className="input-field h-14 rounded-xl border-stone-100 flex-1 px-4 font-medium"
        />
      ) : (
        <p className="text-lg font-tight font-bold text-charcoal">{displayValue || "Unspecified"}</p>
      )}
    </div>
  </div>
);