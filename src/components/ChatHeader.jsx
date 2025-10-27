import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaArrowLeft, 
  FaInfoCircle, 
  FaEllipsisV, 
  FaMap,
  FaTrash,
  FaUser
} from 'react-icons/fa';

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
  const handleDeleteAllMessages = () => {
    onDeleteAllMessages?.();
  };
  const [showOptions, setShowOptions] = useState(false);

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
          
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center cursor-pointer overflow-hidden"
               onClick={() => onViewProfile?.()}>
            {otherParticipant?.user?.profilePicture || otherParticipant?.user?.avatarUrl ? (
              <img
                src={otherParticipant.user.profilePicture || otherParticipant.user.avatarUrl}
                alt={otherParticipant.user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-lg font-semibold text-gray-600">
                {otherParticipant?.user?.name?.charAt(0) || '?'}
              </span>
            )}
          </div>
          
          <div>
            <h2 className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                onClick={() => onViewProfile?.()}>
              {otherParticipant?.user?.name || 'Unknown User'}
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
          {/* Bulk Actions Toggle */}
          {onToggleBulkActions && (
            <button
              onClick={() => onToggleBulkActions()}
              className={`p-2 transition-colors ${
                showBulkActions 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Bulk Actions"
            >
              <FaTrash className="w-5 h-5" />
            </button>
          )}
          
          {/* Map Button */}
          {onViewMap && (
            <button
              onClick={() => onViewMap()}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="View Map"
            >
              <FaMap className="w-5 h-5" />
            </button>
          )}
          
          {/* Profile Button */}
          {onViewProfile && (
            <button
              onClick={() => onViewProfile()}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="View Profile"
            >
              <FaUser className="w-5 h-5" />
            </button>
          )}
          
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
                <button
                  onClick={() => handleOptionClick(onViewProfile)}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <FaInfoCircle className="w-4 h-4" />
                  View Profile
                </button>
                
                {onViewMap && (
                  <button
                    onClick={() => handleOptionClick(onViewMap)}
                    className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FaMap className="w-4 h-4" />
                    View Map
                  </button>
                )}
                
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
                    onClick={() => handleOptionClick(handleDeleteAllMessages)}
                    className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <FaTrash className="w-4 h-4" />
                    Delete All My Messages
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


