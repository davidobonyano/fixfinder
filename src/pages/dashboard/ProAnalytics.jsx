import { useEffect, useState } from 'react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { getProAnalytics, getProJobs, getConnections } from '../../utils/api';
import { 
  FaBriefcase, 
  FaUsers, 
  FaStar, 
  FaSpinner,
  FaChartLine,
  FaCalendarAlt
} from 'react-icons/fa';

const ProAnalytics = () => {
  const [data, setData] = useState({ 
    jobsPerMonth: [], 
    connectionsCount: 0,
    totalJobs: 0,
    averageRating: 0,
    reviewCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await getProAnalytics();
        const analyticsData = res?.data || res || {};

        // Also fetch pro jobs and compute completed jobs per month using same logic as MyJobs
        let jobsMonthlyCompleted = [];
        try {
          const jobsResp = await getProJobs({ limit: 300 });
          const jobsList = jobsResp?.data?.jobs || jobsResp?.data || jobsResp || [];

          const isJobCompleted = (job) => {
            const statusLc = String(job?.status || '').toLowerCase();
            const lifecycleLc = String(job?.lifecycleState || '').toLowerCase();
            return statusLc === 'completed' || statusLc === 'cancelled' ||
                   ['in_progress', 'completed_by_pro', 'completed_by_user', 'closed', 'cancelled'].includes(lifecycleLc) ||
                   job?.completed === true || job?.isCompleted === true || !!job?.completedAt;
          };

          // Build last 6 months buckets
          const now = new Date();
          const buckets = [];
          for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            buckets.push({ y: d.getFullYear(), m: d.getMonth() + 1, count: 0 });
          }

          jobsList.forEach((job) => {
            if (!isJobCompleted(job)) return;
            const completedAt = job.completedAt || job.updatedAt || job.createdAt;
            const dt = completedAt ? new Date(completedAt) : null;
            if (!dt || isNaN(dt)) return;
            const y = dt.getFullYear();
            const m = dt.getMonth() + 1;
            const bucket = buckets.find(b => b.y === y && b.m === m);
            if (bucket) bucket.count += 1;
          });

          // Convert to chart format
          jobsMonthlyCompleted = processMonthlyData(buckets.map(b => ({ _id: { y: b.y, m: b.m }, count: b.count })));

          // Compute total jobs as unique job IDs
          const uniqueJobIds = new Set();
          jobsList.forEach(j => { const id = j?._id || j?.id; if (id) uniqueJobIds.add(String(id)); });
          analyticsData.totalJobs = uniqueJobIds.size;
        } catch (e) {
          // fallback to whatever analyticsData has or mock
          jobsMonthlyCompleted = processMonthlyData(analyticsData.jobsPerMonth || []);
        }

        // Fetch connections count
        try {
          const consResp = await getConnections();
          const count = (Array.isArray(consResp?.data) ? consResp.data.length
                        : Array.isArray(consResp?.connections) ? consResp.connections.length
                        : Array.isArray(consResp) ? consResp.length
                        : Array.isArray(consResp?.data?.connections) ? consResp.data.connections.length
                        : 0);
          analyticsData.connectionsCount = count;
        } catch (_) {}

        setData({
          ...analyticsData,
          jobsPerMonth: jobsMonthlyCompleted
        });
      } catch (e) {
        console.error('Failed to load analytics', e);
        // Set mock data for demo
        setData({
          jobsPerMonth: generateMockMonthlyData('jobs'),
          connectionsCount: 12,
          totalJobs: 45,
          averageRating: 4.7,
          reviewCount: 23
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const processMonthlyData = (data) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    const result = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = months[date.getMonth()];
      
      const found = data.find(item => 
        item._id?.y === date.getFullYear() && item._id?.m === date.getMonth() + 1
      );
      
      result.push({
        month: monthName,
        value: found ? (found.count || found.total || 0) : 0,
        fullDate: monthKey
      });
    }
    
    return result;
  };

  const generateMockMonthlyData = (type) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => ({
      month,
      value: Math.floor(Math.random() * 10) + 1
    }));
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Track your professional performance and growth</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <FaCalendarAlt className="w-4 h-4" />
          <span>Last 6 months</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Jobs</p>
              <p className="text-3xl font-bold text-gray-900">{data.totalJobs}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <FaBriefcase className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Connections</p>
              <p className="text-3xl font-bold text-gray-900">{data.connectionsCount}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <FaUsers className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Rating</p>
              <p className="text-3xl font-bold text-gray-900">{data.averageRating?.toFixed(1) || '0.0'}</p>
              <p className="text-xs text-gray-500">{data.reviewCount} reviews</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <FaStar className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        {/* Jobs Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Jobs Completed</h3>
            <FaChartLine className="w-5 h-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.jobsPerMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#3B82F6" 
                fill="#3B82F6" 
                fillOpacity={0.1}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        
      </div>

      {/* Performance Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">
              {data.jobsPerMonth.reduce((sum, item) => sum + item.value, 0)}
            </div>
            <p className="text-sm text-gray-600">Jobs (6 months)</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-2">
              {data.connectionsCount}
            </div>
            <p className="text-sm text-gray-600">Active Connections</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProAnalytics;






