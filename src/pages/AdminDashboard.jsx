import { useEffect, useState } from 'react';
import { 
  FaUsers, 
  FaUserTie, 
  FaBriefcase, 
  FaCheckCircle, 
  FaComments, 
  FaStar,
  FaChartLine,
  FaSpinner,
  FaUserCheck,
  FaEnvelope,
  FaArrowUp,
  FaArrowDown,
  FaSync,
  FaClock,
  FaTimes,
  FaCheck,
  FaUserFriends,
  FaBan,
  FaUnlock,
  FaSearch,
  FaFilter,
  FaFlag,
  FaEye,
  FaCheckCircle as FaCheckCircleIcon,
  FaTimesCircle
} from 'react-icons/fa';
import { getAdminStats, getAllUsers, banUser, unbanUser, getAllReports, updateReportStatus, getPendingReportsCount } from '../utils/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // User management state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [bannedFilter, setBannedFilter] = useState('');
  const [banModal, setBanModal] = useState({ open: false, user: null });
  const [banReason, setBanReason] = useState('');
  const [banExpiresAt, setBanExpiresAt] = useState('');
  
  // Reports state
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportStatusFilter, setReportStatusFilter] = useState('');
  const [reportSearch, setReportSearch] = useState('');
  const [pendingReportsCount, setPendingReportsCount] = useState(0);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAdminStats();
      if (response.success) {
        setStats(response.data);
        setLastUpdated(new Date());
      } else {
        setError('Failed to load stats');
      }
    } catch (err) {
      console.error('Error loading admin stats:', err);
      setError(err.message || 'Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
  };

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (roleFilter) params.role = roleFilter;
      if (bannedFilter) params.banned = bannedFilter;
      
      const response = await getAllUsers(params);
      if (response.success) {
        setUsers(response.data || []);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleBan = async () => {
    if (!banModal.user) return;
    try {
      const response = await banUser(banModal.user._id, {
        reason: banReason || 'Violation of Terms and Conditions',
        expiresAt: banExpiresAt || null
      });
      if (response.success) {
        setBanModal({ open: false, user: null });
        setBanReason('');
        setBanExpiresAt('');
        loadUsers();
        loadReports();
        loadPendingCount();
        loadStats();
      }
    } catch (err) {
      alert(err.message || 'Failed to ban user');
    }
  };

  const handleUnban = async (userId) => {
    if (!confirm('Are you sure you want to unban this user?')) return;
    try {
      const response = await unbanUser(userId);
      if (response.success) {
        loadUsers();
        loadStats();
      }
    } catch (err) {
      alert(err.message || 'Failed to unban user');
    }
  };

  useEffect(() => {
    loadUsers();
  }, [searchQuery, roleFilter, bannedFilter]);

  const loadReports = async () => {
    try {
      setReportsLoading(true);
      const params = {};
      if (reportStatusFilter) params.status = reportStatusFilter;
      if (reportSearch) params.search = reportSearch;
      
      const response = await getAllReports(params);
      if (response.success) {
        setReports(response.data || []);
      }
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setReportsLoading(false);
    }
  };

  const loadPendingCount = async () => {
    try {
      const response = await getPendingReportsCount();
      if (response.success) {
        setPendingReportsCount(response.count || 0);
      }
    } catch (err) {
      console.error('Error loading pending count:', err);
    }
  };

  const handleUpdateReportStatus = async (reportId, status) => {
    try {
      const response = await updateReportStatus(reportId, { status });
      if (response.success) {
        loadReports();
        loadPendingCount();
      }
    } catch (err) {
      alert(err.message || 'Failed to update report status');
    }
  };

  const handleBanFromReport = (report) => {
    if (report.reportedUser) {
      setBanModal({ open: true, user: report.reportedUser });
    }
  };

  useEffect(() => {
    loadReports();
    loadPendingCount();
  }, [reportStatusFilter, reportSearch]);

  const StatCard = ({ title, value, icon: Icon, color = 'blue', trend, subtitle }) => (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${trend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {trend > 0 ? <FaArrowUp className="w-3 h-3" /> : <FaArrowDown className="w-3 h-3" />}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full bg-${color}-100 dark:bg-${color}-900/20`}>
          <Icon className={`w-8 h-8 text-${color}-600 dark:text-${color}-400`} />
        </div>
      </div>
    </div>
  );

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="w-12 h-12 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaTimes className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={loadStats}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const completionRate = stats?.jobs?.completionRate || 0;
  const activeUsersPercentage = stats?.users?.total > 0 
    ? ((stats.users.activeLast24h / stats.users.total) * 100).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">FindYourFixer Admin Dashboard</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {lastUpdated && `Last updated: ${lastUpdated.toLocaleTimeString()}`}
              </p>
            </div>
            <button
              onClick={loadStats}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              <FaSync className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={formatNumber(stats?.users?.total || 0)}
            icon={FaUsers}
            color="blue"
            subtitle={`${stats?.users?.customers || 0} customers, ${stats?.users?.professionals || 0} pros`}
          />
          <StatCard
            title="Professionals"
            value={formatNumber(stats?.professionals?.total || 0)}
            icon={FaUserTie}
            color="purple"
            subtitle={`${stats?.professionals?.verified || 0} verified`}
          />
          <StatCard
            title="Total Jobs"
            value={formatNumber(stats?.jobs?.total || 0)}
            icon={FaBriefcase}
            color="green"
            subtitle={`${stats?.jobs?.completed || 0} completed`}
          />
          <StatCard
            title="Active Jobs"
            value={formatNumber(stats?.jobs?.active || 0)}
            icon={FaClock}
            color="orange"
            subtitle={`${stats?.jobs?.pending || 0} pending`}
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Completed Jobs"
            value={formatNumber(stats?.jobs?.completed || 0)}
            icon={FaCheckCircle}
            color="green"
            subtitle={`${completionRate}% completion rate`}
          />
          <StatCard
            title="Messages"
            value={formatNumber(stats?.communication?.messages || 0)}
            icon={FaComments}
            color="blue"
            subtitle={`${stats?.communication?.messagesToday || 0} today`}
          />
          <StatCard
            title="Conversations"
            value={formatNumber(stats?.communication?.conversations || 0)}
            icon={FaEnvelope}
            color="purple"
            subtitle={`${stats?.communication?.activeConversations || 0} active`}
          />
          <StatCard
            title="Average Rating"
            value={stats?.reviews?.averageRating?.toFixed(1) || '0.0'}
            icon={FaStar}
            color="yellow"
            subtitle={`${stats?.reviews?.total || 0} reviews`}
          />
        </div>

        {/* Detailed Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* User Analytics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FaUsers className="w-5 h-5 text-blue-600" />
              User Analytics
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Total Users</span>
                <span className="font-semibold">{stats?.users?.total || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Customers</span>
                <span className="font-semibold">{stats?.users?.customers || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Professionals</span>
                <span className="font-semibold">{stats?.users?.professionals || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Email Verified</span>
                <span className="font-semibold">{stats?.users?.verified || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Active (24h)</span>
                <span className="font-semibold">{stats?.users?.activeLast24h || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">New Today</span>
                <span className="font-semibold text-green-600">{stats?.users?.growth?.today || 0}</span>
              </div>
            </div>
          </div>

          {/* Professional Analytics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FaUserTie className="w-5 h-5 text-purple-600" />
              Professional Analytics
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Total Professionals</span>
                <span className="font-semibold">{stats?.professionals?.total || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Verified</span>
                <span className="font-semibold text-green-600">{stats?.professionals?.verified || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Active</span>
                <span className="font-semibold">{stats?.professionals?.active || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Complete Profiles</span>
                <span className="font-semibold">{stats?.professionals?.withCompleteProfile || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Job Analytics */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FaBriefcase className="w-5 h-5 text-green-600 dark:text-green-400" />
            Job Analytics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.jobs?.total || 0}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Total Jobs</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/50">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats?.jobs?.active || 0}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Active</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800/50">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats?.jobs?.completed || 0}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Completed</p>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800/50">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats?.jobs?.cancelled || 0}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Cancelled</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-300">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{completionRate}%</p>
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-300">Jobs This Week</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.jobs?.growth?.thisWeek || 0}</p>
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-300">Jobs This Month</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.jobs?.growth?.thisMonth || 0}</p>
            </div>
          </div>
        </div>

        {/* Engagement Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FaComments className="w-5 h-5 text-blue-600" />
              Communication
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Total Conversations</span>
                <span className="font-semibold">{stats?.communication?.conversations || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Total Messages</span>
                <span className="font-semibold">{stats?.communication?.messages || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Messages Today</span>
                <span className="font-semibold text-blue-600">{stats?.communication?.messagesToday || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Active Conversations</span>
                <span className="font-semibold">{stats?.communication?.activeConversations || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FaUserFriends className="w-5 h-5 text-purple-600" />
              Connections & Reviews
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Total Connections</span>
                <span className="font-semibold">{stats?.connections?.total || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Pending Requests</span>
                <span className="font-semibold">{stats?.connections?.pending || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">This Week</span>
                <span className="font-semibold">{stats?.connections?.thisWeek || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Total Reviews</span>
                <span className="font-semibold">{stats?.reviews?.total || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Average Rating</span>
                <span className="font-semibold text-yellow-600">{stats?.reviews?.averageRating?.toFixed(1) || '0.0'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Reviews This Month</span>
                <span className="font-semibold">{stats?.reviews?.thisMonth || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Growth Metrics */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FaChartLine className="w-5 h-5 text-green-600 dark:text-green-400" />
            Growth Metrics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800/50">
              <p className="text-sm text-gray-600 dark:text-gray-300">New Users Today</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats?.users?.growth?.today || 0}</p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/50">
              <p className="text-sm text-gray-600 dark:text-gray-300">New Users This Week</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats?.users?.growth?.thisWeek || 0}</p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800/50">
              <p className="text-sm text-gray-600 dark:text-gray-300">New Users This Month</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats?.users?.growth?.thisMonth || 0}</p>
            </div>
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-800/50">
              <p className="text-sm text-gray-600 dark:text-gray-300">Jobs This Week</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats?.jobs?.growth?.thisWeek || 0}</p>
            </div>
          </div>
        </div>

        {/* User Management Section */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FaUsers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              User Management
            </h2>
            <button
              onClick={loadUsers}
              className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg flex items-center gap-2 transition-colors"
            >
              <FaSync className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">All Roles</option>
              <option value="customer">Customer</option>
              <option value="professional">Professional</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={bannedFilter}
              onChange={(e) => setBannedFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">All Users</option>
              <option value="false">Active</option>
              <option value="true">Banned</option>
            </select>
          </div>

          {/* Users Table */}
          {usersLoading ? (
            <div className="text-center py-8">
              <FaSpinner className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-400">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Role</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{user.name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">{user.email}</td>
                      <td className="py-3 px-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                          user.role === 'professional' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                          'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {user.accountStatus?.isBanned ? (
                          <div>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                              Banned
                            </span>
                            {user.accountStatus.banReason && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Reason: {user.accountStatus.banReason}</p>
                            )}
                            {user.accountStatus.banExpiresAt && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">Expires: {new Date(user.accountStatus.banExpiresAt).toLocaleDateString()}</p>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {user.role !== 'admin' && (
                          <div className="flex items-center gap-2">
                            {user.accountStatus?.isBanned ? (
                              <button
                                onClick={() => handleUnban(user._id)}
                                className="px-3 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-900/50 flex items-center gap-1 transition-colors"
                              >
                                <FaUnlock className="w-3 h-3" />
                                Unban
                              </button>
                            ) : (
                              <button
                                onClick={() => setBanModal({ open: true, user })}
                                className="px-3 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center gap-1 transition-colors"
                              >
                                <FaBan className="w-3 h-3" />
                                Ban
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reports Section */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FaFlag className="w-5 h-5 text-red-600 dark:text-red-400" />
                User Reports
              </h2>
              {pendingReportsCount > 0 && (
                <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-semibold">
                  {pendingReportsCount} Pending
                </span>
              )}
            </div>
            <button
              onClick={() => {
                loadReports();
                loadPendingCount();
              }}
              className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg flex items-center gap-2 transition-colors"
            >
              <FaSync className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Report Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search reports..."
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <select
              value={reportStatusFilter}
              onChange={(e) => setReportStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>

          {/* Reports Table */}
          {reportsLoading ? (
            <div className="text-center py-8">
              <FaSpinner className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-400">Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">No reports found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Reported User</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Reported By</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Reason</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                        <div>
                          <p className="font-medium">{report.reportedUser?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{report.reportedUser?.email}</p>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                            report.reportedUser?.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                            report.reportedUser?.role === 'professional' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                            'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}>
                            {report.reportedUser?.role || 'N/A'}
                          </span>
                          {report.reportedUser?.accountStatus?.isBanned && (
                            <span className="ml-1 inline-block px-2 py-0.5 rounded text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                              Banned
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                        <div>
                          <p className="font-medium">{report.reportedBy?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{report.reportedBy?.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                        <div>
                          <p className="font-medium">{report.reason}</p>
                          {report.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{report.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          report.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                          report.status === 'reviewed' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                          report.status === 'resolved' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                          'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                          {report.status === 'pending' && report.reportedUser && report.reportedUser.role !== 'admin' && (
                            <button
                              onClick={() => handleBanFromReport(report)}
                              className="px-3 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center gap-1 transition-colors"
                            >
                              <FaBan className="w-3 h-3" />
                              Ban User
                            </button>
                          )}
                          {report.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateReportStatus(report._id, 'reviewed')}
                                className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 flex items-center gap-1 transition-colors"
                              >
                                <FaEye className="w-3 h-3" />
                                Review
                              </button>
                              <button
                                onClick={() => handleUpdateReportStatus(report._id, 'resolved')}
                                className="px-3 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-900/50 flex items-center gap-1 transition-colors"
                              >
                                <FaCheckCircleIcon className="w-3 h-3" />
                                Resolve
                              </button>
                              <button
                                onClick={() => handleUpdateReportStatus(report._id, 'dismissed')}
                                className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1 transition-colors"
                              >
                                <FaTimesCircle className="w-3 h-3" />
                                Dismiss
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Ban Modal */}
      {banModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Ban User: {banModal.user?.name}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ban Reason (optional)
                </label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Violation of Terms and Conditions"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ban Expires (optional - leave empty for permanent ban)
                </label>
                <input
                  type="datetime-local"
                  value={banExpiresAt}
                  onChange={(e) => setBanExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty for permanent ban</p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setBanModal({ open: false, user: null });
                    setBanReason('');
                    setBanExpiresAt('');
                  }}
                  className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBan}
                  className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg"
                >
                  {banExpiresAt ? 'Ban Temporarily' : 'Ban Permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
