import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiBell,
  FiUser,
  FiBriefcase,
  FiMessageSquare,
  FiStar,
  FiDollarSign,
  FiClock,
  FiCheckCircle,
  FiAlertTriangle,
  FiEye,
  FiPlus,
  FiTrendingUp,
  FiMapPin,
  FiArrowRight,
  FiShield
} from 'react-icons/fi';
import { useAuth } from '../../context/useAuth';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import { getMyJobs, getNotifications, getProfessional } from '../../utils/api';

const ProfessionalDashboard = () => {
  const { user, logout } = useAuth();
  const { socket, isConnected, emit } = useSocket();
  const { error: showError } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    totalEarnings: 0,
    rating: 0,
    reviewCount: 0
  });
  const [recentJobs, setRecentJobs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSharingLocation, setIsSharingLocation] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'professional') {
      navigate('/dashboard');
      return;
    }
    loadDashboardData();
  }, [user, navigate]);

  const toggleLocationSharing = () => {
    setIsSharingLocation(!isSharingLocation);
    if (socket && isConnected) {
      emit('shareLocation', {
        userId: user?.id,
        isSharing: !isSharingLocation
      });
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const jobsResponse = await getMyJobs({ limit: 4 });
      if (jobsResponse.success) {
        const jobs = jobsResponse.data.jobs || [];
        setRecentJobs(jobs.map(job => ({
          id: job._id,
          title: job.title,
          client: job.client?.name || 'Private Client',
          status: job.status,
          date: new Date(job.createdAt).toLocaleDateString(),
          budget: job.budget ? `₦${job.budget.min?.toLocaleString()}` : 'Negotiable'
        })));

        setStats(prev => ({
          ...prev,
          totalJobs: jobsResponse.data.pagination?.total || 0,
          activeJobs: jobs.filter(j => j.status === 'In Progress').length,
          completedJobs: jobs.filter(j => j.status === 'Completed').length
        }));
      }

      if (user?.id) {
        const proResponse = await getProfessional(user.id, { byUser: true });
        if (proResponse.success) {
          setStats(prev => ({
            ...prev,
            rating: proResponse.data.ratingAvg || 0,
            reviewCount: proResponse.data.ratingCount || 0,
            totalEarnings: proResponse.data.totalEarnings || 0
          }));
        }
      }

      const notifResponse = await getNotifications({ limit: 3 });
      if (notifResponse.success) {
        setNotifications(notifResponse.data.notifications.map(n => ({
          id: n._id,
          message: n.message,
          time: n.age || 'Just now',
          unread: !n.isRead
        })));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const base = 'px-2 py-1 text-[9px] uppercase font-bold tracking-widest border';
    if (status === 'Completed') return `${base} text-trust bg-trust/5 border-trust/20`;
    if (status === 'In Progress') return `${base} text-clay bg-clay/5 border-clay/20`;
    return `${base} text-stone-500 bg-stone-100 border-stone-200`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <FiLoader className="w-12 h-12 animate-spin text-trust mb-4" />
        <p className="label-caps text-stone-400">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Header Area */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-stone-200">
        <div>
          <label className="label-caps mb-4 block">Professional Portal</label>
          <h1 className="text-4xl lg:text-5xl font-tight font-bold text-charcoal leading-tight">
            Work Status: {isSharingLocation ? 'Available' : 'Offline'}.
          </h1>
          <p className="mt-4 text-lg text-graphite max-w-xl">
            You have <span className="text-trust font-bold">{stats.activeJobs} active projects</span> and {notifications.filter(n => n.unread).length} unread updates.
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={toggleLocationSharing}
            className={`px-8 py-4 border font-bold text-[10px] tracking-widest uppercase transition-all rounded-xl ${isSharingLocation
              ? 'bg-trust text-white border-trust'
              : 'bg-white text-charcoal border-stone-200 hover:border-charcoal'
              }`}
          >
            {isSharingLocation ? 'STOP SHARING LOCATION' : 'GO LIVE ON MAP'}
          </button>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Platform Rating', value: stats.rating.toFixed(1), icon: FiStar, color: 'text-trust' },
          { label: 'Project Volume', value: stats.totalJobs, icon: FiBriefcase, color: 'text-charcoal' },
          { label: 'Active Tasks', value: stats.activeJobs, icon: FiClock, color: 'text-clay' },
          { label: 'Total Revenue', value: `₦${stats.totalEarnings.toLocaleString()}`, icon: FiDollarSign, color: 'text-trust' },
        ].map((stat, i) => (
          <div key={i} className="card-premium p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 bg-stone-50 border border-stone-100 rounded-2xl">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <div className="text-3xl font-tight font-bold mb-2">{stat.value}</div>
            <p className="label-caps !text-[9px] text-stone-400">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Jobs Column */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between pb-4 border-b border-stone-200">
            <h3 className="text-xl font-tight font-bold uppercase tracking-tight">Recent Project Feed</h3>
            <Link to="/dashboard/professional/my-jobs" className="label-caps hover:text-trust">Full history →</Link>
          </div>
          <div className="space-y-4">
            {recentJobs.length > 0 ? recentJobs.map((job) => (
              <div key={job.id} className="card-premium p-6 group hover:border-trust transition-all">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={getStatusBadge(job.status)}>{job.status}</span>
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{job.date}</span>
                    </div>
                    <h4 className="text-xl font-tight font-bold group-hover:text-trust transition-colors truncate">{job.title}</h4>
                    <div className="mt-2 flex items-center gap-4 text-sm text-graphite">
                      <span className="flex items-center gap-1"><FiUser className="w-3.5 h-3.5" /> {job.client}</span>
                      <span className="flex items-center gap-1"><FiDollarSign className="w-3.5 h-3.5" /> {job.budget}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/dashboard/professional/my-jobs/${job.id}`)}
                    className="p-3 border border-stone-200 hover:border-trust transition-colors"
                  >
                    <FiArrowRight />
                  </button>
                </div>
              </div>
            )) : (
              <div className="p-12 border border-dashed border-stone-300 text-center">
                <p className="text-graphite font-medium">No assigned projects yet.</p>
                <Link to="/dashboard/professional" className="mt-4 inline-block btn-secondary !py-2">Browse Job Feed</Link>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-12">
          {/* Notifications */}
          <section>
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-stone-200">
              <h3 className="text-sm font-bold uppercase tracking-widest">Updates</h3>
              <FiBell className="text-stone-300" />
            </div>
            <div className="space-y-6">
              {notifications.map((n) => (
                <div key={n.id} className="relative pl-6 before:absolute before:left-0 before:top-2 before:w-1 before:h-1 before:bg-trust">
                  <p className={`text-sm leading-relaxed ${n.unread ? 'font-bold text-charcoal' : 'text-graphite'}`}>
                    {n.message}
                  </p>
                  <p className="mt-2 text-[10px] font-bold text-stone-400 uppercase tracking-widest">{n.time}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Verification Status */}
          <section className="p-8 border border-stone-200 bg-stone-50">
            <FiShield className="w-8 h-8 text-trust mb-6" />
            <h4 className="text-lg font-tight font-bold mb-4">Verification Level 1</h4>
            <p className="text-sm text-graphite leading-relaxed mb-6">
              Your identity has been verified. To unlock larger projects and premium badge, complete your background check.
            </p>
            <button className="text-[10px] font-bold uppercase tracking-widest text-trust hover:underline">
              COMPLETE KYC →
            </button>
          </section>

          {/* Quick Links */}
          <section className="space-y-2">
            {[
              { label: 'View Public Profile', path: '/dashboard/professional/profile' },
              { label: 'Service Analytics', path: '/dashboard/professional/analytics' },
              { label: 'Payment Settings', path: '/dashboard/professional/settings' },
            ].map((link, i) => (
              <Link
                key={i}
                to={link.path}
                className="flex items-center justify-between p-4 bg-white border border-stone-200 hover:border-charcoal transition-all group"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest">{link.label}</span>
                <FiArrowRight className="w-3 h-3 text-stone-300 group-hover:text-charcoal" />
              </Link>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalDashboard;