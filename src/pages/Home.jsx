import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import servicesData from '../data/services.json';
import heroImage from '../assets/images/hero-city.webp';
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
    // Seed with all services immediately, but show only first 4 on home page
    setAllServices(servicesData);
    setServices(servicesData.slice(0, 4)); // Show only 4 services on home page

    // Try auto geolocation (may show browser prompt/warning, acceptable per requirements)
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((result) => {
          if (result.state === 'granted' || result.state === 'prompt') {
            handleGetLocation();
          } else {
            setLoading(false);
          }
        })
        .catch(() => {
          // Fallback: attempt geolocation directly
          handleGetLocation();
        });
    } else {
      handleGetLocation();
    }
  }, []);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported.');
      setLoading(false);
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const city = getCityFromCoords(latitude, longitude);
        setUserCity(city);

        // Only filter by city if we have a valid known city
        if (city && city !== 'Unknown') {
          const filtered = servicesData.filter(
            (service) =>
              isValidString(service.name) &&
              isValidString(service.description) &&
              isValidLocation(service.location) &&
              service.location === city
          );
          setAllServices(filtered.length ? filtered : servicesData);
          setServices(filtered.length ? filtered.slice(0, 4) : servicesData.slice(0, 4));
        } else {
          // If city is null or unknown, show all services
          setAllServices(servicesData);
          setServices(servicesData.slice(0, 4));
        }
        setLoading(false);
      },
      (err) => {
        console.warn(err.message);
        setError('Location access denied. Showing all services.');
        setUserCity(null); // Set to null instead of empty string
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
        : userCity && userCity !== 'Unknown' ? service.location === userCity : true;

      return matchesKeyword && matchesCategory && matchesCity;
    });

    setServices(filterServices.slice(0, 4));
  }, [searchTerm, selectedCategory, selectedCity, userCity, allServices]);

  return (
    <section>
      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll {
          animation: scroll 20s linear infinite;
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div>

        {/* 🚀 Hero Section with Background */}
      <div className="relative h-[500px] md:h-[600px] flex items-center justify-center text-center">
  <img
    src={heroImage}
    alt="Find trusted service professionals"
    className="absolute inset-0 w-full h-full object-cover object-center"
  />
       <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/50 to-black/10" />
          <div className="relative z-10 text-white px-6 md:px-12 space-y-6 max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight drop-shadow-lg">
              Find Trusted Local Service Experts
            </h1>
            <p className="text-lg md:text-xl text-gray-100 font-normal">
              Whether you need a reliable tailor, plumber, or electrician,
              <span className="font-semibold text-white"> FixFinder</span> connects you to verified professionals in{' '}
              <span className="text-blue-600 font-medium">{selectedCity || userCity || 'your area'}</span>.
            </p>
            <div className="flex justify-center">
              <Link to={'/services'}>
                <button className="bg-blue-600 hover:bg-blue-700 transition px-6 py-3 rounded-full text-white font-medium shadow-lg">
                  Browse Services
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* 🔍 Search Bar */}
        <div className="-mt-20 z-20 relative px-4 md:px-0">
          <div className="max-w-5xl mx-auto bg-white p-4 md:p-6 rounded-xl shadow-xl grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search e.g. electrician"
              className="p-3 border border-gray-300 rounded-lg w-full"
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
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="p-3 border border-gray-300 rounded-lg w-full"
            >
              <option value="">Use My Location</option>
              {allCities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
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
                <div key={service.id} className="border rounded-xl shadow-md overflow-hidden group hover:shadow-lg transition-all">
                  <img
                    src={service.image || `/images/${service.name.toLowerCase().replace(/\s+/g, '')}.jpeg`}
                    alt={service.name}
                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => (e.currentTarget.src = '/images/placeholder.jpeg')}
                  />
                  <div className="p-4">
                    <h3 className="font-semibold text-lg text-gray-800 mb-2">
                      {service.name}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2">{service.description}</p>
                    <Link
                      to={`/services/${service.name.toLowerCase()}`}
                      className="text-blue-600 text-sm mt-3 inline-block hover:underline"
                    >
                      View More →
                    </Link>
                  </div>
                </div>
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

        {/* 📢 CTA Section */}
        <div className="px-4 md:px-12 py-16 bg-gray-50">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-gray-800">Ready to find or offer a service?</h2>
            <p className="text-lg text-gray-600 mb-8">
              Join thousands using FixFinder to find help or grow their business.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Find a Service Card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <div className="h-48 relative">
                <img
                  src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop"
                  alt="Find a Service"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h3 className="text-2xl font-bold">Find a Service</h3>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h4 className="text-xl font-semibold mb-4 text-gray-800">How to use FixFinder as a User</h4>
                <div className="space-y-3 text-gray-600">
                  <div className="flex items-start gap-3">
                    <span className="bg-gray-100 text-gray-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">1</span>
                    <p>Search for the service you need using our search bar or browse categories</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-gray-100 text-gray-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">2</span>
                    <p>View verified professionals in your area with ratings and reviews</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-gray-100 text-gray-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">3</span>
                    <p>Contact and book your preferred professional directly</p>
                  </div>
                </div>
                <Link
                  to="/services"
                  className="mt-6 w-full bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  Start Finding Services
                  <FaArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Become a Provider Card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <div className="h-48 relative">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop"
                  alt="Become a Provider"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h3 className="text-2xl font-bold">Become a Provider</h3>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h4 className="text-xl font-semibold mb-4 text-gray-800">How to use FixFinder as a Professional</h4>
                <div className="space-y-3 text-gray-600">
                  <div className="flex items-start gap-3">
                    <span className="bg-gray-100 text-gray-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">1</span>
                    <p>Create your professional profile with your skills and experience</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-gray-100 text-gray-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">2</span>
                    <p>Get verified to build trust with potential customers</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-gray-100 text-gray-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">3</span>
                    <p>Receive job requests and grow your business</p>
                  </div>
                </div>
                <Link
                  to="/join"
                  className="mt-6 w-full bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  Join as Professional
                  <FaArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 🔥 Popular Categories - Sliding Carousel */}
        <div className="py-10 bg-white">
          <h2 className="text-2xl font-semibold text-center mb-8">Popular Categories</h2>
          <div className="relative overflow-hidden">
            <div className="flex animate-scroll gap-6 px-4 md:px-0">
              {/* Duplicate the array to create seamless loop */}
              {[
                { icon: <FaTools />, label: 'Electrician' },
                { icon: <FaMapMarkerAlt />, label: 'Plumber' },
                { icon: <FaStar />, label: 'Tailor' },
                { icon: <FaThumbsUp />, label: 'Hair Stylist' },
                { icon: <FaClock />, label: 'Generator Repair' },
                { icon: <FaCheckCircle />, label: 'AC Technician' },
                { icon: <FaTools />, label: 'Electrician' },
                { icon: <FaMapMarkerAlt />, label: 'Plumber' },
                { icon: <FaStar />, label: 'Tailor' },
                { icon: <FaThumbsUp />, label: 'Hair Stylist' },
                { icon: <FaClock />, label: 'Generator Repair' },
                { icon: <FaCheckCircle />, label: 'AC Technician' },
              ].map((cat, idx) => (
                <div
                  key={idx}
                  className="min-w-[150px] bg-white border rounded-xl shadow p-4 text-center hover:scale-105 transition transform cursor-pointer flex-shrink-0"
                >
                  <div className="text-blue-600 text-3xl mb-2">{cat.icon}</div>
                  <p className="text-sm font-medium text-gray-700">{cat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 🌟 Testimonials */}
        <div className="bg-gray-50 py-10 px-6 rounded-xl">
          <h2 className="text-2xl font-semibold text-center mb-6">What Our Users Say</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Sandra', review: 'FixFinder helped me find a professional tailor within 30 minutes!' },
              { name: 'Emeka', review: 'I booked a plumber in my area fast — the reviews were very helpful!' },
              { name: 'Fatima', review: 'As a vendor, FixFinder helps me get more jobs every week.' }
            ].map((t, i) => (
              <div key={i} className="p-4 border rounded-lg shadow-sm bg-white">
                <p className="text-gray-600 italic">"{t.review}"</p>
                <p className="mt-4 font-semibold text-sm text-blue-700">— {t.name}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

export default Home;
