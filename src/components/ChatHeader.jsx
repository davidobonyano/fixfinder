import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiInfo,
  FiMoreVertical,
  FiTrash2,
  FiUser,
  FiAlertTriangle,
  FiBriefcase,
  FiPlus,
  FiCheckCircle,
  FiXCircle,
  FiLoader,
  FiMapPin
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { getProfessional } from '../utils/api';
import UserAvatar from './UserAvatar';
import { getUser } from '../utils/api';

const ChatHeader = ({
  conversation,
  otherParticipant,
  presence,
  onBack,
  onViewProfile,
  onDeleteConversation,
  onToggleBulkActions,
  onDeleteAllMessages,
  showBulkActions,
  formatLastSeen,
  userRole,
  activeJob,
  effectiveState,
  onAction,
  isMessageLimitReached,
  userMessageCount,
  messageLimit,
  onViewMap,
  distanceFormatted,
  otherAddressLabel
}) => {
  const navigate = useNavigate();

  // Default formatLastSeen function if not provided
  const defaultFormatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Offline';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const formatLastSeenFn = formatLastSeen || defaultFormatLastSeen;

  const handleDeleteAllMessages = () => {
    onDeleteAllMessages?.();
  };
  const [showOptions, setShowOptions] = useState(false);
  const [hydratedUser, setHydratedUser] = useState(otherParticipant?.user);

  useEffect(() => {
    async function hydrateUser() {
      if (otherParticipant?.user?._id && !(otherParticipant.user.profilePicture || otherParticipant.user.avatarUrl)) {
        try {
          const res = await getUser(otherParticipant.user._id);
          if (res && res.data) {
            setHydratedUser({ ...otherParticipant.user, ...res.data });
          }
        } catch (_) { }
      } else {
        setHydratedUser(otherParticipant?.user);
      }
    }
    hydrateUser();
    // eslint-disable-next-line
  }, [otherParticipant?.user?._id]);

  const handleOptionClick = (action) => {
    setShowOptions(false);
    action?.();
  };

  const handleProfileNavigation = async () => {
    console.log('handleProfileNavigation called');
    console.log('hydratedUser:', hydratedUser);
    console.log('otherParticipant:', otherParticipant);

    // If current viewer is a professional, always show the other user's profile modal
    if (String(userRole).toLowerCase() === 'professional') {
      console.log('Viewer is professional → opening user profile modal instead of navigating');
      onViewProfile?.();
      return;
    }

    // Check if user is professional by role or userType
    const isPro = hydratedUser?.role === 'professional' || otherParticipant?.userType === 'professional';
    console.log('Is professional?', isPro, 'role:', hydratedUser?.role, 'userType:', otherParticipant?.userType);

    if (isPro && hydratedUser?._id) {
      try {
        console.log('Fetching professional profile for user ID:', hydratedUser._id);
        // Try to get professional profile by user ID
        const proResp = await getProfessional(hydratedUser._id, { byUser: true });
        console.log('Professional response:', proResp);
        const pro = proResp?.data || proResp;
        const proId = pro?._id || pro?.id;

        if (proId) {
          const route = `/dashboard/professional/${proId}`;
          console.log('✅ Navigating to professional profile route:', route);
          navigate(route);
        } else {
          console.warn('⚠️ No professional ID found, trying with user ID');
          const route = `/dashboard/professional/${hydratedUser._id}`;
          console.log('Navigating with user ID:', route);
          navigate(route);
        }
      } catch (e) {
        console.error('❌ Error getting professional ID:', e);
        // Fallback: try navigating with user ID directly
        const route = `/dashboard/professional/${hydratedUser._id}`;
        console.log('🔙 Fallback: navigating with user ID:', route);
        navigate(route);
      }
    } else {
      // For regular users, use onViewProfile callback
      console.log('👤 Regular user, using onViewProfile callback');
      onViewProfile?.();
    }
  };

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-2 text-stone-400 hover:text-stone-600 transition-colors"
            >
              <FiArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Avatar/Name clicked, hydratedUser:', hydratedUser);
              await handleProfileNavigation();
            }}
            className="flex items-center gap-3 cursor-pointer"
          >
            <UserAvatar
              user={hydratedUser}
              size="md"
              className="hover:opacity-80 transition-opacity"
            />

            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                {hydratedUser?.name || 'Unknown User'}
              </h2>
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${presence?.isOnline ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`} />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {presence?.isOnline ? 'Online' : formatLastSeenFn(presence?.lastSeen)}
                </span>
                {distanceFormatted && (
                  <>
                    <span className="text-gray-300 dark:text-gray-700 mx-1">•</span>
                    <span className="text-xs font-bold text-trust uppercase tracking-wider">
                      {distanceFormatted}
                    </span>
                  </>
                )}
                {otherAddressLabel && (
                  <>
                    <span className="text-gray-300 dark:text-gray-700 mx-1">•</span>
                    <span className="text-xs text-stone-400">
                      {otherAddressLabel}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onViewMap && (
            <button
              onClick={onViewMap}
              className="p-2 text-stone-400 hover:text-trust transition-colors rounded-full hover:bg-stone-50"
              title="View Live Map"
            >
              <FiMapPin className="w-5 h-5" />
            </button>
          )}

          {/* Options Menu */}
          <div className="relative">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
              title="More Options"
            >
              <FiMoreVertical className="w-5 h-5" />
            </button>

            {showOptions && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowOptions(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-charcoal rounded-2xl shadow-xl border border-stone-100 dark:border-stone-800 py-2 z-50 overflow-hidden">

                  <Link
                    to={userRole === 'professional' ? '/dashboard/professional/connected-users' : '/dashboard/professionals'}
                    className="w-full px-4 py-3 text-left text-sm font-medium text-charcoal dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800/50 flex items-center gap-3 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowOptions(false);
                    }}
                  >
                    <FiUser className="w-4 h-4 text-stone-400" />
                    Manage Connections
                  </Link>

                  <div className="border-t border-stone-100 dark:border-stone-800 my-1"></div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const username = hydratedUser?.name || hydratedUser?.email;
                      setShowOptions(false);
                      setTimeout(() => {
                        navigate('/help/report', {
                          state: { reportedUsername: username },
                          replace: false
                        });
                      }, 100);
                    }}
                    className="w-full px-4 py-3 text-left text-sm font-medium text-charcoal dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800/50 flex items-center gap-3 transition-colors"
                  >
                    <FiAlertTriangle className="w-4 h-4 text-clay" />
                    Report User
                  </button>

                  {onDeleteAllMessages && (
                    <button
                      onClick={() => handleOptionClick(onDeleteAllMessages)}
                      className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-3 transition-colors"
                    >
                      <FiTrash2 className="w-4 h-4" />
                      Delete All Messages
                    </button>
                  )}

                  {onDeleteConversation && (
                    <button
                      onClick={() => handleOptionClick(onDeleteConversation)}
                      className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-3 transition-colors"
                    >
                      <FiTrash2 className="w-4 h-4" />
                      Delete Conversation
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Job Context & Lifecycle Actions */}
      {(() => {
        const hasJob = !!activeJob && effectiveState !== 'cancelled' && effectiveState !== 'closed';
        const isPro = String(userRole).toLowerCase() === 'professional';

        return (
          <div className="mt-4 flex flex-col gap-3">
            {/* Main Status Bar */}
            <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${!hasJob
              ? 'bg-stone-50 border-stone-100'
              : effectiveState === 'job_requested'
                ? 'bg-blue-50/50 border-blue-100'
                : effectiveState === 'in_progress'
                  ? 'bg-trust/5 border-trust/10'
                  : 'bg-stone-50 border-stone-100'
              }`}>

              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl shadow-sm border transition-colors ${!hasJob ? 'bg-white border-stone-100 text-stone-400' : 'bg-white border-white text-trust'}`}>
                  <FiBriefcase className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-0.5">
                    {!hasJob ? 'Service Status' : 'Linked Project'}
                  </p>
                  <p className="text-sm font-tight font-bold text-charcoal">
                    {!hasJob
                      ? (isPro ? 'Waiting for client request' : 'Initialize service request')
                      : activeJob.title}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!hasJob ? (
                  !isPro && (
                    <button
                      onClick={() => onAction?.('create')}
                      className="flex items-center gap-2 px-4 py-2 bg-charcoal text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-stone-800 transition-all shadow-sm"
                    >
                      <FiPlus className="w-3 h-3" /> Create Request
                    </button>
                  )
                ) : (
                  <div className="flex items-center gap-2">
                    {/* State Specific Actions */}
                    {effectiveState === 'job_requested' && (
                      <>
                        {isPro ? (
                          <button
                            onClick={() => onAction?.('accept')}
                            className="flex items-center gap-2 px-4 py-2 bg-trust text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-trust/90 transition-all shadow-sm"
                          >
                            <FiCheckCircle className="w-3 h-3" /> Accept
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-[9px] font-bold uppercase tracking-widest border border-blue-200">
                            Awaiting Pro
                          </span>
                        )}
                        <button
                          onClick={() => onAction?.('cancel')}
                          className="p-2 text-stone-400 hover:text-clay transition-colors"
                          title="Cancel Request"
                        >
                          <FiXCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {effectiveState === 'in_progress' && (
                      <>
                        {isPro ? (
                          <button
                            onClick={() => onAction?.('complete')}
                            className="flex items-center gap-2 px-4 py-2 bg-trust text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-trust/90 transition-all shadow-sm"
                          >
                            <FiCheckCircle className="w-3 h-3" /> Mark Done
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 bg-trust/10 text-trust rounded-lg text-[9px] font-bold uppercase tracking-widest border border-trust/20">
                            In Progress
                          </span>
                        )}
                        <button
                          onClick={() => onAction?.('cancel')}
                          className="p-2 text-stone-400 hover:text-clay transition-colors"
                        >
                          <FiXCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {effectiveState === 'completed_by_pro' && (
                      <div className="flex items-center gap-2">
                        {!isPro ? (
                          <>
                            <button
                              onClick={() => onAction?.('confirm')}
                              className="px-4 py-2 bg-trust text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-trust/90 transition-all"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => onAction?.('dispute')}
                              className="px-4 py-2 bg-stone-100 text-stone-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-stone-200 transition-all"
                            >
                              Dispute
                            </button>
                          </>
                        ) : (
                          <span className="px-3 py-1.5 bg-trust/10 text-trust rounded-lg text-[9px] font-bold uppercase tracking-widest border border-trust/20">
                            Awaiting User Confirmation
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Message Quota / Usage Indicator (Premium Flow) */}
            {!hasJob && (
              <div className="px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-1.5 flex-1 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${isMessageLimitReached ? 'bg-clay' : userMessageCount / messageLimit > 0.8 ? 'bg-amber-400' : 'bg-trust'}`}
                      style={{ width: `${Math.min(100, (userMessageCount / messageLimit) * 100)}%` }}
                    ></div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${isMessageLimitReached ? 'text-clay' : 'text-stone-400'}`}>
                    {userMessageCount}/{messageLimit} Messages
                  </span>
                </div>
                {isMessageLimitReached && (
                  <span className="ml-4 text-[9px] font-bold text-clay uppercase tracking-widest animate-pulse">
                    Limit Reached
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};

export default ChatHeader;


