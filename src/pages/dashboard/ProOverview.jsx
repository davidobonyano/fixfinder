import { useEffect, useState } from 'react';
import { getProOverview, getProJobs, getConnections } from '../../utils/api';
import { FaBriefcase, FaClock, FaCheckCircle, FaStar, FaUsers } from 'react-icons/fa';

const StatCard = ({ title, value, icon: Icon, accent }) => (
  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={`p-3 rounded-full ${accent}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
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
            if (isCancelled) return false; // exclude cancelled from completed
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
        } catch (_) {}

        // Fetch connections count
        let connections = 0;
        try {
          const cons = await getConnections();
          connections = (Array.isArray(cons?.data) ? cons.data.length
                        : Array.isArray(cons?.connections) ? cons.connections.length
                        : Array.isArray(cons) ? cons.length
                        : Array.isArray(cons?.data?.connections) ? cons.data.connections.length
                        : 0);
        } catch (_) {}

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

  if (loading) return <div className="p-6">Loading overview...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Jobs" value={stats.totalJobs} icon={FaBriefcase} accent="bg-blue-100 text-blue-600" />
        <StatCard title="Active Jobs" value={stats.activeJobs} icon={FaClock} accent="bg-yellow-100 text-yellow-600" />
        <StatCard title="Completed" value={stats.completedJobs} icon={FaCheckCircle} accent="bg-green-100 text-green-600" />
        <StatCard title="Connections" value={stats.connections} icon={FaUsers} accent="bg-purple-100 text-purple-600" />
      </div>
      <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-700">Rating: <span className="font-semibold">{(stats.rating||0).toFixed(1)}</span> ({stats.reviewCount} reviews)</p>
      </div>
    </div>
  );
};

export default ProOverview;






