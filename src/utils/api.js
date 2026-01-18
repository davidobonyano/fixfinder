export const saveService = async (data) => {
  const existing = JSON.parse(localStorage.getItem("addedServices")) || [];
  existing.push(data);
  localStorage.setItem("addedServices", JSON.stringify(existing));
  return Promise.resolve("success");
};

// ---- Real API client ----
const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://fixfinder-backend-8yjj.onrender.com";

export const getAuthToken = () => localStorage.getItem("token") || "";
export const setAuthToken = (token) => {
  if (token) localStorage.setItem("token", token);
};
export const clearAuthToken = () => localStorage.removeItem("token");
export const resolveImageUrl = (url) => {
  if (!url) return null;
  const trimmed = typeof url === 'string' ? url.trim() : url;
  if (!trimmed) return null;
  if (trimmed.startsWith('http') || trimmed.startsWith('data:') || trimmed.startsWith('blink:') || trimmed.startsWith('//')) {
    return trimmed;
  }
  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${API_BASE}${normalized}`;
};

async function request(path, { method = "GET", body, auth = false, headers: extraHeaders } = {}) {
  const headers = { ...(extraHeaders || {}) };
  if (!(body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }
  if (auth) headers["Authorization"] = `Bearer ${getAuthToken()}`;

  const payload = body
    ? (body instanceof FormData
      ? body
      : (typeof body === 'string' ? body : JSON.stringify(body)))
    : undefined;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: payload,
  });

  console.log(`🌐 API Request: ${method} ${API_BASE}${path}`, {
    status: res.status,
    statusText: res.statusText,
    headers: Object.fromEntries(res.headers.entries())
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`❌ API Error: ${method} ${API_BASE}${path}`, {
      status: res.status,
      statusText: res.statusText,
      data
    });
    const error = new Error(data?.message || "Request failed");
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const registerUser = (payload) => request("/api/auth/register", { method: "POST", body: payload });
export const loginUser = (payload) => request("/api/auth/login", { method: "POST", body: payload });
export const getMe = () => request("/api/auth/me", { method: "GET", auth: true });
export const forgotPassword = (email) => request("/api/auth/forgot-password", { method: "POST", body: { email } });
export const resetPassword = (token, password) => request("/api/auth/reset-password", { method: "POST", body: { token, password } });
export const getUser = (id) => request(`/api/users/${id}`, { auth: true });
export const getServicesApi = async (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return request(`/api/services${q ? `?${q}` : ""}`, { method: "GET" });
};

// Professional API functions
export const getProfessionals = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return request(`/api/professionals${queryString ? `?${queryString}` : ''}`, { auth: true });
};

// Prefer fetching professional by user id to avoid mismatch between user id and pro id
export const getProfessional = (userIdOrProId, { byUser = true } = {}) => {
  const path = byUser ? `/api/professionals/by-user/${userIdOrProId}` : `/api/professionals/${userIdOrProId}`;
  return request(path, { auth: true });
};

export const createProfessional = (data) => request("/api/professionals", {
  method: "POST",
  body: data,
  auth: true
});

export const updateProfessional = (id, data) => request(`/api/professionals/${id}`, {
  method: "PUT",
  body: data,
  auth: true
});

export const deleteProfessional = (id) => request(`/api/professionals/${id}`, {
  method: "DELETE",
  auth: true
});



// Job API functions
export const createJob = (data) => request("/api/jobs", {
  method: "POST",
  body: data,
  auth: true
});

export const getMyJobs = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/api/jobs/my-jobs?${query}`, { auth: true });
};

export const getJobFeed = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/api/jobs/feed?${query}`, { auth: true });
};

export const getJobDetails = (id) => request(`/api/jobs/${id}`, { auth: true });

export const applyToJob = (id, data) => {
  // If a File is provided under data.cvFile, send multipart FormData with field name "cv"
  if (data && data.cvFile instanceof File) {
    const form = new FormData();
    form.append('proposal', data.proposal);
    form.append('proposedPrice', String(data.proposedPrice ?? ''));
    form.append('estimatedDuration', data.estimatedDuration || '');
    form.append('cv', data.cvFile);
    return request(`/api/jobs/${id}/apply`, {
      method: 'POST',
      body: form,
      auth: true
    });
  }
  return request(`/api/jobs/${id}/apply`, {
    method: 'POST',
    body: data,
    auth: true
  });
};

export const acceptApplication = (jobId, applicationId) => request(`/api/jobs/${jobId}/accept/${applicationId}`, {
  method: "POST",
  auth: true
});

export const getApplicationCvUrl = (jobId, applicationId) => request(`/api/jobs/${jobId}/applications/${applicationId}/cv-url`, { auth: true });

export const deleteJobApplication = (jobId, applicationId) =>
  request(`/api/jobs/${jobId}/applications/${applicationId}`, { method: 'DELETE', auth: true });

export const completeJob = (id) => request(`/api/jobs/${id}/complete`, {
  method: "POST",
  auth: true
});

export const cancelJob = (id, data) => request(`/api/jobs/${id}/cancel`, {
  method: "POST",
  body: data,
  auth: true
});

export const deleteJobApi = (id) => request(`/api/jobs/${id}`, {
  method: 'DELETE',
  auth: true
});

// Message API functions
export const getConversations = () => request("/api/messages/conversations", { auth: true });

export const createOrGetConversation = (data) => request("/api/messages/conversations", {
  method: "POST",
  body: data,
  auth: true
});

export const getMessages = (conversationId, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/api/messages/conversations/${conversationId}?${query}`, { auth: true });
};

export const sendMessage = (conversationId, formData) => {
  const headers = {};
  if (formData instanceof FormData) {
    // Don't set Content-Type for FormData, let browser set it
  } else {
    headers["Content-Type"] = "application/json";
  }

  return request(`/api/messages/conversations/${conversationId}`, {
    method: "POST",
    body: formData instanceof FormData ? formData : JSON.stringify(formData),
    auth: true,
    headers
  });
};

export const editMessage = (messageId, data) => request(`/api/messages/${messageId}`, {
  method: "PUT",
  body: data,
  auth: true
});

export const deleteMessage = (messageId) => request(`/api/messages/${messageId}`, {
  method: "DELETE",
  auth: true
});

export const markConversationAsRead = (conversationId) => request(`/api/messages/conversations/${conversationId}/read`, {
  method: "POST",
  auth: true
});

// Delete all my messages in a conversation
export const deleteMyMessagesInConversation = (conversationId) => request(`/api/messages/conversations/${conversationId}/my-messages`, {
  method: "DELETE",
  auth: true
});

// Block/Unblock user
export const blockUser = (userId) => request(`/api/users/block`, {
  method: "POST",
  body: { userId },
  auth: true
});

export const unblockUser = (userId) => request(`/api/users/unblock`, {
  method: "POST",
  body: { userId },
  auth: true
});

// Delete conversation
export const deleteConversation = (conversationId) => request(`/api/messages/conversations/${conversationId}`, {
  method: "DELETE",
  auth: true
});

// Location sharing functions
export const shareLocation = (conversationId, locationData) => request(`/api/messages/conversations/${conversationId}/location-share`, {
  method: "POST",
  body: locationData,
  auth: true
});

export const stopLocationShare = (conversationId) => request(`/api/messages/conversations/${conversationId}/stop-location-share`, {
  method: "POST",
  auth: true
});

// Notification API functions
export const getNotifications = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/api/notifications?${query}`, { auth: true });
};

export const getNotificationCount = () => request("/api/notifications/count", { auth: true });

export const markNotificationAsRead = (id) => request(`/api/notifications/${id}/read`, {
  method: "PUT",
  auth: true
});

export const markAllNotificationsAsRead = () => request("/api/notifications/read-all", {
  method: "PUT",
  auth: true
});

export const clearAllNotifications = () => request('/api/notifications', {
  method: 'DELETE',
  auth: true
});

export const deleteNotification = (id) => request(`/api/notifications/${id}`, {
  method: "DELETE",
  auth: true
});

// Pro dashboard API
export const getProAnalytics = () => request(`/api/pro-dashboard/analytics`, { auth: true });
export const getProJobs = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/api/pro-dashboard/my-jobs?${query}`, { auth: true });
};

// Connection request API functions
export const sendConnectionRequest = (professionalId) => request(`/api/connections/request`, {
  method: "POST",
  body: { professionalId },
  auth: true
});

export const acceptConnectionRequest = (requestId) => request(`/api/connections/accept`, {
  method: "POST",
  body: { requestId },
  auth: true
});

export const rejectConnectionRequest = (requestId) => request(`/api/connections/reject`, {
  method: "POST",
  body: { requestId },
  auth: true
});

export const getConnectionRequests = () => {
  console.log('🔍 API: Getting connection requests...');
  return request(`/api/connections/my-requests`, { auth: true });
};

export const getConnections = () => request(`/api/connections`, { auth: true });

export const removeConnection = (connectionId) => request(`/api/connections/${connectionId}`, {
  method: "DELETE",
  auth: true
});

// Cancel a pending connection request
export const cancelConnectionRequest = (professionalId) => request(`/api/connections/cancel/${professionalId}`, {
  method: "DELETE",
  auth: true
});

// User Profile API functions
export const getUserProfile = () => request("/api/users/profile", { auth: true });

export const updateUserProfile = (data) => request("/api/users/profile", {
  method: "PUT",
  body: data,
  auth: true
});

export const uploadProfilePicture = (file) => {
  const formData = new FormData();
  formData.append('profilePicture', file);

  return fetch(`${API_BASE}/api/users/profile-picture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: formData
  }).then(res => res.json());
};

// Professional portfolio media upload
export const uploadProfessionalMedia = (professionalId, file, mediaType = 'image') => {
  console.log("🌐 Uploading media for professional ID:", professionalId);
  console.log("📁 File details:", {
    name: file.name,
    type: file.type,
    size: file.size
  });
  console.log("🎬 Media type:", mediaType);

  const formData = new FormData();
  formData.append('media', file);
  formData.append('mediaType', mediaType);

  return fetch(`${API_BASE}/api/professionals/${professionalId}/media`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: formData
  }).then(res => {
    console.log("🌐 API Response status:", res.status);
    if (!res.ok) {
      console.error("❌ API Error:", res.status, res.statusText);
    }
    return res.json();
  });
};

// Delete professional media
export const deleteProfessionalMedia = (professionalId, mediaId, mediaType) => request(`/api/professionals/${professionalId}/media`, {
  method: "DELETE",
  auth: true,
  body: JSON.stringify({
    publicId: mediaId,
    type: mediaType
  })
});

export const removeProfilePicture = () => request("/api/users/profile-picture", {
  method: "DELETE",
  auth: true
});

// Account Security
export const changePassword = (data) => request("/api/users/change-password", {
  method: "POST",
  body: data,
  auth: true
});

export const sendEmailVerification = () => request("/api/users/send-email-verification", {
  method: "POST",
  auth: true
});

export const sendProfessionalEmailVerification = () => request("/api/professionals/send-email-verification", {
  method: "POST",
  auth: true
});

export const getFaceVerificationStatus = () => request("/api/verify/face/status", { auth: true });

export const startFaceVerification = () => request("/api/verify/face/start", {
  method: "POST",
  auth: true
});

export const setFaceReference = (payload) => request("/api/verify/face/reference", {
  method: "POST",
  body: payload,
  auth: true
});

export const submitFaceCapture = (formData) => request("/api/verify/face/capture", {
  method: "POST",
  body: formData,
  auth: true
});

export const resetFaceVerification = () => request("/api/verify/face/reset", {
  method: "POST",
  auth: true
});

export const deleteAccount = () => request("/api/users/delete-account", {
  method: "DELETE",
  auth: true
});

export const verifyEmail = (token) => request("/api/users/verify-email", {
  method: "POST",
  body: { token },
  auth: true
});

export const getProfessionalProfile = (id) => request(`/api/professionals/${id}`, { auth: true });

// Location API functions
export const saveLocation = (latitude, longitude) => request("/api/location/save", {
  method: "POST",
  body: { latitude, longitude },
  auth: true
});

export const getMyLocation = () => request("/api/location/my-location", { auth: true });

export const findNearbyProfessionals = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return request(`/api/location/nearby-professionals${queryString ? `?${queryString}` : ''}`, { auth: true });
};

export const findNearbyJobs = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return request(`/api/location/nearby-jobs${queryString ? `?${queryString}` : ''}`, { auth: true });
};

export const calculateDistanceAPI = (lat1, lon1, lat2, lon2) => {
  return request(`/api/location/calculate-distance?lat1=${lat1}&lon1=${lon1}&lat2=${lat2}&lon2=${lon2}`, { auth: true });
};

// Snap coordinates to LGA/state
export const snapToLGAApi = (latitude, longitude) => {
  const q = new URLSearchParams({ latitude, longitude }).toString();
  return request(`/api/location/snap?${q}`, { auth: true });
};


export const deleteAllMessagesForMe = (conversationId) => {
  return request(`/api/messages/conversations/${conversationId}/all-for-me`, {
    method: 'DELETE',
    auth: true,
  });
};

export const deleteConversationForMe = (conversationId) => request(`/api/messages/conversations/${conversationId}/for-me`, {
  method: 'DELETE',
  auth: true,
});

// ----- Job lifecycle (chat-driven) -----
export const createJobRequestInChat = (conversationId, payload) => request(`/api/jobs/chat/${conversationId}/request`, {
  method: 'POST',
  body: payload,
  auth: true
});

export const acceptJobRequest = (jobId) => request(`/api/jobs/${jobId}/accept-request`, {
  method: 'POST',
  auth: true
});

export const proMarkCompleted = (jobId) => request(`/api/jobs/${jobId}/complete-by-pro`, {
  method: 'POST',
  auth: true
});

export const confirmJobCompletion = (jobId) => request(`/api/jobs/${jobId}/confirm-completion`, {
  method: 'POST',
  auth: true
});

// ----- Reviews API -----
export const createReview = (payload) => request(`/api/reviews`, {
  method: 'POST',
  body: payload,
  auth: true
});

export const getProfessionalReviews = (professionalId, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/api/reviews/${professionalId}${query ? `?${query}` : ''}`, { auth: true });
};

// Admin API functions (public endpoint - no auth required)
export const getAdminStats = () => request("/api/admin/stats/public", { method: "GET", auth: false });

// Admin User Management API functions (public - secret URL protection)
export const getAllUsers = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/api/admin/users${query ? `?${query}` : ''}`, { method: "GET", auth: false });
};

export const getBannedUsers = () => request("/api/admin/users/banned", { method: "GET", auth: false });

export const banUser = (userId, { reason, expiresAt }) => request(`/api/admin/users/${userId}/ban`, {
  method: "POST",
  body: { reason, expiresAt },
  auth: false
});

export const unbanUser = (userId) => request(`/api/admin/users/${userId}/unban`, {
  method: "POST",
  auth: false
});

// Report API functions
export const createReport = (payload) => request(`/api/reports`, {
  method: "POST",
  body: payload,
  auth: true
});

// Admin report functions (public - secret URL protection)
export const getAllReports = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/api/admin/reports${query ? `?${query}` : ''}`, { method: "GET", auth: false });
};

export const getPendingReportsCount = () => request("/api/admin/reports/pending/count", { method: "GET", auth: false });

export const updateReportStatus = (reportId, { status, adminNotes }) => request(`/api/reports/${reportId}/status`, {
  method: "PATCH",
  body: { status, adminNotes },
  auth: false
});

// Contact form API
export const sendContactMessage = (payload) => request("/api/contact", {
  method: "POST",
  body: payload,
  auth: false
});