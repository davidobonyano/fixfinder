import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  FaSearch, 
  FaFilter, 
  FaEye, 
  FaComments, 
  FaTimes, 
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaUser,
  FaStar,
  FaEdit,
  FaTrash,
  FaPlus,
  FaBriefcase
} from 'react-icons/fa';
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
          const day = (d) => new Date(d || 0).toISOString().slice(0,10);
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
    const raw = String(job?.status || '').toLowerCase();
    const lifecycle = String(job?.lifecycleState || '').toLowerCase();
    const hasCompletedFlag = job?.completed === true || job?.isCompleted === true || !!job?.completedAt;
    const hasCancelledFlag = job?.cancelled === true || !!job?.cancelledAt;
    const isAssigned = !!job?.professional || !!job?.assignedProfessional || !!job?.conversation;

    if (hasCancelledFlag || lifecycle === 'cancelled' || raw === 'cancelled') return 'Cancelled';
    if (hasCompletedFlag || lifecycle === 'completed_by_pro' || lifecycle === 'completed_by_user' || raw === 'completed') return 'Completed';
    if (lifecycle === 'in_progress' || raw === 'in progress' || raw === 'in_progress' || isAssigned) return 'In Progress';
    return 'Pending';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'text-emerald-600';
      case 'In Progress': return 'text-indigo-600';
      case 'Pending': return 'text-gray-600';
      case 'Cancelled': return 'text-red-500';
      default: return 'text-gray-600';
    }
  };

  const getUrgencyColor = (urgency) => {
    return urgency === 'Urgent' ? 'text-red-500' : 'text-gray-500';
  };

  const reloadJobs = async () => {
    try {
      const response = String(user?.role).toLowerCase() === 'professional' 
        ? await getProJobs({ limit: 100 }) 
        : await getMyJobs({ limit: 100 }); // Request up to 100 jobs
      if (response.success) {
        const list = response.data.jobs || response.data || [];
        setJobs(list);
        setFilteredJobs(list);
      }
    } catch (e) {}
  };

  const handleJobAction = async (jobId, action, data = {}) => {
    setActionLoading(true);
    try {
      let response;
      if (action === 'complete') {
        response = await completeJob(jobId);
      } else if (action === 'cancel') {
        response = await cancelJob(jobId, data);
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return `₦${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <FaBriefcase className="w-5 h-5 text-indigo-600 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Modern Design */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-400 opacity-10 rounded-full -ml-24 -mb-24"></div>
        
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-2 flex items-center gap-3">
              <FaBriefcase className="w-8 h-8 text-amber-300" />
              My Jobs
            </h1>
            <p className="text-indigo-100 text-lg">
              {String(user?.role).toLowerCase() === 'professional' ? 'Jobs you are working on and have completed' : 'Manage and track all your posted jobs'}
            </p>
          </div>
          {String(user?.role).toLowerCase() !== 'professional' && (
            <Link
              to="/dashboard/post-job"
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-semibold shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all duration-300 flex items-center gap-2 transform hover:scale-105"
            >
              <FaPlus className="w-5 h-5" />
              Post New Job
            </Link>
          )}
        </div>
      </div>

      {/* Filters - Modern Design */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-indigo-400 dark:text-white w-5 h-5" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-white focus:border-indigo-500 dark:focus:border-white transition-all dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
          <div className="md:w-56">
            <div className="relative">
              <FaFilter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-indigo-400 dark:text-white w-5 h-5 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-white focus:border-indigo-500 dark:focus:border-white appearance-none bg-white dark:bg-gray-800 dark:text-white transition-all"
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 border border-gray-100 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <FaBriefcase className="w-10 h-10 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No jobs found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter 
                ? 'Try adjusting your search or filter criteria'
                : (String(user?.role).toLowerCase() === 'professional' ? 'You have no jobs yet' : 'You haven\'t posted any jobs yet')}
            </p>
            {String(user?.role).toLowerCase() !== 'professional' && !searchTerm && !statusFilter && (
              <Link
                to="/dashboard/post-job"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-300 transform hover:scale-105"
              >
                <FaPlus className="w-5 h-5" />
                Post Your First Job
              </Link>
            )}
          </div>
        ) : (
          filteredJobs.map((job) => (
            <div key={job._id} className="group bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-white overflow-hidden hover:shadow-xl transition-all duration-300">
              {Array.isArray(job.media) && job.media[0]?.url && (
                <div className="w-full bg-gradient-to-br from-indigo-50 to-gray-50 overflow-hidden">
                  <img src={job.media[0].url} alt="job" className="w-full max-h-80 object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              )}
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{job.title}</h3>
                      <span className={`text-sm font-semibold ${getStatusColor(deriveStatus(job))}`}>
                        {deriveStatus(job)}
                      </span>
                      {job.urgency && (
                        <span className={`text-sm font-semibold ${getUrgencyColor(job.urgency)}`}>
                          {job.urgency}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">{job.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                      <span className="flex items-center gap-2">
                        <FaMapMarkerAlt className="w-4 h-4 text-indigo-400 dark:text-white" />
                        {job.location?.city}, {job.location?.state}
                      </span>
                      <span className="flex items-center gap-2">
                        <FaCalendarAlt className="w-4 h-4 text-indigo-400 dark:text-white" />
                        {formatDate(job.preferredDate)}
                      </span>
                      <span className="flex items-center gap-2">
                        <FaClock className="w-4 h-4 text-indigo-400 dark:text-white" />
                        {job.preferredTime}
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-4 space-y-1">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(job.budget?.min || 0)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                      - {formatCurrency(job.budget?.max || 0)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{job.category}</p>
                  </div>
                </div>

                {/* Client Info for pro view */}
                {String(user?.role).toLowerCase() === 'professional' && job.client && (
                  <div className="rounded-xl p-4 mb-4 border border-gray-200 dark:border-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                          <FaUser className="w-6 h-6 text-gray-500" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white">{job.client.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <span>{job.client.phone || ''}</span>
                          </div>
                        </div>
                      </div>
                      <button className="flex items-center gap-2 px-4 py-2 border border-indigo-200 dark:border-white text-indigo-600 dark:text-white rounded-lg font-semibold hover:border-indigo-400 dark:hover:border-gray-300 hover:text-indigo-700 dark:hover:text-gray-200 transition-colors">
                        <FaComments className="w-4 h-4" />
                        Message
                      </button>
                    </div>
                  </div>
                )}

                {/* Applications */}
                {job.applications && job.applications.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-500">
                          {job.applications.length}
                        </span>
                        Applications
                      </h4>
                      <Link 
                        to={`/dashboard/my-jobs/${job._id}/applications`} 
                        className="text-indigo-600 dark:text-white hover:text-indigo-700 dark:hover:text-gray-200 font-semibold text-sm flex items-center gap-1 group"
                      >
                        View All
                        <FaArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                    <div className="space-y-3">
                      {job.applications.slice(0, 2).map((app) => (
                        <div key={app._id} className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-white hover:border-indigo-300 dark:hover:border-gray-300 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                              <FaUser className="w-6 h-6 text-gray-500 dark:text-white" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white">{app.professional?.name || 'Unknown Professional'}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{app.proposal}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(app.proposedPrice)}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{app.estimatedDuration}</p>
                          </div>
                        </div>
                      ))}
                      {job.applications.length > 2 && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 text-center py-2">
                          +{job.applications.length - 2} more applications
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-white">
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <FaClock className="w-4 h-4 text-gray-400" />
                      Posted {formatDate(job.createdAt)}
                    </span>
                    {job.completedAt && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="flex items-center gap-1">
                          <FaCheckCircle className="w-4 h-4 text-gray-400" />
                          Completed {formatDate(job.completedAt)}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setSelectedJob(job);
                        setShowModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 border border-indigo-200 dark:border-white text-indigo-600 dark:text-white rounded-lg font-semibold hover:border-indigo-400 dark:hover:border-gray-300 hover:text-indigo-700 dark:hover:text-gray-200 transition-colors"
                    >
                      <FaEye className="w-4 h-4" />
                      View Details
                    </button>
                    {deriveStatus(job) === 'In Progress' && (
                      <button
                        onClick={() => handleJobAction(job._id, 'complete')}
                        disabled={actionLoading}
                        className="flex items-center gap-2 px-4 py-2 border border-emerald-200 text-emerald-600 rounded-lg font-semibold hover:border-emerald-400 hover:text-emerald-700 transition-colors disabled:opacity-50"
                      >
                        <FaCheckCircle className="w-4 h-4" />
                        Complete
                      </button>
                    )}
                    {(deriveStatus(job) === 'Pending' || deriveStatus(job) === 'In Progress') && (
                      <button
                        onClick={() => handleJobAction(job._id, 'cancel', { reason: 'Cancelled by user' })}
                        disabled={actionLoading}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg font-semibold hover:border-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50"
                      >
                        <FaTimes className="w-4 h-4" />
                        Cancel
                      </button>
                    )}
                    {deriveStatus(job) === 'Cancelled' && (
                      <button
                        onClick={async () => { setActionLoading(true); try { await deleteJobApi(job._id); await reloadJobs(); } finally { setActionLoading(false); } }}
                        disabled={actionLoading}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg font-semibold hover:border-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50"
                        title="Delete this cancelled job"
                      >
                        <FaTrash className="w-4 h-4" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Job Details Modal */}
      {showModal && selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Job Details</h2>
                <div>
                  {selectedJob?.applications?.length > 0 && (
                    <Link to={`/dashboard/my-jobs/${selectedJob._id}/applications`} className="text-blue-600 text-sm hover:underline">View Applications</Link>
                  )}
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Header */}
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Looking for: <span className="font-extrabold">{selectedJob.title}</span></h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedJob.location?.address || selectedJob.location?.city || '—'} • {selectedJob.category}</p>
                </div>

                {/* Media */}
                {Array.isArray(selectedJob.media) && selectedJob.media[0]?.url && (
                  <div>
                    <img src={selectedJob.media[0].url} alt="job" className="w-full max-h-96 object-cover rounded border border-gray-200" />
                  </div>
                )}

                {/* Labeled details */}
                <div className="space-y-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">Title</div>
                    <div className="text-gray-900">{selectedJob.title || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">Description</div>
                    <div className="text-gray-900 whitespace-pre-wrap">{selectedJob.description || '—'}</div>
                  </div>
                  {selectedJob.requirements && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500">Requirements</div>
                      <div className="text-gray-900 whitespace-pre-wrap">{selectedJob.requirements}</div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500">Budget</div>
                      <div className="text-gray-900">{formatCurrency(selectedJob.budget.min)} - {formatCurrency(selectedJob.budget.max)}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500">Urgency</div>
                      <div className="text-gray-900">{selectedJob.urgency || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500">Preferred Date</div>
                      <div className="text-gray-900">{formatDate(selectedJob.preferredDate)}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500">Preferred Time</div>
                      <div className="text-gray-900">{selectedJob.preferredTime || '—'}</div>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="text-xs uppercase tracking-wide text-gray-500">Location</div>
                      <div className="text-gray-900">{selectedJob.location?.address || selectedJob.location?.city || '—'}</div>
                    </div>
                  </div>
                </div>

                {selectedJob.applications && selectedJob.applications.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">All Applications</h4>
                    <div className="space-y-3">
                      {selectedJob.applications.map((app) => (
                        <div key={app._id} className="p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium">{app.professional.name}</h5>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              app.status === 'Accepted' ? 'bg-green-100 text-green-800' :
                              app.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {app.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{app.proposal}</p>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{formatCurrency(app.proposedPrice)}</span>
                            <span className="text-gray-600">{app.estimatedDuration}</span>
                          </div>
                          <div className="mt-3 flex gap-2">
                            {deriveStatus(selectedJob) === 'Pending' && app.status === 'Pending' && (
                              <button
                                onClick={async () => {
                                  try {
                                    setActionLoading(true);
                                    const resp = await acceptApplication(selectedJob._id, app._id);
                                    if (resp?.success) {
                                      await reloadJobs();
                                      // Try to open chat with this professional (by user id if available)
                                      const otherUserId = app.professional?.user || app.professional?._id;
                                      if (otherUserId) {
                                        try {
                                          const conv = await createOrGetConversation({ userId: otherUserId });
                                          const convId = conv?.data?._id || conv?._id;
                                          if (convId) {
                                            navigate(`/dashboard/messages/${convId}`);
                                          } else {
                                            navigate(`/dashboard/messages`);
                                          }
                                        } catch (_) {
                                          navigate(`/dashboard/messages`);
                                        }
                                      } else {
                                        navigate(`/dashboard/messages`);
                                      }
                                    }
                                  } finally {
                                    setActionLoading(false);
                                  }
                                }}
                                disabled={actionLoading}
                                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                Accept & Open Chat
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyJobs;
