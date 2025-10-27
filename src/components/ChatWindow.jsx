import { useState, useEffect, useRef } from 'react';
import { 
  FaPaperPlane, 
  FaUser, 
  FaSpinner,
  FaComments,
  FaTrash
} from 'react-icons/fa';
import { useAuth } from '../context/useAuth';
import { useSocket } from '../context/SocketContext';
import { 
  sendMessage, 
  editMessage, 
  deleteMessage,
  shareLocation,
  stopLocationShare,
  deleteMyMessagesInConversation
} from '../utils/api';
import MessageBubble from './MessageBubble';
import ChatHeader from './ChatHeader';
import LocationModal from './LocationModal';
import MapView from './MapView';
import LocationButton from './LocationButton';
import ChatProfileModal from './ChatProfileModal';

const ChatWindow = ({ 
  conversation, 
  messages = [], 
  onBack,
  onViewProfile,
  onDeleteConversation,
  onDeleteAllMessages,
  formatTime,
  formatLastSeen 
}) => {
  const { user } = useAuth();
  const { socket, isConnected, emit, on, off } = useSocket();
  const messagesEndRef = useRef(null);
  
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [presence, setPresence] = useState({});
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [sharedLocations, setSharedLocations] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [locationWatchId, setLocationWatchId] = useState(null);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

  // Get other participant
  const otherParticipant = conversation?.participants?.find(p => p?.user?._id !== user?.id);

  // Handle message deletion events
  const handleMessageDeleted = (data) => {
    console.log('Message deleted received:', data);
    // The message will be updated via the API response
    // This is just for real-time updates to other users
  };

  const handleMessagesDeleted = (data) => {
    console.log('Messages deleted received:', data);
    // The messages will be updated via the API response
    // This is just for real-time updates to other users
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket || !isConnected || !conversation) return;

    // Join conversation room
    emit('join', conversation._id);

    // Listen for new messages
    const handleReceiveMessage = (message) => {
      // This will be handled by the parent component
    };

    // Listen for typing indicators
    const handleTyping = (data) => {
      if (data.userId !== user?.id) {
        setTypingUsers(prev => {
          const filtered = prev.filter(u => u.userId !== data.userId);
          return [...filtered, { userId: data.userId, name: data.userName }];
        });
        
        // Clear typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
        }, 3000);
      }
    };

    // Listen for message read receipts
    const handleMessageRead = (data) => {
      // Update message read status
    };

    // Listen for location sharing
    const handleReceiveLocation = (data) => {
      console.log('🎯 Location shared received in chat:', data);
      if (data.senderId !== user?.id) {
        setSharedLocations(prev => [...prev, {
          ...data.coordinates,
          user: data.user,
          userId: data.senderId,
          timestamp: data.timestamp
        }]);
      }
    };

    // Listen for location sharing confirmation (for sender)
    const handleLocationSharingStarted = (data) => {
      console.log('🎯 Location sharing started confirmation:', data);
      // This is just confirmation for the sender
    };

    // Listen for location updates
    const handleLocationUpdate = (data) => {
      console.log('🎯 Location updated received:', data);
      if (data.userId !== user?.id) {
        setSharedLocations(prev => 
          prev.map(loc => 
            loc.userId === data.userId 
              ? { 
                  ...loc, 
                  lat: data.lat, 
                  lng: data.lng, 
                  timestamp: data.timestamp,
                  user: data.user
                }
              : loc
          )
        );
      }
    };

    // Listen for stop location sharing
    const handleStopLocationUpdate = (data) => {
      if (data.userId !== user?.id) {
        setSharedLocations(prev => prev.filter(loc => loc.user?.name !== data.user?.name));
      }
    };

    on('receive_message', handleReceiveMessage);
    on('user_typing', handleTyping);
    on('message_read', handleMessageRead);
    on('locationShared', handleReceiveLocation);
    on('locationSharingStarted', handleLocationSharingStarted);
    on('location_update', handleLocationUpdate);
    on('stop_location_update', handleStopLocationUpdate);
    on('message_deleted', handleMessageDeleted);
    on('messages_deleted', handleMessagesDeleted);

    return () => {
      emit('leave', conversation._id);
      off('receive_message', handleReceiveMessage);
      off('user_typing', handleTyping);
      off('message_read', handleMessageRead);
      off('locationShared', handleReceiveLocation);
      off('locationSharingStarted', handleLocationSharingStarted);
      off('location_update', handleLocationUpdate);
      off('stop_location_update', handleStopLocationUpdate);
      off('message_deleted', handleMessageDeleted);
      off('messages_deleted', handleMessagesDeleted);
    };
  }, [socket, isConnected, conversation, user, emit, on, off]);

  // Cleanup location tracking on unmount
  useEffect(() => {
    return () => {
      stopLiveLocationTracking();
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversation || sending) return;

    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      const response = await sendMessage(conversation._id, {
        content: { text: messageText },
        messageType: 'text',
        replyTo: replyingTo?._id
      });

      if (response.success) {
        // Emit message via Socket.IO for real-time delivery
        if (socket && isConnected) {
          emit('send_message', {
            ...response.data,
            conversationId: conversation._id
          });
        }
        
        setReplyingTo(null);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Revert message input
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = async (messageId, content) => {
    try {
      const response = await editMessage(messageId, content);
      if (response.success) {
        // Emit edit via Socket.IO
        if (socket && isConnected) {
          emit('message_edited', {
            messageId,
            content,
            conversationId: conversation._id
          });
        }
      }
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      const response = await deleteMessage(messageId);
      if (response.success) {
        // Emit delete via Socket.IO
        if (socket && isConnected) {
          emit('message_deleted', {
            messageId,
            conversationId: conversation._id
          });
        }
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleSelectMessage = (messageId) => {
    setSelectedMessages(prev => {
      if (prev.includes(messageId)) {
        return prev.filter(id => id !== messageId);
      } else {
        return [...prev, messageId];
      }
    });
  };

  const handleSelectAllMessages = () => {
    const userMessages = messages.filter(msg => msg.sender._id === user?.id);
    const userMessageIds = userMessages.map(msg => msg._id);
    setSelectedMessages(userMessageIds);
  };

  const handleBulkDeleteMessages = async () => {
    if (selectedMessages.length === 0) return;

    try {
      setSending(true);
      const deletePromises = selectedMessages.map(messageId => deleteMessage(messageId));
      await Promise.all(deletePromises);
      
      // Emit bulk delete via Socket.IO
      if (socket && isConnected) {
        emit('messages_deleted', {
          messageIds: selectedMessages,
          conversationId: conversation._id
        });
      }
      
      setSelectedMessages([]);
      setShowBulkActions(false);
    } catch (error) {
      console.error('Error bulk deleting messages:', error);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteAllMessages = async () => {
    try {
      setSending(true);
      const response = await deleteMyMessagesInConversation(conversation._id);
      if (response?.success) {
        // Emit bulk delete via Socket.IO
        if (socket && isConnected) {
          emit('messages_deleted', {
            messageIds: [], // server-side deletion; clients should refetch or filter
            conversationId: conversation._id
          });
        }
        setShowDeleteAllModal(false);
      }
    } catch (error) {
      console.error('Error deleting all messages:', error);
    } finally {
      setSending(false);
    }
  };

  const handleShareLocation = async (location) => {
    try {
      setSending(true);
      const response = await shareLocation(conversation._id, {
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy
      });

      if (response.success) {
        setIsSharingLocation(true);
        setUserLocation({
          ...location,
          avatarUrl: user?.profilePicture || user?.avatarUrl
        });
        
        // Emit location share via Socket.IO
        if (socket && isConnected) {
          emit('shareLocation', {
            senderId: user?.id,
            receiverId: otherParticipant?.user._id,
            coordinates: location,
            conversationId: conversation._id
          });
        }

        // Start live location tracking
        startLiveLocationTracking();
      }
    } catch (error) {
      console.error('Error sharing location:', error);
    } finally {
      setSending(false);
    }
  };

  const startLiveLocationTracking = () => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        };

        // Update local user location
        setUserLocation(prev => ({
          ...prev,
          ...location,
          avatarUrl: user?.profilePicture || user?.avatarUrl
        }));

        // Send location update to receiver
        if (socket && isConnected) {
          emit('updateLocation', {
            userId: user?.id,
            lat: location.lat,
            lng: location.lng,
            receiverId: otherParticipant?.user._id,
            conversationId: conversation._id
          });
        }
      },
      (error) => {
        console.error('Error tracking location:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000 // Update every 5 seconds
      }
    );

    setLocationWatchId(watchId);
  };

  const stopLiveLocationTracking = () => {
    if (locationWatchId) {
      navigator.geolocation.clearWatch(locationWatchId);
      setLocationWatchId(null);
    }
  };

  const handleStopLocationShare = async () => {
    try {
      setSending(true);
      
      // Stop live tracking
      stopLiveLocationTracking();
      
      const response = await stopLocationShare(conversation._id);

      if (response.success) {
        setIsSharingLocation(false);
        setUserLocation(null);
        
        // Emit stop location share via Socket.IO
        if (socket && isConnected) {
          emit('stopLocationShare', {
            userId: user?.id,
            conversationId: conversation._id
          });
        }
      }
    } catch (error) {
      console.error('Error stopping location share:', error);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    // Emit typing indicator
    if (socket && isConnected && conversation && e.target.value.trim()) {
      emit('user_typing', {
        conversationId: conversation._id,
        userId: user?.id,
        userName: user?.name
      });
    }
  };

  const openInMaps = (lat, lng) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    let mapsUrl;
    if (isIOS) {
      mapsUrl = `http://maps.apple.com/?q=${lat},${lng}`;
    } else if (isAndroid) {
      mapsUrl = `geo:${lat},${lng}?q=${lat},${lng}`;
    } else {
      mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    }
    
    window.open(mapsUrl, '_blank');
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaComments className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
          <p className="text-gray-500">Choose a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <ChatHeader
        conversation={conversation}
        otherParticipant={otherParticipant}
        presence={presence}
        onBack={onBack}
        onViewProfile={() => setShowProfileModal(true)}
        onViewMap={() => setShowMapView(true)}
        onDeleteConversation={onDeleteConversation}
        onToggleBulkActions={() => setShowBulkActions(!showBulkActions)}
        onDeleteAllMessages={onDeleteAllMessages || (() => setShowDeleteAllModal(true))}
        showBulkActions={showBulkActions}
        formatLastSeen={formatLastSeen}
        userRole={user?.role}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isOwn = message.sender._id === user?.id;
          const canEdit = isOwn && !message.isDeleted && 
            (new Date() - new Date(message.createdAt)) < 2 * 60 * 1000; // 2 minutes
          const canDelete = isOwn && !message.isDeleted;
          
          return (
            <MessageBubble
              key={message._id}
              message={message}
              isOwn={isOwn}
              onEdit={handleEditMessage}
              onDelete={handleDeleteMessage}
              onReply={setReplyingTo}
              onViewMap={() => setShowMapView(true)}
              onOpenInMaps={openInMaps}
              formatTime={formatTime}
              canEdit={canEdit}
              canDelete={canDelete}
              isSelected={selectedMessages.includes(message._id)}
              onSelect={handleSelectMessage}
              showBulkActions={showBulkActions}
            />
          );
        })}
        
        {/* Typing Indicators */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 p-3 text-sm text-gray-500">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>
              {typingUsers.map(u => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="bg-blue-50 border-t border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-blue-700">
                {selectedMessages.length} message{selectedMessages.length !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={handleSelectAllMessages}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Select All My Messages
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedMessages([]);
                  setShowBulkActions(false);
                }}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDeleteMessages}
                disabled={selectedMessages.length === 0 || sending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        {replyingTo && (
          <div className="mb-3 p-2 bg-gray-100 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Replying to:</p>
              <p className="text-sm text-gray-900">{replyingTo.content?.text}</p>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={handleTyping}
              placeholder="Type a message..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-400"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
          </div>
          
          <div className="flex items-center gap-2">
            {/* Location Button */}
            <LocationButton
              onShareLocation={() => setShowLocationModal(true)}
              onStopSharing={handleStopLocationShare}
              isSharing={isSharingLocation}
              isLoading={sending}
              disabled={!conversation}
            />

            {/* Share Contact Button */}
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Share contact"
              onClick={async () => {
                if (!conversation) return;
                try {
                  const resp = await sendMessage(conversation._id, {
                    messageType: 'contact',
                    content: { 
                      contact: { 
                        name: user?.name, 
                        phone: user?.phone || 'N/A', 
                        email: user?.email 
                      } 
                    }
                  });
                  if (resp.success && socket && isConnected) {
                    emit('send_message', { ...resp.data, conversationId: conversation._id });
                  }
                } catch (e) {
                  console.error(e);
                }
              }}
            >
              <FaUser className="w-5 h-5" />
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <FaSpinner className="w-4 h-4 animate-spin" />
              ) : (
                <FaPaperPlane className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Location Modal */}
      <LocationModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onConfirm={handleShareLocation}
        onCancel={() => setShowLocationModal(false)}
        otherUserName={otherParticipant?.user?.name}
        isLoading={sending}
      />

      {/* Map View */}
      <MapView
        isOpen={showMapView}
        onClose={() => setShowMapView(false)}
        locations={sharedLocations}
        userLocation={userLocation}
        onStopSharing={handleStopLocationShare}
        isSharing={isSharingLocation}
      />

      {/* Profile Modal */}
      <ChatProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={otherParticipant?.user}
        isProfessional={otherParticipant?.user?.role === 'professional'}
        onViewFullProfile={() => {
          setShowProfileModal(false);
          onViewProfile?.();
        }}
      />

      {/* Delete All Messages Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <FaTrash className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete All Messages</h3>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-600 mb-3">
                Are you sure you want to delete all your messages in this conversation? This action cannot be undone.
              </p>
              <p className="text-sm text-gray-500">
                This will only delete messages you sent. Messages from {otherParticipant?.user?.name || 'the other person'} will remain.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDeleteAllMessages}
                disabled={sending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {sending ? (
                  <>
                    <FaSpinner className="w-4 h-4 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  'Delete All My Messages'
                )}
              </button>
              <button
                onClick={() => setShowDeleteAllModal(false)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;


