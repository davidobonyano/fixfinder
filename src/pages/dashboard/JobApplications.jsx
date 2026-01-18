import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiArrowLeft, FiSearch, FiArrowUp, FiArrowDown,
  FiCheck, FiLoader, FiUser, FiDollarSign,
  FiClock, FiTrash2, FiFileText, FiMessageSquare,
  FiExternalLink, FiBarChart2, FiMapPin
} from 'react-icons/fi';
import {
  getJobDetails, sendConnectionRequest, getProfessionalProfile,
  getConnections, getConnectionRequests, getApplicationCvUrl,
  deleteJobApplication, createOrGetConversation, createJobRequestInChat
} from '../../utils/api';
import { useToast } from '../../context/ToastContext';

const JobApplications = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('price'); // price | rating | time
  const [sortDir, setSortDir] = useState('asc'); // asc | desc
  const [actionLoading, setActionLoading] = useState(null);
  const [connectedProIds, setConnectedProIds] = useState(new Set());
  const [pendingProIds, setPendingProIds] = useState(new Set());
  const [dmSentAppIds, setDmSentAppIds] = useState(new Set());
  const { success, error } = useToast();

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fixfinder-backend-8yjj.onrender.com';

  const resolveImageUrl = (url) => {
    if (!url) return '/images/placeholder.jpeg';
    const trimmed = typeof url === 'string' ? url.trim() : url;
    if (!trimmed) return '/images/placeholder.jpeg';
    if (trimmed.startsWith('http') || trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('//')) {
      return trimmed;
    }
    const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${API_BASE}${normalized}`;
  };

  const loadJobData = async () => {
    setLoading(true);
    try {
      const resp = await getJobDetails(jobId);
      if (resp?.success) setJob(resp.data);

      try {
        const cons = await getConnections();
        const connected = new Set();
        (cons?.data || []).forEach(c => {
          if (c?.professional?._id) connected.add(String(c.professional._id));
        });
        setConnectedProIds(connected);
      } catch (_) { }

      try {
        const reqs = await getConnectionRequests();
        const pending = new Set();
        (reqs?.data || reqs?.data?.requests || []).forEach(r => {
          if (r?.professional?._id) pending.add(String(r.professional._id));
        });
        setPendingProIds(pending);
      } catch (_) { }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobData();
  }, [jobId]);

  const jobStatus = useMemo(() => {
    if (!job) return 'Pending';
    const raw = String(job?.status || '').toLowerCase();
    const lifecycle = String(job?.lifecycleState || '').toLowerCase();
    const hasCompletedFlag = job?.completed === true || job?.isCompleted === true || !!job?.completedAt;
    const hasCancelledFlag = job?.cancelled === true || !!job?.cancelledAt;
    const isAssigned = !!job?.professional || !!job?.assignedProfessional || !!job?.conversation || (Array.isArray(job?.applications) && job.applications.some(a => String(a?.status).toLowerCase() === 'accepted'));

    if (hasCancelledFlag || lifecycle === 'cancelled' || raw === 'cancelled') return 'Cancelled';
    if (hasCompletedFlag || lifecycle === 'completed_by_pro' || lifecycle === 'completed_by_user' || lifecycle === 'closed' || raw === 'completed') return 'Completed';
    if (lifecycle === 'in_progress' || raw === 'in progress' || raw === 'in_progress' || isAssigned) return 'In Progress';
    return 'Pending';
  }, [job]);

  const deriveApplicationStatus = (application) => {
    if (!application) return 'Pending';
    const appStatus = String(application?.status || '').toLowerCase();
    if (appStatus === 'accepted') return 'Accepted';
    return 'Pending';
  };

  const isApplicationAccepted = (application) => {
    return deriveApplicationStatus(application) === 'Accepted';
  };

  const canSendJobToDM = (application) => {
    if (jobStatus === 'Completed' || jobStatus === 'Cancelled') return false;
    if (isApplicationAccepted(application)) return false;
    if (jobStatus === 'In Progress') return false;
    if (dmSentAppIds.has(String(application._id))) return false;
    return true;
  };

  useEffect(() => {
    (async () => {
      if (!job?.applications) return;
      const updates = [];
      for (let i = 0; i < job.applications.length; i++) {
        const app = job.applications[i];
        if (app?.professional && !app.professional.name && app.professional._id) {
          try {
            const prof = await getProfessionalProfile(app.professional._id);
            if (prof?.data) {
              updates.push({ idx: i, prof: prof.data });
            }
          } catch (_) { }
        }
      }
      if (updates.length) {
        setJob(prev => {
          const copy = JSON.parse(JSON.stringify(prev));
          updates.forEach(u => { copy.applications[u.idx].professional = u.prof; });
          return copy;
        });
      }
    })();
  }, [job?.applications]);

  const applications = useMemo(() => {
    if (!job?.applications) return [];
    let list = job.applications.slice();
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(a => ((a.professional?.name || a.professional?.user?.name || '')).toLowerCase().includes(q) || (a.proposal || '').toLowerCase().includes(q));
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'price') {
      list.sort((a, b) => ((a.proposedPrice || 0) - (b.proposedPrice || 0)) * dir);
    } else if (sortKey === 'rating') {
      list.sort((a, b) => (((a.professional?.rating || 0) - (b.professional?.rating || 0)) * dir));
    } else if (sortKey === 'time') {
      list.sort((a, b) => (String(a.estimatedDuration || '').localeCompare(String(b.estimatedDuration || ''))) * dir);
    }
    return list;
  }, [job, search, sortKey, sortDir]);

  const handleConnect = async (application) => {
    try {
      setActionLoading(application._id);
      const professionalId = application.professional?._id;
      if (!professionalId) return;
      await sendConnectionRequest(professionalId);
      success('Network connection request dispatched.');
      setPendingProIds(prev => new Set([...Array.from(prev), String(professionalId)]));
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendJobToDm = async (application) => {
    try {
      setActionLoading(`send_${application._id}`);
      const pro = application.professional || {};
      let otherUserId = pro.user?._id || pro.user || null;
      if (!otherUserId && pro._id) {
        try {
          const prof = await getProfessionalProfile(pro._id);
          otherUserId = prof?.data?.user?._id || prof?.data?.user || otherUserId;
        } catch (_) { }
      }
      if (!otherUserId) {
        error('Identity resolution failure.');
        return;
      }
      const convResp = await createOrGetConversation({ otherUserId });
      const conversationId = convResp?.data?._id || convResp?._id;
      if (!conversationId) {
        error('Encrypted channel establishment failed.');
        return;
      }
      const location = job?.location || {};
      const payload = {
        jobId,
        title: job?.title,
        budget: job?.budget || job?.pricePerHour,
        description: job?.description,
        category: job?.category || job?.serviceCategory || (Array.isArray(job?.services) ? job.services[0] : undefined),
        preferredDate: job?.preferredDate,
        preferredTime: job?.preferredTime,
        location: {
          state: location?.state,
          city: location?.city,
          address: location?.address,
        },
      };

      const missing = [];
      if (!payload.category) missing.push('category');
      if (!payload.preferredDate) missing.push('date');
      if (!payload.preferredTime) missing.push('time');
      if (!payload.location?.state) missing.push('state');
      if (!payload.location?.city) missing.push('city');
      if (!payload.location?.address) missing.push('address');

      if (missing.length) {
        error(`Protocol incomplete. Missing fields: ${missing.join(', ')}`);
        return;
      }
      await createJobRequestInChat(conversationId, payload);
      success('Job manifest transmitted to DM.');
      setDmSentAppIds(prev => new Set([...Array.from(prev), String(application._id)]));
      navigate(`/dashboard/messages/${conversationId}`);
    } catch (e) {
      error(e?.data?.message || e?.message || 'Transmission failure.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <FiLoader className="w-12 h-12 animate-spin text-trust mb-4" />
        <p className="font-tight text-stone-400 uppercase tracking-widest text-xs font-bold">Retrieving Manifest...</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-trust/10 text-trust border-trust/20';
      case 'In Progress': return 'bg-charcoal text-white border-charcoal';
      case 'Cancelled': return 'bg-clay/10 text-clay border-clay/20';
      default: return 'bg-stone-100 text-stone-500 border-stone-200';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
        <div className="space-y-4">
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center gap-2 text-stone-400 hover:text-charcoal transition-colors font-bold text-[10px] uppercase tracking-widest"
          >
            <FiArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Registry
          </button>
          <div>
            <div className="label-caps mb-2 text-trust">Application Registry</div>
            <h1 className="text-4xl md:text-5xl font-tight font-bold text-charcoal tracking-tight">
              {job?.title}
            </h1>
            <div className="flex items-center gap-3 mt-4">
              <span className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-full border ${getStatusColor(jobStatus)}`}>
                {jobStatus}
              </span>
              <div className="h-1 w-1 rounded-full bg-stone-300" />
              <span className="text-xs font-medium text-stone-400 flex items-center gap-2">
                <FiMapPin className="w-3 h-3" />
                {job?.location?.address || 'Location Unspecified'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="card-premium bg-white p-4 flex items-center gap-4">
            <div className="p-3 bg-stone-50 rounded-xl">
              <FiBarChart2 className="w-5 h-5 text-trust" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Total Yield</div>
              <div className="text-xl font-tight font-bold text-charcoal">{applications.length} Bids</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Matrix */}
      <div className="card-premium bg-white p-6 mb-10 border-stone-200">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-5 relative group">
            <FiSearch className="w-4 h-4 text-stone-300 absolute left-5 top-1/2 -translate-y-1/2 group-focus-within:text-trust transition-colors" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by professional name or proposal keyword..."
              className="input-field pl-12 h-14 bg-stone-50/50 border-stone-100"
            />
          </div>
          <div className="md:col-span-4 flex items-center gap-3">
            <div className="flex-1 relative">
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                className="input-field h-14 appearance-none pl-5 pr-10 bg-white border-stone-100 font-bold text-[10px] uppercase tracking-widest"
              >
                <option value="price">Sort by Price</option>
                <option value="rating">Sort by Rating</option>
                <option value="time">Sort by Duration</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                <FiArrowDown className="w-3 h-3" />
              </div>
            </div>
            <button
              onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
              className="h-14 w-14 flex items-center justify-center rounded-2xl border border-stone-100 hover:bg-stone-50 transition-all text-stone-400 hover:text-charcoal"
            >
              {sortDir === 'asc' ? <FiArrowDown className="w-5 h-5" /> : <FiArrowUp className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Applications Grid */}
      <div className="grid grid-cols-1 gap-8">
        {applications.length === 0 ? (
          <div className="card-premium bg-white p-20 text-center border-dashed border-stone-200">
            <FiFileText className="w-16 h-16 text-stone-100 mx-auto mb-6" />
            <div className="label-caps text-stone-300 mb-2">No Active Bids</div>
            <p className="text-stone-400 font-medium">Wait for professionals to transmit proposals.</p>
          </div>
        ) : applications.map(app => (
          <div key={app._id} className="card-premium bg-white overflow-hidden group hover:border-trust transition-all duration-500">
            <div className="p-8">
              {/* Profile Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-stone-50 overflow-hidden border border-stone-100 p-0.5">
                    <img
                      src={resolveImageUrl(app.professional?.profilePicture || app.professional?.user?.profilePicture)}
                      alt=""
                      className="w-full h-full object-cover rounded-[14px]"
                      onError={(e) => { e.target.src = '/images/placeholder.jpeg'; }}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-tight font-bold text-charcoal">
                        {app.professional?.name || app.professional?.user?.name || 'Anonymous Partner'}
                      </h3>
                      {app.professional?.rating != null && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-lg text-[10px] font-bold">
                          ★ {app.professional.rating}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                      {(() => {
                        const appStatus = deriveApplicationStatus(app);
                        if (appStatus === 'Accepted') return <span className="text-trust flex items-center gap-1.5"><FiCheck className="w-3 h-3" /> Accepted</span>;
                        if (dmSentAppIds.has(String(app._id))) return <span className="text-charcoal flex items-center gap-1.5"><FiMessageSquare className="w-3 h-3" /> Manifest Sent</span>;
                        return <span>Initial Proposal</span>;
                      })()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-10">
                  <div className="text-right">
                    <div className="label-caps text-stone-400 mb-1">Bid Quote</div>
                    <div className="text-2xl font-tight font-bold text-charcoal">₦{Number(app.proposedPrice || 0).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="label-caps text-stone-400 mb-1">Duration</div>
                    <div className="text-lg font-tight font-medium text-stone-600">{app.estimatedDuration || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Proposal Text */}
              <div className="bg-stone-50/50 rounded-2xl p-6 mb-8 border border-stone-100">
                <div className="label-caps text-stone-400 mb-4 inline-flex items-center gap-2">
                  <FiFileText className="w-3 h-3" /> Professional Statement
                </div>
                <p className="text-graphite text-sm leading-relaxed whitespace-pre-line font-medium italic">
                  "{app.proposal || 'No additional statement provided.'}"
                </p>
              </div>

              {/* Action Suite */}
              <div className="flex flex-wrap items-center justify-between gap-6 pt-8 border-t border-stone-50">
                <div className="flex items-center gap-3">
                  <Link
                    to={app.professional?._id ? `/dashboard/professional/${app.professional._id}` : '#'}
                    className="btn-secondary px-6 py-3 text-[10px] uppercase tracking-widest flex items-center gap-2"
                  >
                    <FiUser className="w-4 h-4" /> Identity Profile
                  </Link>
                  {app.cvUrl && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const r = await getApplicationCvUrl(jobId, app._id);
                          const url = r?.url || r?.data?.url || app.cvUrl;
                          if (url) window.open(url, '_blank', 'noopener');
                        } catch (e) {
                          if (app.cvUrl) window.open(app.cvUrl, '_blank', 'noopener');
                          else error('Could not resolve credential link.');
                        }
                      }}
                      className="btn-secondary px-6 py-3 text-[10px] uppercase tracking-widest flex items-center gap-2"
                    >
                      <FiExternalLink className="w-4 h-4" /> Credentials
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to purge this application?')) {
                        try {
                          await deleteJobApplication(jobId, app._id);
                          success('Application purged.');
                          setJob(prev => {
                            const copy = JSON.parse(JSON.stringify(prev));
                            copy.applications = (copy.applications || []).filter(a => a._id !== app._id);
                            return copy;
                          });
                        } catch (e) {
                          error('Purge failure.');
                        }
                      }
                    }}
                    disabled={isApplicationAccepted(app) || jobStatus === 'Completed' || jobStatus === 'In Progress'}
                    className="p-3 text-stone-300 hover:text-clay transition-colors disabled:opacity-20"
                    title="Delete application"
                  >
                    <FiTrash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {connectedProIds.has(String(app.professional?._id)) ? (
                    <button
                      type="button"
                      onClick={() => handleSendJobToDm(app)}
                      disabled={!canSendJobToDM(app) || actionLoading === `send_${app._id}`}
                      className={`btn-primary px-8 py-4 bg-charcoal text-[10px] flex items-center gap-2 disabled:opacity-30`}
                    >
                      {actionLoading === `send_${app._id}` ? (
                        <>
                          <FiLoader className="w-4 h-4 animate-spin" /> DISPATCHING...
                        </>
                      ) : (
                        <>
                          <FiMessageSquare className="w-4 h-4" />
                          {dmSentAppIds.has(String(app._id)) ? 'DISPATCHED TO DM' : 'TRANSMIT JOB TO DM'}
                        </>
                      )}
                    </button>
                  ) : pendingProIds.has(String(app.professional?._id)) ? (
                    <div className="px-8 py-4 rounded-2xl border border-stone-200 text-stone-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                      <FiClock className="w-4 h-4" /> Connection Pending
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleConnect(app)}
                      disabled={actionLoading === app._id || isApplicationAccepted(app)}
                      className="btn-primary space-x-2 px-8 py-4 text-[10px]"
                    >
                      {actionLoading === app._id ? (
                        <FiLoader className="w-4 h-4 animate-spin" />
                      ) : (
                        <span>INITIATE CONNECTION</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobApplications;

