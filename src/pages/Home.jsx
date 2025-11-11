import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { snapToLGAApi } from '../utils/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faBriefcase, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import servicesData from '../data/services.json';
// hero image retained in assets for potential future fallback
import GlobeHero from '../components/GlobeHero';
import ServiceSelector from '../components/ServiceSelector';
import {
  isValidString,
  isValidLocation
} from '../utils/validateInput';
import {
  FaSearch,
  FaMapMarkerAlt,
  FaTools,
  FaStar,
  FaCheckCircle,
  FaClock,
  FaThumbsUp,
  FaArrowRight,
  FaUser,
  FaBriefcase
} from 'react-icons/fa';

const getCityFromCoords = (lat, lng) => {
  // Nigeria coordinates ranges (more generous)
  if (lat >= 6.0 && lat <= 6.8 && lng >= 3.0 && lng <= 4.0) return 'Lagos';
  if (lat >= 4.5 && lat <= 5.2 && lng >= 6.8 && lng <= 7.5) return 'Port Harcourt';
  if (lat >= 8.5 && lat <= 9.5 && lng >= 7.0 && lng <= 7.8) return 'Abuja';
  if (lat >= 6.2 && lat <= 6.5 && lng >= 5.5 && lng <= 6.2) return 'Benin';
  // If coordinates are in Nigeria but not in our predefined cities, default to Lagos
  if (lat >= 4 && lat <= 14 && lng >= 3 && lng <= 15) return 'Lagos';
  return null; // Return null instead of 'Unknown' for better handling
};

// Counter animation hook
const useCounter = (end, duration = 2000) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    let startTime;
    const startValue = 0;
    const endValue = end;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentCount = Math.floor(startValue + (endValue - startValue) * easeOutQuart);
      
      setCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isVisible, end, duration]);

  return [count, ref];
};

const Home = () => {
  const [allServices, setAllServices] = useState([]);
  const [services, setServices] = useState([]);
  const [userCity, setUserCity] = useState('');
  const [userCoords, setUserCoords] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Counter hooks
  const [professionalsCount, professionalsRef] = useCounter(1000);
  const [categoriesCount, categoriesRef] = useCounter(500);
  const [usersCount, usersRef] = useCounter(100);
  const [citiesCount, citiesRef] = useCounter(250);

  const allCities = ['Lagos', 'Abuja', 'Port Harcourt', 'Benin'];
  const allCategories = [...new Set(servicesData.map((s) => s.name))];

  useEffect(() => {
    // Seed with all services immediately, show only first 4 on home page
    setAllServices(servicesData);
    setServices(servicesData.slice(0, 4));
    setLoading(false);
    // Do not auto-request geolocation; require user gesture per browser guidance
  }, []);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported.');
      setLoading(false);
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          // Use backend snap (no CORS) to get LGA/State
          const snap = await snapToLGAApi(latitude, longitude);
          const lga = snap?.data?.lga || '';
          const state = snap?.data?.state || '';
          const label = lga || state || '';
          setUserCity(label);
          setUserCoords({ latitude, longitude });
        } catch {
          const city = getCityFromCoords(latitude, longitude);
          setUserCity(city || '');
          setUserCoords({ latitude, longitude });
        }

        setAllServices(servicesData);
        setServices(servicesData.slice(0, 4));
        setLoading(false);
      },
      (err) => {
        console.warn(err.message);
        setError('Location access denied. Showing all services.');
        setUserCity(null); // Set to null instead of empty string
        setUserCoords(null);
        setAllServices(servicesData);
        setServices(servicesData.slice(0, 4));
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  useEffect(() => {
    const keyword = searchTerm.toLowerCase();

    const filterServices = allServices.filter((service) => {
      const matchesKeyword =
        service.name.toLowerCase().includes(keyword) ||
        service.description.toLowerCase().includes(keyword);

      const matchesCategory = selectedCategory
        ? service.name === selectedCategory
        : true;

      const matchesCity = selectedCity
        ? service.location === selectedCity
        : userCity && userCity !== 'Unknown'
          ? (service.location === userCity || (userCity && service.location && userCity.toLowerCase().includes(service.location.toLowerCase())))
          : true;

      return matchesKeyword && matchesCategory && matchesCity;
    });

    const next = filterServices.length ? filterServices : allServices;
    setServices(next.slice(0, 4));
  }, [searchTerm, selectedCategory, selectedCity, userCity, allServices]);

  return (
    <section>
      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @keyframes scroll-reverse {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }
        .animate-scroll {
          animation: scroll 20s linear infinite;
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
        .animate-scroll-reverse {
          animation: scroll-reverse 22s linear infinite;
        }
        .animate-scroll-reverse:hover { 
          animation-play-state: paused; 
        }
      `}</style>
      <div>

        {/* 🚀 Hero Section with 3D Globe */}
        <GlobeHero
          coords={userCoords}
          headline="Find Trusted Local Service Experts"
          subline={`Whether you need a reliable tailor, plumber, or electrician, FindYourFixer connects you to verified professionals in ${selectedCity || userCity || 'your area'}.`}
          onNeedsLocation={handleGetLocation}
        />

        {/* 🔍 Search Bar */}
        <div className="-mt-20 z-20 relative px-4 md:px-0">
          <div className="max-w-5xl mx-auto bg-white p-4 md:p-6 rounded-xl shadow-xl grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <ServiceSelector
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search for a service (e.g. Electrician, Plumber, Barber)..."
              showSuggestions={true}
              allowCustom={true}
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="p-3 border border-gray-300 rounded-lg w-full"
            >
              <option value="">All Categories</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleGetLocation}
                className="p-3 border border-gray-300 rounded-lg w-full hover:bg-gray-50"
              >
                <span className="inline-flex items-center gap-2">
                  <FaMapMarkerAlt className="text-blue-600" /> {userCity ? `Using: ${userCity}` : 'Use My Location'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 🧰 Service Cards */}
        <div className="px-4 md:px-12 py-16 bg-white">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4 text-center">
            Discover Your Next Local Service
          </h2>
          <p className="text-center text-gray-500 mb-10 text-sm md:text-base">
            Explore top-ranking categories to connect with trusted professionals near you.
          </p>

          {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

          {loading ? (
            <p className="text-center">Loading nearby services...</p>
          ) : services.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <Link
                  key={service.id}
                  to={`/services/${service.name.toLowerCase()}`}
                  className="group relative block rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all"
                >
                  <img
                    src={service.image || `/images/${service.name.toLowerCase().replace(/\s+/g, '')}.jpeg`}
                    alt={service.name}
                    className="w-full h-80 object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => (e.currentTarget.src = '/images/placeholder.jpeg')}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 to-transparent" />
                  <div className="shine-overlay" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-white font-bold text-lg drop-shadow-sm">{service.name}</h3>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No matching services found.</p>
          )}
        </div>

        {/* 📊 Stats */}
        <div className="px-4 md:px-12 py-16 bg-white text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-10 text-gray-800">
            Explore millions of services tailored to your local needs
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div ref={professionalsRef}>
              <p className="text-4xl font-extrabold text-blue-600">{professionalsCount}+</p>
              <p className="text-sm text-gray-600 mt-2">Verified Professionals</p>
            </div>
            <div ref={categoriesRef}>
              <p className="text-4xl font-extrabold text-blue-600">{categoriesCount}+</p>
              <p className="text-sm text-gray-600 mt-2">Local Categories</p>
            </div>
            <div ref={usersRef}>
              <p className="text-4xl font-extrabold text-blue-600">{usersCount}K+</p>
              <p className="text-sm text-gray-600 mt-2">Happy Users</p>
            </div>
            <div ref={citiesRef}>
              <p className="text-4xl font-extrabold text-blue-600">{citiesCount}+</p>
              <p className="text-sm text-gray-600 mt-2">Cities Covered</p>
            </div>
          </div>
        </div>

        {/* 📢 CTA Section (Upgraded) */}
        <div className="px-4 md:px-12 py-20 relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-50 via-white to-emerald-50" />
          <div className="absolute -top-20 -right-24 w-80 h-80 rounded-full bg-indigo-200/40 blur-3xl" />
          <div className="absolute -bottom-28 -left-24 w-96 h-96 rounded-full bg-emerald-200/40 blur-3xl" />

          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
              Ready to find or offer a service?
            </h2>
            <p className="text-lg text-gray-600 mt-3">
              Join thousands using FindYourFixer to find help or grow their business.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Find a Service Card */}
            <div className="relative group rounded-3xl overflow-hidden border border-gray-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm hover:shadow-xl transition-all">
              <div className="h-56 relative">
                <img
                  src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1000&h=600&fit=crop"
                  alt="Find a Service"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white text-indigo-600 shadow">
                    <FontAwesomeIcon icon={faSearch} />
                  </span>
                  <h3 className="text-white text-2xl font-bold drop-shadow">Find a Service</h3>
                </div>
              </div>
              <div className="p-6 md:p-8">
                <h4 className="text-lg md:text-xl font-semibold text-gray-900">How to use FindYourFixer as a User</h4>
                <div className="mt-4 space-y-4">
                  {[
                    'Search for the service you need using our search bar or browse categories',
                    'View verified professionals in your area with ratings and reviews',
                    'Contact and book your preferred professional directly'
                  ].map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-white text-sm font-bold">
                        {idx + 1}
                      </span>
                      <p className="text-gray-700 text-sm md:text-base">{step}</p>
                    </div>
                  ))}
                </div>
                <Link
                  to="/services"
                  className="mt-6 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 shadow"
                >
                  Start Finding Services
                  <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Become a Provider Card */}
            <div className="relative group rounded-3xl overflow-hidden border border-gray-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm hover:shadow-xl transition-all">
              <div className="h-56 relative">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1000&h=600&fit=crop"
                  alt="Become a Provider"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white text-emerald-600 shadow">
                    <FontAwesomeIcon icon={faBriefcase} />
                  </span>
                  <h3 className="text-white text-2xl font-bold drop-shadow">Become a Provider</h3>
                </div>
              </div>
              <div className="p-6 md:p-8">
                <h4 className="text-lg md:text-xl font-semibold text-gray-900">How to use FindYourFixer as a Professional</h4>
                <div className="mt-4 space-y-4">
                  {[
                    'Create your professional profile with your skills and experience',
                    'Get verified to build trust with potential customers',
                    'Receive job requests and grow your business'
                  ].map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white text-sm font-bold">
                        {idx + 1}
                      </span>
                      <p className="text-gray-700 text-sm md:text-base">{step}</p>
                    </div>
                  ))}
                </div>
                <Link
                  to="/join"
                  className="mt-6 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-500 shadow"
                >
                  Join as Professional
                  <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 🔥 Popular Categories - Mint Blue section with V-shaped image cards */}
        <div className="py-16 relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-cyan-50 via-emerald-50 to-white" />
          <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-cyan-200/30 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-[520px] h-[520px] rounded-full bg-emerald-200/30 blur-3xl" />

          <h2 className="text-3xl md:text-4xl font-extrabold text-center text-gray-800">
            Top 10 Most Popular Categories for {new Date().getFullYear()}
          </h2>
          <p className="mt-3 text-center text-gray-600">Hand-picked categories people book the most this year.</p>

          {(() => {
            const categories = [
              { label: 'AC Technician', img: '/pro/actechnician1.jpeg' },
              { label: 'Barber', img: '/pro/barber1.jpeg' },
              { label: 'Caregiver', img: '/pro/caregiver1.jpeg' },
              { label: 'Carpenter', img: '/pro/carpenter1.jpeg' },
              { label: 'Dry Cleaner', img: '/pro/dryclean1.jpeg' },
              { label: 'Electrician', img: '/pro/electrician1.avif' },
              { label: 'Generator Repair', img: '/pro/gen1.jpeg' },
              { label: 'Hair Stylist', img: '/pro/hairstylist1.jpeg' },
              { label: 'Makeup Artist', img: '/pro/makeup1.jpeg' },
              { label: 'Plumber', img: '/pro/plumber1.jpeg' },
            ];
            const loop = [...categories, ...categories]; // seamless loop
            return (
              <div className="mt-10 relative overflow-hidden">
                <div className="flex animate-scroll gap-6 px-6">
                  {loop.map((cat, idx) => (
                    <div
                      key={`${cat.label}-${idx}`}
                      className={`group relative flex-shrink-0 w-[220px] h-[300px] rounded-2xl overflow-hidden shadow-lg border border-white/40 bg-white/70 backdrop-blur-sm transition-transform duration-300 ${idx % 2 === 0 ? '-rotate-6' : 'rotate-6'} hover:rotate-0`}
                    >
                      <img
                        src={cat.img}
                        alt={cat.label}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => (e.currentTarget.src = '/images/placeholder.jpeg')}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                        <div>
                          <p className="text-white font-semibold drop-shadow-sm">{cat.label}</p>
                        </div>
                        <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-white/90 text-gray-800 shadow">Explore</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* 🌟 Testimonials - Mint glass marquee */}
        <div className="relative py-16 px-6 rounded-2xl overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50 via-white to-cyan-50" />
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-cyan-200/40 blur-3xl" />

          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">What our users say</h2>
            <p className="mt-2 text-gray-600">Real stories from customers and pros who found the perfect match.</p>
          </div>

          {(() => {
            const testimonials = [
              { name: 'Sandra', role: 'Tailoring customer', quote: 'Found a brilliant tailor in 30 minutes. Outfit delivered next day!' },
              { name: 'Emeka', role: 'Homeowner', quote: 'Booked a plumber nearby in minutes. Transparent pricing and great work.' },
              { name: 'Fatima', role: 'Hair stylist', quote: 'I get steady bookings every week. Reviews boosted my visibility.' },
              { name: 'Uche', role: 'Electrician', quote: 'Verification helped me win trust. Repeat clients are up 3x.' },
              { name: 'Ada', role: 'Event planner', quote: 'The quality of leads is excellent. Messaging makes coordination easy.' },
              { name: 'Chinedu', role: 'Generator repair', quote: 'Customers can see my ratings—makes closing jobs so much easier.' },
            ];
            const Card = ({ t }) => (
              <div className="rounded-2xl border border-white/50 bg-white/70 backdrop-blur-md shadow-sm hover:shadow-lg transition-all p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-1 text-emerald-500">“</div>
                  <div className="flex-1">
                    <p className="text-gray-700 leading-relaxed text-sm">{t.quote}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                        <p className="text-xs text-gray-500">{t.role}</p>
                      </div>
                      <div className="ml-4 flex items-center gap-0.5 text-amber-500 text-sm" aria-label="5 out of 5 stars">
                        {Array.from({ length: 5 }).map((_, i) => (<span key={i}>★</span>))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
            return (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
                {testimonials.map((t, i) => (<Card key={`${i}-${t.name}`} t={t} />))}
              </div>
            );
          })()}
        </div>

      </div>
    </section>
  );
};

export default Home;
