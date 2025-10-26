import { useEffect, useState } from 'react';
import { getProOverview } from '../../utils/api';
import { FaBriefcase, FaClock, FaCheckCircle, FaStar, FaMoneyBillWave } from 'react-icons/fa';

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
  const [stats, setStats] = useState({ totalJobs: 0, activeJobs: 0, completedJobs: 0, totalEarnings: 0, rating: 0, reviewCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await getProOverview();
        const data = res?.data || res;
        setStats(data);
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
        <StatCard title="Total Earnings" value={`₦${(stats.totalEarnings||0).toLocaleString()}`} icon={FaMoneyBillWave} accent="bg-emerald-100 text-emerald-600" />
      </div>
      <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-700">Rating: <span className="font-semibold">{(stats.rating||0).toFixed(1)}</span> ({stats.reviewCount} reviews)</p>
      </div>
    </div>
  );
};

export default ProOverview;






