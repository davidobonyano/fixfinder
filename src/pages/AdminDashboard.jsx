import { useEffect, useState } from 'react';
import {
  FiUsers,
  FiBriefcase,
  FiCheckCircle,
  FiMessageSquare,
  FiStar,
  FiTrendingUp,
  FiLoader,
  FiUserCheck,
  FiMail,
  FiArrowUp,
  FiArrowDown,
  FiRefreshCw,
  FiClock,
  FiX,
  FiCheck,
  FiUserPlus,
  FiSlash,
  FiUnlock,
  FiSearch,
  FiFilter,
  FiFlag,
  FiEye,
  FiXCircle
} from 'react-icons/fi';
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

  const StatCard = ({ title, value, icon: Icon, color = 'trust', subtitle }) => (
    <div className="card-premium p-8 bg-white">
      <div className="flex items-start justify-between">
        <div>
          <label className="label-caps mb-4 block">{title}</label>
          <p className="text-4xl font-tight font-bold text-charcoal">{value}</p>
          {subtitle && <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-2">{subtitle}</p>}
        </div>
        <div className="p-3 bg-stone-50 border border-stone-200">
          <Icon className="w-5 h-5 text-trust" />
        </div>
      </div>
    </div>
  );

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="text-center">
          <FiLoader className="w-12 h-12 animate-spin text-trust mx-auto mb-4" />
          <p className="font-tight text-lg text-graphite">Synchronizing data...</p>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full card-premium p-8 text-center bg-white">
          <div className="w-16 h-16 bg-clay/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiX className="w-8 h-8 text-clay" />
          </div>
          <h2 className="text-2xl font-tight font-bold text-charcoal mb-4">Connection Error</h2>
          <p className="text-graphite mb-8">{error}</p>
          <button
            onClick={loadStats}
            className="btn-primary w-full"
          >
            Retry Synchronization
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
    <div className="space-y-12">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-stone-200">
        <div>
          <label className="label-caps mb-4 block">System Administration</label>
          <h1 className="text-4xl lg:text-5xl font-tight font-bold text-charcoal leading-tight">
            FindYourFixer Central.
          </h1>
          <p className="mt-4 text-lg text-graphite max-w-xl">
            {lastUpdated && `Last synchronized at ${lastUpdated.toLocaleTimeString()}. Monitor platform health and user activity.`}
          </p>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="btn-primary flex items-center gap-2"
        >
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>REFRESH DATA</span>
        </button>
      </section>

      {/* Metrics Grids */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Ecosystem"
          value={formatNumber(stats?.users?.total || 0)}
          icon={FiUsers}
          subtitle={`${stats?.users?.customers || 0} Members / ${stats?.users?.professionals || 0} Pros`}
        />
        <StatCard
          title="Active Projects"
          value={formatNumber(stats?.jobs?.active || 0)}
          icon={FiClock}
          subtitle={`${stats?.jobs?.pending || 0} awaiting assignment`}
        />
        <StatCard
          title="Completed Work"
          value={formatNumber(stats?.jobs?.completed || 0)}
          icon={FiCheckCircle}
          subtitle={`${completionRate}% success rate`}
        />
        <StatCard
          title="Avg Feedback"
          value={stats?.reviews?.averageRating?.toFixed(1) || '0.0'}
          icon={FiStar}
          subtitle={`Based on ${stats?.reviews?.total || 0} verified reviews`}
        />
      </section>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* User Base Analytics */}
        <section className="card-premium p-8 bg-white">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-stone-200">
            <h3 className="text-xl font-tight font-bold uppercase tracking-tight">Membership Analytics</h3>
            <FiUsers className="text-stone-300 w-5 h-5" />
          </div>
          <div className="space-y-6">
            {[
              { label: 'Total Verified Members', value: stats?.users?.total || 0 },
              { label: 'Active Service Providers', value: stats?.users?.professionals || 0 },
              { label: 'Regular Customers', value: stats?.users?.customers || 0 },
              { label: 'New Signups (24h)', value: stats?.users?.growth?.today || 0, highlight: true },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-stone-50 last:border-0">
                <span className="text-sm text-graphite font-medium">{item.label}</span>
                <span className={`text-lg font-bold ${item.highlight ? 'text-trust' : 'text-charcoal'}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Job System Analytics */}
        <section className="card-premium p-8 bg-white">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-stone-200">
            <h3 className="text-xl font-tight font-bold uppercase tracking-tight">Operation Health</h3>
            <FiBriefcase className="text-stone-300 w-5 h-5" />
          </div>
          <div className="space-y-6">
            {[
              { label: 'Platform Completion Rate', value: `${completionRate}%` },
              { label: 'Total Jobs Processed', value: stats?.jobs?.total || 0 },
              { label: 'Current Ongoing Tasks', value: stats?.jobs?.active || 0 },
              { label: 'Cancelled Engagements', value: stats?.jobs?.cancelled || 0, warn: true },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-stone-50 last:border-0">
                <span className="text-sm text-graphite font-medium">{item.label}</span>
                <span className={`text-lg font-bold ${item.warn ? 'text-clay' : 'text-charcoal'}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Connectivity & Engagement */}
      <section className="bg-stone-50 border-y border-stone-200 -mx-4 lg:-mx-12 px-4 lg:px-12 py-12">
        <label className="label-caps mb-8 block text-center">Engagement Metrics</label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 border border-stone-200">
            <label className="label-caps !text-[9px] mb-4 block">Messaging Volume</label>
            <div className="text-3xl font-tight font-bold text-charcoal mb-2">{stats?.communication?.messages || 0}</div>
            <p className="text-xs text-graphite">Total platform messages exchanged</p>
          </div>
          <div className="bg-white p-6 border border-stone-200">
            <label className="label-caps !text-[9px] mb-4 block">Active Conversations</label>
            <div className="text-3xl font-tight font-bold text-charcoal mb-2">{stats?.communication?.activeConversations || 0}</div>
            <p className="text-xs text-graphite">Ongoing chat sessions currently active</p>
          </div>
          <div className="bg-white p-6 border border-stone-200">
            <label className="label-caps !text-[9px] mb-4 block">System Reviews</label>
            <div className="text-3xl font-tight font-bold text-charcoal mb-2">{stats?.reviews?.total || 0}</div>
            <p className="text-xs text-graphite">Total service reviews published</p>
          </div>
        </div>
      </section>

      {/* Registry Management */}
      <section className="space-y-8">
        <div className="flex items-center justify-between pb-4 border-b border-stone-200">
          <h3 className="text-xl font-tight font-bold uppercase tracking-tight">Member Registry</h3>
          <div className="flex gap-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search repository..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-stone-200 text-sm focus:outline-none focus:border-charcoal min-w-[240px]"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 bg-white border border-stone-200 text-sm focus:outline-none"
            >
              <option value="">All Roles</option>
              <option value="customer">Customers</option>
              <option value="professional">Professionals</option>
            </select>
          </div>
        </div>

        {usersLoading ? (
          <div className="flex justify-center p-12"><FiLoader className="w-6 h-6 animate-spin text-stone-300" /></div>
        ) : (
          <div className="card-premium overflow-hidden bg-white">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  <th className="px-6 py-4 label-caps !text-[9px]">Identity</th>
                  <th className="px-6 py-4 label-caps !text-[9px]">Classification</th>
                  <th className="px-6 py-4 label-caps !text-[9px]">Status</th>
                  <th className="px-6 py-4 label-caps !text-[9px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-charcoal">{user.name}</div>
                      <div className="text-xs text-stone-400">{user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-stone-100 text-stone-600 border border-stone-200">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.accountStatus?.isBanned ? (
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-red-50 text-red-700 border border-red-200">BANNED</span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-trust/5 text-trust border border-trust/20">ACTIVE</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user.role !== 'admin' && (
                        user.accountStatus?.isBanned ? (
                          <button onClick={() => handleUnban(user._id)} className="text-[10px] font-bold uppercase tracking-widest text-trust hover:underline">REVOKE BAN</button>
                        ) : (
                          <button onClick={() => setBanModal({ open: true, user })} className="text-[10px] font-bold uppercase tracking-widest text-clay hover:underline">RESTRICT</button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Incident Reports */}
      <section className="space-y-8">
        <div className="flex items-center justify-between pb-4 border-b border-stone-200">
          <h3 className="text-xl font-tight font-bold uppercase tracking-tight">Trust & Safety Queue</h3>
          <div className="flex gap-4">
            <select
              value={reportStatusFilter}
              onChange={(e) => setReportStatusFilter(e.target.value)}
              className="px-4 py-2 bg-white border border-stone-200 text-sm focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
        </div>

        {reportsLoading ? (
          <div className="flex justify-center p-12"><FiLoader className="w-6 h-6 animate-spin text-stone-300" /></div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report._id} className="card-premium p-6 bg-white border-l-4 border-l-stone-300 hover:border-l-trust transition-all">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 ${report.status === 'pending' ? 'bg-clay/5 text-clay border border-clay/20' : 'bg-trust/5 text-trust border border-trust/20'
                        }`}>
                        {report.status}
                      </span>
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{new Date(report.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <h4 className="text-lg font-tight font-bold text-charcoal mb-1">{report.reason}</h4>
                      <p className="text-sm text-graphite leading-relaxed">{report.description || 'No detailed description provided.'}</p>
                    </div>
                    <div className="flex gap-8">
                      <div>
                        <label className="label-caps !text-[8px] mb-1 block">Subject</label>
                        <div className="text-xs font-bold text-charcoal">{report.reportedUser?.name} ({report.reportedUser?.role})</div>
                      </div>
                      <div>
                        <label className="label-caps !text-[8px] mb-1 block">Reporter</label>
                        <div className="text-xs font-bold text-charcoal">{report.reportedBy?.name}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row md:flex-col gap-2 justify-end">
                    {report.status === 'pending' && (
                      <>
                        <button onClick={() => handleUpdateReportStatus(report._id, 'resolved')} className="px-4 py-2 bg-trust text-white text-[10px] font-bold uppercase tracking-widest">RESOLVE</button>
                        <button onClick={() => setBanModal({ open: true, user: report.reportedUser })} className="px-4 py-2 bg-clay text-white text-[10px] font-bold uppercase tracking-widest">BAN SUBJECT</button>
                        <button onClick={() => handleUpdateReportStatus(report._id, 'dismissed')} className="px-4 py-2 border border-stone-200 text-charcoal text-[10px] font-bold uppercase tracking-widest hover:border-charcoal">DISMISS</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Ban Modal */}
      {banModal.open && (
        <div className="fixed inset-0 bg-charcoal/20 backdrop-blur-sm flex items-center justify-center z-[100] p-6">
          <div className="card-premium p-10 bg-white max-w-lg w-full shadow-2xl">
            <label className="label-caps mb-4 block">Enforcement Action</label>
            <h3 className="text-2xl font-tight font-bold text-charcoal mb-8">Restricting: {banModal.user?.name}</h3>

            <div className="space-y-6">
              <div>
                <label className="label-caps !text-[9px] mb-2 block">Reason for Exclusion</label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Official reason for system restriction..."
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-charcoal min-h-[120px]"
                />
              </div>
              <div>
                <label className="label-caps !text-[9px] mb-2 block">Duration (Optional)</label>
                <input
                  type="datetime-local"
                  value={banExpiresAt}
                  onChange={(e) => setBanExpiresAt(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-charcoal"
                />
              </div>
              <div className="flex gap-4 pt-6">
                <button
                  onClick={() => setBanModal({ open: false, user: null })}
                  className="flex-1 py-4 border border-stone-200 text-[11px] font-bold uppercase tracking-widest hover:border-charcoal"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleBan}
                  className="flex-1 py-4 bg-clay text-white text-[11px] font-bold uppercase tracking-widest"
                >
                  {banExpiresAt ? 'EXECUTE TEMPORARY BAN' : 'EXECUTE PERMANENT BAN'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
