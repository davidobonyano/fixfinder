import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  FaSearch, 
  FaPaperPlane, 
  FaFile, 
  FaPhone, 
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
  FaLocationArrow,
  FaShare,
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
  deleteMessage,
  deleteMyMessagesInConversation,
  deleteConversation as deleteConversationApi,
  getConnections,
  removeConnection,
  getUser,
  deleteAllMessagesForMe,
  deleteConversationForMe
} from '../../utils/api';
import { compressImage, validateImageFile } from '../../utils/imageCompression';
import MapView from '../../components/MapView';
import ConfirmationModal from '../../components/ConfirmationModal';
import PrivacySettings from '../../components/PrivacySettings';
import ChatWindow from '../../components/ChatWindow';
import useLocationSessionManager from '../../hooks/useLocationSessionManager';
import UserAvatar from '../../components/UserAvatar';

const Messages = () => {
  const { conversationId } = useParams();
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const { socket, isConnected, emit, on, off } = useSocket();
  const navigate = useNavigate();

  // State
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hiddenMessageIds, setHiddenMessageIds] = useState(new Set());
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [presenceByUser, setPresenceByUser] = useState({});
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);
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

  // Keep hydrated users in a map
  const [hydratedUsers, setHydratedUsers] = useState({});

  // Place helper functions before anything uses them:
  const getOtherParticipantUser = (otherParticipant) => {
    // If participant has user data, return it
    if (otherParticipant?.user) {
      return otherParticipant.user;
    }
    
    // If participant has no user data but has userType, we need to fetch it
    // For now, return a placeholder object
    if (otherParticipant?.userType) {
      return {
        _id: otherParticipant._id,
        name: otherParticipant.userType === 'user' ? 'User' : 'Professional',
        email: 'Unknown',
        role: otherParticipant.userType
      };
    }
    
    return null;
  };

  const getOtherParticipant = (conversation) => {
    if (!conversation || !user) return null;
    
    if (conversation.participants) {
      // Find the participant that is not the current user
      const otherParticipant = conversation.participants.find(p => {
        // If participant has a user object, check by user._id
        if (p.user && p.user._id) {
          return p.user._id !== user.id;
        }
        
        // If participant has no user object but has userType, check by userType
        if (!p.user && p.userType) {
          // If current user is professional, look for user type participant
          if (user.role === 'professional' && p.userType === 'user') {
            return true;
          }
          // If current user is user, look for professional type participant
          if (user.role === 'user' && p.userType === 'professional') {
            return true;
          }
        }
        
        return false;
      });
      
      // If we found a participant but it doesn't have user data, try to create a placeholder
      if (otherParticipant && !otherParticipant.user && otherParticipant.userType) {
        return {
          ...otherParticipant,
          user: {
            _id: otherParticipant._id,
            name: otherParticipant.userType === 'user' ? 'User' : 'Professional',
            email: 'Unknown',
            role: otherParticipant.userType
          }
        };
      }
      
      return otherParticipant;
    }
    
    return null;
  };

  // Before any use or hydration:
  const filteredConversations = conversations.filter(conv => {
    const otherParticipant = getOtherParticipant(conv);
    const matchName = otherParticipant?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchJob = conv.job?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchName || matchJob;
  });

  // Hydrate users in conversations sidebar if image missing
  useEffect(() => {
    async function hydrateAll() {
      const updates = {};
      await Promise.all(filteredConversations.map(async conv => {
        const participant = getOtherParticipant(conv)?.user;
        if (participant?._id && !(participant.profilePicture || participant.avatarUrl)) {
          try {
            const res = await getUser(participant._id);
            if (res && res.data) {
              updates[participant._id] = { ...participant, ...res.data };
            }
          } catch (_) {}
        } else if (participant?._id) {
          updates[participant._id] = participant;
        }
      }));
      setHydratedUsers(prev => ({ ...prev, ...updates }));
    }
    hydrateAll();
    // eslint-disable-next-line
  }, [filteredConversations.map(conv => getOtherParticipant(conv)?.user?._id).join(','), filteredConversations.length]);

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
          // Prefer conversation passed via navigation state (fresh create)
          const stateConversation = location.state?.conversation;
          if (stateConversation) {
            setSelectedConversation(stateConversation);
          } else if (conversationId) {
            // If conversationId is provided, select that conversation
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
  }, [conversationId, user, location.state]);

  // Prevent body scroll on mobile when chat is open
  useEffect(() => {
    if (selectedConversation) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedConversation]);

  // Load messages for selected conversation
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation._id);
      // load hidden ids for this conversation from localStorage
      try {
        const raw = localStorage.getItem(`hiddenMsgs:${selectedConversation._id}`);
        if (raw) {
          setHiddenMessageIds(new Set(JSON.parse(raw)));
        } else {
          setHiddenMessageIds(new Set());
        }
      } catch (_) {
        setHiddenMessageIds(new Set());
      }
      
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
      const existsInList = conversations.some(conv => conv._id === message.conversation);
      if (!existsInList) {
        // Refresh conversations so newly unhidden/active thread appears
        getConversations().then(resp => {
          if (resp.success) setConversations(resp.data);
        }).catch(() => {});
      }
      if (message.conversation === selectedConversation?._id) {
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          const exists = prev.some(msg => msg._id === message._id);
          if (exists) return prev;
          return [...prev, message];
        });
        
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

    // Listen for user-level incoming message notifications to refresh sidebar
    const handleIncomingMessage = (data) => {
      // Always refresh conversations so hidden/removed threads reappear only on new activity
      getConversations().then(resp => {
        if (resp.success) setConversations(resp.data);
      }).catch(() => {});
    };

    // Listen for user-level job updates
    const handleJobUpdate = (data) => {
      try {
        if (!data) return;
        // Refresh sidebar always so job badge/status updates
        getConversations().then(resp => {
          if (resp.success) setConversations(resp.data);
        }).catch(() => {});
        // If this update belongs to the currently open conversation, update it
        if (data.conversationId && selectedConversation?._id === data.conversationId && data.job) {
          setSelectedConversation(prev => prev ? { ...prev, job: data.job } : prev);
        }
      } catch (_) {}
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
    on('incoming_message', handleIncomingMessage);
    on('job:update', handleJobUpdate);
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
      off('incoming_message', handleIncomingMessage);
      off('job:update', handleJobUpdate);
      off('user_typing', handleTyping);
      off('message_read', handleMessageRead);
      off('presence:update', handlePresence);
      off('locationShared', handleLocationShared);
      off('locationSharingStarted', handleLocationSharingStarted);
      off('locationUpdated', handleLocationUpdate);
      off('locationStopped', handleLocationStopped);
      off('locationSharingStopped', handleLocationSharingStopped);
    };
  }, [socket, isConnected, selectedConversation, user, on, off, conversations]);

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

  const hideMessagesForMe = (ids) => {
    if (!selectedConversation || !ids || ids.length === 0) return;
    setHiddenMessageIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      try {
        localStorage.setItem(`hiddenMsgs:${selectedConversation._id}` , JSON.stringify(Array.from(next)));
      } catch (_) {}
      return next;
    });
  };

  const visibleMessages = messages.filter(m => !hiddenMessageIds.has(m._id));

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

  const handleDeleteConfirm = () => {
    setShowDeleteConfirmModal(true);
  };

  const deleteConversation = async () => {
    if (!selectedConversation) return;
    
    try {
      const response = await deleteConversationApi(selectedConversation._id);
      if (response.success) {
        // Remove from conversations list
        setConversations(prev => prev.filter(c => c._id !== selectedConversation._id));
        setSelectedConversation(null);
        console.log('✅ Conversation deleted');
      }
    } catch (error) {
      console.error('❌ Error deleting conversation:', error);
    }
    setShowDeleteConfirmModal(false);
  };


  const handleDeleteAllMyMessages = async () => {
    if (!selectedConversation) return;
    
    try {
      const response = await deleteAllMessagesForMe(selectedConversation._id);
      if (response.success) {
        // Clear messages
        setMessages([]);
        console.log('✅ All messages deleted');
      }
    } catch (error) {
      console.error('❌ Error deleting messages:', error);
    }
  };

  const handleDeleteAllMessagesInChat = async () => {
    if (!selectedConversation) return;
    try {
      const response = await deleteConversationApi(selectedConversation._id);
      if (response.success) {
        setMessages([]);
        // Optionally, remove from sidebar too:
        setConversations(prev => prev.filter(c => c._id !== selectedConversation._id));
        setSelectedConversation(null);
        console.log('✅ All messages in chat deleted');
      }
    } catch (error) {
      console.error('❌ Error deleting all messages in chat:', error);
    }
  };

  const handleDeleteAllMessagesForMe = async () => {
    if (!selectedConversation) return;
    try {
      const response = await deleteAllMessagesForMe(selectedConversation._id);
      if (response.success) {
        setMessages([]);
        console.log('✅ All messages in this chat are now hidden for me');
      }
    } catch (error) {
      console.error('❌ Error deleting all messages for me:', error);
    }
  };

  const handleClearChatForMe = async () => {
    if (!selectedConversation) return;
    try {
      const response = await deleteAllMessagesForMe(selectedConversation._id);
      if (response.success) {
        setMessages([]);
        console.log('✅ All messages in this chat are now hidden for me');
      }
    } catch (error) {
      console.error('❌ Error hiding all messages for me:', error);
    }
  };

  const handleViewProfile = () => {
    if (!selectedConversation) return;
    const otherParticipant = getOtherParticipant(selectedConversation);
    const otherUser = getOtherParticipantUser(otherParticipant);
    if (otherUser?._id) {
      // Navigate to full profile based on role
      if (otherUser.role === 'professional') {
        navigate(`/professional/${otherUser._id}`);
      } else {
        navigate(`/user/${otherUser._id}`);
      }
    }
  };


  const handleSavePrivacySettings = (settings) => {
    setPrivacySettings(settings);
    setShowPrivacySettings(false);
  };

  const handleDeleteConversationForMe = async () => {
    if (!selectedConversation) return;
    try {
      const response = await deleteConversationForMe(selectedConversation._id);
      if (response.success) {
        setConversations(prev => prev.filter(c => c._id !== selectedConversation._id));
        setSelectedConversation(null);
        console.log('✅ Conversation removed from my feed');
      }
    } catch (error) {
      console.error('❌ Error removing conversation:', error);
    }
    setShowDeleteConfirmModal(false);
  };

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <FaComments className="w-5 h-5 text-indigo-600 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!user && !isLoading) {
    // Instead of instant logout or redirect, show a friendly auth error
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center rounded-2xl mb-4 shadow-lg">
          <span className="text-3xl">🔒</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Needed</h2>
        <p className="text-gray-500 mb-4 max-w-sm text-center">Your session has expired. Sign back in to continue chatting with professionals.</p>
        <a
          href="/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all"
        >
          Go to Login
        </a>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 top-16 bottom-16 md:relative md:inset-auto md:top-auto md:bottom-auto flex flex-col md:flex-row h-auto md:h-[calc(100dvh-120px)] rounded-none md:rounded-3xl shadow-none md:shadow-2xl border-0 md:border border-indigo-100 mx-0 md:mx-0 mt-0 md:mt-0 mb-0 md:mb-0 bg-gradient-to-br from-indigo-50 via-white to-amber-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 z-10">
      {/* Conversations Sidebar */}
      <div
        className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-[360px] flex-col bg-white/70 backdrop-blur-md border-r border-white/40 dark:bg-gray-900/75 dark:border-gray-800`}
      >
        <div className="p-6 border-b border-white/40 space-y-5 dark:border-gray-800">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 dark:text-gray-100">
              <FaComments className="w-6 h-6 text-indigo-500" />
              Messages
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Stay in touch with your connections</p>
          </div>

          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300 w-4 h-4" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border-2 border-white/70 rounded-xl bg-white/70 shadow-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-gray-400 dark:bg-gray-900/60 dark:border-gray-800 dark:placeholder:text-gray-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12 px-4 bg-white/70 rounded-2xl border border-white/60 shadow-inner dark:bg-gray-900/70 dark:border-gray-800">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-2xl flex items-center justify-center mb-4 dark:from-indigo-900 dark:to-indigo-800">
                <FaComments className="w-7 h-7 text-indigo-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 dark:text-gray-100">No conversations yet</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Start by connecting with a professional to begin chatting.</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const otherParticipant = getOtherParticipant(conversation);
              const isSelected = selectedConversation?._id === conversation._id;
              const userType = user?.role === 'professional' ? 'professional' : 'user';
              const unreadCount = conversation.unreadCount?.[userType] || 0;
              const hasUnread = unreadCount > 0;

              return (
                <div
                  key={conversation._id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-indigo-300 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/40 scale-[1.01]'
                      : 'border-white/60 bg-white/80 hover:border-indigo-200 hover:shadow-md hover:-translate-y-0.5 dark:border-gray-800 dark:bg-gray-900/70 dark:hover:border-gray-700'
                  }`}
                >
                  <div className="p-4 flex items-start gap-3">
                    <div className="relative">
                      <UserAvatar user={hydratedUsers[otherParticipant?.user?._id] || otherParticipant?.user} size="lg" />
                      {hasUnread && (
                        <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center font-semibold text-xs ${isSelected ? 'bg-amber-300 text-indigo-900' : 'bg-amber-400 text-indigo-900'} shadow-sm`}>
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className={`font-semibold truncate ${isSelected ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                          {(hydratedUsers[otherParticipant?.user?._id] || otherParticipant?.user)?.name || 'Unknown User'}
                        </h3>
                        <span className={`text-xs ${isSelected ? 'text-indigo-100' : 'text-gray-400 dark:text-gray-500'}`}>
                          {presenceByUser[otherParticipant?.user._id]?.isOnline ? 'Online' : formatLastSeen(presenceByUser[otherParticipant?.user._id]?.lastSeen)}
                        </span>
                      </div>

                      <p className={`text-sm truncate mt-1 ${isSelected ? 'text-indigo-100/80' : 'text-gray-500 dark:text-gray-400'}`}>
                        {conversation.lastMessage?.content?.text || 'No messages yet'}
                      </p>

                      {conversation.job && (() => {
                        const job = conversation.job;
                        const ls = String(job.lifecycleState || '').toLowerCase();
                        const st = String(job.status || '').toLowerCase();
                        const isClosed = ls === 'closed' || ls === 'cancelled' || st === 'cancelled' || st === 'completed';
                        if (isClosed) return null;
                        return (
                          <p className={`text-xs mt-2 flex items-center gap-2 ${isSelected ? 'text-indigo-100' : 'text-indigo-600 dark:text-indigo-300'}`}>
                            <span>Job: {job.title}</span>
                            {ls && (
                              <span className={`px-2 py-0.5 text-[10px] rounded-full border ${isSelected ? 'bg-white/20 text-white border-white/30' : 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30'}`}>
                                {ls.replaceAll('_', ' ')}
                              </span>
                            )}
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-1 bg-white/80 backdrop-blur-md flex flex-col overflow-hidden h-full dark:bg-gray-900/80`}>
        {selectedConversation ? (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
            <ChatWindow
            conversation={selectedConversation}
            messages={visibleMessages}
            onMessageSent={(message, tempId, remove) => {
              if (remove) {
                // Remove the optimistic message
                setMessages(prev => prev.filter(msg => msg._id !== tempId));
              } else if (tempId && message) {
                // Replace optimistic message with real one
                setMessages(prev => prev.map(msg => 
                  msg._id === tempId ? message : msg
                ));
                // Update conversation last message with real data
                setConversations(prev => 
                  prev.map(conv => 
                    conv._id === selectedConversation._id 
                      ? { 
                          ...conv, 
                          lastMessage: message,
                          updatedAt: message.createdAt
                        }
                      : conv
                  )
                );
              } else if (message) {
                // Add new optimistic message
                setMessages(prev => [...prev, message]);
                // Update conversation last message
                setConversations(prev => 
                  prev.map(conv => 
                    conv._id === selectedConversation._id 
                      ? { 
                          ...conv, 
                          lastMessage: message,
                          updatedAt: message.createdAt
                        }
                      : conv
                  )
                );
              }
            }}
            onHideMessages={hideMessagesForMe}
            onUpdateMessages={(updater) => {
              setMessages(updater);
            }}
            onBack={() => setSelectedConversation(null)}
            onViewProfile={handleViewProfile}
            onDeleteConversation={handleDeleteConfirm}
            onDeleteAllMessages={handleClearChatForMe}
            formatTime={formatTime}
            formatLastSeen={formatLastSeen}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm px-6 py-12 bg-white/70 backdrop-blur-sm rounded-3xl border border-white/60 shadow-xl dark:bg-gray-900/70 dark:border-gray-800">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-2xl flex items-center justify-center mx-auto mb-6 dark:from-indigo-900 dark:to-indigo-800">
                <FaComments className="w-9 h-9 text-indigo-500" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3 dark:text-gray-100">Select a conversation</h3>
              <p className="text-gray-500 dark:text-gray-400">Choose someone from your inbox to start chatting. Messages appear here in real time.</p>
            </div>
          </div>
        )}
      </div>

      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-white/40 shadow-2xl p-8 max-w-md w-full dark:bg-gray-900/95 dark:border-gray-800">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2 dark:text-gray-100">
              <FaMapMarkerAlt className="w-5 h-5 text-indigo-500" />
              Share Your Location
            </h3>

            {userLocation ? (
              <div className="space-y-6">
                <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl border border-indigo-100 dark:from-indigo-950 dark:to-indigo-900 dark:border-indigo-900">
                  <div className="flex items-center gap-2 text-indigo-700 font-semibold dark:text-indigo-300">
                    <FaMapMarkerAlt className="w-4 h-4" />
                    Location detected
                  </div>
                  <p className="text-sm text-indigo-600 mt-2 dark:text-indigo-300">
                    Lat: {userLocation.lat.toFixed(6)}, Lng: {userLocation.lng.toFixed(6)}
                  </p>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                  <button
                    onClick={handleLocationShareConfirm}
                    disabled={sending}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
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
                    className="px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-all dark:border-gray-700 dark:text-gray-300 dark:hover:border-indigo-500 dark:hover:text-indigo-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="h-10 w-10 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Getting your location...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Info Modal */}
      {showUserInfo && selectedConversation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-white/40 shadow-2xl p-8 max-w-md w-full dark:bg-gray-900/95 dark:border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">User Information</h3>
              <button
                onClick={() => setShowUserInfo(false)}
                className="text-gray-400 hover:text-indigo-500 transition-colors dark:hover:text-indigo-300"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const otherParticipant = getOtherParticipant(selectedConversation);
              const pres = presenceByUser[otherParticipant?.user._id] || {};

              return (
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-2xl flex items-center justify-center shadow-md dark:from-indigo-900 dark:to-indigo-800">
                      <span className="text-2xl font-semibold text-indigo-600 dark:text-indigo-300">
                        {otherParticipant?.user.name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{otherParticipant?.user.name || 'Unknown User'}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{otherParticipant?.user.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${pres.isOnline ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {pres.isOnline ? 'Online now' : formatLastSeen(pres.lastSeen)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedConversation.job && (
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900 dark:bg-indigo-900/30">
                      <h5 className="font-semibold text-indigo-700 mb-1 dark:text-indigo-300">Related Job</h5>
                      <p className="text-sm text-indigo-600 dark:text-indigo-300">{selectedConversation.job.title}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setShowUserInfo(false);
                        handleViewProfile();
                      }}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all"
                    >
                      View Profile
                    </button>
                    <Link
                      to={user?.role === 'professional' ? '/dashboard/professional/connected-users' : '/dashboard/professionals'}
                      onClick={() => setShowUserInfo(false)}
                      className="flex-1 px-4 py-3 rounded-xl border-2 border-indigo-100 text-indigo-600 hover:border-indigo-300 hover:text-indigo-700 transition-all text-center font-semibold dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:border-indigo-400 dark:hover:text-indigo-200"
                    >
                      Manage Connections
                    </Link>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

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
          onConfirm={handleDeleteConversationForMe}
          title="Remove Conversation from My Feed"
          message={`Are you sure you want to remove this conversation with ${getOtherParticipant(selectedConversation)?.user.name || 'this person'} from your feed? This action cannot be undone.`}
          confirmText="Remove Conversation"
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