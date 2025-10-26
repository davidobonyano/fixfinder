import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaSearch, FaSync, FaFilter } from 'react-icons/fa';
import { getJobFeed } from '../../utils/api';
import ServiceSelector from '../../components/ServiceSelector';

const ProJobFeed = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [service, setService] = useState('');
  const [refreshTs, setRefreshTs] = useState(Date.now());

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getJobFeed({ q: search, service });
        // backend returns {success, data}; support both shapes defensively
        const list = Array.isArray(data) ? data : (data?.data || []);
        setJobs(list);
      } catch (e) {
        console.error('Failed to load job feed', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [search, service, refreshTs]);

  const displayedJobs = useMemo(() => jobs, [jobs]);

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
          <div className="flex items-end">
            <button className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">
              <FaFilter className="w-4 h-4" /> More Filters
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-500">Loading jobs...</div>
      ) : displayedJobs.length === 0 ? (
        <div className="py-20 text-center text-gray-500">No jobs found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedJobs.map((job) => (
            <Link
              key={job._id || job.id}
              to={`/dashboard/professional/messages?job=${job._id || job.id}`}
              className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="pr-3">
                  <h3 className="font-semibold text-gray-900">{job.title || 'Untitled job'}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mt-1">{job.description || 'No description'}</p>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-2">
                    <span className="text-blue-700 font-medium">₦{(job.budget || job.price || 0).toLocaleString()}</span>
                    <span className="inline-flex items-center gap-1">
                      <FaMapMarkerAlt className="w-3 h-3" />
                      {job.location?.address || job.city || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProJobFeed;






