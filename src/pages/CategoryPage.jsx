import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProfessionals } from '../utils/api';
import ProfessionalCard from '../components/ProfessionalCard';
import ReviewModal from '../components/ReviewModal';
import SkeletonCard from '../components/SkeletonCard';
import { FaPlus, FaLock, FaUser, FaUserPlus } from 'react-icons/fa';

const LOCAL_KEY = 'fixfinder-reviews';

const CategoryPage = () => {
  const { category } = useParams();
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
        
        const response = await getProfessionals({ category: category.toLowerCase() });
        let professionals = response.professionals || [];

        // Fallback demo professionals if none from backend
        if (!Array.isArray(professionals) || professionals.length === 0) {
          const baseLocation = userLocation || [6.5244, 3.3792]; // Lagos default
          const demoNames = [
            'John', 'Mary', 'Emeka', 'Aisha', 'Chinedu', 'Fatima', 'Bola', 'Ibrahim', 'Ngozi', 'Tunde'
          ];
          const cities = ['Lagos', 'Abuja', 'Port Harcourt', 'Benin'];
          const priceByCategory = {
            electrician: [8000, 15000],
            plumber: [7000, 12000],
            tailor: [3000, 8000],
            barber: [2000, 5000],
            mechanic: [6000, 14000],
            painter: [5000, 12000],
            carpenter: [5000, 13000],
            default: [4000, 10000],
          };

          const [minP, maxP] = priceByCategory[category.toLowerCase()] || priceByCategory.default;

          professionals = Array.from({ length: 8 }).map((_, i) => {
            const offsetLat = (Math.random() - 0.5) * 0.08;
            const offsetLon = (Math.random() - 0.5) * 0.08;
            const name = `${demoNames[i % demoNames.length]} ${category.charAt(0).toUpperCase() + category.slice(1)}`;
            const rating = Math.round((Math.random() * 2 + 3) * 10) / 10; // 3.0 - 5.0
            const reviewCount = Math.floor(Math.random() * 50) + 5;

            return {
              id: `demo_${category}_${i}`,
              name,
              category: category.toLowerCase(),
              city: cities[i % cities.length],
              bio: `Experienced ${category} available for quick and reliable service.`,
              pricePerHour: Math.floor(Math.random() * (maxP - minP)) + minP,
              ratingAvg: rating,
              ratingCount: reviewCount,
              photos: ['/images/placeholder.jpeg'],
              coordinates: [baseLocation[0] + offsetLat, baseLocation[1] + offsetLon],
            };
          });
        }
        
        // Attach saved reviews from localStorage
        const stored = localStorage.getItem(LOCAL_KEY);
        const storedReviews = stored ? JSON.parse(stored) : {};

        const enriched = professionals.map((pro) => {
          const saved = storedReviews[pro.name] || {};
          // Generate coordinates if not available (for demo purposes)
          const coordinates = pro.coordinates || (userLocation ? [
            userLocation[0] + (Math.random() - 0.5) * 0.05,
            userLocation[1] + (Math.random() - 0.5) * 0.05
          ] : null);
          
          return {
            ...pro,
            ratingAvg: saved.rating || pro.ratingAvg || 0,
            ratingCount: saved.reviewCount || pro.ratingCount || 0,
            reviews: saved.reviews || [],
            coordinates,
          };
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

        setPros(sorted);
      } catch (err) {
        setError(err.message || 'Failed to fetch professionals');
        setPros([]);
      } finally {
        setLoading(false);
      }
    };

    if (category) {
      fetchProfessionals();
    }
  }, [category, userLocation, sortBy]);

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
          {category} Professionals
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
      ) : pros.length > 0 ? (
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
                  Sign in or create an account to view detailed profiles, ratings, and connect with {category} professionals
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
            Be the first to join as a {category} professional!
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
