import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMapPin, FiSearch, FiRefreshCw, FiFilter, FiBriefcase, FiArrowRight, FiLoader, FiX, FiCheckCircle, FiClock, FiMaximize2 } from 'react-icons/fi';
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
          } catch { }
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
        const day = (d) => new Date(d || 0).toISOString().slice(0, 10);
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
        } catch { }
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
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Premium Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="label-caps mb-2">Marketplace</div>
          <h1 className="text-4xl md:text-5xl font-tight font-bold text-charcoal tracking-tight">
            Recent Opportunities
          </h1>
          <p className="mt-3 text-lg text-graphite max-w-xl">
            Real-time feed of service requests within your operational vicinity.
          </p>
        </div>
        <button
          onClick={() => setRefreshTs(Date.now())}
          className="btn-secondary py-3 flex items-center gap-2"
        >
          <FiRefreshCw className="w-4 h-4" /> Synchronize Feed
        </button>
      </div>

      {/* Filters Section - Premium Card */}
      <div className="card-premium p-8 mb-10 bg-white">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-stone-100">
          <FiFilter className="w-5 h-5 text-trust" />
          <h2 className="text-xl font-tight font-bold text-charcoal tracking-tight">Refine Discovery</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6">
          <div className="md:col-span-2 lg:col-span-1">
            <label className="label-caps mb-2 block">Search</label>
            <div className="relative">
              <FiSearch className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Keywords..."
                className="input-field pl-11"
              />
            </div>
          </div>
          <div>
            <label className="label-caps mb-2 block">Service Type</label>
            <ServiceSelector value={service} onChange={setService} placeholder="All Categories" />
          </div>
          <div>
            <label className="label-caps mb-2 block">Jurisdiction</label>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="input-field"
            >
              <option value="">All Regions</option>
              {[
                'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
              ].map(s => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
          <div>
            <label className="label-caps mb-2 block">Proximity: <span className="text-trust font-bold">{kmRange}km</span></label>
            <div className="pt-3">
              <input
                type="range"
                min={1}
                max={70}
                step={1}
                value={kmRange}
                onChange={(e) => setKmRange(Number(e.target.value))}
                className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-trust"
              />
              <div className="flex justify-between mt-2 text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                <span>1km</span>
                <span>70km</span>
              </div>
            </div>
          </div>
          <div className="flex items-end">
            <button className="btn-secondary w-full py-3 flex items-center justify-center gap-2">
              <FiMaximize2 className="w-4 h-4" /> Advanced
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 card-premium bg-white border-dashed">
          <FiLoader className="w-12 h-12 animate-spin text-trust mb-4" />
          <p className="font-tight text-graphite text-lg">Synchronizing operational feed...</p>
        </div>
      ) : (displayedJobs.inSameCity.length + displayedJobs.inSameState.length + displayedJobs.inOtherStates.length) === 0 ? (
        <div className="text-center py-32 card-premium bg-white border-dashed">
          <FiBriefcase className="w-16 h-16 mx-auto mb-6 text-stone-300" />
          <p className="text-2xl font-tight font-bold text-charcoal mb-2">No opportunities found</p>
          <p className="text-graphite">Try expanding your search radius or refining your service categories.</p>
        </div>
      ) : (
        <div className="space-y-16">
          {displayedJobs.inSameCity.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-8 bg-trust"></div>
                <div>
                  <div className="label-caps mb-1">Local Focus</div>
                  <h2 className="text-3xl font-tight font-bold text-charcoal tracking-tight">
                    Nearby in {userCity || 'your city'}
                  </h2>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {displayedJobs.inSameCity.map((job) => (
                  <JobCard key={job._id || job.id} job={job} />
                ))}
              </div>
            </div>
          )}
          {displayedJobs.inSameState.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-8 bg-stone-300"></div>
                <div>
                  <div className="label-caps mb-1">Regional Feed</div>
                  <h2 className="text-3xl font-tight font-bold text-charcoal tracking-tight">
                    Across {userState || 'your state'}
                  </h2>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {displayedJobs.inSameState.map((job) => (
                  <JobCard key={job._id || job.id} job={job} />
                ))}
              </div>
            </div>
          )}
          {displayedJobs.inOtherStates.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-8 bg-stone-200"></div>
                <div>
                  <div className="label-caps mb-1">National Scope</div>
                  <h2 className="text-3xl font-tight font-bold text-charcoal tracking-tight">
                    Other jurisdictions
                  </h2>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
  const knownStatuses = ['pending', 'open', 'in progress', 'completed', 'cancelled'];
  const statusFromState = knownStatuses.includes(maybeStateAsStatus) ? maybeStateAsStatus : '';
  const statusLc = rawStatus || statusFromState; // Only trust state when it looks like a status
  const lifecycleLc = String(job?.lifecycleState || '').toLowerCase();
  const isExplicitlyOpen = ['pending', 'open'].includes(statusLc);
  const closedByLifecycle = ['in_progress', 'completed_by_pro', 'completed_by_user', 'closed', 'cancelled'].includes(lifecycleLc);
  const closedByFlags = job?.completed === true || job?.isCompleted === true || !!job?.completedAt || !!job?.cancelledAt;
  const closedByAssignment = !!job?.professional || !!job?.conversation;
  const isClosed = (!isExplicitlyOpen) || closedByLifecycle || closedByFlags || closedByAssignment;

  return (
    <div className="group card-premium bg-white hover:border-stone-400 transition-all duration-500 flex flex-col h-full">
      {/* Visual Indicator */}
      <div className="h-1 bg-stone-100 group-hover:bg-trust transition-colors"></div>

      {/* Header */}
      <div className="p-8 pb-0">
        <div className="flex justify-between items-start gap-6">
          <div className="flex-1 min-w-0">
            <div className="label-caps mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-trust"></span>
              {job.category}
            </div>
            <h3 className="text-2xl font-tight font-bold text-charcoal leading-tight mb-2 group-hover:text-trust transition-colors cursor-pointer" onClick={() => setDetailsOpen(true)}>
              {job.title || 'Untitled request'}
            </h3>
            <div className="flex items-center gap-3 text-graphite text-sm">
              <FiMapPin className="w-4 h-4 text-stone-400" />
              <span>{job.location?.city || job.city || 'Unknown'}</span>
              <span className="text-stone-300">•</span>
              <FiClock className="w-4 h-4 text-stone-400" />
              <span>{new Date(job.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-tight font-bold text-charcoal">
              {(() => {
                const b = job.budget;
                if (b && typeof b === 'object' && (b.min != null || b.max != null)) {
                  const min = Number(b.min || 0);
                  const max = Number(b.max || 0);
                  return `₦${min.toLocaleString()}`;
                }
                const price = Number(job.price || 0);
                return `₦${price.toLocaleString()}`;
              })()}
            </div>
            <div className="label-caps text-stone-400 mt-1">Est. Budget</div>
          </div>
        </div>
      </div>

      {/* Media if exists */}
      {Array.isArray(job.media) && job.media[0]?.url && (
        <div className="mt-8 px-8">
          <div className="aspect-video w-full rounded-xl overflow-hidden bg-stone-100 border border-stone-100">
            <img src={job.media[0].url} alt="Reference" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          </div>
        </div>
      )}

      {/* Body */}
      <div className="p-8 flex-1">
        <p className="text-graphite leading-relaxed line-clamp-3 mb-8">
          {job.description || 'No description provided by the client.'}
        </p>

        <div className="flex flex-wrap gap-3">
          {job.distanceFormatted && (
            <div className="px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-graphite uppercase tracking-widest flex items-center gap-2">
              <FiMaximize2 className="w-3 h-3" /> {job.distanceFormatted} away
            </div>
          )}
          <div className="px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-graphite uppercase tracking-widest flex items-center gap-2">
            <FiCheckCircle className="w-3 h-3" /> Identity Verified
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-8 pt-0 mt-auto grid grid-cols-2 gap-4">
        <button
          onClick={() => setDetailsOpen(true)}
          className="btn-secondary w-full py-4 font-bold flex items-center justify-center gap-2"
        >
          Analysis
        </button>
        {isClosed ? (
          <div className="flex items-center justify-center bg-stone-100 rounded-lg text-charcoal label-caps">Engagement Closed</div>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="btn-primary w-full py-4 font-bold flex items-center justify-center gap-2"
          >
            Apply <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white card-premium max-w-md w-full p-10">
            <div className="label-caps text-trust mb-2">Proposal Submission</div>
            <h3 className="text-3xl font-tight font-bold text-charcoal mb-2">Seal the Deal</h3>
            <p className="text-graphite mb-8">
              Briefly describe why you are the best fit for <span className="font-bold">{job.title}</span>.
            </p>

            <div className="space-y-6">
              <div>
                <label className="label-caps mb-2 block">Cover Details</label>
                <textarea
                  value={proposal}
                  onChange={(e) => setProposal(e.target.value)}
                  placeholder="Elaborate on your approach..."
                  className="input-field min-h-[120px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-caps mb-2 block">Proposed Fee</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="₦0.00"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-caps mb-2 block">Timeline</label>
                  <input
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 3 Days"
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="label-caps mb-2 block">Documentation</label>
                <div className="input-field flex items-center justify-between group cursor-pointer relative overflow-hidden">
                  <span className="text-stone-400 truncate">{cvFile ? cvFile.name : 'Upload PDF Portfolio...'}</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setCvFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-3">
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
                className="btn-primary w-full py-4 text-lg"
              >
                {loading ? <FiLoader className="animate-spin mx-auto" /> : 'Confirm Submission'}
              </button>
              <button onClick={() => setOpen(false)} className="btn-secondary w-full py-4">Discard</button>
            </div>
          </div>
        </div>
      )}

      {detailsOpen && (
        <div
          className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm flex items-center justify-center z-50 p-6"
          onClick={() => setDetailsOpen(false)}
        >
          <div
            className="bg-white card-premium max-w-4xl w-full overflow-hidden flex flex-col md:flex-row h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Column: Media & Context */}
            <div className="w-full md:w-1/2 bg-stone-50 border-r border-stone-100 flex flex-col">
              <div className="p-10 pb-0">
                <div className="label-caps text-trust mb-3">Operational Context</div>
                <h2 className="text-4xl font-tight font-bold text-charcoal leading-tight mb-4">{job.title}</h2>
                <div className="flex items-center gap-4 text-graphite mb-10">
                  <div className="flex items-center gap-2">
                    <FiMapPin className="text-stone-400" /> {job.location?.city}
                  </div>
                  <div className="w-1 h-1 rounded-full bg-stone-300"></div>
                  <div className="flex items-center gap-2">
                    <FiBriefcase className="text-stone-400" /> {job.category}
                  </div>
                </div>
              </div>

              <div className="flex-1 px-10 pb-10 overflow-y-auto invisible-scrollbar">
                {Array.isArray(job.media) && job.media[0]?.url ? (
                  <img src={job.media[0].url} alt="Reference" className="w-full rounded-2xl border border-stone-100 shadow-sm mb-10" />
                ) : (
                  <div className="w-full aspect-video bg-stone-100 rounded-2xl border-2 border-dashed border-stone-200 flex items-center justify-center mb-10">
                    <FiBriefcase className="w-12 h-12 text-stone-300" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-8 mb-10">
                  <DetailItem label="Allocated Budget">
                    <span className="text-2xl font-tight font-bold text-charcoal">
                      {(() => {
                        const b = job.budget || {};
                        const min = Number(b.min || 0);
                        return `₦${min.toLocaleString()}+`;
                      })()}
                    </span>
                  </DetailItem>
                  <DetailItem label="Priority Status">
                    <span className="text-2xl font-tight font-bold text-clay uppercase tracking-tight">{job.urgency || 'Standard'}</span>
                  </DetailItem>
                </div>
              </div>
            </div>

            {/* Right Column: Narrative & Actions */}
            <div className="w-full md:w-1/2 flex flex-col">
              <div className="p-10 border-b border-stone-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <div className="label-caps">Details & Narrative</div>
                <button onClick={() => setDetailsOpen(false)} className="p-2 hover:bg-stone-50 rounded-full transition-colors"><FiX className="w-6 h-6" /></button>
              </div>

              <div className="p-10 flex-1 overflow-y-auto invisible-scrollbar">
                <div className="space-y-12">
                  <section>
                    <div className="label-caps text-stone-400 mb-4">Request Objective</div>
                    <p className="text-graphite text-lg leading-relaxed">{job.description}</p>
                  </section>

                  {job.requirements && (
                    <section>
                      <div className="label-caps text-stone-400 mb-4">Specific Requirements</div>
                      <div className="p-6 bg-stone-50 border border-stone-100 rounded-xl text-graphite italic leading-relaxed">
                        "{job.requirements}"
                      </div>
                    </section>
                  )}

                  <section>
                    <div className="label-caps text-stone-400 mb-4">Schedule</div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-3 text-charcoal font-bold">
                        <FiClock className="text-trust" />
                        {job.preferredDate ? new Date(job.preferredDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'Flexible'}
                      </div>
                      <div className="text-stone-300">|</div>
                      <div className="flex items-center gap-3 text-graphite">
                        {job.preferredTime || 'Business Hours'}
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              <div className="p-10 border-t border-stone-100 bg-white sticky bottom-0 z-10 grid grid-cols-2 gap-4">
                <button onClick={() => setDetailsOpen(false)} className="btn-secondary w-full py-4 uppercase tracking-widest text-xs font-bold">Dismiss</button>
                {!isClosed && (
                  <button
                    onClick={() => {
                      setDetailsOpen(false);
                      setOpen(true);
                    }}
                    className="btn-primary w-full py-4 uppercase tracking-widest text-xs font-bold"
                  >
                    Initiate Application
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailItem = ({ label, children }) => (
  <div>
    <div className="label-caps text-stone-400 mb-2">{label}</div>
    <div className="text-charcoal font-bold leading-relaxed">{children}</div>
  </div>
);

export default ProJobFeed;






