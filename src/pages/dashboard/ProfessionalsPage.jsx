import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiMapPin, FiStar, FiClock, FiFilter, FiSearch, FiGrid, FiList, FiX, FiUser, FiArrowRight, FiShield, FiLoader } from 'react-icons/fi';
import { getProfessionals, getConnectionRequests, getConnections, createOrGetConversation, getProfessional } from '../../utils/api';
import { useAuth } from '../../context/useAuth';
import { useLocation as useLocationHook } from '../../hooks/useLocation';
import { calculateDistance as haversineDistance, formatDistance } from '../../utils/locationUtils';
import { useToast } from '../../context/ToastContext';
import ServiceSelector from '../../components/ServiceSelector';
import { getVerificationState } from '../../utils/verificationUtils';

const ProfessionalsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { error } = useToast();
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const { location: detectedLocation } = useLocationHook(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [filters, setFilters] = useState({
    service: '',
    location: '',
    priceRange: { min: 0, max: 100000 },
    rating: 0,
    availability: 'all'
  });
  const [connections, setConnections] = useState(new Map());
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fromDetected = detectedLocation?.latitude && detectedLocation?.longitude
      ? { lat: detectedLocation.latitude, lng: detectedLocation.longitude }
      : null;
    const fromUser = user?.location?.coordinates?.lat && user?.location?.coordinates?.lng
      ? { lat: Number(user.location.coordinates.lat), lng: Number(user.location.coordinates.lng) }
      : (user?.location?.latitude && user?.location?.longitude
        ? { lat: Number(user.location.latitude), lng: Number(user.location.longitude) }
        : null);

    setUserLocation(fromDetected || fromUser || { lat: 6.5244, lng: 3.3792 });
    loadData();
  }, [user]);

  useEffect(() => {
    if (detectedLocation?.latitude && detectedLocation?.longitude) {
      setUserLocation({ lat: detectedLocation.latitude, lng: detectedLocation.longitude });
    }
  }, [detectedLocation?.latitude, detectedLocation?.longitude]);

  useEffect(() => {
    if (userLocation) {
      loadProfessionals();
    }
  }, [userLocation]);

  const loadData = async () => {
    if (!user) return;
    try {
      const connResponse = await getConnections();
      if (connResponse.success) {
        const connectionsMap = new Map();
        connResponse.data.forEach(connection => {
          let professionalId = connection.requester._id === user.id
            ? connection.professional?._id
            : connection.requester?._id;
          if (professionalId) {
            connectionsMap.set(professionalId, connection._id);
          }
        });
        setConnections(connectionsMap);
      }
      await loadProfessionals();
    } catch (err) {
      console.log('Error synchronization:', err);
    }
  };

  const loadProfessionals = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await getProfessionals({ limit: 50 });
      if (response?.success && Array.isArray(response.professionals)) {
        const pros = response.professionals.map(pro => ({
          ...pro,
          image: pro.user?.profilePicture || pro.profilePicture || '/images/placeholder.jpeg'
        }));

        if (userLocation) {
          const prosWithDistance = await Promise.all(pros.map(async (pro) => {
            let loc = pro.location;
            if (!loc?.coordinates?.lat || !loc?.coordinates?.lng) {
              try {
                const detail = await getProfessional(pro._id, { byUser: false });
                const payload = detail?.data || detail;
                if (payload?.location) loc = payload.location;
              } catch { }
            }
            const distance = (loc?.coordinates?.lat && loc?.coordinates?.lng)
              ? haversineDistance(userLocation.lat, userLocation.lng, Number(loc.coordinates.lat), Number(loc.coordinates.lng))
              : undefined;
            return { ...pro, location: loc || pro.location, distance };
          }));
          setProfessionals(prosWithDistance.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999)));
        } else {
          setProfessionals(pros);
        }
      }
    } catch (error) {
      console.error('Error loading professionals:', error);
      setErrorMessage('Registry synchronization failure.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async (professional) => {
    try {
      const response = await createOrGetConversation({ otherUserId: professional.user });
      if (response.success) navigate(`/dashboard/messages/${response.data._id}`);
    } catch (err) {
      error('Communication link failure.');
    }
  };

  const filteredProfessionals = professionals.filter(pro => {
    if (!connections.has(pro._id)) return false;
    const matchesService = !filters.service || pro.category?.toLowerCase().includes(filters.service.toLowerCase());
    const matchesLocation = !filters.location || pro.location?.address?.toLowerCase().includes(filters.location.toLowerCase());
    const rating = pro.ratingAvg || pro.rating || 0;
    const matchesRating = rating >= filters.rating;
    const price = pro.pricePerHour || pro.hourlyRate || 0;
    const matchesPrice = price >= filters.priceRange.min && price <= filters.priceRange.max;
    return matchesService && matchesLocation && matchesRating && matchesPrice;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <FiLoader className="w-12 h-12 animate-spin text-trust mb-4" />
        <p className="font-tight text-graphite text-lg">Retrieving node connections...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Premium Header */}
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <div className="label-caps mb-2 text-stone-400">Professional Network</div>
          <h1 className="text-4xl md:text-5xl font-tight font-bold text-charcoal tracking-tight">Active Connections</h1>
          <p className="mt-3 text-lg text-graphite max-w-xl leading-relaxed">
            A directory of authenticated professionals within your established trust network.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white border border-stone-100 rounded-2xl p-1 flex shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-3 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-stone-50 text-trust shadow-inner' : 'text-stone-300 hover:text-stone-400'}`}
            >
              <FiGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-3 rounded-xl transition-all ${viewMode === 'list' ? 'bg-stone-50 text-trust shadow-inner' : 'text-stone-300 hover:text-stone-400'}`}
            >
              <FiList className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={() => setShowFilterModal(true)}
            className="p-4 bg-white border border-stone-200 rounded-2xl hover:border-charcoal transition-all text-charcoal"
          >
            <FiFilter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search Architecture */}
      <div className="card-premium bg-white p-6 mb-12 border-stone-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative group">
            <FiSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-trust transition-colors z-10" />
            <ServiceSelector
              value={filters.service}
              onChange={(service) => setFilters(prev => ({ ...prev, service }))}
              placeholder="Search by category..."
              className="pl-14 h-16 rounded-2xl border-stone-100 focus:border-trust transition-all text-sm font-medium"
            />
          </div>
          <div className="relative group">
            <FiMapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-trust transition-colors" />
            <input
              type="text"
              placeholder="Search by location..."
              value={filters.location}
              onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
              className="input-field pl-14 h-16 rounded-2xl bg-stone-50/50"
            />
          </div>
        </div>
      </div>

      {/* Professionals Registry */}
      {filteredProfessionals.length === 0 ? (
        <div className="card-premium bg-white p-20 text-center border-dashed border-stone-200">
          <FiUser className="w-16 h-16 text-stone-200 mx-auto mb-6" />
          <h3 className="text-xl font-tight font-bold text-stone-400">Registry Empty</h3>
          <p className="text-stone-300 mt-2">No professionals identified in your current sector.</p>
          <button
            onClick={() => setFilters({ service: '', location: '', priceRange: { min: 0, max: 100000 }, rating: 0, availability: 'all' })}
            className="mt-8 text-[11px] font-bold uppercase tracking-widest text-trust hover:underline"
          >
            RESET PARAMETERS
          </button>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-6"}>
          {filteredProfessionals.map((pro) => (
            <Link
              key={pro._id}
              to={`/dashboard/professional/${pro._id}`}
              state={{ professional: pro }}
              className={`card-premium bg-white overflow-hidden group hover:border-trust transition-all duration-500 cursor-pointer block ${viewMode === 'list' ? 'flex flex-row items-center p-6 gap-8' : ''}`}
            >
              <div className={`relative ${viewMode === 'list' ? 'w-32 h-32' : 'h-64'} overflow-hidden rounded-2xl`}>
                <img
                  src={pro.image}
                  alt={pro.name}
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-110 group-hover:scale-100"
                />
                <div className="absolute inset-0 bg-charcoal/5 group-hover:bg-transparent transition-colors"></div>
                <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-[10px] font-bold text-charcoal shadow-sm">
                  <FiMapPin className="text-trust" /> {formatDistance(pro.distance)}
                </div>
              </div>

              <div className={`flex-1 ${viewMode === 'grid' ? 'p-8' : ''}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="label-caps text-trust mb-1">{pro.category}</div>
                    <h3 className="text-2xl font-tight font-bold text-charcoal group-hover:text-trust transition-colors flex items-center gap-2">
                      {pro.name}
                      {getVerificationState(pro).fullyVerified && <FiShield className="w-5 h-5 text-trust fill-trust/10" />}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-stone-50 border border-stone-100 rounded-xl text-xs font-bold text-charcoal">
                    <FiStar className="text-trust fill-trust w-3 h-3" /> {pro.rating || '4.5'}
                  </div>
                </div>

                {viewMode === 'grid' && (
                  <p className="text-graphite text-sm leading-relaxed mb-6 line-clamp-2">
                    {pro.bio || "No professional narrative recorded in the ecosystem registry."}
                  </p>
                )}

                <div className="flex items-center justify-between py-6 border-y border-stone-50 mb-6 font-tight">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-stone-400 uppercase tracking-widest">
                    <FiClock /> Available Now
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-tight font-bold text-charcoal">₦{pro.hourlyRate || '2,500'}</div>
                    <div className="label-caps text-[9px] text-stone-400">Hourly Rate</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleStartChat(pro);
                    }}
                    className="flex-1 btn-primary py-4 px-6 text-[11px] bg-charcoal"
                  >
                    SEND MESSAGE
                  </button>
                  <div className="p-4 border border-stone-200 rounded-2xl bg-stone-50 group-hover:bg-trust group-hover:border-trust transition-all">
                    <FiArrowRight className="w-5 h-5 text-charcoal group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="card-premium bg-white p-10 max-w-lg w-full animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-10">
              <div>
                <div className="label-caps text-trust mb-2">Refine Registry</div>
                <h2 className="text-3xl font-tight font-bold text-charcoal">Filter Parameters</h2>
              </div>
              <button onClick={() => setShowFilterModal(false)} className="p-3 hover:bg-stone-50 rounded-2xl transition-all">
                <FiX className="w-6 h-6 text-stone-300" />
              </button>
            </div>

            <div className="space-y-8">
              <div>
                <label className="label-caps text-stone-400 block mb-4">Minimum Reputation Index</label>
                <div className="flex gap-4">
                  {[4, 3, 2, 0].map(r => (
                    <button
                      key={r}
                      onClick={() => setFilters(prev => ({ ...prev, rating: r }))}
                      className={`flex-1 py-4 border rounded-2xl font-bold transition-all ${filters.rating === r ? 'bg-trust text-white border-trust' : 'border-stone-100 hover:border-stone-400 text-stone-400'}`}
                    >
                      {r === 0 ? 'Any' : `${r}.0+`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label-caps text-stone-400 block mb-4">Price Spectrum (₦ /hr)</label>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    placeholder="MIN"
                    className="input-field"
                    value={filters.priceRange.min}
                    onChange={(e) => setFilters(prev => ({ ...prev, priceRange: { ...prev.priceRange, min: Number(e.target.value) } }))}
                  />
                  <input
                    type="number"
                    placeholder="MAX"
                    className="input-field"
                    value={filters.priceRange.max}
                    onChange={(e) => setFilters(prev => ({ ...prev, priceRange: { ...prev.priceRange, max: Number(e.target.value) } }))}
                  />
                </div>
              </div>
            </div>

            <div className="mt-12">
              <button
                onClick={() => setShowFilterModal(false)}
                className="w-full btn-primary py-5 text-[12px]"
              >
                APPLY PARAMETERS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalsPage;
