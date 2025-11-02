import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProfessionals, getProfessionalReviews } from '../utils/api';
import ProfessionalCard from '../components/ProfessionalCard';
import ReviewModal from '../components/ReviewModal';
import SkeletonCard from '../components/SkeletonCard';
import { FaPlus, FaLock, FaUser, FaUserPlus } from 'react-icons/fa';

const LOCAL_KEY = 'fixfinder-reviews';

// Mock reviews for professionals
const getMockReviews = (category) => {
  const reviewMap = {
    'electrician': [
      { text: 'Excellent work! Fixed my electrical issues quickly and professionally.', rating: 5 },
      { text: 'Very reliable and knowledgeable electrician. Highly recommend!', rating: 4 }
    ],
    'plumber': [
      { text: 'Great service, fixed my plumbing issue in no time.', rating: 5 },
      { text: 'Professional and efficient. Will definitely call again.', rating: 4 }
    ],
    'carpenter': [
      { text: 'Amazing woodwork! The furniture looks perfect.', rating: 5 },
      { text: 'Quality craftsmanship and attention to detail.', rating: 4 }
    ],
    'mechanic': [
      { text: 'Diagnosed and fixed my car issue perfectly. Very honest.', rating: 5 },
      { text: 'Quick service and fair pricing. Highly recommended.', rating: 4 }
    ],
    'barber': [
      { text: 'Best fade I\'ve ever had! Clean work.', rating: 5 },
      { text: 'Professional service and great conversation.', rating: 5 }
    ],
    'hair stylist': [
      { text: 'kln;k', rating: 5 },
      { text: 'kln', rating: 4 },
      { text: 'jjjjjj', rating: 4 },
      { text: 'lm', rating: 5 },
      { text: '', rating: 4 },
      { text: '', rating: 5 }
    ],
    'painter': [
      { text: 'Excellent painting work! Clean and professional finish.', rating: 5 },
      { text: 'Very satisfied with the paint job. Colors look great!', rating: 4 }
    ],
    'tailor': [
      { text: 'Perfect fit! Great tailoring skills.', rating: 5 },
      { text: 'Quick service and excellent alterations.', rating: 4 }
    ],
    'welder': [
      { text: 'Strong and durable welding work. Highly recommended!', rating: 5 },
      { text: 'Professional service, fixed my gate perfectly.', rating: 4 }
    ],
    'laptop repair': [
      { text: 'Fixed my laptop quickly and professionally. Highly recommend!', rating: 5 },
      { text: 'Great service, reasonable prices. My laptop is working perfectly now.', rating: 4 }
    ]
  };

  return reviewMap[category] || reviewMap['electrician'] || [
    { text: 'Great service! Very satisfied with the work.', rating: 5 },
    { text: 'Professional and reliable. Would recommend.', rating: 4 }
  ];
};

// Mock professionals data for categories without real professionals
const getMockProfessionals = (category) => {
  const categoryMap = {
    'electrician': [
      {
        _id: 'mock-elec-1',
        name: 'Michael Okafor',
        category: 'Electrician',
        ratingAvg: 4.7,
        ratingCount: 24,
        pricePerHour: 3500,
        bio: 'Certified electrician with 10+ years of experience in residential and commercial installations. Specialized in wiring, repairs, and electrical maintenance.',
        location: {
          address: 'Ikeja, Lagos',
          city: 'Ikeja',
          state: 'Lagos',
          coordinates: { lat: 6.5244, lng: 3.3792 }
        },
        photos: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face'],
        isVerified: true,
        user: { _id: 'user-mock-elec-1', profilePicture: null }
      },
      {
        _id: 'mock-elec-2',
        name: 'David Chukwu',
        category: 'Electrician',
        ratingAvg: 4.9,
        ratingCount: 18,
        pricePerHour: 4000,
        bio: 'Expert electrician providing quality electrical services. Quick response time and professional service guaranteed.',
        location: {
          address: 'Victoria Island, Lagos',
          city: 'Victoria Island',
          state: 'Lagos',
          coordinates: { lat: 6.4281, lng: 3.4219 }
        },
        photos: ['https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face'],
        isVerified: true,
        user: { _id: 'user-mock-elec-2', profilePicture: null }
      },
      {
        _id: 'mock-elec-3',
        name: 'James Adeyemi',
        category: 'Electrician',
        ratingAvg: 4.5,
        ratingCount: 32,
        pricePerHour: 3000,
        bio: 'Reliable electrician offering comprehensive electrical solutions for homes and businesses.',
        location: {
          address: 'Surulere, Lagos',
          city: 'Surulere',
          state: 'Lagos',
          coordinates: { lat: 6.4995, lng: 3.3550 }
        },
        photos: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face'],
        isVerified: false,
        user: { _id: 'user-mock-elec-3', profilePicture: null }
      }
    ],
    'plumber': [
      {
        _id: 'mock-plumb-1',
        name: 'Sarah Oladele',
        category: 'Plumber',
        ratingAvg: 4.8,
        ratingCount: 28,
        pricePerHour: 2500,
        bio: 'Professional plumber with expertise in pipe repairs, installations, and maintenance. Available 24/7 for emergencies.',
        location: {
          address: 'Ikoyi, Lagos',
          city: 'Ikoyi',
          state: 'Lagos',
          coordinates: { lat: 6.4474, lng: 3.4203 }
        },
        photos: ['https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face'],
        isVerified: true,
        user: { _id: 'user-mock-plumb-1', profilePicture: null }
      },
      {
        _id: 'mock-plumb-2',
        name: 'Peter Uche',
        category: 'Plumber',
        ratingAvg: 4.6,
        ratingCount: 15,
        pricePerHour: 2200,
        bio: 'Experienced plumber specializing in residential plumbing repairs and installations.',
        location: {
          address: 'Lekki, Lagos',
          city: 'Lekki',
          state: 'Lagos',
          coordinates: { lat: 6.4654, lng: 3.5653 }
        },
        photos: ['https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face'],
        isVerified: true,
        user: { _id: 'user-mock-plumb-2', profilePicture: null }
      }
    ],
    'carpenter': [
      {
        _id: 'mock-carp-1',
        name: 'Mike Ojo',
        category: 'Carpenter',
        ratingAvg: 4.7,
        ratingCount: 21,
        pricePerHour: 3000,
        bio: 'Skilled carpenter offering custom furniture, repairs, and woodwork services.',
        location: {
          address: 'Magodo, Lagos',
          city: 'Magodo',
          state: 'Lagos',
          coordinates: { lat: 6.5833, lng: 3.3833 }
        },
        photos: ['https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face'],
        isVerified: true,
        user: { _id: 'user-mock-carp-1', profilePicture: null }
      }
    ],
    'mechanic': [
      {
        _id: 'mock-mech-1',
        name: 'David Adekunle',
        category: 'Mechanic',
        ratingAvg: 4.6,
        ratingCount: 35,
        pricePerHour: 4000,
        bio: 'Auto mechanic with extensive experience in car repairs, maintenance, and diagnostics.',
        location: {
          address: 'Apapa, Lagos',
          city: 'Apapa',
          state: 'Lagos',
          coordinates: { lat: 6.4488, lng: 3.3596 }
        },
        photos: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face'],
        isVerified: true,
        user: { _id: 'user-mock-mech-1', profilePicture: null }
      }
    ],
    'barber': [
      {
        _id: 'mock-barber-1',
        name: 'Tony Styles',
        category: 'Barber',
        ratingAvg: 4.9,
        ratingCount: 42,
        pricePerHour: 2000,
        bio: 'Professional barber with modern techniques. Specializing in fades, designs, and classic cuts.',
        location: {
          address: 'Yaba, Lagos',
          city: 'Yaba',
          state: 'Lagos',
          coordinates: { lat: 6.4958, lng: 3.3823 }
        },
        photos: ['https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face'],
        isVerified: true,
        user: { _id: 'user-mock-barber-1', profilePicture: null }
      }
    ],
    'hair stylist': [
      {
        _id: 'mock-hair-1',
        name: 'bernice',
        category: 'Hair Stylist',
        ratingAvg: 4.5,
        ratingCount: 6,
        pricePerHour: 2000,
        bio: 'i sell wigs',
        location: {
          address: 'Egor, Edo',
          city: 'Egor',
          state: 'Edo',
          coordinates: { lat: 6.3333, lng: 5.6167 }
        },
        photos: ['https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&h=400&fit=crop&crop=face'],
        isVerified: false,
        user: { _id: 'user-mock-hair-1', profilePicture: null }
      }
    ],
    'laptop repair': [
      {
        _id: 'mock-laptop-1',
        name: 'Patience Laptop Repair',
        category: 'Laptop Repair',
        ratingAvg: 4.7,
        ratingCount: 40,
        pricePerHour: 3000,
        bio: 'Expert laptop repair services. Specializing in hardware repairs, software installation, and diagnostics.',
        location: {
          address: 'Ibadan, Oyo',
          city: 'Ibadan',
          state: 'Oyo',
          coordinates: { lat: 7.4000, lng: 3.9167 }
        },
        photos: ['https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face'],
        isVerified: true,
        user: { _id: 'user-mock-laptop-1', profilePicture: null }
      }
    ],
    'painter': [
      {
        _id: 'mock-paint-1',
        name: 'Emmanuel Okafor',
        category: 'Painter',
        ratingAvg: 4.8,
        ratingCount: 19,
        pricePerHour: 2800,
        bio: 'Professional painter specializing in interior and exterior painting. Quality finishes guaranteed.',
        location: {
          address: 'Oshodi, Lagos',
          city: 'Oshodi',
          state: 'Lagos',
          coordinates: { lat: 6.5581, lng: 3.3327 }
        },
        photos: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face'],
        isVerified: true,
        user: { _id: 'user-mock-paint-1', profilePicture: null }
      }
    ],
    'tailor': [
      {
        _id: 'mock-tailor-1',
        name: 'Grace Adeyemi',
        category: 'Tailor',
        ratingAvg: 4.7,
        ratingCount: 31,
        pricePerHour: 1500,
        bio: 'Expert tailor providing alteration, repairs, and custom clothing services.',
        location: {
          address: 'Obalende, Lagos',
          city: 'Obalende',
          state: 'Lagos',
          coordinates: { lat: 6.4523, lng: 3.4064 }
        },
        photos: ['https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face'],
        isVerified: true,
        user: { _id: 'user-mock-tailor-1', profilePicture: null }
      }
    ],
    'welder': [
      {
        _id: 'mock-weld-1',
        name: 'Segun Bamidele',
        category: 'Welder',
        ratingAvg: 4.6,
        ratingCount: 27,
        pricePerHour: 3500,
        bio: 'Certified welder with expertise in metal fabrication, repairs, and installations.',
        location: {
          address: 'Alaba, Lagos',
          city: 'Alaba',
          state: 'Lagos',
          coordinates: { lat: 6.4898, lng: 3.2835 }
        },
        photos: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face'],
        isVerified: true,
        user: { _id: 'user-mock-weld-1', profilePicture: null }
      }
    ]
  };

  // Get mock data for category, or return generic mock data
  const mockData = categoryMap[category] || categoryMap['electrician'] || [];
  
  // If category not in map, create a generic mock professional
  if (mockData.length === 0) {
    return [{
      _id: `mock-${category}-1`,
      name: `Professional ${category.charAt(0).toUpperCase() + category.slice(1)}`,
      category: category.charAt(0).toUpperCase() + category.slice(1),
      ratingAvg: 4.5,
      ratingCount: Math.floor(Math.random() * 30) + 5,
      pricePerHour: Math.floor(Math.random() * 3000) + 1500,
      bio: `Experienced ${category} professional providing quality services.`,
      location: {
        address: 'Lagos, Nigeria',
        city: 'Lagos',
        state: 'Lagos',
        coordinates: { lat: 6.5244, lng: 3.3792 }
      },
      photos: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face'],
      isVerified: true,
      user: { _id: `user-mock-${category}-1`, profilePicture: null }
    }];
  }

  return mockData;
};

const CategoryPage = () => {
  const { category: categoryParam } = useParams();
  // Normalize category: convert "laptop-repair" to "laptop repair" for display and "laptop repair" for lookup
  const category = categoryParam?.replace(/-/g, ' ') || '';
  const categoryKey = category.toLowerCase(); // For mock data lookup
  
  const [pros, setPros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPro, setSelectedPro] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [sortBy, setSortBy] = useState('rating'); // 'rating', 'distance', 'price'

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.log('Location access denied or failed:', error);
        },
        { timeout: 10000, maximumAge: 300000 }
      );
    }
  }, []);

  // Load professionals from backend API
  useEffect(() => {
    const fetchProfessionals = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await getProfessionals({ category: categoryKey });
        let professionals = response.professionals || [];

        console.log('API Response:', response);
        console.log('Professionals from API:', professionals);

        // Always use mock data if no real professionals (for main site pages)
        if (!Array.isArray(professionals) || professionals.length === 0) {
          console.log('🎭 No real professionals found, using mock data for category:', categoryKey);
          const mockProfs = getMockProfessionals(categoryKey);
          professionals = mockProfs.length > 0 ? mockProfs : [{
            _id: `mock-${categoryKey}-1`,
            name: `Professional ${category.charAt(0).toUpperCase() + category.slice(1)}`,
            category: category.charAt(0).toUpperCase() + category.slice(1),
            ratingAvg: 4.5,
            ratingCount: Math.floor(Math.random() * 30) + 5,
            pricePerHour: Math.floor(Math.random() * 3000) + 1500,
            bio: `Experienced ${category} professional providing quality services.`,
            location: {
              address: 'Lagos, Nigeria',
              city: 'Lagos',
              state: 'Lagos',
              coordinates: { lat: 6.5244, lng: 3.3792 }
            },
            photos: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face'],
            isVerified: true,
            user: { _id: `user-mock-${categoryKey}-1`, profilePicture: null }
          }];
        }

        // Remove duplicates based on _id or name
        const uniqueProfessionals = professionals.filter((pro, index, self) => 
          index === self.findIndex(p => p._id === pro._id || (p.name === pro.name && p.category === pro.category))
        );

        console.log('Unique professionals after deduplication:', uniqueProfessionals.length);
        
        const enriched = uniqueProfessionals.map((pro) => {
          
          // Convert location coordinates to array format for distance calculation
          let coordinates = null;
          if (pro.location?.coordinates) {
            coordinates = [pro.location.coordinates.lat, pro.location.coordinates.lng];
          }
          
          // Debug logging
          console.log('Professional data:', {
            name: pro.name,
            photos: pro.photos,
            videos: pro.videos,
            bio: pro.bio,
            pricePerHour: pro.pricePerHour,
            _id: pro._id
          });
          
          // Filter out invalid photo URLs
          const validPhotos = (pro.photos || []).filter(photo => 
            photo && typeof photo === 'string' && photo.trim() !== '' && photo !== '/images/placeholder.jpeg'
          );
          
          // Use professional photos first, then user profile picture, then placeholder
          let finalPhotos = validPhotos;
          if (finalPhotos.length === 0 && pro.user?.profilePicture) {
            finalPhotos = [pro.user.profilePicture];
          }
          if (finalPhotos.length === 0) {
            finalPhotos = ['/images/placeholder.jpeg'];
          }
          
          const base = {
            ...pro,
            ratingAvg: pro.ratingAvg || 0,
            ratingCount: pro.ratingCount || 0,
            coordinates,
            // Use real photos if available, otherwise show placeholder
            photos: finalPhotos,
            // Add videos if available
            videos: pro.videos || [],
            // Ensure bio exists
            bio: pro.bio || `Experienced ${category} professional available for service.`,
            // Ensure price exists
            pricePerHour: pro.pricePerHour || 0,
          };
          return base;
        });

        // Sort professionals
        const sorted = enriched.sort((a, b) => {
          switch (sortBy) {
            case 'distance':
              if (!userLocation) return 0;
              const distA = a.coordinates ? Math.sqrt(
                Math.pow(a.coordinates[0] - userLocation[0], 2) + 
                Math.pow(a.coordinates[1] - userLocation[1], 2)
              ) : Infinity;
              const distB = b.coordinates ? Math.sqrt(
                Math.pow(b.coordinates[0] - userLocation[0], 2) + 
                Math.pow(b.coordinates[1] - userLocation[1], 2)
              ) : Infinity;
              return distA - distB;
            case 'price':
              return (a.pricePerHour || 0) - (b.pricePerHour || 0);
            case 'rating':
            default:
              return (b.ratingAvg || 0) - (a.ratingAvg || 0);
          }
        });

        // Fetch top 2 recent reviews for first 6 pros to build confidence
        const top = sorted.slice(0, 6);
        try {
          const withRecent = await Promise.all(top.map(async (p) => {
            try {
              // Only fetch real reviews for non-mock professionals
              if (!p._id?.startsWith('mock-')) {
                const r = await getProfessionalReviews(p._id || p.id, { limit: 2 });
                const items = r?.data?.reviews || r?.data || [];
                return { ...p, reviews: items.map(x => ({ text: x.comment || x.review || '', rating: Number(x.rating||0) })) };
              } else {
                // Add mock reviews for mock professionals
                return { 
                  ...p, 
                  reviews: getMockReviews(p.category?.toLowerCase() || categoryKey) 
                };
              }
            } catch (_) { 
              // If fetching fails, add mock reviews
              return { 
                ...p, 
                reviews: getMockReviews(p.category?.toLowerCase() || categoryKey) 
              };
            }
          }));
          const merged = sorted.map(s => withRecent.find(w => (w._id||w.id) === (s._id||s.id)) || s);
          setPros(merged);
        } catch (_) {
          // If all fails, add mock reviews to all
          const withMockReviews = sorted.map(p => ({
            ...p,
            reviews: getMockReviews(p.category?.toLowerCase() || categoryKey)
          }));
          setPros(withMockReviews);
        }
      } catch (err) {
        console.error('Error fetching professionals:', err);
        console.log('🎭 API failed, using mock data as fallback');
        // Use mock data as fallback instead of showing empty state
        const mockProfs = getMockProfessionals(categoryKey);
        const withMockReviews = mockProfs.map(p => ({
          ...p,
          reviews: getMockReviews(p.category?.toLowerCase() || categoryKey)
        }));
        setPros(withMockReviews);
        // Don't set error, just silently fallback to mock data
      } finally {
        setLoading(false);
      }
    };

    if (categoryKey) {
      fetchProfessionals();
    }
  }, [categoryKey, userLocation, sortBy]);

  const handleReviewSubmit = ({ serviceName, review, rating }) => {
    setPros((prev) =>
      prev.map((pro) => {
        if (pro.name === serviceName) {
          const newReviews = [...(pro.reviews || []), { text: review, rating }];
          const newCount = (pro.reviewCount || 0) + 1;
          const newRating = (
            (pro.rating * (pro.reviewCount || 0) + rating) / newCount
          ).toFixed(1);

          // Save to localStorage
          const stored = localStorage.getItem(LOCAL_KEY);
          const parsed = stored ? JSON.parse(stored) : {};
          parsed[pro.name] = {
            rating: newRating,
            reviewCount: newCount,
            reviews: newReviews,
          };
          localStorage.setItem(LOCAL_KEY, JSON.stringify(parsed));

          return {
            ...pro,
            rating: newRating,
            reviewCount: newCount,
            reviews: newReviews,
          };
        }
        return pro;
      })
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 capitalize">
          {category || categoryKey} Professionals
        </h2>
        <div className="flex items-center gap-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="rating">Sort by Rating</option>
            <option value="distance">Sort by Distance</option>
            <option value="price">Sort by Price</option>
          </select>
          <Link
            to="/join"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <FaPlus />
            Join as Pro
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : pros.length > 0 ? ( // Show layout with professionals (mock or real)
        <div className="relative">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 filter blur-[2px]">
            {pros.map((pro) => (
              <ProfessionalCard
                key={pro._id || pro.id}
                pro={pro}
                userLocation={userLocation}
                onReviewClick={(pro) => {
                  setSelectedPro(pro);
                  setIsModalOpen(true);
                }}
              />
            ))}
          </div>

          {/* Login Overlay */}
          <div className="absolute inset-0 flex items-start justify-center pt-20 bg-white bg-opacity-90 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-200">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaLock className="text-2xl text-gray-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Professional Profiles</h2>
                <p className="text-gray-600">
                  Sign in or create an account to view detailed profiles, ratings, and connect with {category || categoryKey} professionals
                </p>
              </div>

              <div className="space-y-4">
                <Link
                  to="/login"
                  className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  <FaUser />
                  Sign In
                </Link>
                
                <Link
                  to="/signup"
                  className="w-full flex items-center justify-center gap-3 bg-white text-indigo-600 py-3 px-4 rounded-lg border-2 border-indigo-600 hover:bg-indigo-50 transition-colors font-medium"
                >
                  <FaUserPlus />
                  Create Account
                </Link>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500">
                  Join thousands of users finding trusted professionals
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg mb-4">
            No professionals found for this category yet.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Be the first to join as a {category || categoryKey} professional!
          </p>
          <Link
            to="/join"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <FaPlus />
            Join as Pro
          </Link>
        </div>
      )}

      <ReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        serviceName={selectedPro?.name}
        onSubmit={handleReviewSubmit}
      />
    </div>
  );
};

export default CategoryPage;
