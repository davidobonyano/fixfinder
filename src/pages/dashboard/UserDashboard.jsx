import { useState, useEffect } from 'react';
import { resolveImageUrl } from '../../utils/api';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiSearch,
  FiMapPin,
  FiStar,
  FiPlus,
  FiBriefcase,
  FiMessageSquare,
  FiBell,
  FiClock,
  FiCheckCircle,
  FiUser,
  FiArrowRight,
  FiShield,
  FiTrendingUp,
  FiLoader
} from 'react-icons/fi';
import { useAuth } from '../../context/useAuth';
import { getMyJobs, getProfessionals, getNotifications, saveLocation } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { getCurrentLocation } from '../../utils/locationUtils';
import ServiceSelector from '../../components/ServiceSelector';

const UserDashboard = () => {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const { error: showError, success: showSuccess } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [nearbyPros, setNearbyPros] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0
  });
  const [loading, setLoading] = useState(true);
  const [updatingLocation, setUpdatingLocation] = useState(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const jobsResponse = await getMyJobs({ limit: 3 });
        if (jobsResponse.success) {
          setRecentJobs(jobsResponse.data.jobs.map(job => ({
            id: job._id,
            title: job.title,
            status: job.status,
            date: new Date(job.createdAt).toLocaleDateString(),
            pro: job.professional?.name || null,
            category: job.category,
            budget: `₦${job.budget.min.toLocaleString()} - ₦${job.budget.max.toLocaleString()}`
          })));

          const totalJobs = jobsResponse.data.pagination.total;
          const activeJobs = jobsResponse.data.jobs.filter(job => job.status === 'In Progress').length;
          const completedJobs = jobsResponse.data.jobs.filter(job => job.status === 'Completed').length;

          setStats({ totalJobs, activeJobs, completedJobs });
        }

        const prosResponse = await getProfessionals({ limit: 3 });
        if (prosResponse.success) {
          setNearbyPros(prosResponse.professionals.map(pro => ({
            id: pro._id,
            name: pro.name,
            service: pro.category,
            rating: pro.rating || 0,
            distance: 'Nearby',
            verified: pro.isVerified || false,
            image: resolveImageUrl(pro.user?.profilePicture || pro.profilePicture)
          })));
        }

        const notificationsResponse = await getNotifications({ limit: 3 });
        if (notificationsResponse.success) {
          setNotifications(notificationsResponse.data.notifications.map(notif => ({
            id: notif._id,
            message: notif.message,
            time: notif.age || 'Just now',
            unread: !notif.isRead,
            type: notif.type
          })));
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  const handleSearch = (service) => {
    if (service.trim()) {
      navigate(`/dashboard/professionals?search=${encodeURIComponent(service)}`);
    }
  };

  const getStatusBadge = (status = '') => {
    const base = 'px-3 py-1 text-[10px] uppercase font-bold tracking-widest border transition-colors';
    const styles = {
      'Completed': `${base} text-trust bg-trust/5 border-trust/20`,
      'In Progress': `${base} text-white bg-charcoal border-charcoal`,
      'Pending': `${base} text-stone-500 bg-stone-50 border-stone-200`,
      'Cancelled': `${base} text-clay bg-clay/5 border-clay/20`,
    };
    return styles[status] || styles['Pending'];
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <FiLoader className="w-10 h-10 animate-spin text-trust mb-4" />
        <p className="label-caps text-stone-400 tracking-widest text-[10px]">Synchronizing Workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Welcome Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-stone-200">
        <div>
          <label className="label-caps mb-4 block">Dashboard Overview</label>
          <h1 className="text-4xl lg:text-5xl font-tight font-bold text-charcoal leading-tight">
            Greetings, {user?.name?.split(' ')[0] || 'Member'}.
          </h1>
          <p className="mt-4 text-lg text-graphite max-w-xl">
            You have <span className="text-trust font-bold">{stats.activeJobs} active requests</span> currently being serviced in your area.
          </p>
        </div>
        <div className="flex gap-4">
          <Link to="/dashboard/post-job" className="btn-primary flex items-center gap-2">
            <FiPlus className="w-5 h-5" />
            <span>POST NEW REQUEST</span>
          </Link>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Services', value: stats.totalJobs, icon: FiBriefcase },
          { label: 'Ongoing Work', value: stats.activeJobs, icon: FiTrendingUp },
          { label: 'Verified Complete', value: stats.completedJobs, icon: FiCheckCircle },
        ].map((stat, i) => (
          <div key={i} className="card-premium p-8">
            <div className="flex items-start justify-between">
              <div className="p-3 bg-stone-50 border border-stone-200">
                <stat.icon className="w-5 h-5 text-trust" />
              </div>
              <span className="text-4xl font-tight font-bold">{stat.value}</span>
            </div>
            <p className="mt-6 label-caps">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* Main Search & Location */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-premium p-8 flex flex-col justify-between">
          <div>
            <label className="label-caps mb-6 block">Service Directory</label>
            <h2 className="text-2xl font-tight font-bold mb-8">What help do you need today?</h2>
            <div className="flex flex-col sm:flex-row gap-0">
              <div className="flex-1">
                <ServiceSelector
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="e.g. Electrician, Plumber..."
                  className="rounded-none border-stone-200 h-14"
                />
              </div>
              <button
                onClick={() => handleSearch(searchQuery)}
                className="bg-charcoal text-white px-8 h-14 font-bold uppercase tracking-widest text-[11px] hover:bg-trust transition-colors sm:border-l-0"
              >
                FIND PROS
              </button>
            </div>
          </div>
        </div>

        <div className="card-premium p-8 bg-stone-50">
          <label className="label-caps mb-6 block">Service Context</label>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white border border-stone-200">
              <FiMapPin className="w-5 h-5 text-trust" />
            </div>
            <div>
              <p className="text-xl font-tight font-bold">{user?.location?.city || 'Lagos State'}</p>
              <p className="text-sm text-graphite mb-6">{user?.location?.lga || 'Mainland LGA'}</p>
              <button
                onClick={() => navigate('/dashboard/profile')}
                className="text-[10px] font-bold uppercase tracking-widest text-trust hover:underline"
              >
                UPDATE LOCATION →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Dual Lists */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-8">
        {/* Recent Jobs Column */}
        <div>
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-stone-200">
            <h3 className="text-xl font-tight font-bold uppercase tracking-tight">Active Requests</h3>
            <Link to="/dashboard/my-jobs" className="label-caps hover:text-trust">View Archive →</Link>
          </div>
          <div className="space-y-4">
            {recentJobs.length > 0 ? recentJobs.map((job) => (
              <Link
                key={job.id}
                to={`/dashboard/my-jobs/${job.id}`}
                className="block p-6 card-premium hover:border-trust group"
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className={getStatusBadge(job.status)}>{job.status}</span>
                    <h4 className="mt-4 text-xl font-tight font-bold group-hover:text-trust transition-colors">{job.title}</h4>
                    <p className="text-sm text-graphite mt-1">{job.category} • {job.budget}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{job.date}</p>
                  </div>
                </div>
              </Link>
            )) : (
              <div className="p-12 border border-dashed border-stone-300 text-center">
                <FiBriefcase className="w-8 h-8 mx-auto mb-4 text-stone-300" />
                <p className="text-sm text-graphite">No active requests found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Nearby Professionals Column */}
        <div>
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-stone-200">
            <h3 className="text-xl font-tight font-bold uppercase tracking-tight">Recommended pros</h3>
            <Link to="/dashboard/professionals" className="label-caps hover:text-trust">Complete list →</Link>
          </div>
          <div className="space-y-4">
            {nearbyPros.length > 0 ? nearbyPros.map((pro) => (
              <Link
                key={pro.id}
                to={`/dashboard/professional/${pro.id}`}
                className="block p-6 card-premium hover:border-trust group cursor-pointer"
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-stone-100 overflow-hidden border border-stone-200 flex-shrink-0 rounded-2xl">
                    {pro.image ? (
                      <img src={pro.image} alt="" className="w-full h-full object-cover transition-all hover:scale-110" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-300"><FiUser size={24} /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-tight font-bold truncate group-hover:text-trust transition-colors">{pro.name}</h4>
                      {pro.verified && <FiShield className="text-trust w-4 h-4" title="Verified Professional" />}
                    </div>
                    <p className="text-sm text-graphite">{pro.service}</p>
                    <div className="mt-3 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                      <span className="flex items-center gap-1 text-trust"><FiStar /> {pro.rating}</span>
                      <span>LOCAL PRO</span>
                    </div>
                  </div>
                  <div className="p-3 border border-stone-200 rounded-2xl group-hover:bg-trust group-hover:border-trust transition-all">
                    <FiArrowRight size={18} className="text-charcoal group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            )) : (
              <div className="p-12 border border-dashed border-stone-300 text-center">
                <FiUser className="w-8 h-8 mx-auto mb-4 text-stone-300" />
                <p className="text-sm text-graphite">Searching for professionals in your area...</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Trust Banner */}
      <section className="bg-charcoal p-12 text-white border border-stone-200">
        <div className="max-w-3xl">
          <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-500 mb-6 block">Our Commitment</label>
          <h2 className="text-3xl font-tight font-bold mb-6">Service requests are protected by FindYourFixer Trust.</h2>
          <p className="text-stone-400 leading-relaxed mb-8">
            Every transaction is recorded on our secure ledger. If a professional fails to deliver as agreed, our mediation team is available 24/7 to resolve the issue and ensure your project is completed.
          </p>
          <button className="text-[11px] font-bold uppercase tracking-widest border border-stone-700 px-6 py-3 hover:bg-white hover:text-charcoal transition-all">
            READ THE PROMISE
          </button>
        </div>
      </section>
    </div>
  );
};

export default UserDashboard;

