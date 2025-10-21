import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaBriefcase, 
  FaUsers, 
  FaStar, 
  FaEye, 
  FaToggleOn, 
  FaToggleOff,
  FaBriefcase as FaJob,
  FaUsers as FaLeads,
  FaChartLine,
  FaComments,
  FaCalendarAlt,
  FaBell,
  FaCheckCircle,
  FaClock,
  FaMapMarkerAlt,
  FaHands,
  FaUser
} from 'react-icons/fa';

const ProfessionalDashboard = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [stats, setStats] = useState({});
  const [jobFeed, setJobFeed] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Mock data - replace with real API calls
  useEffect(() => {
    // Simulate stats
    setStats({
      jobsThisWeek: 5,
      totalLeads: 23,
      averageRating: 4.8,
      profileViews: 156
    });

    // Simulate job feed
    setJobFeed([
      { 
        id: 1, 
        title: 'Fix Kitchen Sink Leak', 
        description: 'Kitchen sink has been leaking for 2 days, need urgent repair',
        location: 'Victoria Island, Lagos',
        budget: '₦15,000 - ₦25,000',
        posted: '2 hours ago',
        urgency: 'Urgent',
        distance: '0.5 km'
      },
      { 
        id: 2, 
        title: 'Install New Door', 
        description: 'Need to install a new wooden door for bedroom',
        location: 'Ikoyi, Lagos',
        budget: '₦8,000 - ₦12,000',
        posted: '4 hours ago',
        urgency: 'Regular',
        distance: '1.2 km'
      },
      { 
        id: 3, 
        title: 'Repair Toilet Flush', 
        description: 'Toilet flush is not working properly',
        location: 'Surulere, Lagos',
        budget: '₦5,000 - ₦8,000',
        posted: '6 hours ago',
        urgency: 'Regular',
        distance: '0.8 km'
      }
    ]);

    // Simulate my jobs
    setMyJobs([
      { 
        id: 1, 
        title: 'Fix Electrical Outlet', 
        client: 'Sarah Johnson',
        status: 'In Progress',
        date: '2024-01-15',
        budget: '₦20,000'
      },
      { 
        id: 2, 
        title: 'Install Ceiling Fan', 
        client: 'Mike Brown',
        status: 'Completed',
        date: '2024-01-10',
        budget: '₦15,000'
      },
      { 
        id: 3, 
        title: 'Repair Light Switch', 
        client: 'Emma Davis',
        status: 'Pending',
        date: '2024-01-20',
        budget: '₦8,000'
      }
    ]);

    // Simulate notifications
    setNotifications([
      { id: 1, message: 'New job matches your skills', time: '1 hour ago', unread: true },
      { id: 2, message: 'Sarah Johnson sent you a message', time: '3 hours ago', unread: true },
      { id: 3, message: 'Your job "Fix Electrical Outlet" was accepted', time: '1 day ago', unread: false }
    ]);
  }, []);

  const toggleAvailability = () => {
    setIsOnline(!isOnline);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FaHands className="text-2xl text-green-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome back, John!</h1>
              <p className="text-gray-600">Ready to find your next job?</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">Availability:</span>
            <button
              onClick={toggleAvailability}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isOnline ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-600 hover:bg-gray-700 text-white'
              }`}
            >
              {isOnline ? <FaToggleOn /> : <FaToggleOff />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Jobs This Week</p>
              <p className="text-2xl font-bold text-indigo-600">{stats.jobsThisWeek}</p>
            </div>
            <FaJob className="w-8 h-8 text-indigo-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Leads</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalLeads}</p>
            </div>
            <FaLeads className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Average Rating</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.averageRating}</p>
            </div>
            <FaStar className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Profile Views</p>
              <p className="text-2xl font-bold text-blue-600">{stats.profileViews}</p>
            </div>
            <FaEye className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          to="/dashboard/job-feed"
          className="bg-white rounded-lg shadow-sm p-6 text-center hover:shadow-md transition-shadow"
        >
          <FaBriefcase className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
          <h3 className="font-semibold">Job Feed</h3>
          <p className="text-sm text-gray-500">Find new jobs</p>
        </Link>
        
        <Link
          to="/dashboard/my-jobs"
          className="bg-white rounded-lg shadow-sm p-6 text-center hover:shadow-md transition-shadow"
        >
          <FaJob className="w-8 h-8 text-green-600 mx-auto mb-3" />
          <h3 className="font-semibold">My Jobs</h3>
          <p className="text-sm text-gray-500">Manage jobs</p>
        </Link>
        
        <Link
          to="/dashboard/messages"
          className="bg-white rounded-lg shadow-sm p-6 text-center hover:shadow-md transition-shadow"
        >
          <FaComments className="w-8 h-8 text-blue-600 mx-auto mb-3" />
          <h3 className="font-semibold">Messages</h3>
          <p className="text-sm text-gray-500">Chat with clients</p>
        </Link>
        
        <Link
          to="/dashboard/portfolio"
          className="bg-white rounded-lg shadow-sm p-6 text-center hover:shadow-md transition-shadow"
        >
          <FaUsers className="w-8 h-8 text-purple-600 mx-auto mb-3" />
          <h3 className="font-semibold">Portfolio</h3>
          <p className="text-sm text-gray-500">Update profile</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job Feed */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Available Jobs</h2>
            <Link to="/dashboard/job-feed" className="text-indigo-600 text-sm hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {jobFeed.map((job) => (
              <div key={job.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium">{job.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{job.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <FaMapMarkerAlt />
                      <span>{job.location}</span>
                      <FaClock />
                      <span>{job.posted}</span>
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="text-sm font-medium text-green-600">{job.budget}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        job.urgency === 'Urgent' ? 'bg-gray-200 text-gray-900' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {job.urgency}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 mt-3">
                  <button className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700">
                    View Details
                  </button>
                  <button className="px-3 py-1 border border-indigo-600 text-indigo-600 text-sm rounded-md hover:bg-indigo-50">
                    Apply
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* My Jobs */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">My Jobs</h2>
            <Link to="/dashboard/my-jobs" className="text-indigo-600 text-sm hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {myJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h3 className="font-medium">{job.title}</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span>Client: {job.client}</span>
                    <span>•</span>
                    <span>{job.budget}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    job.status === 'Completed' ? 'bg-gray-100 text-gray-800' :
                    job.status === 'In Progress' ? 'bg-gray-200 text-gray-900' :
                    'bg-gray-50 text-gray-700'
                  }`}>
                    {job.status}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">{job.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Notifications</h2>
          <Link to="/dashboard/notifications" className="text-indigo-600 text-sm hover:underline">
            View all
          </Link>
        </div>
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div key={notification.id} className={`flex items-start space-x-3 p-3 rounded-lg ${
              notification.unread ? 'bg-gray-100 border-l-4 border-gray-400' : 'bg-gray-50'
            }`}>
              <FaBell className={`mt-1 ${notification.unread ? 'text-gray-600' : 'text-gray-400'}`} />
              <div className="flex-1">
                <p className="text-sm">{notification.message}</p>
                <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
              </div>
              {notification.unread && (
                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfessionalDashboard;
