import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaSearch, FaSync, FaFilter } from 'react-icons/fa';
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
  const isClosed = (!isExplicitlyOpen) || closedByLifecycle || closedByFlags;

  return (
    <div className="bg-white border border-gray-200 rounded-xl hover:shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">{(job.category || 'J')[0]}</div>
          <div className="cursor-pointer" onClick={() => setDetailsOpen(true)}>
            <h3 className="font-semibold text-gray-900">{job.title || 'Untitled job'}</h3>
            <div className="text-xs text-gray-500">{job.location?.city || job.city || 'Unknown'} • {job.category}</div>
          </div>
        </div>
        <div className="text-blue-700 font-medium text-sm flex items-center gap-2">
          {isClosed && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 border border-gray-200">No longer taking applications</span>
          )}
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
      {/* Media */}
      {Array.isArray(job.media) && job.media[0]?.url && (
        <div className="w-full bg-gray-50">
          <img src={job.media[0].url} alt="job" className="w-full max-h-80 object-cover" />
        </div>
      )}
      {/* Body */}
      <div className="p-4">
        <p className="text-sm text-gray-800 whitespace-pre-wrap">{job.description || 'No description'}</p>
        {job.requirements && (
          <p className="text-sm text-gray-800 mt-2"><span className="font-medium">Requirements:</span> {job.requirements}</p>
        )}
        <div className="flex items-center gap-3 text-sm text-gray-500 mt-2">
          <span className="inline-flex items-center gap-1"><FaMapMarkerAlt className="w-3 h-3" />{job.location?.address || job.location?.city || job.city || 'Unknown'}</span>
          {job.distanceFormatted && (
            <span className="inline-flex items-center gap-1 text-green-700 font-medium">{job.distanceFormatted} away</span>
          )}
        </div>
      </div>
      {/* Footer */}
      <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2">
        <button onClick={() => setDetailsOpen(true)} className="px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50">View details</button>
        {isClosed ? (
          <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded text-sm border border-gray-200">No longer taking applications</span>
        ) : (
          <button onClick={() => setOpen(true)} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Apply</button>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setDetailsOpen(false)}>
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Looking for: <span className="font-extrabold">{job.title || 'Untitled job'}</span></h2>
              <p className="text-sm text-gray-600 mt-1">{job.location?.address || job.location?.city || 'Unknown'} • {job.category}</p>
            </div>

            {/* Media */}
            {Array.isArray(job.media) && job.media[0]?.url && (
              <div className="mb-4">
                <img src={job.media[0].url} alt="job" className="w-full max-h-96 object-cover rounded border border-gray-200" />
              </div>
            )}

            {/* Labeled details */}
            <div className="space-y-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Title</div>
                <div className="text-gray-900">{job.title || '—'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Description</div>
                <div className="text-gray-900 whitespace-pre-wrap">{job.description || '—'}</div>
              </div>
              {job.requirements && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Requirements</div>
                  <div className="text-gray-900 whitespace-pre-wrap">{job.requirements}</div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Budget</div>
                  <div className="text-gray-900">{(() => { const b = job.budget || {}; const min = Number(b.min || 0); const max = Number(b.max || 0); return `₦${min.toLocaleString()} - ₦${max.toLocaleString()}`; })()}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Urgency</div>
                  <div className="text-gray-900">{job.urgency || '—'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Preferred Date</div>
                  <div className="text-gray-900">{job.preferredDate ? new Date(job.preferredDate).toLocaleDateString() : '—'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Preferred Time</div>
                  <div className="text-gray-900">{job.preferredTime || '—'}</div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-xs uppercase tracking-wide text-gray-500">Location</div>
                  <div className="text-gray-900">{job.location?.address || job.location?.city || '—'}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setDetailsOpen(false)} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">Close</button>
              {!isClosed && (
                <button onClick={() => { setDetailsOpen(false); setOpen(true); }} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Apply</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProJobFeed;






