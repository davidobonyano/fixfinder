import { useState, useEffect } from 'react';
import { 
  FaTimes, 
  FaUser, 
  FaPhone, 
  FaEnvelope, 
  FaMapMarkerAlt, 
  FaStar,
  FaCheck,
  FaSpinner,
  FaCamera,
  FaVideo,
  FaCertificate,
  FaEdit,
  FaClock,
  FaMoneyBillWave,
  FaLanguage,
  FaImages,
  FaThumbsUp,
  FaThumbsDown
} from 'react-icons/fa';
import { useAuth } from '../context/useAuth';
import { getProfessional, getUser } from '../utils/api';
import UserFullProfileModal from './UserFullProfileModal';
import { useNavigate } from 'react-router-dom';

const ChatProfileModal = ({ 
  isOpen, 
  onClose, 
  user, 
  isProfessional = false,
  onViewFullProfile 
}) => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [professionalData, setProfessionalData] = useState(null);
  const [error, setError] = useState(null);
  const [showFullProfile, setShowFullProfile] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (isOpen && user) {
        setLoading(true);
        setError(null);
        
        try {
          // Fetch user data
          const userResponse = await getUser(user._id);
          setProfileData(userResponse.data);
          
          // If it's a professional, fetch professional data
          if (isProfessional && user.role === 'professional') {
            try {
              const proResponse = await getProfessional(user._id);
              setProfessionalData(proResponse.data);
            } catch (proError) {
              console.warn('Could not fetch professional data:', proError);
              // Continue with just user data
            }
          }
        } catch (err) {
          console.error('Error fetching profile data:', err);
          setError('Failed to load profile data');
          // Fallback to basic user data
          setProfileData(user);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchProfileData();
  }, [isOpen, user, isProfessional]);

  if (!isOpen || !user) return null;

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          {/* Remove the h2 header "User Profile" or "Professional Profile" */}
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Content */}
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <FaSpinner className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading profile...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Profile Picture and Basic Info */}
              <div className="text-center">
                <div className="relative inline-block">
                  {(profileData?.profilePicture || profileData?.avatarUrl || user.profilePicture || user.avatarUrl) ? (
                    <img
                      src={profileData?.profilePicture || profileData?.avatarUrl || user.profilePicture || user.avatarUrl}
                      alt={profileData?.name || user.name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-200">
                      <FaUser className="w-10 h-10 text-gray-400" />
                    </div>
                  )}
                  {isProfessional && (professionalData?.verified || profileData?.emailVerification?.isVerified) && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <FaCheck className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                
                <h3 className="text-xl font-semibold mt-2">{profileData?.name || user.name}</h3>
                <p className="text-gray-600 capitalize">{profileData?.role || user.role}</p>
                
                {isProfessional && professionalData && (
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <FaStar className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium">{professionalData.rating || '4.5'}</span>
                    <span className="text-sm text-gray-500">({professionalData.reviewCount || 0} reviews)</span>
                  </div>
                )}
              </div>

              {/* Contact Information */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Contact Information</h4>
                <div className="space-y-2">
                  {(profileData?.email || user.email) && (
                    <div className="flex items-center gap-2 text-sm">
                      <FaEnvelope className="w-4 h-4 text-gray-400" />
                      <span>{profileData?.email || user.email}</span>
                    </div>
                  )}
                  {(profileData?.phone || user.phone) && (
                    <div className="flex items-center gap-2 text-sm">
                      <FaPhone className="w-4 h-4 text-gray-400" />
                      <span>{profileData?.phone || user.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Professional-specific information */}
              {isProfessional && (professionalData || profileData) && (
                <>
                  {/* Bio */}
                  {professionalData?.bio && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">About</h4>
                      <p className="text-sm text-gray-600">{professionalData.bio}</p>
                    </div>
                  )}

                  {/* Services */}
                  {professionalData?.services && professionalData.services.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Services</h4>
                      <div className="flex flex-wrap gap-2">
                        {professionalData.services.map((service, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hourly Rate */}
                  {professionalData?.hourlyRate && (
                    <div className="flex items-center gap-2">
                      <FaMoneyBillWave className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">
                        <span className="font-medium">₦{professionalData.hourlyRate}</span> per hour
                      </span>
                    </div>
                  )}

                  {/* Experience */}
                  {professionalData?.experience && (
                    <div className="flex items-center gap-2">
                      <FaClock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">
                        <span className="font-medium">{professionalData.experience}</span> years experience
                      </span>
                    </div>
                  )}

                  {/* Certifications */}
                  {professionalData?.certifications && professionalData.certifications.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Certifications</h4>
                      <div className="space-y-2">
                        {professionalData.certifications.slice(0, 3).map((cert, index) => (
                          <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                            <FaCertificate className="w-4 h-4 text-green-500 mt-1" />
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-900">{cert.name || cert}</span>
                              {cert.school && (
                                <p className="text-xs text-gray-600">{cert.school}</p>
                              )}
                              {cert.year && (
                                <p className="text-xs text-gray-500">{cert.year}</p>
                              )}
                            </div>
                          </div>
                        ))}
                        {professionalData.certifications.length > 3 && (
                          <p className="text-xs text-gray-500">
                            +{professionalData.certifications.length - 3} more certifications
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Languages */}
                  {professionalData?.languages && professionalData.languages.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Languages</h4>
                      <div className="flex flex-wrap gap-2">
                        {professionalData.languages.map((language, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1"
                          >
                            <FaLanguage className="w-3 h-3" />
                            {language}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Portfolio Preview */}
                  {professionalData?.portfolio && professionalData.portfolio.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Portfolio</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {professionalData.portfolio.slice(0, 4).map((item, index) => (
                          <div key={index} className="relative group">
                            {item.type === 'video' ? (
                              <div className="w-full h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                                <FaVideo className="w-6 h-6 text-gray-400" />
                              </div>
                            ) : (
                              <img
                                src={item.url}
                                alt={item.title || 'Portfolio item'}
                                className="w-full h-20 object-cover rounded-lg"
                              />
                            )}
                            <div className="absolute top-1 right-1">
                              {item.type === 'video' ? (
                                <div className="bg-black bg-opacity-75 text-white px-1 py-0.5 rounded text-xs flex items-center gap-1">
                                  <FaVideo className="w-2 h-2" />
                                </div>
                              ) : (
                                <div className="bg-black bg-opacity-75 text-white px-1 py-0.5 rounded text-xs flex items-center gap-1">
                                  <FaImages className="w-2 h-2" />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {professionalData.portfolio.length > 4 && (
                          <div className="w-full h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                            <span className="text-xs text-gray-500">
                              +{professionalData.portfolio.length - 4} more
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Verification Status */}
              <div className="flex items-center gap-2">
                {(profileData?.emailVerification?.isVerified || user.emailVerification?.isVerified) ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <FaCheck className="w-4 h-4" />
                    <span className="text-sm">Email Verified</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-yellow-600">
                    <FaSpinner className="w-4 h-4" />
                    <span className="text-sm">Email Not Verified</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {/* Remove the footer actions (Close button) at:
            <div className="p-4 border-t bg-gray-50"> ... <button ...>Close</button> ... </div>
        */}
      </div>
    </div>
    <UserFullProfileModal
      isOpen={showFullProfile}
      onClose={() => setShowFullProfile(false)}
      user={profileData || user}
    />
    </>
  );
};

export default ChatProfileModal;

