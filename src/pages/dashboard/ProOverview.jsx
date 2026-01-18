import { useEffect, useState } from 'react';
import { getProOverview, getProJobs, getConnections } from '../../utils/api';
import { FiBriefcase, FiClock, FiCheckCircle, FiUsers, FiStar, FiTrendingUp, FiLoader } from 'react-icons/fi';

const StatCard = ({ label, value, icon: Icon, subValue }) => (
  <div className="card-premium bg-white p-8 group hover:border-trust transition-all duration-300">
    <div className="flex items-start justify-between mb-6">
      <div className="p-3 bg-stone-50 border border-stone-100 rounded-xl group-hover:scale-110 transition-transform">
        <Icon className="w-5 h-5 text-trust" />
      </div>
      <div className="text-3xl font-tight font-bold text-charcoal tracking-tight">{value}</div>
    </div>
    <div className="label-caps text-stone-400 mb-2">{label}</div>
    {subValue && (
      <div className="text-[10px] font-bold uppercase tracking-widest text-stone-300">
        {subValue}
      </div>
    )}
  </div>
);

const ProOverview = () => {
  const [stats, setStats] = useState({ totalJobs: 0, activeJobs: 0, completedJobs: 0, connections: 0, rating: 0, reviewCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await getProOverview();
        const overview = res?.data || res || {};

        // Fetch pro jobs to compute job stats
        let totalJobs = 0;
        let activeJobs = 0;
        let completedJobs = 0;
        try {
          const jobsResp = await getProJobs({ limit: 300 });
          const jobs = jobsResp?.data?.jobs || jobsResp?.data || jobsResp || [];
          const uniqueIds = new Set();

          const isCompletedStrict = (job) => {
            const statusLc = String(job?.status || '').toLowerCase();
            const lifecycleLc = String(job?.lifecycleState || '').toLowerCase();
            const hasCompletedFlag = job?.completed === true || job?.isCompleted === true || !!job?.completedAt;
            const isCancelled = statusLc === 'cancelled' || lifecycleLc === 'cancelled' || !!job?.cancelledAt || job?.cancelled === true;
            if (isCancelled) return false;
            return statusLc === 'completed' || lifecycleLc === 'completed_by_pro' || lifecycleLc === 'completed_by_user' || lifecycleLc === 'closed' || hasCompletedFlag;
          };

          const isActive = (job) => {
            const statusLc = String(job?.status || '').toLowerCase();
            const lifecycleLc = String(job?.lifecycleState || '').toLowerCase();
            const isCancelled = statusLc === 'cancelled' || lifecycleLc === 'cancelled' || !!job?.cancelledAt || job?.cancelled === true;
            if (isCancelled) return false;
            if (isCompletedStrict(job)) return false;
            const isAssigned = !!job?.professional || !!job?.assignedProfessional || !!job?.conversation;
            return lifecycleLc === 'in_progress' || statusLc === 'in progress' || statusLc === 'in_progress' || isAssigned;
          };

          jobs.forEach((j) => {
            const id = j?._id || j?.id;
            if (!id) return;
            if (!uniqueIds.has(String(id))) {
              uniqueIds.add(String(id));
            }
            if (isCompletedStrict(j)) completedJobs += 1;
            else if (isActive(j)) activeJobs += 1;
          });
          totalJobs = uniqueIds.size;
        } catch (_) { }

        // Fetch connections count
        let connections = 0;
        try {
          const cons = await getConnections();
          connections = (Array.isArray(cons?.data) ? cons.data.length
            : Array.isArray(cons?.connections) ? cons.connections.length
              : Array.isArray(cons) ? cons.length
                : Array.isArray(cons?.data?.connections) ? cons.data.connections.length
                  : 0);
        } catch (_) { }

        setStats({
          totalJobs,
          activeJobs,
          completedJobs,
          connections,
          rating: overview.rating || 0,
          reviewCount: overview.reviewCount || 0
        });
      } catch (e) {
        console.error('Failed to load overview', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <FiLoader className="w-12 h-12 animate-spin text-trust mb-4" />
        <p className="font-tight text-graphite text-lg">Synchronizing performance metrics...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-12">
        <div className="label-caps mb-2 text-stone-400">Performance Matrix</div>
        <h1 className="text-4xl md:text-5xl font-tight font-bold text-charcoal tracking-tight">Overview</h1>
        <p className="mt-3 text-lg text-graphite max-w-xl">
          Real-time analytics and operational statistics for your professional node.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        <StatCard label="Total Requests" value={stats.totalJobs} icon={FiBriefcase} subValue="Lifetime Engagement" />
        <StatCard label="Ongoing Tasks" value={stats.activeJobs} icon={FiClock} subValue="Current Pipeline" />
        <StatCard label="Success Rate" value={stats.completedJobs} icon={FiCheckCircle} subValue="Verified Completions" />
        <StatCard label="Network Reach" value={stats.connections} icon={FiUsers} subValue="Active Connections" />
      </div>

      <div className="card-premium bg-paper p-10 border-stone-200">
        <div className="flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="flex-1">
            <div className="label-caps text-trust mb-4">Reputation Index</div>
            <div className="flex items-end gap-3 mb-4">
              <span className="text-5xl font-tight font-bold text-charcoal">{(stats.rating || 0).toFixed(1)}</span>
              <div className="flex gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <FiStar key={i} className={`w-5 h-5 ${i < Math.round(stats.rating) ? 'text-trust fill-trust' : 'text-stone-200'}`} />
                ))}
              </div>
            </div>
            <p className="text-graphite leading-relaxed">
              Based on <span className="font-bold text-charcoal">{stats.reviewCount}</span> verified consumer appraisals within the network. High ratings increase ecosystem priority.
            </p>
          </div>

          <div className="w-full md:w-auto">
            <div className="p-8 rounded-3xl bg-white border border-stone-100 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-trust/5 flex items-center justify-center text-trust text-2xl mb-4">
                <FiTrendingUp />
              </div>
              <div className="label-caps text-stone-400 mb-1">Status</div>
              <div className="font-tight font-bold text-charcoal uppercase tracking-tighter">Elite Potential</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProOverview;






