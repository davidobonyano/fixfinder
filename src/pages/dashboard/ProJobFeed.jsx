import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaSearch, FaSync, FaFilter } from 'react-icons/fa';
import { getJobFeed, findNearbyJobs } from '../../utils/api';
import { useLocation as useLocationHook } from '../../hooks/useLocation';
import ServiceSelector from '../../components/ServiceSelector';
import { useAuth } from '../../context/useAuth';
import { calculateDistance } from '../../utils/locationUtils';

const ProJobFeed = () => {
  const { user } = useAuth();
  const { location: detectedLocation } = useLocationHook(false);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [service, setService] = useState('');
  const [refreshTs, setRefreshTs] = useState(Date.now());
  const [userCity, setUserCity] = useState('');
  const [userState, setUserState] = useState('');
  const [kmRange, setKmRange] = useState(5); // 1–70 km
  const radiusMeters = kmRange * 1000;
  const [stateFilter, setStateFilter] = useState('');

  useEffect(() => {
    const city = user?.location?.city || user?.city || '';
    const state = user?.location?.state || user?.state || '';
    setUserCity(city);
    setUserState(state);
  }, [user]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Prefer nearby endpoint with radius; it will use saved user location if coords not provided
        const params = {
          radiusMeters,
        };
        if (service) params.category = service;
        if (detectedLocation?.latitude && detectedLocation?.longitude) {
          params.latitude = detectedLocation.latitude;
          params.longitude = detectedLocation.longitude;
        }
        const resp = await findNearbyJobs(params);
        let list = Array.isArray(resp?.jobs) ? resp.jobs : Array.isArray(resp?.data?.jobs) ? resp.data.jobs : [];
        if (!list.length) {
          // Fallback to broader feed if nothing within radius
          try {
            const data = await getJobFeed({ scope: 'all' });
            if (Array.isArray(data)) list = data;
            else if (Array.isArray(data?.data)) list = data.data;
            else if (Array.isArray(data?.data?.jobs)) list = data.data.jobs;
          } catch {}
        }
        const centerLat = detectedLocation?.latitude || user?.location?.latitude;
        const centerLon = detectedLocation?.longitude || user?.location?.longitude;
        if (centerLat && centerLon) {
          list = list.map(j => {
            if (!j?.distance && j?.location?.coordinates?.lat && j?.location?.coordinates?.lng) {
              const d = calculateDistance(centerLat, centerLon, j.location.coordinates.lat, j.location.coordinates.lng);
              return { ...j, distance: d, distanceFormatted: `${d.toFixed(1)} km` };
            }
            return j;
          });
        }
        // Client-side filters (state, service, search) for reliability and instant UX
        if (stateFilter) {
          list = list.filter(j => (j.location?.state || j.state || '').toLowerCase() === stateFilter.toLowerCase());
        }
        if (service) {
          const s = service.toLowerCase();
          list = list.filter(j => (j.category || j.service || '').toLowerCase() === s);
        }
        if (search?.trim()) {
          const q = search.trim().toLowerCase();
          list = list.filter(j =>
            (j.title || '').toLowerCase().includes(q) ||
            (j.description || '').toLowerCase().includes(q)
          );
        }
        setJobs(list);
      } catch (e) {
        console.error('Failed to load nearby jobs', e);
        // Fallback to legacy feed
        try {
          const data = await getJobFeed({ q: search, service, scope: 'all' });
          let list = [];
          if (Array.isArray(data)) list = data;
          else if (Array.isArray(data?.data)) list = data.data;
          else if (Array.isArray(data?.data?.jobs)) list = data.data.jobs;
          setJobs(list);
        } catch {}
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, service, stateFilter, refreshTs, radiusMeters, detectedLocation?.latitude, detectedLocation?.longitude]);

  const displayedJobs = useMemo(() => {
    const now = Date.now();
    const toKey = (d) => new Date(d || 0).getTime() || now;
    const city = (userCity || '').toLowerCase();
    const state = (userState || '').toLowerCase();

    const inSameCity = [];
    const inSameState = [];
    const inOtherStates = [];

    jobs.forEach(job => {
      const jCity = (job.location?.city || job.city || '').toLowerCase();
      const jState = (job.location?.state || job.state || '').toLowerCase();
      if (city && jCity === city) {
        inSameCity.push(job);
      } else if (state && jState === state) {
        inSameState.push(job);
      } else {
        inOtherStates.push(job);
      }
    });

    const byRecency = (a, b) => toKey(b.createdAt) - toKey(a.createdAt);
    inSameCity.sort(byRecency);
    inSameState.sort(byRecency);
    inOtherStates.sort(byRecency);

    return { inSameCity, inSameState, inOtherStates };
  }, [jobs, userCity, userState]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Job Feed</h1>
        <button
          onClick={() => setRefreshTs(Date.now())}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
        >
          <FaSync className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Search</label>
            <div className="relative">
              <FaSearch className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or description"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Filter by Service</label>
            <ServiceSelector value={service} onChange={setService} placeholder="Any service" />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">State (optional)</label>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All states</option>
              {[
                'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'
              ].map(s => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Distance: <span className="font-medium">{kmRange} km</span></label>
            <input
              type="range"
              min={1}
              max={70}
              step={1}
              value={kmRange}
              onChange={(e) => setKmRange(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="flex items-end">
            <button className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">
              <FaFilter className="w-4 h-4" /> More Filters
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-500">Loading jobs...</div>
      ) : (displayedJobs.inSameCity.length + displayedJobs.inSameState.length + displayedJobs.inOtherStates.length) === 0 ? (
        <div className="py-20 text-center text-gray-500">No jobs found</div>
      ) : (
        <div className="space-y-8">
          {displayedJobs.inSameCity.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">🏙️ Jobs near you in {userCity || 'your city'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedJobs.inSameCity.map((job) => (
                  <JobCard key={job._id || job.id} job={job} />
                ))}
              </div>
            </div>
          )}
          {displayedJobs.inSameState.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">🌆 More jobs in {userState || 'your state'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedJobs.inSameState.map((job) => (
                  <JobCard key={job._id || job.id} job={job} />
                ))}
              </div>
            </div>
          )}
          {displayedJobs.inOtherStates.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">🌍 Other jobs across Nigeria</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedJobs.inOtherStates.map((job) => (
                  <JobCard key={job._id || job.id} job={job} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const JobCard = ({ job }) => {
  return (
    <Link
      to={`/dashboard/professional/messages?job=${job._id || job.id}`}
      className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div className="pr-3">
          <h3 className="font-semibold text-gray-900">{job.title || 'Untitled job'}</h3>
          {Boolean(job.category) && (
            <div className="mt-1">
              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {job.category}
              </span>
            </div>
          )}
          <p className="text-sm text-gray-600 line-clamp-2 mt-1">{job.description || 'No description'}</p>
          <div className="flex items-center gap-3 text-sm text-gray-500 mt-2">
            <span className="text-blue-700 font-medium">
              {(() => {
                const b = job.budget;
                if (b && typeof b === 'object' && (b.min != null || b.max != null)) {
                  const min = Number(b.min || 0);
                  const max = Number(b.max || 0);
                  return `₦${min.toLocaleString()} - ₦${max.toLocaleString()}`;
                }
                const price = Number(job.price || 0);
                return `₦${price.toLocaleString()}`;
              })()}
            </span>
            <span className="inline-flex items-center gap-1">
              <FaMapMarkerAlt className="w-3 h-3" />
              {job.location?.address || job.location?.city || job.city || 'Unknown'}
            </span>
            {job.distanceFormatted && (
              <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                {job.distanceFormatted} away
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProJobFeed;






