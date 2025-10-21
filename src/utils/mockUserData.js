// Mock user data for testing profile page
export const mockUserData = {
  _id: "user123",
  name: "John Doe",
  email: "john.doe@example.com",
  phone: "+234 801 234 5678",
  role: "customer",
  profilePicture: null,
  avatarUrl: null,
  isVerified: false,
  createdAt: "2024-01-15T10:30:00Z",
  verification: {
    status: "none",
    selfieUrl: null,
    selfieVideoUrl: null,
    idPhotoUrl: null,
    submittedAt: null,
    reviewedAt: null,
    reviewerId: null,
    selfieScore: null,
    videoDurationMs: null,
    hasAudio: null,
    frameCount: null
  }
};

// Mock user with profile picture
export const mockUserWithPicture = {
  ...mockUserData,
  name: "Sarah Johnson",
  email: "sarah.johnson@example.com",
  phone: "+234 802 345 6789",
  profilePicture: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
  avatarUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
  isVerified: true,
  verification: {
    ...mockUserData.verification,
    status: "approved",
    submittedAt: "2024-01-20T14:30:00Z",
    reviewedAt: "2024-01-21T09:15:00Z"
  }
};

// Mock professional user
export const mockProfessionalUser = {
  ...mockUserData,
  name: "Mike Electrician",
  email: "mike.electrician@example.com",
  phone: "+234 803 456 7890",
  role: "professional",
  profilePicture: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
  avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
  isVerified: true,
  verification: {
    ...mockUserData.verification,
    status: "approved",
    submittedAt: "2024-01-18T11:20:00Z",
    reviewedAt: "2024-01-19T16:45:00Z"
  }
};




