import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { getMyJobs, getProJobs, completeJob, cancelJob } from '../../utils/api';

const MyJobs = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
        const response = String(user?.role).toLowerCase() === 'professional' ? await getProJobs() : await getMyJobs();
        if (response.success) {
          const list = response.data.jobs || response.data || [];
          setJobs(list);
          setFilteredJobs(list);
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
  }, [user?.role]);

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
      filtered = filtered.filter(job => job.status === statusFilter);
    }

    setFilteredJobs(filtered);
  }, [jobs, searchTerm, statusFilter]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-gray-100 text-gray-800';
      case 'In Progress': return 'bg-gray-200 text-gray-900';
      case 'Pending': return 'bg-gray-50 text-gray-700';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency) => {
    return urgency === 'Urgent' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800';
  };

  const reloadJobs = async () => {
    try {
      const response = String(user?.role).toLowerCase() === 'professional' ? await getProJobs() : await getMyJobs();
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">My Jobs</h1>
            <p className="text-gray-600">
              {String(user?.role).toLowerCase() === 'professional' ? 'Jobs you are working on and have completed' : 'Manage and track all your posted jobs'}
            </p>
          </div>
          {String(user?.role).toLowerCase() !== 'professional' && (
            <Link
              to="/dashboard/post-job"
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <FaPlus className="w-4 h-4" />
              Post New Job
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
              />
            </div>
          </div>
          <div className="md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
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

      {/* Jobs List */}
      <div className="space-y-4">
        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 border border-gray-200 text-center">
            <FaBriefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter 
                ? 'Try adjusting your search or filter criteria'
                : (String(user?.role).toLowerCase() === 'professional' ? 'You have no jobs yet' : 'You haven\'t posted any jobs yet')}
            </p>
            {String(user?.role).toLowerCase() !== 'professional' && !searchTerm && !statusFilter && (
              <Link
                to="/dashboard/post-job"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <FaPlus className="w-4 h-4" />
                Post Your First Job
              </Link>
            )}
          </div>
        ) : (
          filteredJobs.map((job) => (
            <div key={job._id} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getUrgencyColor(job.urgency)}`}>
                        {job.urgency}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-2">{job.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <FaMapMarkerAlt className="w-3 h-3" />
                        {job.location.city}, {job.location.state}
                      </span>
                      <span className="flex items-center gap-1">
                        <FaCalendarAlt className="w-3 h-3" />
                        {formatDate(job.preferredDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <FaClock className="w-3 h-3" />
                        {job.preferredTime}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(job.budget?.min || 0)} - {formatCurrency(job.budget?.max || 0)}
                    </p>
                    <p className="text-sm text-gray-500">{job.category}</p>
                  </div>
                </div>

                {/* Client Info for pro view */}
                {String(user?.role).toLowerCase() === 'professional' && job.client && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <FaUser className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{job.client.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>{job.client.phone || ''}</span>
                          </div>
                        </div>
                      </div>
                      <button className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-900">
                        <FaComments className="w-4 h-4" />
                        Message
                      </button>
                    </div>
                  </div>
                )}

                {/* Applications */}
                {job.applications && job.applications.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Applications ({job.applications.length})
                    </h4>
                    <div className="space-y-2">
                      {job.applications.slice(0, 2).map((app) => (
                        <div key={app._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              <FaUser className="w-4 h-4 text-gray-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{app.professional.name}</p>
                              <p className="text-sm text-gray-600">{app.proposal}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">{formatCurrency(app.proposedPrice)}</p>
                            <p className="text-sm text-gray-600">{app.estimatedDuration}</p>
                          </div>
                        </div>
                      ))}
                      {job.applications.length > 2 && (
                        <p className="text-sm text-gray-600 text-center">
                          +{job.applications.length - 2} more applications
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>Posted {formatDate(job.createdAt)}</span>
                    {job.completedAt && (
                      <>
                        <span>•</span>
                        <span>Completed {formatDate(job.completedAt)}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedJob(job);
                        setShowModal(true);
                      }}
                      className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
                    >
                      <FaEye className="w-4 h-4" />
                      View Details
                    </button>
                    {job.status === 'In Progress' && (
                      <button
                        onClick={() => handleJobAction(job._id, 'complete')}
                        disabled={actionLoading}
                        className="flex items-center gap-2 px-3 py-1 text-sm text-green-600 hover:text-green-700"
                      >
                        <FaCheckCircle className="w-4 h-4" />
                        Mark Complete
                      </button>
                    )}
                    {(job.status === 'Pending' || job.status === 'In Progress') && (
                      <button
                        onClick={() => handleJobAction(job._id, 'cancel', { reason: 'Cancelled by user' })}
                        disabled={actionLoading}
                        className="flex items-center gap-2 px-3 py-1 text-sm text-red-600 hover:text-red-700"
                      >
                        <FaTimes className="w-4 h-4" />
                        Cancel
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
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedJob.title}</h3>
                  <p className="text-gray-600">{selectedJob.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Category</p>
                    <p className="font-medium">{selectedJob.category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Budget</p>
                    <p className="font-medium">
                      {formatCurrency(selectedJob.budget.min)} - {formatCurrency(selectedJob.budget.max)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-medium">
                      {selectedJob.location.address}, {selectedJob.location.city}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Preferred Date</p>
                    <p className="font-medium">{formatDate(selectedJob.preferredDate)}</p>
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
