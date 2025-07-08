import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import servicesData from '../data/services.json';
import ServiceCard from '../components/ServiceCard';
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
  FaThumbsUp
} from 'react-icons/fa';

// Simulated lat/lng → city mapping
const getCityFromCoords = (lat, lng) => {
  if (lat >= 6 && lat <= 7 && lng >= 3 && lng <= 4) return 'Lagos';
  if (lat >= 4 && lat <= 5 && lng >= 7 && lng <= 8) return 'Port Harcourt';
  if (lat >= 8 && lat <= 9 && lng >= 6 && lng <= 8) return 'Abuja';
  if (lat >= 6 && lat <= 7 && lng >= 5 && lng <= 6) return 'Benin';
  return 'Unknown';
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

  const allCities = ['Lagos', 'Abuja', 'Port Harcourt', 'Benin'];
  const allCategories = [...new Set(servicesData.map((s) => s.name))];

  // Get user location on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported.');
      setAllServices(servicesData);
      setServices(servicesData);
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const city = getCityFromCoords(latitude, longitude);
        setUserCity(city);

        const filtered = servicesData.filter((service) =>
          isValidString(service.name) &&
          isValidString(service.description) &&
          isValidLocation(service.location) &&
          service.location === city
        );

        setAllServices(filtered.length ? filtered : servicesData);
        setServices(filtered.length ? filtered : servicesData);
        setLoading(false);
      },
      (err) => {
        console.warn(err.message);
        setError('Location access denied. Showing all services.');
        setAllServices(servicesData);
        setServices(servicesData);
        setLoading(false);
      }
    );
  }, []);

  // Dynamic filtering based on search, category, city
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
        : service.location === userCity;

      return matchesKeyword && matchesCategory && matchesCity;
    });

    setServices(filterServices);
  }, [searchTerm, selectedCategory, selectedCity, userCity, allServices]);

  return (
    <section className="p-6 md:p-10 space-y-16">
      <div className="max-w-7xl mx-auto space-y-16">

        {/* 🚀 Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800">
            Find Trusted Local Service Experts
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Whether you need a reliable tailor, plumber, or electrician,
            <span className="font-semibold"> FixFinder</span> connects you to verified professionals in{' '}
            <span className="text-blue-600 font-medium">{selectedCity || userCity || 'your area'}</span>.
          </p>
          <div className="flex justify-center mt-4">
            <button className="bg-blue-600 text-white px-6 py-3 rounded-xl shadow hover:bg-blue-700 transition-all duration-200">
              Browse Services
            </button>
          </div>
        </div>

        {/* 🔄 How It Works */}
        <div className="grid md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-blue-600 text-3xl mb-2"><FaSearch /></div>
            <h3 className="font-semibold text-lg">Search</h3>
            <p className="text-sm text-gray-500">Find services by category or city.</p>
          </div>
          <div>
            <div className="text-blue-600 text-3xl mb-2"><FaMapMarkerAlt /></div>
            <h3 className="font-semibold text-lg">Connect</h3>
            <p className="text-sm text-gray-500">Contact nearby verified professionals.</p>
          </div>
          <div>
            <div className="text-blue-600 text-3xl mb-2"><FaTools /></div>
            <h3 className="font-semibold text-lg">Get Service</h3>
            <p className="text-sm text-gray-500">Get the help you need quickly.</p>
          </div>
          <div>
            <div className="text-blue-600 text-3xl mb-2"><FaStar /></div>
            <h3 className="font-semibold text-lg">Review</h3>
            <p className="text-sm text-gray-500">Leave feedback to help others.</p>
          </div>
        </div>

        {/* 🔍 Filters + Service Cards */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Explore Nearby Services</h2>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search service (e.g. tailor)"
              className="p-3 border border-gray-300 rounded-lg shadow-sm w-full"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="p-3 border border-gray-300 rounded-lg shadow-sm w-full"
            >
              <option value="">All Categories</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="p-3 border border-gray-300 rounded-lg shadow-sm w-full"
            >
              <option value="">Use My Location</option>
              {allCities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-500 mb-4">{error}</p>}

          {loading ? (
            <p>Loading nearby services...</p>
          ) : services.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No matching services found.</p>
          )}
        </div>

        {/* 🌟 Testimonials */}
        <div className="bg-gray-50 py-10 px-6 rounded-xl">
          <h2 className="text-2xl font-semibold text-center mb-6">What Our Users Say</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Sandra',
                review: 'FixFinder helped me find a professional tailor within 30 minutes!',
              },
              {
                name: 'Emeka',
                review: 'I booked a plumber in my area fast — the reviews were very helpful!',
              },
              {
                name: 'Fatima',
                review: 'As a vendor, FixFinder helps me get more jobs every week.',
              },
            ].map((t, i) => (
              <div key={i} className="p-4 border rounded-lg shadow-sm bg-white">
                <p className="text-gray-600 italic">"{t.review}"</p>
                <p className="mt-4 font-semibold text-sm text-blue-700">— {t.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 💡 Why Choose Us */}
        <div className="py-10">
          <h2 className="text-2xl font-semibold text-center mb-6">Why Choose FixFinder?</h2>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-blue-600 text-3xl mb-2"><FaCheckCircle /></div>
              <h3 className="font-semibold">Verified Experts</h3>
              <p className="text-sm text-gray-500">We only show trusted professionals in your area.</p>
            </div>
            <div>
              <div className="text-blue-600 text-3xl mb-2"><FaClock /></div>
              <h3 className="font-semibold">Fast & Reliable</h3>
              <p className="text-sm text-gray-500">Connect and hire in minutes with confidence.</p>
            </div>
            <div>
              <div className="text-blue-600 text-3xl mb-2"><FaThumbsUp /></div>
              <h3 className="font-semibold">User Reviewed</h3>
              <p className="text-sm text-gray-500">Real reviews from people like you.</p>
            </div>
          </div>
        </div>

        {/* 📢 CTA Section */}
        <div className="bg-blue-600 text-white text-center py-10 px-4 rounded-2xl shadow-lg">
          <h2 className="text-3xl font-bold mb-4">Ready to find or offer a service?</h2>
          <p className="mb-6 text-blue-100">Join thousands using FixFinder to find help or grow their business.</p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Link
              to="/services"
              className="bg-white text-blue-600 font-semibold px-6 py-3 rounded-xl shadow hover:bg-gray-100 transition-all"
            >
              Find a Service
            </Link>
            <Link
              to="/post-job"
              className="bg-blue-800 text-white px-6 py-3 rounded-xl hover:bg-blue-900 transition-all"
            >
              Become a Provider
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Home;
