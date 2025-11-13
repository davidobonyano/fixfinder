import { useState } from 'react';
import { 
  FaMapMarkerAlt, 
  FaExternalLinkAlt, 
  FaEdit, 
  FaTrash, 
  FaReply,
  FaCheck,
  FaCheckDouble,
  FaClock,
  FaTimes,
  FaUser,
  FaMap
} from 'react-icons/fa';

const MessageBubble = ({ 
  message, 
  isOwn, 
  onEdit, 
  onDelete, 
  onReply,
  onViewMap,
  onOpenInMaps,
  formatTime,
  canEdit = false,
  canDelete = false,
  isSelected = false,
  onSelect = null,
  showBulkActions = false,
  onActivateBulkActions = null
}) => {
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content?.text || '');
  const [pressTimer, setPressTimer] = useState(null);

  const beginLongPress = () => {
    if (!onActivateBulkActions || !onSelect) return;
    const timer = setTimeout(() => {
      onActivateBulkActions();
      onSelect(message._id);
    }, 400);
    setPressTimer(timer);
  };

  const cancelLongPress = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  const handleEdit = () => {
    if (editText.trim() && editText !== message.content?.text) {
      onEdit(message._id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditText(message.content?.text || '');
    }
  };

  const getMessageStatus = () => {
    if (message.isDeleted) return 'deleted';
    if (message.isEdited) return 'edited';
    return 'sent';
  };

  const renderLocationMessage = () => {
    // Only render location message if location data actually exists
    if (!message.content?.location) return null;
    
    // Check if location has actual coordinates
    const { lat, lng, accuracy } = message.content.location || {};
    if (lat === undefined && lng === undefined) return null;

    // Only render if both lat and lng are valid numbers
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    
    return (
      <div className="text-sm text-current">
                <div className="flex items-center gap-2 mb-2">
                  <FaMapMarkerAlt className="w-4 h-4 text-blue-500 dark:text-blue-300" />
                  <span className="font-semibold">
                    {message.messageType === 'location_share'
                      ? (isOwn ? '🗺️ You are now sharing your location' : `📍 ${message.sender?.name || 'User'} is sharing their location with you`)
                      : '📍 Shared location'
                    }
                  </span>
                </div>
        
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => onViewMap && onViewMap(message.content.location)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isOwn 
                ? 'bg-blue-600 hover:bg-blue-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-400' 
                : 'bg-blue-100 hover:bg-blue-200 text-blue-900 dark:bg-blue-500/10 dark:text-blue-200 dark:hover:bg-blue-500/20'
            }`}
          >
            <FaMap className="w-3 h-3" />
            View on Map
          </button>
          
          <button
            onClick={() => onOpenInMaps && onOpenInMaps(lat, lng)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isOwn 
                ? 'bg-green-600 hover:bg-green-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600'
            }`}
          >
            <FaExternalLinkAlt className="w-3 h-3" />
            Get Directions
          </button>
        </div>
        
        <div className="text-xs opacity-75 text-current">
          Accuracy: {accuracy ? Math.round(accuracy) : 'N/A'}m
        </div>
      </div>
    );
  };

  const renderContactMessage = () => {
    if (!message.content?.contact) return null;

    return (
      <div className="text-sm text-current">
        <div className="font-semibold mb-1 text-gray-900 dark:text-gray-100">Shared contact</div>
        <div className="opacity-90 text-gray-800 dark:text-gray-200">{message.content.contact.name}</div>
        <div className="opacity-90 text-gray-800 dark:text-gray-200">{message.content.contact.phone}</div>
        {message.content.contact.email && (
          <div className="opacity-90 text-gray-800 dark:text-gray-200">{message.content.contact.email}</div>
        )}
      </div>
    );
  };

  const renderMediaMessage = () => {
    if (!message.content?.media || message.content.media.length === 0) return null;

    return (
      <div className="mt-2 space-y-2">
        {message.content.media.map((media, index) => (
          <div key={index}>
            {media.type === 'image' ? (
              <img
                src={media.url}
                alt={media.filename}
                className="max-w-full h-auto rounded cursor-pointer"
                onClick={() => window.open(media.url, '_blank')}
              />
            ) : (
              <div className="flex items-center gap-2 p-2 bg-gray-100 rounded dark:bg-gray-800">
                <FaFile className="w-4 h-4" />
                <span className="text-sm text-gray-700 dark:text-gray-200">{media.filename}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderReplyPreview = () => {
    if (!message.replyTo) return null;

    return (
      <div className={`text-xs mb-2 p-2 rounded ${
        isOwn ? 'bg-blue-600 text-white dark:bg-indigo-500' : 'bg-gray-300 text-gray-900 dark:bg-slate-700 dark:text-gray-100'
      }`}>
        <div className="font-medium">Replying to:</div>
        <div className="truncate">
          {message.replyTo.content?.text || 
           message.replyTo.content?.location ? '📍 Location' :
           message.replyTo.content?.contact ? '👤 Contact' :
           'Message'}
        </div>
      </div>
    );
  };

  if (message.isDeleted) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
          <div className={`p-3 rounded-lg ${
            isOwn ? 'bg-gray-300 text-gray-600' : 'bg-gray-200 text-gray-500'
          }`}>
            <p className="text-sm italic">This message was deleted</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isSelected ? 'bg-blue-50 dark:bg-slate-800/40 rounded-lg p-2 transition-colors' : ''}`}>
      {/* Selection checkbox for bulk actions */}
      {showBulkActions && onSelect && (
        <div className="flex items-center mr-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(message._id)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </div>
      )}
      
      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
        {!isOwn && (
          <p className="text-xs text-gray-500 mb-1 dark:text-gray-400">
            {message.sender?.name || 'Unknown User'}
          </p>
        )}
        
        <div
          className={`p-3 rounded-lg relative group transition-colors ${
            isOwn
              ? 'bg-blue-500 text-white dark:bg-indigo-500'
              : 'bg-gray-200 text-gray-900 dark:bg-slate-800 dark:text-gray-100'
          }`}
          onMouseEnter={() => setShowActions(true)}
          onMouseLeave={() => setShowActions(false)}
          onContextMenu={(e) => {
            if (onActivateBulkActions && onSelect) {
              e.preventDefault();
              onActivateBulkActions();
              onSelect(message._id);
            }
          }}
          onTouchStart={beginLongPress}
          onTouchEnd={cancelLongPress}
          onTouchCancel={cancelLongPress}
        >
          {renderReplyPreview()}
          
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleKeyPress}
                className="w-full p-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleEdit}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditText(message.content?.text || '');
                  }}
                  className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
          {message.content?.text && (
            <p className="text-sm whitespace-pre-wrap text-current">{message.content.text}</p>
              )}

              {message.content?.location && renderLocationMessage()}
              {message.content?.contact && renderContactMessage()}
              {message.content?.media && renderMediaMessage()}

              {/* Action buttons */}
              {showActions && (canEdit || canDelete || onReply) && (
                <div className={`absolute top-2 right-2 flex gap-1 ${
                  isOwn ? 'bg-blue-600 dark:bg-indigo-500' : 'bg-gray-300 dark:bg-slate-700'
                } rounded-lg p-1`}>
                  {onReply && (
                    <button
                      onClick={() => onReply(message)}
                      className="p-1 hover:bg-blue-700 rounded transition-colors"
                      title="Reply"
                    >
                      <FaReply className="w-3 h-3" />
                    </button>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1 hover:bg-blue-700 rounded transition-colors"
                      title="Edit"
                    >
                      <FaEdit className="w-3 h-3" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => onDelete && onDelete(message._id)}
                      className="p-1 hover:bg-red-600 rounded transition-colors"
                      title="Delete"
                    >
                      <FaTrash className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        
        <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatTime(message.createdAt)}
          </span>
          {message.isEdited && (
            <span className="text-xs text-gray-400 dark:text-gray-500">(edited)</span>
          )}
          {isOwn && (
            <div className="flex items-center gap-1">
              {message.isRead ? (
                <FaCheckDouble className="w-3 h-3 text-blue-500" />
              ) : (
                <FaCheck className="w-3 h-3 text-gray-400" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
