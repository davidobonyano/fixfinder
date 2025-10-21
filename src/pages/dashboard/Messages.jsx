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
  FaLocationArrow
} from 'react-icons/fa';
import { useAuth } from '../../context/useAuth';
import { useSocket } from '../../context/SocketContext';
import { 
  getConversations, 
  createOrGetConversation, 
  getMessages, 
  sendMessage, 
  markConversationAsRead 
} from '../../utils/api';
import { compressImage, validateImageFile } from '../../utils/imageCompression';

const Messages = () => {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const { socket, isConnected, emit, on, off } = useSocket();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [presenceByUser, setPresenceByUser] = useState({});

  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      try {
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
        // Fallback to mock data
        setConversations([
          {
            _id: '1',
            participants: [
              { user: { _id: 'user1', name: 'John Electrician', email: 'john@example.com' }, userType: 'professional' },
              { user: { _id: user?.id, name: user?.name, email: user?.email }, userType: 'user' }
            ],
            lastMessage: {
              _id: 'msg1',
              content: { text: 'I can fix your electrical issues' },
              sender: { _id: 'user1', name: 'John Electrician' },
              createdAt: '2024-01-20T10:30:00Z'
            },
            lastMessageAt: '2024-01-20T10:30:00Z',
            unreadCount: { user: 0, professional: 1 },
            job: { _id: 'job1', title: 'Fix Kitchen Sink' }
          },
          {
            _id: '2',
            participants: [
              { user: { _id: 'user2', name: 'Sarah Plumber', email: 'sarah@example.com' }, userType: 'professional' },
              { user: { _id: user?.id, name: user?.name, email: user?.email }, userType: 'user' }
            ],
            lastMessage: {
              _id: 'msg2',
              content: { text: 'When would you like me to come?' },
              sender: { _id: 'user2', name: 'Sarah Plumber' },
              createdAt: '2024-01-19T15:45:00Z'
            },
            lastMessageAt: '2024-01-19T15:45:00Z',
            unreadCount: { user: 2, professional: 0 },
            job: { _id: 'job2', title: 'Install New Door' }
          }
        ]);
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
                  lastMessageAt: message.createdAt,
                  unreadCount: { 
                    ...conv.unreadCount, 
                    user: message.sender._id !== user?.id ? conv.unreadCount.user + 1 : conv.unreadCount.user
                  }
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

    // Presence updates
    const handlePresence = (data) => {
      setPresenceByUser(prev => ({ ...prev, [data.userId]: { isOnline: data.isOnline, lastSeen: data.lastSeen } }));
    };

    on('newMessage', handleNewMessage);
    on('typing', handleTyping);
    on('messageRead', handleMessageRead);
    on('presence:update', handlePresence);

    return () => {
      off('newMessage', handleNewMessage);
      off('typing', handleTyping);
      off('messageRead', handleMessageRead);
      off('presence:update', handlePresence);
    };
  }, [socket, isConnected, selectedConversation, user, on, off]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async (convId) => {
    try {
      const response = await getMessages(convId);
      if (response.success) {
        setMessages(response.data);
        
        // Mark conversation as read
        await markConversationAsRead(convId);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      // Fallback to mock data
      setMessages([
        {
          _id: 'msg1',
          content: { text: 'Hi! I saw your job posting for electrical work.' },
          sender: { _id: 'user1', name: 'John Electrician' },
          senderType: 'professional',
          createdAt: '2024-01-20T10:00:00Z',
          isRead: true
        },
        {
          _id: 'msg2',
          content: { text: 'Hello! Yes, I need help with my kitchen sink.' },
          sender: { _id: user?.id, name: user?.name },
          senderType: 'user',
          createdAt: '2024-01-20T10:05:00Z',
          isRead: true
        },
        {
          _id: 'msg3',
          content: { text: 'I can fix that for you. When would be a good time?' },
          sender: { _id: 'user1', name: 'John Electrician' },
          senderType: 'professional',
          createdAt: '2024-01-20T10:10:00Z',
          isRead: true
        },
        {
          _id: 'msg4',
          content: { text: 'How about tomorrow morning around 9 AM?' },
          sender: { _id: user?.id, name: user?.name },
          senderType: 'user',
          createdAt: '2024-01-20T10:15:00Z',
          isRead: true
        },
        {
          _id: 'msg5',
          content: { text: 'Perfect! I\'ll be there at 9 AM. My rate is ₦5,000 per hour.' },
          sender: { _id: 'user1', name: 'John Electrician' },
          senderType: 'professional',
          createdAt: '2024-01-20T10:20:00Z',
          isRead: false
        }
      ]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending) return;

    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      const response = await sendMessage(selectedConversation._id, {
        content: { text: messageText },
        messageType: 'text',
        replyTo: replyingTo?._id
      });

      if (response.success) {
        // Add message to local state
        setMessages(prev => [...prev, response.data]);
        
        // Emit message via Socket.IO for real-time delivery
        if (socket && isConnected) {
          emit('sendMessage', {
            ...response.data,
            conversationId: selectedConversation._id
          });
        }
        
        // Update conversation last message
        setConversations(prev => 
          prev.map(conv => 
            conv._id === selectedConversation._id 
              ? { 
                  ...conv, 
                  lastMessage: response.data,
                  lastMessageAt: response.data.createdAt,
                  unreadCount: { ...conv.unreadCount, professional: conv.unreadCount.professional + 1 }
                }
              : conv
          )
        );
        
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

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setShowLocationModal(true);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to get your location. Please allow location access.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  const sendLocation = async () => {
    if (!userLocation) return;

    setSending(true);
    try {
      const response = await sendMessage(selectedConversation._id, {
        content: { 
          text: `📍 My location: ${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}`,
          location: userLocation
        },
        messageType: 'location'
      });

      if (response.success) {
        setShowLocationModal(false);
        setUserLocation(null);
        
        // Add message to local state
        setMessages(prev => [...prev, response.data]);
        
        // Emit message via Socket.IO for real-time delivery
        if (socket && isConnected) {
          emit('sendMessage', {
            ...response.data,
            conversationId: selectedConversation._id
          });
        }
      }
    } catch (error) {
      console.error('Error sending location:', error);
    } finally {
      setSending(false);
    }
  };

  const openInMaps = (lat, lng) => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      const mapsUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=15`;
      window.open(mapsUrl, '_blank');
    } else {
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
      window.open(mapsUrl, '_blank');
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingImages(true);
    
    try {
      // Filter and validate image files
      const imageFiles = files.filter(file => file.type.startsWith('image/'));
      
      if (imageFiles.length === 0) {
        alert('Please select image files only.');
        return;
      }

      // Validate and compress images
      const compressedFiles = [];
      for (const file of imageFiles) {
        try {
          validateImageFile(file);
          const compressedFile = await compressImage(file, 300); // 300KB max
          compressedFiles.push(compressedFile);
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          alert(`Error processing ${file.name}: ${error.message}`);
        }
      }

      if (compressedFiles.length === 0) return;

      // Send images as messages
      for (const file of compressedFiles) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('conversationId', selectedConversation._id);
        formData.append('messageType', 'image');

        try {
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/messages/conversations/${selectedConversation._id}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              setMessages(prev => [...prev, result.data]);
              
              // Emit via Socket.IO
              if (socket && isConnected) {
                emit('sendMessage', {
                  ...result.data,
                  conversationId: selectedConversation._id
                });
              }
            }
          }
        } catch (error) {
          console.error('Error uploading image:', error);
        }
      }

      // Update conversation
      setConversations(prev => 
        prev.map(conv => 
          conv._id === selectedConversation._id 
            ? { 
                ...conv, 
                lastMessage: { content: { text: `Sent ${compressedFiles.length} image(s)` }, createdAt: new Date().toISOString() },
                lastMessageAt: new Date().toISOString()
              }
            : conv
        )
      );

    } catch (error) {
      console.error('Error handling file upload:', error);
      alert('Error uploading images. Please try again.');
    } finally {
      setUploadingImages(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getOtherParticipant = (conversation) => {
    return conversation.participants.find(p => p.user._id !== user?.id);
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
          
          {/* Search */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => {
            const otherParticipant = getOtherParticipant(conversation);
            const isSelected = selectedConversation?._id === conversation._id;
            const unreadCount = conversation.unreadCount?.user || 0;
            
            return (
              <div
                key={conversation._id}
                onClick={() => setSelectedConversation(conversation)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  isSelected ? 'bg-gray-100' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-lg font-semibold text-gray-600">
                      {otherParticipant?.user.name.charAt(0)}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {otherParticipant?.user.name}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {formatTime(conversation.lastMessageAt)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 truncate mb-1">
                      {conversation.job?.title && (
                        <span className="text-blue-600">Job: {conversation.job.title}</span>
                      )}
                    </p>
                    
                    <p className="text-sm text-gray-500 truncate">
                      {conversation.lastMessage?.content?.text || 'No messages yet'}
                    </p>
                  </div>
                  
                  {unreadCount > 0 && (
                    <div className="w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="md:hidden p-2 text-gray-400 hover:text-gray-600"
                  >
                    <FaArrowLeft className="w-5 h-5" />
                  </button>
                  
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-lg font-semibold text-gray-600">
                      {getOtherParticipant(selectedConversation)?.user.name.charAt(0)}
                    </span>
                  </div>
                  
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {getOtherParticipant(selectedConversation)?.user.name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selectedConversation.job?.title && `Job: ${selectedConversation.job.title}`}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Presence */}
                  {(() => {
                    const other = getOtherParticipant(selectedConversation);
                    const pres = presenceByUser[other?.user._id] || {};
                    return (
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${pres.isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className="text-xs text-gray-500">
                          {pres.isOnline ? 'Online' : formatLastSeen(pres.lastSeen)}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => {
                const isOwn = message.sender._id === user?.id;
                const isReply = message.replyTo;
                
                return (
                  <div
                    key={message._id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
                      {!isOwn && (
                        <p className="text-xs text-gray-500 mb-1">
                          {message.sender.name}
                        </p>
                      )}
                      
                      <div
                        className={`p-3 rounded-lg ${
                          isOwn
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-900'
                        }`}
                      >
                        {isReply && (
                          <div className={`text-xs mb-2 p-2 rounded ${
                            isOwn ? 'bg-blue-600' : 'bg-gray-300'
                          }`}>
                            Replying to: {message.replyTo?.content?.text}
                          </div>
                        )}
                        
                        {message.content.text && (
                          <p className="text-sm">{message.content.text}</p>
                        )}

                        {/* Location message */}
                        {message.content.location && (
                          <div className="text-sm">
                            <div className="font-semibold mb-1">Shared location</div>
                            <a
                              className={`underline ${isOwn ? 'text-white' : 'text-blue-600'}`}
                              href={`https://www.google.com/maps?q=${message.content.location.lat},${message.content.location.lng}`}
                              target="_blank" rel="noreferrer"
                            >
                              View on map
                            </a>
                            {message.content.location.label && (
                              <div className="mt-1 opacity-90">{message.content.location.label}</div>
                            )}
                          </div>
                        )}

                        {/* Contact message */}
                        {message.content.contact && (
                          <div className="text-sm">
                            <div className="font-semibold mb-1">Shared contact</div>
                            <div className="opacity-90">{message.content.contact.name}</div>
                            <div className="opacity-90">{message.content.contact.phone}</div>
                            {message.content.contact.email && (
                              <div className="opacity-90">{message.content.contact.email}</div>
                            )}
                          </div>
                        )}
                        
                        {message.content.media && message.content.media.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {message.content.media.map((media, index) => (
                              <div key={index}>
                                {media.type === 'image' ? (
                                  <img
                                    src={media.url}
                                    alt={media.filename}
                                    className="max-w-full h-auto rounded"
                                  />
                                ) : (
                                  <div className="flex items-center gap-2 p-2 bg-gray-100 rounded">
                                    <FaFile className="w-4 h-4" />
                                    <span className="text-sm">{media.filename}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-xs text-gray-500">
                          {formatTime(message.createdAt)}
                        </span>
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

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              {replyingTo && (
                <div className="mb-3 p-2 bg-gray-100 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Replying to:</p>
                    <p className="text-sm text-gray-900">{replyingTo.content.text}</p>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FaTimes className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                <div className="flex-1">
                  <textarea
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      
                      // Emit typing indicator
                      if (socket && isConnected && selectedConversation && e.target.value.trim()) {
                        emit('typing', {
                          conversationId: selectedConversation._id,
                          userId: user?.id,
                          userName: user?.name
                        });
                      }
                    }}
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
                  {/* Share location */}
                  <button
                    type="button"
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title="Share location"
                    onClick={async () => {
                      if (!selectedConversation) return;
                      if (!navigator.geolocation) {
                        alert('Geolocation not supported by this browser');
                        return;
                      }
                      
                      // Try to get current location
                      navigator.geolocation.getCurrentPosition(
                        async (pos) => {
                          const { latitude, longitude } = pos.coords;
                          try {
                            const resp = await sendMessage(selectedConversation._id, {
                              messageType: 'location',
                              content: { 
                                location: { 
                                  lat: latitude, 
                                  lng: longitude,
                                  label: 'Current Location'
                                } 
                              }
                            });
                            if (resp.success) {
                              setMessages(prev => [...prev, resp.data]);
                              if (socket && isConnected) {
                                emit('sendMessage', { ...resp.data, conversationId: selectedConversation._id });
                              }
                            }
                          } catch (e) {
                            console.error(e);
                            alert('Failed to send location');
                          }
                        },
                        (err) => {
                          console.error('Geolocation error:', err);
                          // Fallback: ask for manual location input
                          const address = prompt('Location access denied. Please enter your location (e.g., "Lagos, Nigeria"):');
                          if (address) {
                            // Use a default Lagos location as fallback
                            const fallbackLocation = { lat: 6.5244, lng: 3.3792, label: address };
                            sendMessage(selectedConversation._id, {
                              messageType: 'location',
                              content: { location: fallbackLocation }
                            }).then(resp => {
                              if (resp.success) {
                                setMessages(prev => [...prev, resp.data]);
                                if (socket && isConnected) {
                                  emit('sendMessage', { ...resp.data, conversationId: selectedConversation._id });
                                }
                              }
                            }).catch(e => console.error(e));
                          }
                        },
                        { 
                          enableHighAccuracy: true, 
                          timeout: 10000,
                          maximumAge: 300000 // 5 minutes
                        }
                      );
                    }}
                  >
                    <FaMapMarkerAlt className="w-5 h-5" />
                  </button>

                  {/* Share my contact */}
                  <button
                    type="button"
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title="Share contact"
                    onClick={async () => {
                      if (!selectedConversation) return;
                      try {
                        const resp = await sendMessage(selectedConversation._id, {
                          messageType: 'contact',
                          content: { contact: { name: user?.name, phone: user?.phone || 'N/A', email: user?.email } }
                        });
                        if (resp.success) {
                          setMessages(prev => [...prev, resp.data]);
                          if (socket && isConnected) {
                            emit('sendMessage', { ...resp.data, conversationId: selectedConversation._id });
                          }
                        }
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                  >
                    <FaUser className="w-5 h-5" />
                  </button>

                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <FaPaperPlane className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </form>
            </div>
          </>
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
    </div>
  );
};

export default Messages;
