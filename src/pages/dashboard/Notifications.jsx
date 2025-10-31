import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FaBell, 
  FaCheckCircle, 
  FaComments, 
  FaBriefcase, 
  FaUser, 
  FaHeart,
  FaExclamationTriangle,
  FaInfoCircle,
  FaTimes,
  FaEye,
  FaTrash,
  FaFilter,
  FaSearch,
  FaCheck,
  FaTimes as FaX,
  FaSpinner
} from 'react-icons/fa';
import { getNotifications, markNotificationAsRead, deleteNotification, acceptConnectionRequest, rejectConnectionRequest, clearAllNotifications, getConnections } from '../../utils/api';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/ToastContext';

const Notifications = () => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const isProDashboard = location.pathname.startsWith('/dashboard/professional');
  const basePath = isProDashboard ? '/dashboard/professional' : '/dashboard';
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [searchQuery, setSearchQuery] = useState('');
  const [processingRequest, setProcessingRequest] = useState(null);
  const [totalActive, setTotalActive] = useState(0);
  const INBOX_CAP = 50;

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [response, connectionsResp] = await Promise.all([
        getNotifications({ limit: INBOX_CAP }),
        // Fetch accepted connections to reconcile stale connection_request notifications
        getConnections().catch(() => ({ success: false, data: [] }))
      ]);
      if (response.success) {
        const raw = response.data.notifications || [];
        const acceptedConnectionIds = new Set(
          Array.isArray(connectionsResp?.data)
            ? connectionsResp.data.map(c => String(c?._id || c?.id)).filter(Boolean)
            : []
        );
        // Normalize connection request states across duplicates
        const normalized = (() => {
          const rank = { connection_accepted: 2, connection_rejected: 1, connection_request: 0 };
          const reqState = new Map();
          for (const n of raw) {
            const reqId = n?.data?.connectionRequestId?._id || n?.data?.connectionRequestId || n?.data?.requestId || n?.data?.metadata?.connectionRequestId || n?.data?.metadata?.requestId;
            if (!reqId) continue;
            const r = rank[n.type] ?? -1;
            const prev = reqState.get(String(reqId)) ?? -1;
            if (r > prev) reqState.set(String(reqId), r);
          }
          return raw.map(n => {
            const reqId = n?.data?.connectionRequestId?._id || n?.data?.connectionRequestId || n?.data?.requestId || n?.data?.metadata?.connectionRequestId || n?.data?.metadata?.requestId;
            if (!reqId) return n;
            const r = reqState.get(String(reqId));
            if (r === 2 && n.type !== 'connection_accepted') return { ...n, type: 'connection_accepted', isRead: true };
            // If this request has become an accepted connection, promote to accepted and mark read
            if (acceptedConnectionIds.has(String(reqId)) && n.type === 'connection_request') {
              return { ...n, type: 'connection_accepted', isRead: true };
            }
            if (r === 1 && n.type !== 'connection_rejected') return { ...n, type: 'connection_rejected', isRead: true };
            return n;
          });
        })();
        setNotifications(normalized);
        setTotalActive(response.data.pagination?.total || 0);
        return;
      } else {
        throw new Error(response.message || 'Failed to load notifications');
      }
    } catch (apiError) {
      console.error('❌ API Error loading notifications:', apiError);
      error('Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, isRead: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await deleteNotification(notificationId);
      setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
      setTotalActive(prev => Math.max(prev - 1, 0));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(notif => !notif.isRead);
      for (const notif of unreadNotifications) {
        await markNotificationAsRead(notif._id);
      }
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleAcceptConnection = async (notification) => {
    try {
      setProcessingRequest(notification._id);
      const requestId = notification.data?.connectionRequestId?._id || 
                       notification.data?.connectionRequestId || 
                       notification.data?.requestId || 
                       notification.data?.metadata?.connectionRequestId ||
                       notification.data?.metadata?.requestId;
      if (!requestId) {
        throw new Error('This connection request is no longer valid.');
      }
      await acceptConnectionRequest(requestId);
      // Update ALL notifications for this request id to accepted
      setNotifications(prev => prev.map(notif => {
        const nReqId = notif.data?.connectionRequestId?._id || notif.data?.connectionRequestId || notif.data?.requestId || notif.data?.metadata?.connectionRequestId || notif.data?.metadata?.requestId;
        if (nReqId && String(nReqId) === String(requestId)) {
          return { ...notif, isRead: true, type: 'connection_accepted' };
        }
        return notif;
      }));
      success('Connection accepted!');
      if (isProDashboard) {
        // Give backend a brief moment to persist before fetching on next page
        try { await new Promise(resolve => setTimeout(resolve, 600)); } catch (e) {}
        navigate('/dashboard/professional/connected-users');
      }
    } catch (err) {
      error('Failed to accept connection request');
      console.error('Error accepting connection:', err);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectConnection = async (notification) => {
    try {
      setProcessingRequest(notification._id);
      const requestId = notification.data?.connectionRequestId?._id || 
                       notification.data?.connectionRequestId || 
                       notification.data?.requestId || 
                       notification.data?.metadata?.connectionRequestId ||
                       notification.data?.metadata?.requestId;
      if (!requestId) {
        throw new Error('This connection request is no longer valid.');
      }
      await rejectConnectionRequest(requestId);
      // Update ALL notifications for this request id to rejected
      setNotifications(prev => prev.map(notif => {
        const nReqId = notif.data?.connectionRequestId?._id || notif.data?.connectionRequestId || notif.data?.requestId || notif.data?.metadata?.connectionRequestId || notif.data?.metadata?.requestId;
        if (nReqId && String(nReqId) === String(requestId)) {
          return { ...notif, isRead: true, type: 'connection_rejected' };
        }
        return notif;
      }));
      success('Connection request rejected');
    } catch (err) {
      error('Failed to reject connection request');
      console.error('Error rejecting connection:', err);
    } finally {
      setProcessingRequest(null);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'connection_request':
      case 'connection_accepted':
        return <FaUser className="w-5 h-5 text-blue-500" />;
      case 'job_application':
      case 'job_update':
      case 'job_completed':
        return <FaBriefcase className="w-5 h-5 text-green-500" />;
      case 'message':
        return <FaComments className="w-5 h-5 text-purple-500" />;
      case 'review':
        return <FaHeart className="w-5 h-5 text-red-500" />;
      case 'system':
        return <FaInfoCircle className="w-5 h-5 text-gray-500" />;
      default:
        return <FaBell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'connection_request':
        return 'border-l-blue-500 bg-blue-50';
      case 'connection_accepted':
        return 'border-l-green-500 bg-green-50';
      case 'job_application':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'job_update':
        return 'border-l-orange-500 bg-orange-50';
      case 'message':
        return 'border-l-purple-500 bg-purple-50';
      case 'review':
        return 'border-l-red-500 bg-red-50';
      case 'system':
        return 'border-l-gray-500 bg-gray-50';
      default:
        return 'border-l-gray-300 bg-gray-50';
    }
  };

  const formatTimeAgo = (dateInput) => {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter(notif => {
    const matchesFilter = filter === 'all' || 
      (filter === 'unread' && !notif.isRead) || 
      (filter === 'read' && notif.isRead);
    const matchesSearch = !searchQuery || 
      notif.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notif.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const unreadCount = notifications.filter(notif => !notif.isRead).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                Notifications
                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                  {Math.min(totalActive, INBOX_CAP)}/{INBOX_CAP}
                </span>
              </h1>
              <p className="text-gray-600">
                {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Mark all as read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={async () => { try { await clearAllNotifications(); await loadNotifications(); } catch (e) {} }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm ${
                  filter === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-lg text-sm ${
                  filter === 'unread' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Unread
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-4 py-2 rounded-lg text-sm ${
                  filter === 'read' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Read
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <FaBell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No notifications found' : 'No notifications yet'}
            </h3>
            <p className="text-gray-500">
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'You\'ll see notifications here when you connect with professionals or receive updates'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notification) => (
              <div
                key={notification._id}
                className={`bg-white rounded-lg shadow-sm border-l-4 p-4 ${
                  notification.isRead ? 'opacity-75' : ''
                } ${getNotificationColor(notification.type)}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {!notification.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notification._id)}
                            className="p-1 text-gray-400 hover:text-blue-600"
                            title="Mark as read"
                          >
                            <FaEye className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDelete(notification._id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Delete notification"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Action buttons based on notification type */}
                    {notification.type === 'connection_request' && notification.data?.connectionRequestId && (
                      <div className="mt-3 flex gap-2">
                        {notification.data?.professionalId && (
                        <Link
                          to={`${basePath}/professional/${notification.data.professionalId}`}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                        >
                          View Profile
                        </Link>
                        )}
                        {notification.isRead ? (
                          <span className="inline-block px-2 py-1 text-xs rounded border bg-gray-50 text-gray-700 border-gray-200">Processed</span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleAcceptConnection(notification)}
                              disabled={processingRequest === notification._id}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                            >
                              {processingRequest === notification._id ? (
                                <FaSpinner className="animate-spin w-3 h-3" />
                              ) : (
                                <FaCheck className="w-3 h-3" />
                              )}
                              Accept
                            </button>
                            <button
                              onClick={() => handleRejectConnection(notification)}
                              disabled={processingRequest === notification._id}
                              className="px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                            >
                              {processingRequest === notification._id ? (
                                <FaSpinner className="animate-spin w-3 h-3" />
                              ) : (
                                <FaX className="w-3 h-3" />
                              )}
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {(notification.type === 'connection_accepted' || notification.type === 'connection_rejected') && (
                      <div className="mt-3">
                        <span className={`inline-block px-2 py-1 text-xs rounded border ${notification.type === 'connection_accepted' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {notification.type === 'connection_accepted' ? 'Accepted' : 'Rejected'}
                        </span>
                      </div>
                    )}
                    
                    {notification.type === 'job_application' && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={async () => {
                            try { await handleMarkAsRead(notification._id); } catch {}
                            const jobId = (
                              notification.data?.jobId?._id ||
                              notification.data?.jobId ||
                              notification.data?.job?._id ||
                              null
                            );
                            if (jobId && typeof jobId === 'string') {
                              navigate(`/dashboard/my-jobs/${jobId}/applications`);
                            } else {
                              navigate(`/dashboard/my-jobs`);
                            }
                          }}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                        >
                          {`View applications for ${(notification.data?.jobTitle || notification.message || '').split(':').slice(1).join(':').trim() || 'this job'}`}
                        </button>
                      </div>
                    )}
                    
                    {notification.type === 'message' && notification.data?.conversationId && (
                      <div className="mt-3">
                        <Link
                          to={`${basePath}/messages/${notification.data.conversationId}`}
                          className="px-3 py-1 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700"
                        >
                          View Message
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
