import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { FaArrowLeft, FaSearch, FaSortAmountDown, FaSortAmountUp, FaCheck, FaSpinner, FaUser, FaMoneyBill, FaClock } from 'react-icons/fa';
import { getJobDetails, sendConnectionRequest, getProfessionalProfile, getConnections, getConnectionRequests, getApplicationCvUrl, deleteJobApplication, createOrGetConversation, createJobRequestInChat } from '../../utils/api';
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
  const { success, error } = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const resp = await getJobDetails(jobId);
        if (resp?.success) setJob(resp.data);
        // Load connections and pending requests to reflect button state
        try {
          const cons = await getConnections();
          const connected = new Set();
          (cons?.data || []).forEach(c => {
            if (c?.professional?._id) connected.add(String(c.professional._id));
          });
          setConnectedProIds(connected);
        } catch (_) {}
        try {
          const reqs = await getConnectionRequests();
          const pending = new Set();
          (reqs?.data || reqs?.data?.requests || []).forEach(r => {
            if (r?.professional?._id) pending.add(String(r.professional._id));
          });
          setPendingProIds(pending);
        } catch (_) {}
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [jobId]);

  // Hydrate missing professional names if not present
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
          } catch (_) {}
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
      success('Connection request sent');
      setPendingProIds(prev => new Set([...Array.from(prev), String(professionalId)]));
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendJobToDm = async (application) => {
    try {
      setActionLoading(`send_${application._id}`);
      const pro = application.professional || {};
      // Resolve professional's user id
      let otherUserId = pro.user?._id || pro.user || null;
      if (!otherUserId && pro._id) {
        try {
          const prof = await getProfessionalProfile(pro._id);
          otherUserId = prof?.data?.user?._id || prof?.data?.user || otherUserId;
        } catch (_) {}
      }
      if (!otherUserId) {
        error('Could not resolve professional user.');
        return;
      }
      // Create/get conversation
      const convResp = await createOrGetConversation({ otherUserId });
      const conversationId = convResp?.data?._id || convResp?._id;
      if (!conversationId) {
        error('Failed to open conversation.');
        return;
      }
      // Build payload including required fields expected by backend
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
      // Validate required fields before sending
      const missing = [];
      if (!payload.category) missing.push('category');
      if (!payload.preferredDate) missing.push('preferredDate');
      if (!payload.preferredTime) missing.push('preferredTime');
      if (!payload.location?.state) missing.push('location.state');
      if (!payload.location?.city) missing.push('location.city');
      if (!payload.location?.address) missing.push('location.address');
      if (missing.length) {
        error(`Please complete job fields before sending: ${missing.join(', ')}`);
        return;
      }
      await createJobRequestInChat(conversationId, payload);
      success('Job sent to DM as a request');
      // Navigate to the conversation
      navigate(`/dashboard/messages/${conversationId}`);
    } catch (e) {
      error(e?.data?.message || e?.message || 'Failed to send job to DM');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FaSpinner className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:text-gray-800">
            <FaArrowLeft />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
            <p className="text-gray-600">{job?.title}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <FaSearch className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search proposal or pro name"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="price">Sort by Price</option>
              <option value="rating">Sort by Rating</option>
              <option value="time">Sort by Estimated Time</option>
            </select>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              {sortDir === 'asc' ? <FaSortAmountDown /> : <FaSortAmountUp />} {sortDir === 'asc' ? 'Asc' : 'Desc'}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {applications.length === 0 ? (
          <div className="p-10 text-center text-gray-500 bg-white border border-gray-200 rounded-xl">No applications yet</div>
        ) : applications.map(app => (
          <div key={app._id} className="bg-white border border-gray-200 rounded-xl p-4">
            {/* Header: Pro info and quick stats */}
            <div className="flex items-start justify-between mb-3">
              <div className="pr-3">
                <div className="flex items-center gap-2">
                  <FaUser className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-gray-900">{app.professional?.name || app.professional?.user?.name || 'Unknown Professional'}</span>
                  {app.professional?.rating != null && (
                    <span className="text-xs text-gray-500">• {app.professional.rating}★</span>
                  )}
                </div>
              </div>
              <div className="text-right space-y-1">
                <div className="text-xs uppercase tracking-wide text-gray-500">Proposed Price</div>
                <div className="text-sm font-semibold text-gray-900">₦{Number(app.proposedPrice || 0).toLocaleString()}</div>
                <div className="text-xs uppercase tracking-wide text-gray-500 mt-2">Estimated Time</div>
                <div className="text-sm text-gray-900">{app.estimatedDuration || 'N/A'}</div>
              </div>
            </div>

            {/* Proposal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proposal</label>
              <textarea
                readOnly
                value={app.proposal || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-800 resize-y"
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-wrap items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Link to={app.professional?._id ? `/dashboard/professional/${app.professional._id}` : '#'} className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 text-sm">View Profile</Link>
                {app.cvUrl && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const r = await getApplicationCvUrl(jobId, app._id);
                        const url = r?.url || r?.data?.url;
                        if (url) {
                          window.open(url, '_blank', 'noopener');
                        } else {
                          if (app.cvUrl) {
                            window.open(app.cvUrl, '_blank', 'noopener');
                          } else {
                            error('Could not get CV link');
                          }
                        }
                      } catch (e) {
                        if (app.cvUrl) {
                          window.open(app.cvUrl, '_blank', 'noopener');
                        } else {
                          error(e?.data?.message || e?.message || 'Failed to open CV');
                        }
                      }
                    }}
                    className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 text-sm"
                  >
                    View CV
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await deleteJobApplication(jobId, app._id);
                      success('Application deleted');
                      setJob(prev => {
                        const copy = JSON.parse(JSON.stringify(prev));
                        copy.applications = (copy.applications || []).filter(a => a._id !== app._id);
                        return copy;
                      });
                    } catch (e) {
                      error(e?.data?.message || e?.message || 'Failed to delete application');
                    }
                  }}
                  className="px-3 py-1.5 bg-red-50 text-red-700 rounded border border-red-200 hover:bg-red-100 text-sm"
                >
                  Delete
                </button>
              </div>

              <div className="flex items-center gap-2">
                {connectedProIds.has(String(app.professional?._id)) ? (
                  <>
                    <span className="px-3 py-1.5 bg-green-50 text-green-700 rounded border border-green-200 text-sm">Connected</span>
                    <button
                      type="button"
                      onClick={() => handleSendJobToDm(app)}
                      disabled={actionLoading === `send_${app._id}`}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      {actionLoading === `send_${app._id}` ? 'Sending...' : 'Send job to DM'}
                    </button>
                  </>
                ) : pendingProIds.has(String(app.professional?._id)) ? (
                  <span className="px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded border border-yellow-200 text-sm">Request Sent</span>
                ) : (
                  <button type="button"
                    onClick={async () => {
                      try {
                        await handleConnect(app);
                      } catch (e) {
                        error(e?.data?.message || e?.message || 'Failed to send request');
                      }
                    }}
                    disabled={actionLoading === app._id}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    {actionLoading === app._id ? 'Requesting...' : 'Connect'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobApplications;
