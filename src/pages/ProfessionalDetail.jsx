import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { getProfessional, uploadProfessionalMedia } from '../utils/api';
import { useAuth } from '../context/useAuth';
import { FaStar, FaMapMarkerAlt, FaClock, FaCheckCircle, FaPhone, FaEnvelope, FaTools } from 'react-icons/fa';

const ProfessionalDetail = () => {
  const { id } = useParams();
  const locationState = useLocation();
  const { user } = useAuth();
  const [professional, setProfessional] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);

  useEffect(() => {
    const fetchProfessional = async () => {
      try {
        setLoading(true);
        
        // First, try to get from dummy data if it's a dummy professional ID
        const dummyProfessionals = [
          {
            _id: '1', name: 'John Electrician', category: 'Electrician', rating: 4.8, hourlyRate: 2500,
            image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
            location: { address: 'Victoria Island, Lagos' }, isVerified: true, user: { _id: 'user1' },
            bio: 'Experienced electrician with 10+ years of experience in residential and commercial electrical work.',
            yearsOfExperience: 10, city: 'Lagos'
          },
          {
            _id: '2', name: 'Sarah Plumber', category: 'Plumber', rating: 4.9, hourlyRate: 2000,
            image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
            location: { address: 'Ikoyi, Lagos' }, isVerified: true, user: { _id: 'user2' },
            bio: 'Professional plumber specializing in pipe repairs, installations, and maintenance.',
            yearsOfExperience: 8, city: 'Lagos'
          },
          {
            _id: '3', name: 'Mike Carpenter', category: 'Carpenter', rating: 4.7, hourlyRate: 3000,
            image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
            location: { address: 'Surulere, Lagos' }, isVerified: false, user: { _id: 'user3' },
            bio: 'Skilled carpenter with expertise in furniture making and home renovations.',
            yearsOfExperience: 12, city: 'Lagos'
          }
        ];
        
        const dummyPro = dummyProfessionals.find(p => p._id === id);
        if (dummyPro) {
          setProfessional(dummyPro);
          return;
        }
        
        // Prefer data passed via route state (from list) for demo fallback
        const statePro = locationState?.state?.professional;
        if (statePro) {
          setProfessional(statePro);
          return;
        }

        const response = await getProfessional(id, { byUser: false });
        const pro = response?.professional || response;
        if (!pro) throw new Error('Professional not found');
        setProfessional(pro);
      } catch (err) {
        setError(err.message || 'Failed to fetch professional details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProfessional();
    }
  }, [id]);

  // Get user's current location
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {},
      { timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  // Compute distance when we have both locations
  useEffect(() => {
    if (!userLocation || !professional) return;
    const coords = professional.coordinates;
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

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<FaStar key={i} className="text-yellow-400" />);
    }
    
    if (hasHalfStar) {
      stars.push(<FaStar key="half" className="text-yellow-400 opacity-50" />);
    }
    
    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<FaStar key={`empty-${i}`} className="text-gray-300" />);
    }

    return stars;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading professional details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
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
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
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
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaCheckCircle className="w-10 h-10 text-blue-600" />
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
                    <FaStar className="w-4 h-4 text-yellow-400 mr-1" />
                    <span className="text-sm text-gray-600">{professional.rating || 4.5}</span>
                    <span className="text-sm text-gray-500 ml-2">({Math.floor(Math.random() * 50) + 10} reviews)</span>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-lg font-semibold text-blue-600">
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
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Sign Up Free
              </Link>
              <Link
                to="/auth/login"
                className="bg-gray-100 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Log In
              </Link>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Join thousands of users who trust FixFinder for their professional service needs
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Back Button */}
      <div className="mb-6">
        <Link
          to={-1}
          className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
        >
          ← Back to Professionals
        </Link>
      </div>

      {/* Top Hero with Profile Image and Badge */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
        <div className="relative">
          <img
            src={professional.photos?.[0] || '/images/placeholder.jpeg'}
            alt={professional.name}
            className="w-full h-64 md:h-80 object-cover"
            onError={(e) => (e.currentTarget.src = '/images/placeholder.jpeg')}
          />
          {professional.isVerified && (
            <span className="absolute top-4 left-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
              <FaCheckCircle /> Verified
            </span>
          )}
        </div>
        <div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{professional.name}</h1>
            <div className="flex items-center flex-wrap gap-3 text-gray-600">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium capitalize">
                {professional.category}
              </span>
              <span className="flex items-center">
                <FaMapMarkerAlt className="mr-1" />{professional.city}
                {typeof distanceKm === 'number' && (
                  <span className="ml-2 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                    {distanceKm}km away
                  </span>
                )}
              </span>
              {professional.yearsOfExperience ? (
                <span className="flex items-center"><FaClock className="mr-1" />{professional.yearsOfExperience} yrs exp</span>
              ) : null}
            </div>
          </div>
          <div className="text-right">
            {professional.pricePerHour ? (
              <p className="text-2xl font-bold text-blue-600">₦{professional.pricePerHour.toLocaleString()}/hour</p>
            ) : null}
            <div className="flex items-center justify-end mt-1">
              {renderStars(professional.ratingAvg || 0)}
              <span className="ml-2 text-sm text-gray-600">({professional.ratingCount || 0} reviews)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Bio */}
          {professional.bio && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">About</h2>
              <p className="text-gray-600 leading-relaxed">{professional.bio}</p>
            </div>
          )}

          {/* Experience & Details */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Professional Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Years of Experience</h3>
                <p className="text-gray-600">{professional.yearsOfExperience || 0} years</p>
              </div>
              
              {professional.languages && professional.languages.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Languages</h3>
                  <div className="flex flex-wrap gap-2">
                    {professional.languages.map((language, index) => (
                      <span key={index} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                        {language}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {professional.certifications && professional.certifications.length > 0 && (
                <div className="md:col-span-2">
                  <h3 className="font-medium text-gray-700 mb-2">Certifications</h3>
                  <div className="flex flex-wrap gap-2">
                    {professional.certifications.map((cert, index) => (
                      <span key={index} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Photos (excluding main profile image) */}
          {professional.photos && professional.photos.length > 1 && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Photos</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {professional.photos.slice(1).map((photo, index) => (
                  <div
                    key={index}
                    className={`cursor-pointer rounded-lg overflow-hidden ${
                      selectedImageIndex === index ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <img
                      src={photo}
                      alt={`${professional.name} work ${index + 2}`}
                      className="w-full h-32 object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Videos */}
          {professional.videos && professional.videos.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Videos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {professional.videos.map((video, index) => (
                  <div key={index} className="relative">
                    <video
                      src={video}
                      controls
                      className="w-full rounded-lg"
                      poster={professional.photos && professional.photos[0]}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Media Upload (Owner only) */}
          {user && professional && (user._id === professional.user || user._id === professional._id) && (
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Add Photos/Videos</h2>
              {uploadError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">{uploadError}</div>
              )}
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 border">
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
                        const res = await uploadProfessionalMedia(professional._id || professional.id, formData);
                        // Optimistically update local state if URLs returned
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
                  <span className="text-sm text-gray-700">Select Files</span>
                </label>
                <button
                  disabled
                  className="px-4 py-2 rounded-lg text-sm bg-blue-600 text-white opacity-60 cursor-not-allowed"
                  title="Drag & drop not implemented in this demo"
                >
                  Drag & Drop Coming Soon
                </button>
                {uploading && (
                  <span className="text-sm text-gray-600">Uploading...</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">Max 10 files. Supported: images and videos.</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Contact & Book</h2>
            
            <div className="space-y-4">
              <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Book Service
              </button>
              
              <button className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium">
                Send Message
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-medium text-gray-700 mb-3">Quick Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Rating:</span>
                  <span className="font-medium">{professional.ratingAvg?.toFixed(1) || 'N/A'}/5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Reviews:</span>
                  <span className="font-medium">{professional.ratingCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Experience:</span>
                  <span className="font-medium">{professional.yearsOfExperience || 0} years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium ${professional.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {professional.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            {/* Only show edit actions if user is the professional themselves */}
            {user && professional && user._id === professional.user && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-medium text-gray-700 mb-3">Actions</h3>
                <div className="space-y-2">
                  <Link
                    to={`/professionals/${professional._id}/edit`}
                    className="block w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-center text-sm font-medium"
                  >
                    Edit Profile
                  </Link>
                  <Link
                    to={`/professionals/${professional._id}/reviews`}
                    className="block w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-center text-sm font-medium"
                  >
                    View Reviews
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalDetail;
