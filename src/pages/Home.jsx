import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import servicesData from '../data/services.json';
import heroImage from '../assets/images/hero-city.jpeg';
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

        const filtered = servicesData.filter(
          (service) =>
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
    <section>
      <div>

        {/* 🚀 Hero Section with Background */}
        <div className="relative overflow-hidden shadow-xl h-[500px] md:h-[600px] flex items-center justify-center text-center bg-black/50">
          <img
            src={heroImage}
            alt="Find trusted service professionals"
            className="absolute inset-0 w-full h-full object-cover object-center opacity-80"
          />
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
                    src={`/images/${service.name.toLowerCase().replace(/\s+/g, '')}.jpeg`}
                    alt={service.name}
                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform"
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
            <div>
              <p className="text-4xl font-extrabold text-blue-600">1,000+</p>
              <p className="text-sm text-gray-600 mt-2">Verified Professionals</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold text-blue-600">500+</p>
              <p className="text-sm text-gray-600 mt-2">Local Categories</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold text-blue-600">100K+</p>
              <p className="text-sm text-gray-600 mt-2">Happy Users</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold text-blue-600">250+</p>
              <p className="text-sm text-gray-600 mt-2">Cities Covered</p>
            </div>
          </div>
        </div>

        {/* 🔥 Popular Categories */}
        <div className="py-10 p-10 space-y-6">
          <h2 className="text-2xl font-semibold text-center">Popular Categories</h2>
          <div className="overflow-x-auto">
            <div className="flex gap-6 px-4 md:px-0 max-w-6xl mx-auto">
              {[
                { icon: <FaTools />, label: 'Electrician' },
                { icon: <FaMapMarkerAlt />, label: 'Plumber' },
                { icon: <FaStar />, label: 'Tailor' },
                { icon: <FaThumbsUp />, label: 'Hair Stylist' },
                { icon: <FaClock />, label: 'Generator Repair' },
                { icon: <FaCheckCircle />, label: 'AC Technician' },
              ].map((cat, idx) => (
                <div
                  key={idx}
                  className="min-w-[150px] bg-white border rounded-xl shadow p-4 text-center hover:scale-105 transition transform cursor-pointer"
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

        {/* 📢 CTA */}
        <div className="bg-blue-600 text-white text-center py-10 px-4 rounded-2xl shadow-lg">
          <h2 className="text-3xl font-bold mb-4">Ready to find or offer a service?</h2>
          <p className="mb-6 text-blue-100">
            Join thousands using FixFinder to find help or grow their business.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Link
              to="/services"
              className="bg-white text-blue-600 font-semibold px-6 py-3 rounded-xl shadow hover:bg-gray-100 transition-all"
            >
              Find a Service
            </Link>
            <Link
              to="/add-service"
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
