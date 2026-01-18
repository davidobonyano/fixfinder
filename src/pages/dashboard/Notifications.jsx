import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FiBell, FiCheckCircle, FiMessageSquare, FiBriefcase, FiUser,
  FiHeart, FiAlertTriangle, FiInfo, FiX, FiEye, FiTrash2,
  FiFilter, FiSearch, FiCheck, FiLoader
} from 'react-icons/fi';
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
  const [filter, setFilter] = useState('all');
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
        getConnections().catch(() => ({ success: false, data: [] }))
      ]);
      if (response.success) {
        const raw = response.data.notifications || [];
        const acceptedConnectionIds = new Set(
          Array.isArray(connectionsResp?.data)
            ? connectionsResp.data.map(c => String(c?._id || c?.id)).filter(Boolean)
            : []
        );
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
            if (acceptedConnectionIds.has(String(reqId)) && n.type === 'connection_request') {
              return { ...n, type: 'connection_accepted', isRead: true };
            }
            if (r === 1 && n.type !== 'connection_rejected') return { ...n, type: 'connection_rejected', isRead: true };
            return n;
          });
        })();
        setNotifications(normalized);
        setTotalActive(response.data.pagination?.total || 0);
      }
    } catch (apiError) {
      console.error('Error loading notifications:', apiError);
      error('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev => prev.map(notif => notif._id === notificationId ? { ...notif, isRead: true } : notif));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await deleteNotification(notificationId);
      setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
      setTotalActive(prev => Math.max(prev - 1, 0));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(notif => !notif.isRead);
      for (const notif of unreadNotifications) {
        await markNotificationAsRead(notif._id);
      }
      setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const handleAcceptConnection = async (notification) => {
    try {
      setProcessingRequest(notification._id);
      const requestId = notification.data?.connectionRequestId?._id || notification.data?.connectionRequestId || notification.data?.requestId || notification.data?.metadata?.connectionRequestId || notification.data?.metadata?.requestId;
      if (!requestId) throw new Error('Invalid connection request.');
      await acceptConnectionRequest(requestId);
      setNotifications(prev => prev.map(notif => {
        const nReqId = notif.data?.connectionRequestId?._id || notif.data?.connectionRequestId || notif.data?.requestId || notif.data?.metadata?.connectionRequestId || notif.data?.metadata?.requestId;
        if (nReqId && String(nReqId) === String(requestId)) {
          return { ...notif, isRead: true, type: 'connection_accepted' };
        }
        return notif;
      }));
      success('Connection accepted!');
      if (isProDashboard) {
        await new Promise(resolve => setTimeout(resolve, 600));
        navigate('/dashboard/professional/connected-users');
      }
    } catch (err) {
      error('Failed to accept connection request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectConnection = async (notification) => {
    try {
      setProcessingRequest(notification._id);
      const requestId = notification.data?.connectionRequestId?._id || notification.data?.connectionRequestId || notification.data?.requestId || notification.data?.metadata?.connectionRequestId || notification.data?.metadata?.requestId;
      if (!requestId) throw new Error('Invalid connection request.');
      await rejectConnectionRequest(requestId);
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
    } finally {
      setProcessingRequest(null);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'connection_request':
      case 'connection_accepted':
        return <FiUser className="w-5 h-5 text-trust" />;
      case 'job_application':
      case 'job_update':
      case 'job_completed':
        return <FiBriefcase className="w-5 h-5 text-clay" />;
      case 'message':
        return <FiMessageSquare className="w-5 h-5 text-charcoal dark:text-stone-300" />;
      case 'review':
        return <FiHeart className="w-5 h-5 text-trust" />;
      case 'system':
        return <FiInfo className="w-5 h-5 text-graphite" />;
      default:
        return <FiBell className="w-5 h-5 text-graphite" />;
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
    const matchesFilter = filter === 'all' || (filter === 'unread' && !notif.isRead) || (filter === 'read' && notif.isRead);
    const matchesSearch = !searchQuery || notif.title.toLowerCase().includes(searchQuery.toLowerCase()) || notif.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const unreadCount = notifications.filter(notif => !notif.isRead).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <FiLoader className="w-12 h-12 animate-spin text-trust mb-4" />
        <p className="font-tight text-graphite text-lg">Syncing notification feed...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Premium Header */}
      <div className="mb-12">
        <div className="label-caps mb-2 text-stone-400 dark:text-stone-500">System Alerts</div>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-tight font-bold text-charcoal dark:text-stone-50 tracking-tight flex items-center gap-4">
              Notifications
              <span className="px-3 py-1 text-xs rounded-xl bg-stone-100 dark:bg-stone-800 text-graphite dark:text-stone-400 border border-stone-200 dark:border-stone-700 font-bold uppercase tracking-widest">
                {Math.min(totalActive, INBOX_CAP)}/{INBOX_CAP}
              </span>
            </h1>
            <p className="mt-3 text-lg text-graphite dark:text-stone-400 max-w-xl leading-relaxed">
              {unreadCount > 0 ? `${unreadCount} unread transmission${unreadCount > 1 ? 's' : ''} awaiting review` : 'All transmissions acknowledged'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button onClick={handleMarkAllAsRead} className="btn-secondary text-xs uppercase tracking-widest">
                Mark All Read
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={async () => { await clearAllNotifications(); await loadNotifications(); }} className="btn-secondary text-xs uppercase tracking-widest">
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card-premium p-6 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 dark:text-stone-600" />
            <input
              type="text"
              placeholder="Search transmissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-12 text-sm"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'unread', 'read'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${filter === f
                    ? 'bg-trust text-white shadow-sm'
                    : 'bg-stone-50 dark:bg-stone-800 text-graphite dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700'
                  }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="card-premium p-20 text-center">
          <FiBell className="w-16 h-16 text-stone-200 dark:text-stone-700 mx-auto mb-6" />
          <h3 className="text-xl font-tight font-bold text-charcoal dark:text-stone-100 mb-2">
            {searchQuery ? 'No matches found' : 'Notification feed empty'}
          </h3>
          <p className="text-graphite dark:text-stone-400">
            {searchQuery ? 'Refine search parameters' : 'New alerts will appear here as they arrive'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notification) => {
            const requestStatusRaw = notification?.data?.status || notification?.data?.state || notification?.data?.requestStatus || notification?.data?.metadata?.status || '';
            const requestStatus = String(requestStatusRaw).toLowerCase();
            const requestHandled = notification.type === 'connection_request' && ['processed', 'accepted', 'approved', 'rejected', 'declined', 'cancelled', 'canceled'].includes(requestStatus);

            return (
              <div
                key={notification._id}
                className={`card-premium p-6 transition-all ${notification.isRead ? 'opacity-60' : 'border-l-4 border-l-trust'}`}
              >
                <div className="flex items-start gap-5">
                  <div className="flex-shrink-0 mt-1 p-3 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-sm font-tight font-bold text-charcoal dark:text-stone-50 mb-1">
                          {notification.title}
                        </h3>
                        <p className="text-sm text-graphite dark:text-stone-400 leading-relaxed">
                          {notification.message}
                        </p>
                        <p className="text-[10px] font-bold text-stone-300 dark:text-stone-600 uppercase tracking-widest mt-2">
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {!notification.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notification._id)}
                            className="p-2 text-stone-300 dark:text-stone-600 hover:text-trust transition-colors"
                            title="Mark as read"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification._id)}
                          className="p-2 text-stone-300 dark:text-stone-600 hover:text-clay transition-colors"
                          title="Delete"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {notification.type === 'connection_request' && notification.data?.connectionRequestId && (
                      <div className="mt-4 flex flex-wrap gap-3">
                        {notification.data?.professionalId && (
                          <Link
                            to={`${basePath}/professional/${notification.data.professionalId}`}
                            className="px-4 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-charcoal dark:text-stone-300 text-xs font-bold uppercase tracking-widest rounded-xl hover:border-trust transition-all"
                          >
                            View Profile
                          </Link>
                        )}
                        {requestHandled ? (
                          <span className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold text-graphite dark:text-stone-400 uppercase tracking-widest">
                            {requestStatus && requestStatus.length <= 14 ? requestStatus : 'Processed'}
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleAcceptConnection(notification)}
                              disabled={processingRequest === notification._id}
                              className="px-4 py-2 bg-trust text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-trust/90 disabled:opacity-50 flex items-center gap-2 transition-all"
                            >
                              {processingRequest === notification._id ? <FiLoader className="animate-spin w-3 h-3" /> : <FiCheck className="w-3 h-3" />}
                              Accept
                            </button>
                            <button
                              onClick={() => handleRejectConnection(notification)}
                              disabled={processingRequest === notification._id}
                              className="px-4 py-2 bg-stone-100 dark:bg-stone-800 text-charcoal dark:text-stone-300 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-50 flex items-center gap-2 transition-all"
                            >
                              {processingRequest === notification._id ? <FiLoader className="animate-spin w-3 h-3" /> : <FiX className="w-3 h-3" />}
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {(notification.type === 'connection_accepted' || notification.type === 'connection_rejected') && (
                      <div className="mt-4">
                        <span className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-xl border ${notification.type === 'connection_accepted' ? 'bg-trust/10 text-trust border-trust/20' : 'bg-stone-50 dark:bg-stone-800 text-graphite dark:text-stone-400 border-stone-200 dark:border-stone-700'}`}>
                          {notification.type === 'connection_accepted' ? 'Accepted' : 'Rejected'}
                        </span>
                      </div>
                    )}

                    {notification.type === 'job_application' && (
                      <div className="mt-4">
                        <button
                          onClick={async () => {
                            await handleMarkAsRead(notification._id);
                            const jobId = notification.data?.jobId?._id || notification.data?.jobId || notification.data?.job?._id || null;
                            if (jobId && typeof jobId === 'string') {
                              navigate(`/dashboard/my-jobs/${jobId}/applications`);
                            } else {
                              navigate(`/dashboard/my-jobs`);
                            }
                          }}
                          className="btn-primary text-xs uppercase tracking-widest"
                        >
                          View Applications
                        </button>
                      </div>
                    )}

                    {notification.type === 'message' && notification.data?.conversationId && (
                      <div className="mt-4">
                        <Link
                          to={`${basePath}/messages/${notification.data.conversationId}`}
                          className="btn-primary text-xs uppercase tracking-widest inline-block"
                        >
                          View Message
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;
