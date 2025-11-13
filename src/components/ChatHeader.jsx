import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaArrowLeft, 
  FaInfoCircle, 
  FaEllipsisV, 
  FaMap,
  FaTrash,
  FaUser
} from 'react-icons/fa';
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
  onViewMap,
  onDeleteConversation,
  onToggleBulkActions,
  onDeleteAllMessages,
  showBulkActions,
  formatLastSeen,
  userRole
}) => {
  const navigate = useNavigate();
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
        } catch (_) {}
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
    <div className="p-4 border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FaArrowLeft className="w-5 h-5" />
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
              <h2 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                {hydratedUser?.name || 'Unknown User'}
              </h2>
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                  presence?.isOnline ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <span className="text-sm text-gray-500">
                  {presence?.isOnline ? 'Online' : formatLastSeen(presence?.lastSeen)}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Options Menu */}
          <div className="relative">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="More Options"
            >
              <FaEllipsisV className="w-5 h-5" />
            </button>
            
            {showOptions && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="border-t border-gray-100 my-1"></div>
                
                <Link
                  to={userRole === 'professional' ? '/dashboard/professional/connected-users' : '/dashboard/professionals'}
                  className="w-full px-4 py-2 text-left text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                  onClick={() => setShowOptions(false)}
                >
                  <FaUser className="w-4 h-4" />
                  Manage Connections
                </Link>
                
                {onDeleteAllMessages && (
                  <button
                    onClick={() => handleOptionClick(onDeleteAllMessages)}
                    className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <FaTrash className="w-4 h-4" />
                    Delete All Messages
                  </button>
                )}
                
                {onDeleteConversation && (
                  <button
                    onClick={() => handleOptionClick(onDeleteConversation)}
                    className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <FaTrash className="w-4 h-4" />
                    Delete Conversation
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Job Context */}
      {(() => {
        const job = conversation?.job;
        if (!job) return null;
        const ls = String(job.lifecycleState || '').toLowerCase();
        const st = String(job.status || '').toLowerCase();
        const isClosed = ls === 'closed' || ls === 'cancelled' || st === 'cancelled' || st === 'completed';
        if (isClosed) return null; // hide job chip when cancelled/closed
        return (
          <div className="mt-2 p-2 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800 flex items-center gap-2">
              <span className="font-medium">Job:</span> {job.title}
              {ls && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  {ls.replaceAll('_',' ')}
                </span>
              )}
            </p>
          </div>
        );
      })()}
    </div>
  );
};

export default ChatHeader;


