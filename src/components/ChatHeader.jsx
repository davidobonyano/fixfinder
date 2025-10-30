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
          
          <UserAvatar user={hydratedUser} size="md" onClick={async () => {
            const isPro = hydratedUser?.role === 'professional';
            if (isPro) {
              try {
                const proResp = await getProfessional(hydratedUser?._id, { byUser: true });
                const pro = proResp?.data || proResp;
                const proId = pro?._id || pro?.id || hydratedUser?._id;
                navigate(`/dashboard/professional/${proId}`);
              } catch (e) {
                navigate(`/dashboard/professional/${hydratedUser?._id}`);
              }
            } else {
              onViewProfile?.();
            }
          }} />
          
          <div>
            <h2 className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                onClick={async () => {
                  const isPro = hydratedUser?.role === 'professional';
                  if (isPro) {
                    try {
                      const proResp = await getProfessional(hydratedUser?._id, { byUser: true });
                      const pro = proResp?.data || proResp;
                      const proId = pro?._id || pro?.id || hydratedUser?._id;
                      navigate(`/dashboard/professional/${proId}`);
                    } catch (e) {
                      navigate(`/dashboard/professional/${hydratedUser?._id}`);
                    }
                  } else {
                    onViewProfile?.();
                  }
                }}>
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
      {conversation?.job?.title && (
        <div className="mt-2 p-2 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Job:</span> {conversation.job.title}
          </p>
        </div>
      )}
    </div>
  );
};

export default ChatHeader;


