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
  deleteMyMessagesInConversation,
  createJobRequestInChat,
  acceptJobRequest,
  proMarkCompleted,
  confirmJobCompletion
} from '../utils/api';
import MessageBubble from './MessageBubble';
import ChatHeader from './ChatHeader';
import LocationModal from './LocationModal';
import MapView from './MapView';
import LocationButton from './LocationButton';
import ChatProfileModal from './ChatProfileModal';
import { useLocation as useLocationHook } from '../hooks/useLocation';
import { calculateDistance, formatDistance } from '../utils/locationUtils';

const ChatWindow = ({ 
  conversation, 
  messages = [], 
  onMessageSent,
  onUpdateMessages,
  onHideMessages,
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
  const [activeJob, setActiveJob] = useState(conversation?.job || null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [jobForm, setJobForm] = useState({
    title: '',
    description: '',
    category: '',
    budgetMin: '',
    budgetMax: ''
  });

  // Get other participant
  const otherParticipant = conversation?.participants?.find(p => p?.user?._id !== user?.id);

  // Current user center for distance calc
  const { location: detectedLocation } = useLocationHook(false);
  const [center, setCenter] = useState(null); // { lat, lng }
  const [headerDistance, setHeaderDistance] = useState(null); // formatted string
  const [headerAddress, setHeaderAddress] = useState(''); // LGA/State label

  // Resolve center from detected -> saved
  useEffect(() => {
    const fromDetected = (detectedLocation?.latitude && detectedLocation?.longitude)
      ? { lat: Number(detectedLocation.latitude), lng: Number(detectedLocation.longitude) }
      : null;
    const saved = user?.location?.coordinates?.lat && user?.location?.coordinates?.lng
      ? { lat: Number(user.location.coordinates.lat), lng: Number(user.location.coordinates.lng) }
      : (user?.location?.latitude && user?.location?.longitude
        ? { lat: Number(user.location.latitude), lng: Number(user.location.longitude) }
        : null);
    const chosen = fromDetected || saved || null;
    if (chosen) {
      setCenter(chosen);
    }
  }, [detectedLocation?.latitude, detectedLocation?.longitude, user?.location?.coordinates?.lat, user?.location?.coordinates?.lng, user?.location?.latitude, user?.location?.longitude]);

  // Compute distance/address for header whenever participants or center change
  useEffect(() => {
    try {
      const other = otherParticipant?.user;
      const otherCoords = other?.location?.coordinates;
      const otherLat = Number(otherCoords?.lat || other?.location?.latitude);
      const otherLng = Number(otherCoords?.lng || other?.location?.longitude);
      const label = [other?.location?.city, other?.location?.state].filter(Boolean).join(', ');
      setHeaderAddress(label);

      if (center && otherLat && otherLng) {
        const d = calculateDistance(center.lat, center.lng, otherLat, otherLng);
        setHeaderDistance(formatDistance(d));
        console.log('💬 Chat header distance debug:', {
          me: center,
          other: { lat: otherLat, lng: otherLng, label },
          distanceKm: d
        });
      } else {
        setHeaderDistance(null);
      }
    } catch (e) {
      setHeaderDistance(null);
    }
  }, [center, otherParticipant?.user?.location?.coordinates?.lat, otherParticipant?.user?.location?.coordinates?.lng, otherParticipant?.user?.location?.latitude, otherParticipant?.user?.location?.longitude, otherParticipant?.user?.location?.city, otherParticipant?.user?.location?.state]);

  // Seed shared locations from existing messages
  useEffect(() => {
    setActiveJob(conversation?.job || null);
    try {
      // Only keep last message per user
      const byUser = new Map();
      (messages || []).forEach(m => {
        if (m.messageType === 'location_share' && m.content?.location && m.sender?._id) {
          byUser.set(m.sender._id, m);
        }
      });
      const seeded = Array.from(byUser.values()).map(m => {
        const sender = m.sender || {};
        const isMe = sender._id === user?.id;
        const fallbackOther = otherParticipant?.user || {};
        const photo = sender.profilePicture || sender.avatarUrl || (isMe ? (user?.profilePicture || user?.avatarUrl) : (fallbackOther.profilePicture || fallbackOther.avatarUrl));
        return ({
          lat: Number(m.content.location.lat),
          lng: Number(m.content.location.lng),
          accuracy: Number(m.content.location.accuracy || 0),
          timestamp: m.createdAt || new Date().toISOString(),
          user: {
            _id: sender._id,
            name: sender.name,
            profilePicture: photo
          },
          userId: sender._id
        });
      });
      if (seeded.length > 0) setSharedLocations(seeded);
    } catch (_) {}
  }, [messages, user?.id, user?.profilePicture, user?.avatarUrl, otherParticipant?.user?.profilePicture, otherParticipant?.user?.avatarUrl]);

  // Handle message deletion events
  const handleMessageDeleted = (data) => {
    console.log('Message deleted received:', data);
    // Update the message in real-time
    if (data.messageId && onUpdateMessages) {
      onUpdateMessages(prev => prev.map(msg => 
        msg._id === data.messageId 
          ? { ...msg, isDeleted: true, deletedAt: data.deletedAt }
          : msg
      ));
    }
  };

  const handleMessagesDeleted = (data) => {
    console.log('Messages deleted received:', data);
    // Update messages in real-time
    if (data.messageIds && data.messageIds.length > 0 && onUpdateMessages) {
      onUpdateMessages(prev => prev.map(msg => 
        data.messageIds.includes(msg._id)
          ? { ...msg, isDeleted: true }
          : msg
      ));
    }
  };

  // Handle message edit events
  const handleMessageEdited = (data) => {
    console.log('Message edited received:', data);
    // Update the message in real-time
    if (data.messageId && data.content && onUpdateMessages) {
      onUpdateMessages(prev => prev.map(msg => 
        msg._id === data.messageId 
          ? { ...msg, content: { ...msg.content, text: data.content }, isEdited: true, editedAt: data.editedAt }
          : msg
      ));
    }
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
        const fallbackUser = data.user || otherParticipant?.user || {};
        const sharedLoc = {
          ...data.coordinates,
          user: {
            _id: fallbackUser._id,
            name: fallbackUser.name,
            profilePicture: fallbackUser.profilePicture || fallbackUser.avatarUrl
          },
          userId: data.senderId,
          timestamp: data.timestamp
        };
        setSharedLocations(prev => {
          // Remove existing entry for this userId, then add latest
          const rest = prev.filter(l => l.userId !== sharedLoc.userId);
          return [...rest, sharedLoc];
        });
        // Append/replace location_share message in chat with latest? (optional)
        if (onUpdateMessages) {
          const locMessage = {
            _id: `loc-${Date.now()}`,
            sender: sharedLoc.user,
            content: { location: { lat: sharedLoc.lat, lng: sharedLoc.lng, accuracy: sharedLoc.accuracy } },
            messageType: 'location_share',
            isRead: false,
            isEdited: false,
            isDeleted: false,
            createdAt: sharedLoc.timestamp,
            conversation: conversation._id
          };
          onUpdateMessages(prev => [...prev, locMessage]);
        }
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
        const fallbackUser = data.user || otherParticipant?.user || {};
        setSharedLocations(prev => {
          const rest = prev.filter(l => l.userId !== data.userId);
          return [...rest, {
            lat: data.lat,
            lng: data.lng,
            accuracy: data.accuracy || 0,
            timestamp: data.timestamp,
            user: {
              _id: fallbackUser._id,
              name: fallbackUser.name,
              profilePicture: fallbackUser.profilePicture || fallbackUser.avatarUrl
            },
            userId: data.userId
          }];
        });
      }
    };

    // Listen for stop location sharing
    const handleStopLocationUpdate = (data) => {
      if (data.userId !== user?.id) {
        setSharedLocations(prev => prev.filter(loc => loc.userId !== data.userId));
      }
    };

    on('receive_message', handleReceiveMessage);
    on('user_typing', handleTyping);
    on('message_read', handleMessageRead);
    on('locationShared', handleReceiveLocation);
    on('locationSharingStarted', handleLocationSharingStarted);
    on('locationUpdated', handleLocationUpdate);
    on('locationStopped', handleStopLocationUpdate);
    on('message_deleted', handleMessageDeleted);
    on('messages_deleted', handleMessagesDeleted);
    on('message_edited', handleMessageEdited);

    return () => {
      emit('leave', conversation._id);
      off('receive_message', handleReceiveMessage);
      off('user_typing', handleTyping);
      off('message_read', handleMessageRead);
      off('locationShared', handleReceiveLocation);
      off('locationSharingStarted', handleLocationSharingStarted);
      off('locationUpdated', handleLocationUpdate);
      off('locationStopped', handleStopLocationUpdate);
      off('message_deleted', handleMessageDeleted);
      off('messages_deleted', handleMessagesDeleted);
      off('message_edited', handleMessageEdited);
    };
  }, [socket, isConnected, conversation, user, emit, on, off, onUpdateMessages]);

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

    // Create a temporary ID for the optimistic message
    const tempId = `temp-${Date.now()}`;
    
    // Create the optimistic message object immediately
    const optimisticMessage = {
      _id: tempId,
      sender: {
        _id: user?.id,
        name: user?.name,
        profilePicture: user?.profilePicture || user?.avatarUrl
      },
      content: { text: messageText },
      messageType: 'text',
      isRead: false,
      isEdited: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      conversation: conversation._id,
      replyTo: replyingTo,
      isOptimistic: true // Flag to identify optimistic messages
    };

    // Add message to local state IMMEDIATELY for instant UI update
    if (onMessageSent) {
      onMessageSent(optimisticMessage);
    }

    try {
      const response = await sendMessage(conversation._id, {
        content: { text: messageText },
        messageType: 'text',
        replyTo: replyingTo?._id
      });

      if (response.success) {
        // Replace optimistic message with real data
        const realMessage = {
          _id: response.data._id || response.data.messageId,
          sender: {
            _id: user?.id,
            name: user?.name,
            profilePicture: user?.profilePicture || user?.avatarUrl
          },
          content: response.data.content || { text: messageText },
          messageType: response.data.messageType || 'text',
          isRead: response.data.isRead || false,
          isEdited: response.data.isEdited || false,
          isDeleted: false,
          createdAt: response.data.createdAt || new Date().toISOString(),
          conversation: response.data.conversation || conversation._id,
          replyTo: replyingTo,
          isOptimistic: false
        };

        // Replace the optimistic message with the real one
        if (onMessageSent) {
          onMessageSent(realMessage, tempId);
        }
        
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
      // Remove the optimistic message on error
      if (onMessageSent && tempId) {
        onMessageSent(null, tempId, true); // true = remove
      }
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
        // Update message in local state immediately
        if (onUpdateMessages) {
          onUpdateMessages(prev => prev.map(msg => 
            msg._id === messageId 
              ? { ...msg, content: { ...msg.content, text: content }, isEdited: true, editedAt: new Date().toISOString() }
              : msg
          ));
        }
        
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
        // Update message in local state immediately
        if (onUpdateMessages) {
          onUpdateMessages(prev => prev.map(msg => 
            msg._id === messageId 
              ? { ...msg, isDeleted: true, deletedAt: new Date().toISOString() }
              : msg
          ));
        }
        
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
      // Only delete messages the current user owns
      const myMessageIds = messages
        .filter(msg => msg.sender._id === user?.id)
        .map(msg => msg._id);
      const deletable = selectedMessages.filter(id => myMessageIds.includes(id));
      const hideOnly = selectedMessages.filter(id => !myMessageIds.includes(id));
      const deletePromises = deletable.map(messageId => deleteMessage(messageId));
      await Promise.all(deletePromises);
      
      // Update messages in local state immediately
      if (onUpdateMessages) {
        onUpdateMessages(prev => prev.map(msg => 
          deletable.includes(msg._id)
            ? { ...msg, isDeleted: true }
            : msg
        ));
      }

      // Hide the other user's selected messages locally (for me only)
      if (hideOnly.length > 0 && onHideMessages) {
        onHideMessages(hideOnly);
      }
      
      // Emit bulk delete via Socket.IO
      if (socket && isConnected) {
        emit('messages_deleted', {
          messageIds: deletable,
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
    const tempId = `temp-loc-${Date.now()}`;
    
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
        // Close modal after confirming share
        setShowLocationModal(false);

        // Add location message to local state immediately for instant update
        const optimisticLocationMessage = {
          _id: tempId,
          sender: {
            _id: user?.id,
            name: user?.name,
            profilePicture: user?.profilePicture || user?.avatarUrl
          },
          content: {
            location: {
              lat: location.lat,
              lng: location.lng,
              accuracy: location.accuracy
            }
          },
          messageType: 'location_share',
          isRead: false,
          isEdited: false,
          isDeleted: false,
          createdAt: new Date().toISOString(),
          conversation: conversation._id,
          isOptimistic: true
        };

        if (onMessageSent) {
          onMessageSent(optimisticLocationMessage);
        }

        // Replace with real data when available
        if (response.data) {
          const locationMessage = {
            _id: response.data._id || response.data.messageId,
            sender: {
              _id: user?.id,
              name: user?.name,
              profilePicture: user?.profilePicture || user?.avatarUrl
            },
            content: response.data.content || {
              location: {
                lat: location.lat,
                lng: location.lng,
                accuracy: location.accuracy
              }
            },
            messageType: response.data.messageType || 'location_share',
            isRead: response.data.isRead || false,
            isEdited: response.data.isEdited || false,
            isDeleted: false,
            createdAt: response.data.createdAt || new Date().toISOString(),
            conversation: response.data.conversation || conversation._id,
            isOptimistic: false
          };

          if (onMessageSent) {
            onMessageSent(locationMessage, tempId);
          }
        }
        
        // Emit location share via Socket.IO
        if (socket && isConnected) {
          emit('shareLocation', {
            senderId: user?.id,
            receiverId: otherParticipant?.user._id,
            coordinates: location,
            conversationId: conversation._id,
            user: {
              _id: user?.id,
              name: user?.name,
              profilePicture: user?.profilePicture || user?.avatarUrl
            }
          });
        }

        // Start live location tracking
        startLiveLocationTracking();
      }
    } catch (error) {
      console.error('Error sharing location:', error);
      // Remove optimistic message on error
      if (onMessageSent) {
        onMessageSent(null, tempId, true);
      }
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
            conversationId: conversation._id,
            user: {
              _id: user?.id,
              name: user?.name,
              profilePicture: user?.profilePicture || user?.avatarUrl
            }
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

  // ---- Job lifecycle handlers ----
  const handleCreateJobRequest = async () => {
    if (!conversation || !user) return;
    try {
      setSending(true);
      const payload = {
        title: jobForm.title || 'Service Request',
        description: jobForm.description || 'Details provided in chat.',
        category: jobForm.category || (otherParticipant?.user?.category) || 'General',
        location: user?.location ? {
          address: user.location.address || 'N/A',
          city: user.location.city || 'N/A',
          state: user.location.state || 'N/A',
          coordinates: user.location.coordinates || undefined
        } : undefined,
        budget: {
          min: Number(jobForm.budgetMin) || 0,
          max: Number(jobForm.budgetMax) || 0
        },
        preferredDate: new Date().toISOString(),
        preferredTime: 'Flexible',
        urgency: 'Regular'
      };
      const resp = await createJobRequestInChat(conversation._id, payload);
      if (resp?.success) {
        setActiveJob(resp.data);
        setShowJobModal(false);
      }
    } catch (e) {
      console.error('Create job request failed:', e);
    } finally {
      setSending(false);
    }
  };

  const handleAcceptJob = async () => {
    if (!activeJob) return;
    try {
      setSending(true);
      const resp = await acceptJobRequest(activeJob._id);
      if (resp?.success) {
        setActiveJob(resp.data || { ...activeJob, lifecycleState: 'in_progress' });
      }
    } catch (e) {
      console.error('Accept job failed:', e);
    } finally {
      setSending(false);
    }
  };

  const handleProMarkCompleted = async () => {
    if (!activeJob) return;
    try {
      setSending(true);
      const resp = await proMarkCompleted(activeJob._id);
      if (resp?.success) {
        setActiveJob(resp.data || { ...activeJob, lifecycleState: 'completed_by_pro' });
      }
    } catch (e) {
      console.error('Pro complete failed:', e);
    } finally {
      setSending(false);
    }
  };

  const handleUserConfirmCompletion = async () => {
    if (!activeJob) return;
    try {
      setSending(true);
      const resp = await confirmJobCompletion(activeJob._id);
      if (resp?.success) {
        setActiveJob(resp.data || { ...activeJob, lifecycleState: 'closed' });
      }
    } catch (e) {
      console.error('Confirm completion failed:', e);
    } finally {
      setSending(false);
    }
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
        distanceFormatted={headerDistance}
        otherAddressLabel={headerAddress}
      />

      {/* Job lifecycle banner */}
      <div className="px-4 pt-3">
        {!activeJob && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-3 flex items-center justify-between">
            <span>
              {String(user?.role).toLowerCase() === 'professional' 
                ? 'Waiting for user to create a job request to start work.'
                : 'Create a job request so the pro can start work.'}
            </span>
            {String(user?.role).toLowerCase() !== 'professional' && (
              <button
                onClick={() => setShowJobModal(true)}
                className="ml-3 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Create Job Request
              </button>
            )}
          </div>
        )}

        {activeJob && activeJob.lifecycleState === 'job_requested' && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 flex items-center justify-between">
            <span>
              {String(user?.role).toLowerCase() === 'professional' 
                ? 'Job requested by user. Review and accept to start.'
                : 'Job created! Waiting for pro to accept.'}
            </span>
            {String(user?.role).toLowerCase() === 'professional' && (
              <button
                onClick={handleAcceptJob}
                disabled={sending}
                className="ml-3 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm disabled:opacity-50"
              >
                {sending ? 'Accepting...' : 'Accept Job'}
              </button>
            )}
          </div>
        )}

        {activeJob && activeJob.lifecycleState === 'in_progress' && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-3 flex items-center justify-between">
            <span>Job is in progress.</span>
            {String(user?.role).toLowerCase() === 'professional' && (
              <button
                onClick={handleProMarkCompleted}
                disabled={sending}
                className="ml-3 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm disabled:opacity-50"
              >
                {sending ? 'Submitting...' : 'Mark Completed'}
              </button>
            )}
          </div>
        )}

        {activeJob && activeJob.lifecycleState === 'completed_by_pro' && (
          <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg p-3 flex items-center justify-between">
            <span>Pro marked this job as completed. Please confirm if work is done.</span>
            {String(user?.role).toLowerCase() !== 'professional' && (
              <div className="ml-3 flex gap-2">
                <button
                  onClick={handleUserConfirmCompletion}
                  disabled={sending}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm disabled:opacity-50"
                >
                  {sending ? 'Confirming...' : 'Confirm Completion'}
                </button>
                <button
                  onClick={() => {}}
                  className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded text-sm"
                >
                  Dispute
                </button>
              </div>
            )}
          </div>
        )}

        {activeJob && activeJob.lifecycleState === 'closed' && (
          <div className="bg-gray-50 border border-gray-200 text-gray-700 rounded-lg p-3">
            Job closed. Thank you!
          </div>
        )}
      </div>

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
              onActivateBulkActions={() => setShowBulkActions(true)}
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
                const tempId = `temp-${Date.now()}`;
                const contactData = { 
                  name: user?.name, 
                  phone: user?.phone || 'N/A', 
                  email: user?.email 
                };
                
                // Optimistic message
                const optimisticContact = {
                  _id: tempId,
                  sender: {
                    _id: user?.id,
                    name: user?.name,
                    profilePicture: user?.profilePicture || user?.avatarUrl
                  },
                  content: { contact: contactData },
                  messageType: 'contact',
                  isRead: false,
                  isEdited: false,
                  isDeleted: false,
                  createdAt: new Date().toISOString(),
                  conversation: conversation._id,
                  isOptimistic: true
                };

                if (onMessageSent) {
                  onMessageSent(optimisticContact);
                }

                try {
                  const resp = await sendMessage(conversation._id, {
                    messageType: 'contact',
                    content: { contact: contactData }
                  });
                  
                  if (resp.success) {
                    // Replace with real message
                    const contactMessage = {
                      _id: resp.data._id || resp.data.messageId,
                      sender: {
                        _id: user?.id,
                        name: user?.name,
                        profilePicture: user?.profilePicture || user?.avatarUrl
                      },
                      content: resp.data.content || { contact: contactData },
                      messageType: resp.data.messageType || 'contact',
                      isRead: resp.data.isRead || false,
                      isEdited: resp.data.isEdited || false,
                      isDeleted: false,
                      createdAt: resp.data.createdAt || new Date().toISOString(),
                      conversation: resp.data.conversation || conversation._id,
                      isOptimistic: false
                    };

                    if (onMessageSent) {
                      onMessageSent(contactMessage, tempId);
                    }

                    if (socket && isConnected) {
                      emit('send_message', { ...resp.data, conversationId: conversation._id });
                    }
                  }
                } catch (e) {
                  console.error(e);
                  if (onMessageSent) {
                    onMessageSent(null, tempId, true);
                  }
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
        onStartSharing={() => setShowLocationModal(true)}
      />

  {/* Create Job Request Modal */}
  {showJobModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Job Request</h3>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Title"
            value={jobForm.title}
            onChange={(e) => setJobForm(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
          <input
            type="text"
            placeholder="Category (e.g., Electrician)"
            value={jobForm.category}
            onChange={(e) => setJobForm(prev => ({ ...prev, category: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
          <textarea
            placeholder="Description"
            value={jobForm.description}
            onChange={(e) => setJobForm(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded"
            rows={3}
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Budget Min"
              value={jobForm.budgetMin}
              onChange={(e) => setJobForm(prev => ({ ...prev, budgetMin: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded"
            />
            <input
              type="number"
              placeholder="Budget Max"
              value={jobForm.budgetMax}
              onChange={(e) => setJobForm(prev => ({ ...prev, budgetMax: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded"
            />
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button
            onClick={handleCreateJobRequest}
            disabled={sending}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? 'Creating...' : 'Create'}
          </button>
          <button
            onClick={() => setShowJobModal(false)}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )}

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


