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
  FaUserFriends
} from 'react-icons/fa';
import { getAdminStats } from '../utils/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

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

  const StatCard = ({ title, value, icon: Icon, color = 'blue', trend, subtitle }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? <FaArrowUp className="w-3 h-3" /> : <FaArrowDown className="w-3 h-3" />}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`w-8 h-8 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaTimes className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadStats}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">FixFinder Admin Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                {lastUpdated && `Last updated: ${lastUpdated.toLocaleTimeString()}`}
              </p>
            </div>
            <button
              onClick={loadStats}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <FaSync className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaBriefcase className="w-5 h-5 text-green-600" />
            Job Analytics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{stats?.jobs?.total || 0}</p>
              <p className="text-sm text-gray-600 mt-1">Total Jobs</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{stats?.jobs?.active || 0}</p>
              <p className="text-sm text-gray-600 mt-1">Active</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{stats?.jobs?.completed || 0}</p>
              <p className="text-sm text-gray-600 mt-1">Completed</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{stats?.jobs?.cancelled || 0}</p>
              <p className="text-sm text-gray-600 mt-1">Cancelled</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{completionRate}%</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">Jobs This Week</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.jobs?.growth?.thisWeek || 0}</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">Jobs This Month</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.jobs?.growth?.thisMonth || 0}</p>
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaChartLine className="w-5 h-5 text-green-600" />
            Growth Metrics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">New Users Today</p>
              <p className="text-2xl font-bold text-green-600">{stats?.users?.growth?.today || 0}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">New Users This Week</p>
              <p className="text-2xl font-bold text-blue-600">{stats?.users?.growth?.thisWeek || 0}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600">New Users This Month</p>
              <p className="text-2xl font-bold text-purple-600">{stats?.users?.growth?.thisMonth || 0}</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600">Jobs This Week</p>
              <p className="text-2xl font-bold text-orange-600">{stats?.jobs?.growth?.thisWeek || 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
