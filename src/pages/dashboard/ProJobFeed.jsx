import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaSearch, FaSync, FaFilter, FaBriefcase } from 'react-icons/fa';
import { getJobFeed, findNearbyJobs, applyToJob } from '../../utils/api';
import { useLocation as useLocationHook } from '../../hooks/useLocation';
import ServiceSelector from '../../components/ServiceSelector';
import { useAuth } from '../../context/useAuth';
import { calculateDistance } from '../../utils/locationUtils';
import { useToast } from '../../context/ToastContext';

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
  const [kmRange, setKmRange] = useState(10); // 1–70 km
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
        // Filter out completed/closed jobs first - be very strict
        list = list.filter(j => {
          const statusLc = String(j?.status || '').toLowerCase();
          const lifecycleLc = String(j?.lifecycleState || '').toLowerCase();
          
          // Strictly exclude any completed/cancelled status
          if (statusLc === 'completed' || statusLc === 'cancelled') {
            return false;
          }
          
          // Strictly exclude any closed lifecycle states
          if (['in_progress', 'completed_by_pro', 'completed_by_user', 'closed', 'cancelled'].includes(lifecycleLc)) {
            return false;
          }
          
          // Exclude jobs with completion flags
          if (j?.completed === true || j?.isCompleted === true || !!j?.completedAt) {
            return false;
          }
          
          // Only include jobs with explicitly open status
          if (!['pending', 'open'].includes(statusLc)) {
            return false;
          }
          
          // If job has professional assigned and no conversation, exclude it (already assigned)
          if (j?.professional && !j?.conversation) {
            return false;
          }
          
          return true;
        });
        
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
        // De-duplicate jobs that are the same posting/thread
        const day = (d) => new Date(d || 0).toISOString().slice(0,10);
        const norm = (s) => String(s || '').trim().toLowerCase();
        const toCurrency = (n) => Number(n || 0);
        const makeSignature = (j) => {
          const title = norm(j.title);
          const category = norm(j.category || j.service || j.serviceCategory);
          const city = norm(j.location?.city || j.city);
          const state = norm(j.location?.state || j.state);
          const dateDay = day(j.preferredDate || j.createdAt);
          const b = j.budget || {};
          const min = toCurrency(b.min);
          const max = toCurrency(b.max);
          return `sig:${title}|${category}|${city}|${state}|${dateDay}|${min}-${max}`;
        };
        const byKey = new Map();
        // Helper to check if job is completed (safety check even after filtering)
        const isJobCompleted = (job) => {
          const statusLc = String(job?.status || '').toLowerCase();
          const lifecycleLc = String(job?.lifecycleState || '').toLowerCase();
          return statusLc === 'completed' || statusLc === 'cancelled' ||
                 ['in_progress', 'completed_by_pro', 'completed_by_user', 'closed', 'cancelled'].includes(lifecycleLc) ||
                 job?.completed === true || job?.isCompleted === true || !!job?.completedAt;
        };
        
        list.forEach(j => {
          // Extra safety: skip if somehow a completed job made it through
          if (isJobCompleted(j)) {
            return; // Skip this job entirely
          }
          
          const primaryKey = j.conversation ? `conv:${j.conversation}` : makeSignature(j);
          const prev = byKey.get(primaryKey);
          
          if (!prev) {
            byKey.set(primaryKey, j);
          } else {
            // Extra safety: if prev is completed, always replace with current (which should not be completed)
            if (isJobCompleted(prev)) {
              if (!isJobCompleted(j)) {
                byKey.set(primaryKey, j);
              }
              return;
            }
            
            // Both are not completed - prefer the one with conversation or more recent
            const prevHasConv = !!prev.conversation;
            const currHasConv = !!j.conversation;
            const prevUpdated = new Date(prev.updatedAt || prev.createdAt || 0).getTime();
            const currUpdated = new Date(j.updatedAt || j.createdAt || 0).getTime();
            
            if (currHasConv && !prevHasConv) {
              byKey.set(primaryKey, j);
            } else if (prevHasConv && !currHasConv) {
              // Keep prev
            } else if (currUpdated > prevUpdated) {
              byKey.set(primaryKey, j);
            }
            // Otherwise keep prev
          }
        });
        setJobs(Array.from(byKey.values()));
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
    <div className="max-w-7xl mx-auto px-4 py-6 -mx-4 lg:mx-0">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white shadow-xl mb-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-400 opacity-10 rounded-full -ml-24 -mb-24"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-2 flex items-center gap-2">
              <span>Job Feed</span>
              <FaBriefcase className="w-6 h-6 text-amber-300 animate-pulse" />
            </h1>
            <p className="text-indigo-100 text-lg">Discover new opportunities near you</p>
          </div>
          <button
            onClick={() => setRefreshTs(Date.now())}
            className="px-5 py-2.5 border border-white/60 hover:border-white rounded-xl backdrop-blur-sm transition-all flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white"
          >
            <FaSync className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Filters Section - Modern Design */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-2 mb-6">
          <FaFilter className="w-5 h-5 text-indigo-500" />
          <h2 className="text-xl font-bold text-gray-900">Search & Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Search</label>
            <div className="relative">
              <FaSearch className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or description"
                className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Service</label>
            <ServiceSelector value={service} onChange={setService} placeholder="Any service" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">State</label>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            >
              <option value="">All states</option>
              {[
                'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'
              ].map(s => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Distance: <span className="text-indigo-600 font-bold">{kmRange} km</span></label>
            <input
              type="range"
              min={1}
              max={70}
              step={1}
              value={kmRange}
              onChange={(e) => setKmRange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>
          <div className="flex items-end">
            <button className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-all">
              <FaFilter className="w-4 h-4" /> More
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <FaBriefcase className="w-5 h-5 text-indigo-600 animate-pulse" />
            </div>
          </div>
        </div>
      ) : (displayedJobs.inSameCity.length + displayedJobs.inSameState.length + displayedJobs.inOtherStates.length) === 0 ? (
        <div className="text-center py-20">
          <FaBriefcase className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-xl font-semibold text-gray-600 mb-2">No jobs found</p>
          <p className="text-gray-500">Try adjusting your filters or search criteria</p>
        </div>
      ) : (
        <div className="space-y-8">
          {displayedJobs.inSameCity.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-6 text-gray-800">
                <FaMapMarkerAlt className="w-5 h-5 text-indigo-500" />
                <h2 className="text-2xl font-bold text-gray-900">Jobs near you in {userCity || 'your city'}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {displayedJobs.inSameCity.map((job) => (
                  <JobCard key={job._id || job.id} job={job} />
                ))}
              </div>
            </div>
          )}
          {displayedJobs.inSameState.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-6 text-gray-800">
                <FaMapMarkerAlt className="w-5 h-5 text-indigo-500" />
                <h2 className="text-2xl font-bold text-gray-900">More jobs in {userState || 'your state'}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {displayedJobs.inSameState.map((job) => (
                  <JobCard key={job._id || job.id} job={job} />
                ))}
              </div>
            </div>
          )}
          {displayedJobs.inOtherStates.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-6 text-gray-800">
                <FaMapMarkerAlt className="w-5 h-5 text-indigo-500" />
                <h2 className="text-2xl font-bold text-gray-900">Other jobs across Nigeria</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [proposal, setProposal] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [loading, setLoading] = useState(false);
  const [cvFile, setCvFile] = useState(null);
  const jobId = job._id || job.id;
  const { success, error } = useToast();
  const rawStatus = String(job?.status || '').toLowerCase();
  const maybeStateAsStatus = String(job?.state || '').toLowerCase();
  const knownStatuses = ['pending','open','in progress','completed','cancelled'];
  const statusFromState = knownStatuses.includes(maybeStateAsStatus) ? maybeStateAsStatus : '';
  const statusLc = rawStatus || statusFromState; // Only trust state when it looks like a status
  const lifecycleLc = String(job?.lifecycleState || '').toLowerCase();
  const isExplicitlyOpen = ['pending','open'].includes(statusLc);
  const closedByLifecycle = ['in_progress','completed_by_pro','completed_by_user','closed','cancelled'].includes(lifecycleLc);
  const closedByFlags = job?.completed === true || job?.isCompleted === true || !!job?.completedAt || !!job?.cancelledAt;
  const closedByAssignment = !!job?.professional || !!job?.conversation;
  const isClosed = (!isExplicitlyOpen) || closedByLifecycle || closedByFlags || closedByAssignment;

  return (
    <div className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md overflow-hidden transition-all duration-300">
      {/* Header */}
      <div className="p-6 bg-gray-50 border-b border-gray-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 font-semibold">
              {(job.category || 'J')[0]}
            </div>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetailsOpen(true)}>
              <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-indigo-600 transition-colors truncate">{job.title || 'Untitled job'}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FaMapMarkerAlt className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{job.location?.city || job.city || 'Unknown'}</span>
                <span className="text-gray-400">•</span>
                <span className="font-medium text-indigo-600">{job.category}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            {isClosed && (
              <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 border border-gray-200 mb-2">Closed</span>
            )}
            <div className="text-gray-900 font-semibold text-lg">
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
            </div>
          </div>
        </div>
      </div>
      {/* Media */}
      {Array.isArray(job.media) && job.media[0]?.url && (
        <div className="w-full bg-gray-100 overflow-hidden">
          <img src={job.media[0].url} alt="job" className="w-full max-h-80 object-cover group-hover:scale-[1.01] transition-transform duration-300" />
        </div>
      )}
      {/* Body */}
      <div className="p-6">
        <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3 mb-4">{job.description || 'No description'}</p>
        {job.requirements && (
          <div className="mb-4">
            <p className="text-sm text-gray-700"><span className="font-semibold text-gray-900">Requirements:</span> {job.requirements}</p>
          </div>
        )}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
            <FaMapMarkerAlt className="w-4 h-4 text-indigo-500" />
            <span className="font-medium">{job.location?.address || job.location?.city || job.city || 'Unknown'}</span>
          </span>
          {job.distanceFormatted && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 font-medium rounded-lg">
              {job.distanceFormatted} away
            </span>
          )}
        </div>
      </div>
      {/* Footer */}
      <div className="p-6 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
        <button 
          onClick={() => setDetailsOpen(true)} 
          className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-indigo-300 hover:text-indigo-600 transition-all"
        >
          View details
        </button>
        {isClosed ? (
          <span className="px-5 py-2 text-sm font-medium text-gray-600">Closed</span>
        ) : (
          <button 
            onClick={() => setOpen(true)} 
            className="px-5 py-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:border-indigo-400 hover:text-indigo-700 transition-colors"
          >
            Apply Now
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Apply to this job</h3>
            <p className="text-sm text-gray-600 mb-4">
              <span className="font-medium">{job.title || 'Untitled job'}</span>
              {job?.budget && (typeof job.budget === 'object') && (job.budget.min != null || job.budget.max != null) && (
                <>
                  {' • Estimated budget: '}
                  ₦{Number(job.budget.min || 0).toLocaleString()} - ₦{Number(job.budget.max || 0).toLocaleString()}
                </>
              )}
            </p>
            <div className="space-y-3">
              <textarea
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                placeholder="Proposal"
                className="w-full px-3 py-2 border border-gray-300 rounded"
                rows={3}
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Proposed price"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded"
                />
                <input
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="Estimated duration"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Attach CV (PDF)</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setCvFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
                <p className="text-xs text-gray-500 mt-1">Optional. PDF only, max 2MB.</p>
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={async () => {
                  try {
                    setLoading(true);
                    await applyToJob(jobId, { proposal: proposal.trim(), proposedPrice: Number(price) || 0, estimatedDuration: duration.trim(), cvFile: cvFile || undefined });
                    success('Application submitted successfully');
                    setOpen(false);
                  } catch (e) {
                    error(e?.data?.message || e?.message || 'Failed to submit application');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading || !proposal.trim() || isClosed}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isClosed ? 'Applications closed' : (loading ? 'Submitting...' : 'Submit Application')}
              </button>
              <button onClick={() => setOpen(false)} className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {detailsOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setDetailsOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-gray-200 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-indigo-500 font-semibold mb-1">Job opportunity</p>
                <h2 className="text-2xl font-bold text-gray-900">{job.title || 'Untitled job'}</h2>
                <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                  <FaMapMarkerAlt className="w-4 h-4 text-indigo-500" />
                  <span>{job.location?.address || job.location?.city || 'Unknown'} • {job.category}</span>
                </p>
              </div>
              <button
                onClick={() => setDetailsOpen(false)}
                className="px-3 py-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
              >
                Close
              </button>
            </div>

            {Array.isArray(job.media) && job.media[0]?.url && (
              <div className="px-6 pt-6">
                <img
                  src={job.media[0].url}
                  alt="job"
                  className="w-full max-h-96 object-cover rounded-xl border border-gray-200"
                />
              </div>
            )}

            <div className="px-6 py-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailItem label="Budget">
                  {(() => {
                    const b = job.budget || {};
                    const min = Number(b.min || 0);
                    const max = Number(b.max || 0);
                    return `₦${min.toLocaleString()} - ₦${max.toLocaleString()}`;
                  })()}
                </DetailItem>
                <DetailItem label="Urgency">{job.urgency || 'Not specified'}</DetailItem>
                <DetailItem label="Preferred date">
                  {job.preferredDate ? new Date(job.preferredDate).toLocaleDateString() : 'Not specified'}
                </DetailItem>
                <DetailItem label="Preferred time">{job.preferredTime || 'Not specified'}</DetailItem>
              </div>

              <DetailItem label="Description" fullWidth>
                {job.description || 'No description provided.'}
              </DetailItem>

              {job.requirements && (
                <DetailItem label="Requirements" fullWidth>
                  {job.requirements}
                </DetailItem>
              )}

              <DetailItem label="Location" fullWidth>
                {job.location?.address || job.location?.city || 'Not specified'}
              </DetailItem>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setDetailsOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:border-gray-400 transition"
              >
                Close
              </button>
              {!isClosed && (
                <button
                  onClick={() => {
                    setDetailsOpen(false);
                    setOpen(true);
                  }}
                  className="px-4 py-2 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:border-indigo-400 hover:text-indigo-700 transition"
                >
                  Apply Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailItem = ({ label, children, fullWidth = false }) => (
  <div className={fullWidth ? 'col-span-1 md:col-span-2' : ''}>
    <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">{label}</div>
    <div className="text-sm text-gray-900 whitespace-pre-wrap">{children}</div>
  </div>
);

export default ProJobFeed;






