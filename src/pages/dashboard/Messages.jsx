import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaSearch, 
  FaPaperPlane, 
  FaFile, 
  FaPhone, 
  FaEllipsisV,
  FaArrowLeft,
  FaCheck,
  FaCheckDouble,
  FaClock,
  FaEdit,
  FaTrash,
  FaReply,
  FaSmile,
  FaComments,
  FaSpinner,
  FaMapMarkerAlt,
  FaUser,
  FaMap,
  FaLocationArrow,
  FaShare,
  FaBan,
  FaInfoCircle,
  FaExternalLinkAlt,
  FaTimes,
  FaShieldAlt,
  FaStop
} from 'react-icons/fa';
import { useAuth } from '../../context/useAuth';
import { useSocket } from '../../context/SocketContext';
import { 
  getConversations, 
  createOrGetConversation, 
  getMessages, 
  sendMessage, 
  markConversationAsRead,
  shareLocation,
  stopLocationShare,
  editMessage,
  deleteMessage
} from '../../utils/api';
import { compressImage, validateImageFile } from '../../utils/imageCompression';
import FriendsMap from '../../components/FriendsMap';
import MapView from '../../components/MapView';
import ConfirmationModal from '../../components/ConfirmationModal';
import PrivacySettings from '../../components/PrivacySettings';
import ChatWindow from '../../components/ChatWindow';
import useLocationSessionManager from '../../hooks/useLocationSessionManager';

const Messages = () => {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const { socket, isConnected, emit, on, off } = useSocket();
  const navigate = useNavigate();

  // State
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [presenceByUser, setPresenceByUser] = useState({});
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [showFriendsMap, setShowFriendsMap] = useState(false);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showLocationConfirmModal, setShowLocationConfirmModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [sharedLocations, setSharedLocations] = useState([]);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    shareLocation: true,
    showOnlineStatus: true,
    allowMessages: true
  });

  const messagesEndRef = useRef(null);

  // Location session manager
  const {
    timeRemaining,
    formatTimeRemaining,
    stopSession
  } = useLocationSessionManager(selectedConversation?._id, isSharingLocation, privacySettings);

  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      try {
        setLoading(true);
        const response = await getConversations();
        if (response.success) {
          setConversations(response.data);
          
          // If conversationId is provided, select that conversation
          if (conversationId) {
            const conversation = response.data.find(conv => conv._id === conversationId);
            if (conversation) {
              setSelectedConversation(conversation);
            }
          }
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [conversationId, user]);

  // Load messages for selected conversation
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation._id);
      
      // Join conversation room for real-time updates
      if (socket && isConnected) {
        emit('join', selectedConversation._id);
      }
    }
    
    // Cleanup: leave previous conversation room
    return () => {
      if (socket && isConnected && selectedConversation) {
        emit('leave', selectedConversation._id);
      }
    };
  }, [selectedConversation, socket, isConnected, emit]);

  // Socket.IO event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for new messages
    const handleNewMessage = (message) => {
      if (message.conversation === selectedConversation?._id) {
        setMessages(prev => [...prev, message]);
        
        // Update conversation last message
        setConversations(prev => 
          prev.map(conv => 
            conv._id === message.conversation 
              ? { 
                  ...conv, 
                  lastMessage: message,
                  updatedAt: message.createdAt
                }
              : conv
          )
        );
      }
    };

    // Listen for typing indicators
    const handleTyping = (data) => {
      if (data.conversationId === selectedConversation?._id && data.userId !== user?.id) {
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
      if (data.conversationId === selectedConversation?._id) {
        setMessages(prev => 
          prev.map(msg => 
            msg._id === data.messageId 
              ? { ...msg, isRead: true, readAt: data.readAt }
              : msg
          )
        );
      }
    };

    // Listen for presence updates
    const handlePresence = (data) => {
      setPresenceByUser(prev => ({
        ...prev,
        [data.userId]: {
          isOnline: data.isOnline,
          lastSeen: data.lastSeen
        }
      }));
    };

    // Listen for location sharing events
    const handleLocationShared = (data) => {
      console.log('Location shared received:', data);
      setSharedLocations(prev => [...prev, {
        userId: data.senderId,
        lat: data.coordinates.lat,
        lng: data.coordinates.lng,
        timestamp: data.timestamp,
        user: data.user
      }]);
    };

    const handleLocationSharingStarted = (data) => {
      console.log('Location sharing started:', data);
      setIsSharingLocation(true);
    };

    const handleLocationUpdate = (data) => {
      console.log('Location updated received:', data);
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

    const handleLocationStopped = (data) => {
      console.log('Location stopped for user:', data);
      // Remove the location from shared locations
      setSharedLocations(prev => prev.filter(loc => loc.userId !== data.userId));
    };

    const handleLocationSharingStopped = (data) => {
      console.log('Location sharing stopped for current user:', data);
      setIsSharingLocation(false);
      setUserLocation(null);
    };

    on('receive_message', handleNewMessage);
    on('user_typing', handleTyping);
    on('message_read', handleMessageRead);
    on('presence:update', handlePresence);
    on('locationShared', handleLocationShared);
    on('locationSharingStarted', handleLocationSharingStarted);
    on('locationUpdated', handleLocationUpdate);
    on('locationStopped', handleLocationStopped);
    on('locationSharingStopped', handleLocationSharingStopped);

    return () => {
      off('receive_message', handleNewMessage);
      off('user_typing', handleTyping);
      off('message_read', handleMessageRead);
      off('presence:update', handlePresence);
      off('locationShared', handleLocationShared);
      off('locationSharingStarted', handleLocationSharingStarted);
      off('locationUpdated', handleLocationUpdate);
      off('locationStopped', handleLocationStopped);
      off('locationSharingStopped', handleLocationSharingStopped);
    };
  }, [socket, isConnected, selectedConversation, user, on, off]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close chat options when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showChatOptions && !event.target.closest('.chat-options')) {
        setShowChatOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showChatOptions]);

  const loadMessages = async (convId) => {
    try {
      const response = await getMessages(convId);
      if (response.success) {
        setMessages(response.data);
        
        // Mark conversation as read and update unread count
        await markConversationAsRead(convId);
        
        // Update conversations list to clear unread count
        setConversations(prev => 
          prev.map(conv => 
            conv._id === convId 
              ? { 
                  ...conv, 
                  unreadCount: { 
                    ...conv.unreadCount, 
                    [user?.role === 'professional' ? 'professional' : 'user']: 0 
                  }
                }
              : conv
          )
        );
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending) return;

    try {
      setSending(true);
      const response = await sendMessage(selectedConversation._id, {
        messageType: 'text',
        content: { text: newMessage.trim() }
      });

      if (response.success) {
        setNewMessage('');
        
        // Emit message via Socket.IO for real-time delivery
        if (socket && isConnected) {
          emit('send_message', { ...response.data, conversationId: selectedConversation._id });
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    // Emit typing indicator
    if (socket && isConnected && selectedConversation) {
      emit('typing', {
        conversationId: selectedConversation._id,
        userId: user?.id,
        userName: user?.name
      });
    }
  };

  const handleLocationShare = () => {
    if (isSharingLocation) {
      // Stop sharing location
      stopLocationShare();
      setIsSharingLocation(false);
      setUserLocation(null);
    } else {
      // Start sharing location
      setShowLocationModal(true);
    }
  };

  const handleLocationShareConfirm = async () => {
    setShowLocationConfirmModal(false);
    
    try {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by this browser.');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          };

          setUserLocation(location);
          setIsSharingLocation(true);
          
          // Share location via API
          const response = await shareLocation(selectedConversation._id, location);
          if (response.success) {
            // Share via Socket.IO for real-time map updates
            if (socket && isConnected) {
              emit('shareLocation', {
                senderId: user?.id,
                receiverId: getOtherParticipant(selectedConversation)?.user._id,
                conversationId: selectedConversation._id,
                coordinates: {
                  lat: location.lat,
                  lng: location.lng
                }
              });
            }
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Error getting your location. Please try again.');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } catch (error) {
      console.error('Error sharing location:', error);
    }
  };

  const getOtherParticipant = (conversation) => {
    if (!conversation || !user) return null;
    
    if (conversation.participants) {
      return conversation.participants.find(p => p.user._id !== user.id);
    }
    
    return null;
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return d.toLocaleDateString();
  };

  const formatLastSeen = (date) => {
    if (!date) return 'last seen recently';
    const d = new Date(date);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'last seen just now';
    if (mins < 60) return `last seen ${mins} min${mins>1?'s':''} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `last seen ${hours} hour${hours>1?'s':''} ago`;
    return `last seen on ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const filteredConversations = conversations.filter(conv => {
    const otherParticipant = getOtherParticipant(conv);
    return otherParticipant?.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           conv.job?.title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleDeleteConfirm = () => {
    setShowDeleteConfirmModal(true);
  };

  const deleteConversation = async () => {
    // TODO: Implement delete conversation API
    console.log('Delete conversation:', selectedConversation._id);
    setShowDeleteConfirmModal(false);
    setSelectedConversation(null);
  };

  const blockUser = () => {
    // TODO: Implement block user functionality
    console.log('Block user:', getOtherParticipant(selectedConversation)?.user._id);
  };

  const handleSavePrivacySettings = (settings) => {
    setPrivacySettings(settings);
    setShowPrivacySettings(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Conversations Sidebar */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">Messages</h1>
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <FaEllipsisV className="w-5 h-5" />
            </button>
          </div>
          
          {/* Friends Map Button */}
          <div className="mb-3">
            <button
              onClick={() => setShowFriendsMap(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaMap className="w-4 h-4" />
              <span className="text-sm">Friends Map</span>
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <FaComments className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
              <p className="text-gray-500">Start a conversation by connecting with a professional</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const otherParticipant = getOtherParticipant(conversation);
              const isSelected = selectedConversation?._id === conversation._id;
              // Fix unread count logic - check both user and professional counts
              const userType = user?.role === 'professional' ? 'professional' : 'user';
              const unreadCount = conversation.unreadCount?.[userType] || 0;
              const hasUnread = unreadCount > 0;
              
              return (
                <div
                  key={conversation._id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  } ${hasUnread ? 'bg-blue-25' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-lg font-semibold text-gray-600">
                          {otherParticipant?.user.name?.charAt(0) || '?'}
                        </span>
                      </div>
                      {hasUnread && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 truncate">
                          {otherParticipant?.user.name || 'Unknown User'}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {formatTime(conversation.updatedAt)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-500 truncate mt-1">
                        {conversation.lastMessage?.content?.text || 'No messages yet'}
                      </p>
                      
                      {conversation.job && (
                        <p className="text-xs text-blue-600 mt-1">
                          Job: {conversation.job.title}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <ChatWindow
            conversation={selectedConversation}
            messages={messages}
            onBack={() => setSelectedConversation(null)}
            onViewProfile={() => setShowUserInfo(true)}
            onBlockUser={blockUser}
            onDeleteConversation={handleDeleteConfirm}
            formatTime={formatTime}
            formatLastSeen={formatLastSeen}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaComments className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-gray-500">Choose a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Share Your Location</h3>
            
            {userLocation ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800">
                    <FaMapMarkerAlt className="w-4 h-4" />
                    <span className="font-medium">Location Found</span>
                  </div>
                  <p className="text-sm text-blue-600 mt-1">
                    Lat: {userLocation.lat.toFixed(6)}, Lng: {userLocation.lng.toFixed(6)}
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={sendLocation}
                    disabled={sending}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {sending ? (
                      <FaSpinner className="w-4 h-4 animate-spin" />
                    ) : (
                      <FaLocationArrow className="w-4 h-4" />
                    )}
                    {sending ? 'Sending...' : 'Share Location'}
                  </button>
                  <button
                    onClick={() => setShowLocationModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Getting your location...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Info Modal */}
      {showUserInfo && selectedConversation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">User Information</h3>
              <button
                onClick={() => setShowUserInfo(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            
            {(() => {
              const otherParticipant = getOtherParticipant(selectedConversation);
              const pres = presenceByUser[otherParticipant?.user._id] || {};
              
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-semibold text-gray-600">
                        {otherParticipant?.user.name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-lg font-medium">{otherParticipant?.user.name || 'Unknown User'}</h4>
                      <p className="text-sm text-gray-500">{otherParticipant?.user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-block w-2 h-2 rounded-full ${pres.isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className="text-xs text-gray-500">
                          {pres.isOnline ? 'Online' : formatLastSeen(pres.lastSeen)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {selectedConversation.job && (
                    <div className="border-t pt-4">
                      <h5 className="font-medium text-gray-900 mb-2">Related Job</h5>
                      <p className="text-sm text-gray-600">{selectedConversation.job.title}</p>
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={() => {
                        setShowUserInfo(false);
                        // TODO: Navigate to user profile
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => {
                        setShowUserInfo(false);
                        blockUser();
                      }}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Block User
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Friends Map */}
      <FriendsMap
        isOpen={showFriendsMap}
        onClose={() => setShowFriendsMap(false)}
        conversations={conversations}
      />

      {/* Location Map */}
      <MapView
        isOpen={showLocationMap}
        onClose={() => setShowLocationMap(false)}
        locations={sharedLocations}
        userLocation={selectedLocation}
      />

      {/* Location Sharing Confirmation Modal */}
      {selectedConversation && (
        <ConfirmationModal
          isOpen={showLocationConfirmModal}
          onClose={() => setShowLocationConfirmModal(false)}
          onConfirm={handleLocationShareConfirm}
          title="Share Your Location"
          message={`Are you sure you want to share your location with ${getOtherParticipant(selectedConversation)?.user.name || 'this person'}? They will be able to see your current location on the map.`}
          confirmText="Share Location"
          cancelText="Cancel"
          type="location"
        />
      )}

      {/* Delete Conversation Confirmation Modal */}
      {selectedConversation && (
        <ConfirmationModal
          isOpen={showDeleteConfirmModal}
          onClose={() => setShowDeleteConfirmModal(false)}
          onConfirm={deleteConversation}
          title="Delete Conversation"
          message={`Are you sure you want to delete this conversation with ${getOtherParticipant(selectedConversation)?.user.name || 'this person'}? This action cannot be undone and all messages will be permanently deleted.`}
          confirmText="Delete Conversation"
          cancelText="Cancel"
          type="delete"
        />
      )}

      {/* Privacy Settings Modal */}
      <PrivacySettings
        isOpen={showPrivacySettings}
        onClose={() => setShowPrivacySettings(false)}
        onSave={handleSavePrivacySettings}
        currentSettings={privacySettings}
        isLoading={false}
      />

    </div>
  );
};

export default Messages;