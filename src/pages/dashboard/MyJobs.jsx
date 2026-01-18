import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiSearch, FiFilter, FiEye, FiMessageSquare, FiX, FiCheckCircle, FiClock, FiAlertTriangle, FiCalendar, FiMapPin, FiUser, FiStar, FiEdit, FiTrash, FiPlus, FiBriefcase, FiArrowRight, FiLoader, FiMaximize2, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '../../context/useAuth';
import { getMyJobs, getProJobs, completeJob, cancelJob, deleteJobApi, acceptApplication, createOrGetConversation } from '../../utils/api';
import { useNavigate as useRouterNavigate } from 'react-router-dom';

const MyJobs = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { jobId } = useParams();
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Load jobs from API
  useEffect(() => {
    const loadJobs = async () => {
      setLoading(true);
      try {
        const response = String(user?.role).toLowerCase() === 'professional'
          ? await getProJobs({ limit: 100 })
          : await getMyJobs({ limit: 100 }); // Request up to 100 jobs
        if (response.success) {
          const raw = response.data.jobs || response.data || [];
          const day = (d) => new Date(d || 0).toISOString().slice(0, 10);
          const norm = (s) => String(s || '').trim().toLowerCase();
          const toCurrency = (n) => Number(n || 0);
          const statusRank = { 'Cancelled': 3, 'Completed': 2, 'In Progress': 1, 'Pending': 0 };

          // Helper to check if job is completed/closed
          const isJobCompleted = (job) => {
            const statusLc = String(job?.status || '').toLowerCase();
            const lifecycleLc = String(job?.lifecycleState || '').toLowerCase();
            return statusLc === 'completed' || statusLc === 'cancelled' ||
              ['in_progress', 'completed_by_pro', 'completed_by_user', 'closed', 'cancelled'].includes(lifecycleLc) ||
              job?.completed === true || job?.isCompleted === true || !!job?.completedAt;
          };

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

          const byId = new Map(); // First pass: group by job ID
          const byKey = new Map(); // Second pass: deduplicate by signature/conversation

          // First, group all jobs by their _id
          raw.forEach(j => {
            if (j._id) {
              const idKey = String(j._id);
              if (!byId.has(idKey)) {
                byId.set(idKey, []);
              }
              byId.get(idKey).push(j);
            }
          });

          // For each unique job ID, keep only the most recent/advanced version
          byId.forEach((jobs, idKey) => {
            if (jobs.length === 1) {
              byKey.set(idKey, jobs[0]);
            } else {
              // Multiple jobs with same ID - prefer non-completed jobs, then highest status, then most recent
              let best = jobs[0];
              for (let i = 1; i < jobs.length; i++) {
                const curr = jobs[i];
                const bestIsCompleted = isJobCompleted(best);
                const currIsCompleted = isJobCompleted(curr);

                // If best is completed and current is not, always prefer current
                if (bestIsCompleted && !currIsCompleted) {
                  best = curr;
                  continue;
                }

                // If current is completed and best is not, keep best
                if (currIsCompleted && !bestIsCompleted) {
                  continue;
                }

                // Both are completed or both are not - use status rank and recency
                const bestRank = statusRank[String(best.status)] ?? -1;
                const currRank = statusRank[String(curr.status)] ?? -1;
                const bestUpdated = new Date(best.updatedAt || best.completedAt || best.createdAt || 0).getTime();
                const currUpdated = new Date(curr.updatedAt || curr.completedAt || curr.createdAt || 0).getTime();
                const bestHasConv = !!best.conversation;
                const currHasConv = !!curr.conversation;

                if (currRank > bestRank ||
                  (currRank === bestRank && currUpdated >= bestUpdated) ||
                  (currRank === bestRank && currUpdated === bestUpdated && currHasConv && !bestHasConv)) {
                  best = curr;
                }
              }
              byKey.set(idKey, best);
            }
          });

          // Then deduplicate jobs that might have same signature but different IDs
          // This handles cases where backend creates a new job when sending to DM (same content, different ID)
          const finalList = [];
          const seenIds = new Set();
          const seenSignatures = new Map(); // Maps signature -> job object

          Array.from(byKey.values()).forEach(j => {
            const jobId = String(j._id || j.id || '');

            // Skip jobs without IDs (shouldn't happen, but safety check)
            if (!jobId) return;

            // Skip if we've already seen this exact job ID
            if (seenIds.has(jobId)) return;

            // Check signature for potential duplicates (same content, different ID)
            const sig = makeSignature(j);
            const existingBySig = seenSignatures.get(sig);

            if (existingBySig) {
              // Same signature - this is likely a duplicate
              // Priority: prefer non-completed jobs > conversation > status rank > most recent
              const existingIsCompleted = isJobCompleted(existingBySig);
              const currentIsCompleted = isJobCompleted(j);

              // If existing is completed and current is not, always replace
              if (existingIsCompleted && !currentIsCompleted) {
                const existingId = String(existingBySig._id || existingBySig.id);
                const index = finalList.findIndex(item => String(item._id || item.id) === existingId);
                if (index >= 0) {
                  seenIds.delete(existingId);
                  finalList[index] = j;
                  seenSignatures.set(sig, j);
                  seenIds.add(jobId);
                }
                return;
              }

              // If current is completed and existing is not, keep existing (skip current)
              if (currentIsCompleted && !existingIsCompleted) {
                return; // Skip current, keep existing
              }

              // Both are completed or both are not - use other criteria
              const existingRank = statusRank[String(existingBySig.status)] ?? -1;
              const currentRank = statusRank[String(j.status)] ?? -1;
              const existingHasConv = !!existingBySig.conversation;
              const currentHasConv = !!j.conversation;
              const existingUpdated = new Date(existingBySig.updatedAt || existingBySig.createdAt || 0).getTime();
              const currentUpdated = new Date(j.updatedAt || j.createdAt || 0).getTime();

              let shouldReplace = false;

              // If both completed, prefer more recent
              if (existingIsCompleted && currentIsCompleted) {
                shouldReplace = currentUpdated > existingUpdated;
              } else {
                // Both not completed - prefer conversation, then status, then recency
                if (currentHasConv && !existingHasConv) {
                  shouldReplace = true;
                } else if (!currentHasConv && existingHasConv) {
                  shouldReplace = false;
                } else if (currentRank > existingRank) {
                  shouldReplace = true;
                } else if (currentRank === existingRank && currentUpdated > existingUpdated) {
                  shouldReplace = true;
                }
              }

              if (shouldReplace) {
                const existingId = String(existingBySig._id || existingBySig.id);
                const index = finalList.findIndex(item => String(item._id || item.id) === existingId);
                if (index >= 0) {
                  seenIds.delete(existingId);
                  finalList[index] = j;
                  seenSignatures.set(sig, j);
                  seenIds.add(jobId);
                }
              }
              // If not replacing, skip this job (don't add it)
            } else {
              // New signature - add it
              finalList.push(j);
              seenSignatures.set(sig, j);
              seenIds.add(jobId);
            }
          });

          setJobs(finalList);
          setFilteredJobs(finalList);
          // Auto-open job modal if jobId param is present
          if (jobId) {
            const found = finalList.find(j => String(j._id) === String(jobId));
            if (found) {
              setSelectedJob(found);
              setShowModal(true);
            }
          }
        }
      } catch (error) {
        console.error('Error loading jobs:', error);
        // Fallback to mock data
        const mockJobs = [
          {
            _id: '1',
            title: 'Fix Kitchen Sink',
            description: 'Kitchen sink is leaking and needs immediate repair',
            category: 'Plumber',
            status: 'In Progress',
            urgency: 'Urgent',
            budget: { min: 15000, max: 25000 },
            location: { address: '123 Main St', city: 'Lagos', state: 'Lagos' },
            preferredDate: '2024-01-25',
            preferredTime: 'Morning (6AM-12PM)',
            createdAt: '2024-01-15T10:00:00Z',
            professional: {
              _id: 'pro1',
              name: 'John Electrician',
              phone: '08012345678',
              rating: 4.8
            },
            applications: [
              {
                _id: 'app1',
                professional: {
                  _id: 'pro2',
                  name: 'Sarah Plumber',
                  rating: 4.9
                },
                proposal: 'I can fix this sink professionally',
                proposedPrice: 20000,
                estimatedDuration: '2 hours',
                status: 'Pending',
                appliedAt: '2024-01-16T09:00:00Z'
              }
            ]
          },
          {
            _id: '2',
            title: 'Install New Door',
            description: 'Need to install a new wooden door for bedroom',
            category: 'Carpenter',
            status: 'Completed',
            urgency: 'Regular',
            budget: { min: 8000, max: 12000 },
            location: { address: '456 Oak Ave', city: 'Abuja', state: 'Abuja' },
            preferredDate: '2024-01-20',
            preferredTime: 'Afternoon (12PM-6PM)',
            createdAt: '2024-01-10T14:00:00Z',
            completedAt: '2024-01-20T16:00:00Z',
            professional: {
              _id: 'pro3',
              name: 'Mike Carpenter',
              phone: '08087654321',
              rating: 4.7
            },
            applications: []
          },
          {
            _id: '3',
            title: 'Repair Toilet',
            description: 'Toilet is not flushing properly',
            category: 'Plumber',
            status: 'Pending',
            urgency: 'Regular',
            budget: { min: 5000, max: 8000 },
            location: { address: '789 Pine St', city: 'Port Harcourt', state: 'Rivers' },
            preferredDate: '2024-01-28',
            preferredTime: 'Flexible',
            createdAt: '2024-01-20T11:00:00Z',
            professional: null,
            applications: [
              {
                _id: 'app2',
                professional: {
                  _id: 'pro4',
                  name: 'David Plumber',
                  rating: 4.6
                },
                proposal: 'I specialize in toilet repairs',
                proposedPrice: 6000,
                estimatedDuration: '1 hour',
                status: 'Pending',
                appliedAt: '2024-01-21T08:00:00Z'
              },
              {
                _id: 'app3',
                professional: {
                  _id: 'pro5',
                  name: 'Emma Fixer',
                  rating: 4.8
                },
                proposal: 'Quick and reliable toilet repair service',
                proposedPrice: 7000,
                estimatedDuration: '1.5 hours',
                status: 'Pending',
                appliedAt: '2024-01-21T10:00:00Z'
              }
            ]
          }
        ];
        setJobs(mockJobs);
        setFilteredJobs(mockJobs);
      } finally {
        setLoading(false);
      }
    };

    loadJobs();
  }, [user?.role, jobId]);

  // Filter jobs based on search and status
  useEffect(() => {
    let filtered = jobs;

    if (searchTerm) {
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(job => deriveStatus(job) === statusFilter);
    }

    setFilteredJobs(filtered);
  }, [jobs, searchTerm, statusFilter]);

  const deriveStatus = (job) => {
    if (!job) return 'Unknown';
    const raw = String(job.status || '').toLowerCase();
    const lifecycle = String(job.lifecycleState || '').toLowerCase();
    const isAssigned = !!job.professional || !!job.assignedTo;
    const hasCompletedFlag = job.completed === true || job.isCompleted === true || !!job.completedAt;

    if (raw === 'cancelled' || lifecycle === 'cancelled') return 'Cancelled';
    if (hasCompletedFlag || lifecycle === 'completed_by_pro' || lifecycle === 'completed_by_user' || raw === 'completed') return 'Completed';
    if (lifecycle === 'in_progress' || raw === 'in progress' || raw === 'in_progress' || isAssigned) return 'In Progress';
    return 'Pending';
  };

  const reloadJobs = async () => {
    try {
      const response = String(user?.role).toLowerCase() === 'professional'
        ? await getProJobs({ limit: 100 })
        : await getMyJobs({ limit: 100 });
      if (response.success) {
        const list = response.data.jobs || response.data || [];
        setJobs(list);
        setFilteredJobs(list);
      }
    } catch (e) { }
  };

  const handleJobAction = async (jobId, action, data = {}) => {
    setActionLoading(true);
    try {
      let response;
      if (action === 'complete') {
        response = await completeJob(jobId);
      } else if (action === 'cancel') {
        response = await cancelJob(jobId, data);
      } else if (action === 'open-chat') {
        // Handle chat opening
        const job = jobs.find(j => j._id === jobId);
        const otherUserId = job.professional?.user || job.professional?._id || job.client?.user || job.client?._id;
        if (otherUserId) {
          try {
            const conv = await createOrGetConversation({ userId: otherUserId });
            const convId = conv?.data?._id || conv?._id;
            if (convId) navigate(`/dashboard/messages/${convId}`);
            else navigate(`/dashboard/messages`);
          } catch (_) {
            navigate(`/dashboard/messages`);
          }
        }
        return;
      }

      if (response?.success) {
        await reloadJobs();
        setShowModal(false);
      }
    } catch (error) {
      console.error('Error performing job action:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString, timeOnly = false) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(timeOnly && { hour: '2-digit', minute: '2-digit' })
    });
  };

  const formatCurrency = (amount) => `₦${Number(amount || 0).toLocaleString()}`;

  const isPro = String(user?.role).toLowerCase() === 'professional';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <FiLoader className="w-12 h-12 animate-spin text-trust mb-4" />
        <p className="font-tight text-graphite text-lg">Synchronizing registry...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Premium Header */}
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <div className="label-caps mb-2 text-stone-400">Management Registry</div>
          <h1 className="text-4xl md:text-5xl font-tight font-bold text-charcoal tracking-tight">Active Engagements</h1>
          <p className="mt-3 text-lg text-graphite max-w-xl leading-relaxed">
            {isPro
              ? 'Comprehensive record of your active and historical professional assignments.'
              : 'Track status, manage providers, and review service history.'}
          </p>
        </div>
        {!isPro && (
          <Link
            to="/dashboard/post-job"
            className="btn-primary py-4 px-8 flex items-center gap-2 group shadow-xl shadow-trust/10"
          >
            <FiPlus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            INITIATE REQUEST
          </Link>
        )}
      </div>

      {/* Filters & Controls */}
      <div className="card-premium bg-white p-6 mb-12 border-stone-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-5 relative group">
            <FiSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-trust transition-colors z-10" />
            <input
              type="text"
              placeholder="Search by title, location, or logic..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-14 h-16 rounded-2xl border-stone-100 focus:border-trust transition-all text-sm font-medium"
            />
          </div>
          <div className="md:col-span-4 relative group">
            <FiFilter className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-300 z-10 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field pl-14 h-16 rounded-2xl border-stone-100 focus:border-trust transition-all text-sm font-medium appearance-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending Assignment</option>
              <option value="In Progress">Active Execution</option>
              <option value="Completed">Verified Complete</option>
              <option value="Cancelled">Terminated</option>
            </select>
            <FiCheckCircle className="absolute right-6 top-1/2 -translate-y-1/2 text-stone-300 pointer-events-none w-4 h-4" />
          </div>

          {/* Quick Stats */}
          <div className="md:col-span-3 flex items-center justify-between px-6 bg-stone-50 rounded-2xl border border-stone-100">
            <div className="text-center">
              <div className="text-2xl font-tight font-bold text-charcoal">{jobs.filter(j => deriveStatus(j) === 'In Progress').length}</div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Active</div>
            </div>
            <div className="w-px h-8 bg-stone-200"></div>
            <div className="text-center">
              <div className="text-2xl font-tight font-bold text-charcoal">{jobs.filter(j => deriveStatus(j) === 'Completed').length}</div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Done</div>
            </div>
            <div className="w-px h-8 bg-stone-200"></div>
            <div className="text-center">
              <div className="text-2xl font-tight font-bold text-charcoal">{jobs.length}</div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      {filteredJobs.length === 0 ? (
        <div className="card-premium bg-white p-24 text-center border-dashed border-stone-200">
          <FiBriefcase className="w-16 h-16 text-stone-200 mx-auto mb-6" />
          <h3 className="text-xl font-tight font-bold text-stone-400">Registry Empty</h3>
          <p className="text-stone-300 mt-2 max-w-md mx-auto">
            No records found matching your current parameters. Adjust filters or initiate a new request to populate the registry.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredJobs.map((job) => {
            const status = deriveStatus(job);
            const isCompleted = status === 'Completed';
            const isActive = status === 'In Progress';

            return (
              <div
                key={job._id}
                className={`card-premium bg-white p-0 group overflow-hidden transition-all duration-500 hover:shadow-lg hover:border-stone-300 ${isActive ? 'border-l-4 border-l-clay' : isCompleted ? 'border-l-4 border-l-trust' : 'border-l-4 border-l-stone-200'}`}
              >
                <div className="p-8 flex flex-col md:flex-row gap-8 items-start">
                  {/* Icon Column */}
                  <div className="hidden md:flex flex-col items-center gap-4 min-w-[80px]">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-sm border ${isActive ? 'bg-clay text-white border-clay' : isCompleted ? 'bg-trust text-white border-trust' : 'bg-stone-50 text-stone-400 border-stone-200'}`}>
                      {isActive ? <FiClock /> : isCompleted ? <FiCheckCircle /> : <FiBriefcase />}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400 text-center">
                      {formatDate(job.createdAt)}
                    </div>
                  </div>

                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${isActive ? 'bg-clay/10 text-clay border-clay/20' : isCompleted ? 'bg-trust/10 text-trust border-trust/20' : 'bg-stone-100 text-stone-500 border-stone-200'}`}>
                        {status.toUpperCase()}
                      </span>
                      <span className="text-stone-300">•</span>
                      <span className="label-caps text-stone-400">{job.category}</span>
                      {job.urgency === 'Urgent' && (
                        <>
                          <span className="text-stone-300">•</span>
                          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-red-500">
                            <FiAlertTriangle className="w-3 h-3" /> High Priority
                          </span>
                        </>
                      )}
                    </div>

                    <h3 className="text-2xl font-tight font-bold text-charcoal mb-3 group-hover:text-trust transition-colors cursor-pointer" onClick={() => { setSelectedJob(job); setShowModal(true); }}>
                      {job.title}
                    </h3>

                    <p className="text-graphite text-sm leading-relaxed mb-6 max-w-2xl line-clamp-2">
                      {job.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-6 text-sm text-stone-500 font-medium">
                      <div className="flex items-center gap-2">
                        <FiMapPin className="text-stone-300" /> {job.location?.city || 'Remote/TBD'}
                      </div>
                      <div className="flex items-center gap-2">
                        <FiUser className="text-stone-300" />
                        {isPro ? (job.client?.name || 'Client') : (job.professional?.name || (job.applications?.length > 0 ? `${job.applications.length} Proposals` : 'Unassigned'))}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-stone-300"></div>
                        <span className="text-charcoal font-bold">{formatCurrency(job.budget?.min)} - {formatCurrency(job.budget?.max)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Column */}
                  <div className="flex flex-row md:flex-col gap-3 w-full md:w-auto mt-4 md:mt-0">
                    <button
                      onClick={() => { setSelectedJob(job); setShowModal(true); }}
                      className="flex-1 md:w-40 py-4 px-6 border border-stone-200 rounded-xl font-bold text-xs uppercase tracking-widest text-charcoal hover:bg-stone-50 hover:border-stone-300 transition-all text-center"
                    >
                      Manage
                    </button>
                    {isActive && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleJobAction(job._id, 'open-chat'); }}
                        className="flex-1 md:w-40 py-4 px-6 bg-charcoal text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-trust transition-all text-center flex items-center justify-center gap-2"
                      >
                        <FiMessageSquare className="w-4 h-4" /> Chat
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Modal */}
      {showModal && selectedJob && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-charcoal/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-300">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm p-8 border-b border-stone-100 flex justify-between items-start z-10">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="label-caps px-3 py-1 bg-stone-100 rounded-lg">{selectedJob.category}</span>
                  <span className={`label-caps px-3 py-1 rounded-lg ${deriveStatus(selectedJob) === 'In Progress' ? 'bg-clay/10 text-clay' : 'bg-stone-50 text-stone-500'}`}>
                    {deriveStatus(selectedJob)}
                  </span>
                </div>
                <h2 className="text-3xl font-tight font-bold text-charcoal">{selectedJob.title}</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors">
                <FiX className="w-6 h-6 text-stone-400" />
              </button>
            </div>

            <div className="p-8 md:p-10 space-y-12">
              {/* Overview Grid */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <DetailItem label="Location" value={`${selectedJob.location?.address}, ${selectedJob.location?.city}`} />
                <DetailItem label="Schedule" value={`${formatDate(selectedJob.preferredDate)} • ${selectedJob.preferredTime}`} />
                <DetailItem label="Budget Range" value={`${formatCurrency(selectedJob.budget?.min)} - ${formatCurrency(selectedJob.budget?.max)}`} />
              </section>

              {/* Description */}
              <section>
                <h3 className="text-lg font-tight font-bold text-charcoal mb-4 border-b border-stone-100 pb-2">Scope of Work</h3>
                <p className="text-graphite leading-relaxed text-lg">{selectedJob.description}</p>
              </section>

              {/* Requirements if any */}
              {selectedJob.requirements && (
                <section className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
                  <div className="label-caps mb-4 text-stone-400">Specific Requirements</div>
                  <p className="text-charcoal font-medium italic">"{selectedJob.requirements}"</p>
                </section>
              )}

              {/* Actions / Pro Logic */}
              <section className="pt-8 border-t border-stone-100">
                {deriveStatus(selectedJob) === 'In Progress' && (
                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-trust/5 p-6 rounded-2xl border border-trust/10">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-trust/20 flex items-center justify-center text-trust">
                        <FiClock className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="font-bold text-charcoal">Engagement Active</h4>
                        <p className="text-sm text-trust">Work is currently in execution phase.</p>
                      </div>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                      <button
                        onClick={() => handleJobAction(selectedJob._id, 'open-chat')}
                        className="btn-secondary py-3 px-6 flex-1 md:flex-none text-xs"
                      >
                        Open Channel
                      </button>
                      <button
                        onClick={() => handleJobAction(selectedJob._id, 'complete')}
                        disabled={actionLoading}
                        className="btn-primary py-3 px-6 flex-1 md:flex-none text-xs bg-trust border-trust"
                      >
                        Verify Completion
                      </button>
                    </div>
                  </div>
                )}

                {/* Applications List (for regular users) */}
                {!isPro && selectedJob.applications && selectedJob.applications.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-xl font-tight font-bold text-charcoal mb-6 flex items-center gap-3">
                      Proposals <span className="px-3 py-1 bg-stone-100 text-stone-500 rounded-full text-xs">{selectedJob.applications.length}</span>
                    </h3>
                    <div className="space-y-4">
                      {selectedJob.applications.map(app => (
                        <div key={app._id} className="card-premium p-6 flex flex-col md:flex-row justify-between items-start gap-6 hover:border-trust transition-colors">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 font-bold text-lg">
                              {app.professional?.name?.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-lg text-charcoal">{app.professional?.name}</div>
                              <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-stone-400 mt-1">
                                <span className="text-trust">{formatCurrency(app.proposedPrice)}</span>
                                <span>•</span>
                                <span>{app.estimatedDuration} Estimate</span>
                              </div>
                              <p className="mt-4 text-graphite text-sm bg-stone-50 p-4 rounded-xl italic">"{app.proposal}"</p>
                            </div>
                          </div>
                          {deriveStatus(selectedJob) === 'Pending' && app.status === 'Pending' && (
                            <button
                              onClick={async () => {
                                try {
                                  setActionLoading(true);
                                  const resp = await acceptApplication(selectedJob._id, app._id);
                                  if (resp?.success) {
                                    await reloadJobs();
                                    setShowModal(false);
                                    // Navigate to chat
                                    const otherId = app.professional?.user || app.professional?._id;
                                    if (otherId) {
                                      const conv = await createOrGetConversation({ userId: otherId });
                                      if (conv?.data?._id) navigate(`/dashboard/messages/${conv.data._id}`);
                                      else navigate('/dashboard/messages');
                                    }
                                  }
                                } catch (e) { console.error(e); } finally { setActionLoading(false); }
                              }}
                              disabled={actionLoading}
                              className="btn-primary py-3 px-6 text-xs whitespace-nowrap w-full md:w-auto"
                            >
                              {actionLoading ? 'Processing...' : 'Accept Proposal'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>

            <div className="p-6 border-t border-stone-100 bg-stone-50 flex justify-between items-center">
              {deriveStatus(selectedJob) !== 'Cancelled' && deriveStatus(selectedJob) !== 'Completed' && (
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to cancel this request?')) handleJobAction(selectedJob._id, 'cancel');
                  }}
                  className="text-red-500 text-xs font-bold uppercase tracking-widest hover:underline px-4"
                >
                  Cancel Request
                </button>
              )}
              <div className="flex-1"></div>
              <button onClick={() => setShowModal(false)} className="btn-secondary py-3 px-8 text-xs">Close View</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailItem = ({ label, value }) => (
  <div className="bg-stone-50 p-5 rounded-2xl border border-stone-100">
    <div className="label-caps text-stone-400 mb-2">{label}</div>
    <div className="text-lg font-tight font-bold text-charcoal">{value || '—'}</div>
  </div>
);

export default MyJobs;
