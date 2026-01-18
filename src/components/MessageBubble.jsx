import { useState } from 'react';
import {
  FiMapPin,
  FiExternalLink,
  FiEdit3,
  FiTrash2,
  FiCornerUpLeft,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiX,
  FiUser,
  FiMap
} from 'react-icons/fi';

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

  const renderLocationMessage = () => {
    if (!message.content?.location) return null;
    const { lat, lng } = message.content.location || {};
    if (lat === undefined || lng === undefined) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isOwn ? 'bg-white/20' : 'bg-trust/10 text-trust'}`}>
            <FiMapPin className="w-5 h-5" />
          </div>
          <span className="font-tight font-bold text-sm tracking-tight">
            {message.messageType === 'location_share' ? 'Real-time entry point shared' : 'Pinned location'}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onViewMap && onViewMap(message.content.location)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${isOwn
              ? 'bg-white/20 hover:bg-white/30 text-white'
              : 'bg-stone-200/50 hover:bg-stone-200 text-charcoal dark:bg-stone-800 dark:text-stone-300'
              }`}
          >
            <FiMap className="w-3 h-3" />
            VIRTUAL VIEW
          </button>

          <button
            onClick={() => onOpenInMaps && onOpenInMaps(lat, lng)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${isOwn
              ? 'bg-trust/80 hover:bg-trust text-white shadow-sm'
              : 'bg-charcoal text-white hover:bg-charcoal/90 dark:bg-stone-700'
              }`}
          >
            <FiExternalLink className="w-3 h-3" />
            OPEN MAPS
          </button>
        </div>
      </div>
    );
  };

  const renderReplyPreview = () => {
    if (!message.replyTo) return null;
    return (
      <div className={`text-xs mb-3 p-3 rounded-2xl border ${isOwn
        ? 'bg-white/10 border-white/20 text-white/80'
        : 'bg-stone-50 border-stone-100 text-stone-400 dark:bg-stone-900/40 dark:border-stone-800'
        }`}>
        <div className="font-bold uppercase tracking-[0.1em] text-[9px] mb-1">Replying to</div>
        <div className="truncate italic">
          {message.replyTo.content?.text || 'Multimedia entry...'}
        </div>
      </div>
    );
  };

  if (message.isDeleted) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} py-2`}>
        <div className={`px-5 py-2.5 rounded-2xl border border-stone-100 dark:border-stone-800 text-stone-300 dark:text-stone-600 text-xs italic font-medium`}>
          Message redacted from the grid
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} py-3 px-2 transition-all ${isSelected ? 'bg-stone-100/50 dark:bg-stone-800/30 rounded-3xl' : ''}`}>
      {!isOwn && (
        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 ml-4">
          {message.sender?.name || 'Anonymous'}
        </span>
      )}

      <div className="relative group w-full">
        <div
          className={`p-4 sm:p-6 transition-all relative ${isOwn
            ? 'bg-stone-50/50 dark:bg-stone-800/20 border-r-4 border-trust text-charcoal dark:text-stone-100'
            : 'bg-white dark:bg-charcoal border-l-4 border-stone-200 dark:border-stone-700 text-charcoal dark:text-stone-300'
            }`}
          onMouseEnter={() => setShowActions(true)}
          onMouseLeave={() => setShowActions(false)}
          onContextMenu={(e) => {
            if (canDelete) {
              e.preventDefault();
              if (window.confirm('Delete this message?')) {
                onDelete?.(message._id);
              }
            }
          }}
          onTouchStart={beginLongPress}
          onTouchEnd={cancelLongPress}
        >
          {renderReplyPreview()}

          {isEditing ? (
            <div className="space-y-4">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleKeyPress}
                className="w-full p-4 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl text-sm font-medium focus:outline-none focus:border-trust resize-none"
                rows={3}
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-trust text-white rounded-xl text-[10px] font-bold uppercase tracking-widest"
                >
                  SAVE CHANGES
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-stone-100 dark:bg-stone-800 text-charcoal dark:text-stone-300 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                >
                  ABORT
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {message.content?.text && (
                <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{message.content.text}</p>
              )}
              {message.content?.location && renderLocationMessage()}

              {/* Media rendering (simplified for aesthetics) */}
              {message.content?.media?.map((m, i) => (
                <div key={i} className="rounded-2xl overflow-hidden border border-paper/10 shadow-sm mt-3">
                  <img src={m.url} alt="" className="w-full h-auto object-cover max-h-96" />
                </div>
              ))}
            </div>
          )}

          {/* Inline Action Bar */}
          {showActions && !isEditing && (
            <div className={`absolute top-0 ${isOwn ? '-left-12' : '-right-12'} translate-y-1/2 flex flex-col gap-2 p-1`}>
              {onReply && (
                <button onClick={() => onReply(message)} className="p-2.5 bg-white dark:bg-stone-800 shadow-sm border border-stone-100 dark:border-stone-700 rounded-xl text-stone-400 hover:text-trust transition-colors">
                  <FiCornerUpLeft className="w-4 h-4" />
                </button>
              )}
              {canEdit && (
                <button onClick={() => setIsEditing(true)} className="p-2.5 bg-white dark:bg-stone-800 shadow-sm border border-stone-100 dark:border-stone-700 rounded-xl text-stone-400 hover:text-trust transition-colors">
                  <FiEdit3 className="w-4 h-4" />
                </button>
              )}
              {canDelete && (
                <button onClick={() => onDelete?.(message._id)} className="p-2.5 bg-white dark:bg-stone-800 shadow-sm border border-stone-100 dark:border-stone-700 rounded-xl text-stone-400 hover:text-clay transition-colors">
                  <FiTrash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        <div className={`flex items-center gap-3 mt-2 px-3 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[10px] font-bold text-stone-300 dark:text-stone-600 uppercase tracking-widest">
            {formatTime(message.createdAt)}
          </span>
          {message.isEdited && <span className="text-[10px] font-bold text-trust uppercase tracking-widest">Edited</span>}
          {isOwn && (
            <div className="flex items-center gap-1">
              {message.isRead ? (
                <FiCheckCircle className="w-3 h-3 text-trust" />
              ) : (
                <FiCheck className="w-3 h-3 text-stone-300" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
