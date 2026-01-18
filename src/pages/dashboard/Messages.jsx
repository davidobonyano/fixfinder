import { useState, useEffect, useRef } from 'react';
import { resolveImageUrl } from '../../utils/api';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  FiSearch, FiSend, FiFile, FiPhone, FiArrowLeft, FiCheck,
  FiClock, FiEdit, FiTrash2, FiMessageCircle, FiLoader,
  FiMapPin, FiUser, FiNavigation, FiShare2, FiInfo, FiX, FiShield, FiSlash
} from 'react-icons/fi';
import { useAuth } from '../../context/useAuth';
import { useSocket } from '../../context/SocketContext';
import {
  getConversations,
  getMessages,
  sendMessage,
  markConversationAsRead,
  getUser,
  deleteConversationForMe,
  deleteAllMessagesForMe
} from '../../utils/api';
import ChatWindow from '../../components/ChatWindow';
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
  const [hydratedUsers, setHydratedUsers] = useState({});

  const messagesEndRef = useRef(null);


  const getOtherParticipant = (conversation) => {
    if (!conversation || !user) return null;
    return conversation.participants?.find(p => p.user?._id !== user.id) || null;
  };

  const filteredConversations = conversations.filter(conv => {
    const otherParticipant = getOtherParticipant(conv);
    const matchName = otherParticipant?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchJob = conv.job?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchName || matchJob;
  });

  useEffect(() => {
    async function hydrateAll() {
      const updates = {};
      await Promise.all(filteredConversations.map(async conv => {
        const participant = getOtherParticipant(conv)?.user;
        const profilePic = participant?.profilePicture || participant?.avatarUrl;

        if (participant?._id && !profilePic) {
          try {
            const res = await getUser(participant._id);
            if (res && res.data) {
              updates[participant._id] = { ...participant, ...res.data };
            }
          } catch (_) { }
        } else if (participant?._id) {
          updates[participant._id] = participant;
        }
      }));
      setHydratedUsers(prev => ({ ...prev, ...updates }));
    }
    if (filteredConversations.length > 0) hydrateAll();
  }, [filteredConversations.length]);

  useEffect(() => {
    const loadConversations = async () => {
      try {
        setLoading(true);
        const response = await getConversations();
        if (response.success) {
          setConversations(response.data);
          const stateConversation = location.state?.conversation;
          if (stateConversation) {
            setSelectedConversation(stateConversation);
          } else if (conversationId) {
            const conversation = response.data.find(conv => conv._id === conversationId);
            if (conversation) setSelectedConversation(conversation);
          }
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
      } finally {
        setLoading(false);
      }
    };
    loadConversations();
  }, [conversationId, location.state]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation._id);
      if (socket && isConnected) emit('join', selectedConversation._id);
    }
    return () => {
      if (socket && isConnected && selectedConversation) emit('leave', selectedConversation._id);
    };
  }, [selectedConversation, socket, isConnected]);

  const loadMessages = async (convId) => {
    try {
      const response = await getMessages(convId);
      if (response.success) {
        setMessages(response.data);
        await markConversationAsRead(convId);
        setConversations(prev => prev.map(conv => conv._id === convId ? { ...conv, unreadCount: { ...conv.unreadCount, [user?.role === 'professional' ? 'professional' : 'user']: 0 } } : conv));
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const formatLastSeen = (date) => {
    if (!date) return 'recently';
    const d = new Date(date);
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return d.toLocaleDateString();
  };

  if (loading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <FiLoader className="w-12 h-12 animate-spin text-trust mb-4" />
        <p className="font-tight text-graphite text-lg">Initializing encrypted channel...</p>
      </div>
    );
  }

  return (
    <div className="flex bg-white dark:bg-charcoal h-[calc(100vh-80px)] overflow-hidden transition-colors -m-6 lg:-m-12">
      {/* Sidebar */}
      <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-96 flex-col border-r border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-charcoal/30 transition-colors`}>
        <div className="p-8 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-tight font-bold text-charcoal dark:text-stone-50 tracking-tight">Inbox</h1>
            <div className="h-2 w-2 rounded-full bg-trust animate-pulse"></div>
          </div>
          <div className="relative group">
            <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-trust transition-colors" />
            <input
              type="text"
              placeholder="Search registry..."
              className="w-full bg-white dark:bg-charcoal/50 border border-stone-100 dark:border-stone-800 pl-12 pr-6 py-4 rounded-2xl text-sm font-medium focus:outline-none focus:border-trust transition-all dark:text-stone-100"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredConversations.length === 0 ? (
            <div className="py-20 text-center">
              <FiMessageCircle className="w-12 h-12 text-stone-200 mx-auto mb-4" />
              <p className="text-stone-400 font-medium font-tight">No active threads</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const other = getOtherParticipant(conv);
              const isSelected = selectedConversation?._id === conv._id;
              const unread = conv.unreadCount?.[user?.role === 'professional' ? 'professional' : 'user'] || 0;
              const participant = hydratedUsers[other?.user?._id] || other?.user;

              return (
                <div
                  key={conv._id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`p-5 rounded-2xl cursor-pointer transition-all duration-300 group ${isSelected ? 'bg-white dark:bg-stone-800 shadow-sm border border-stone-100 dark:border-stone-700' : 'hover:bg-stone-100 dark:hover:bg-stone-800/50'}`}
                >
                  <div className="flex gap-4">
                    <div className="relative shrink-0">
                      <UserAvatar
                        user={participant}
                        size="lg"
                        className="rounded-2xl"
                      />
                      {presenceByUser[participant?._id]?.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-trust border-4 border-white dark:border-stone-800"></div>
                      )}
                      {unread > 0 && (
                        <div className="absolute -top-2 -right-2 bg-clay text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                          {unread}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className={`font-tight font-bold truncate transition-colors ${isSelected ? 'text-charcoal dark:text-stone-50' : 'text-graphite dark:text-stone-400'}`}>
                          {participant?.name || 'Anonymous'}
                        </h3>
                        <span className="text-[10px] font-bold text-stone-300 uppercase tracking-widest leading-none mt-1">
                          {conv.lastMessage?.createdAt ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className={`text-sm truncate leading-tight ${unread > 0 ? 'text-charcoal dark:text-stone-200 font-bold' : 'text-stone-400 dark:text-stone-500'}`}>
                        {conv.lastMessage?.content?.text || 'Commence communication...'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-white dark:bg-charcoal/20 transition-colors`}>
        {selectedConversation ? (
          <ChatWindow
            conversation={selectedConversation}
            messages={messages.filter(m => !hiddenMessageIds.has(m._id))}
            onMessageSent={(message, tempId, remove) => {
              if (remove) setMessages(prev => prev.filter(msg => msg._id !== tempId));
              else if (tempId && message) setMessages(prev => prev.map(msg => msg._id === tempId ? message : msg));
              else if (message) setMessages(prev => [...prev, message]);
            }}
            onUpdateMessages={setMessages}
            onBack={() => setSelectedConversation(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="w-24 h-24 rounded-3xl bg-stone-50 dark:bg-stone-800 flex items-center justify-center text-stone-200 dark:text-stone-700 mb-8">
              <FiMessageCircle className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-tight font-bold text-charcoal dark:text-stone-100 tracking-tight mb-3">Communication Matrix</h2>
            <p className="text-graphite dark:text-stone-400 max-w-sm leading-relaxed">
              Select a secure thread from the registry to initialize high-fidelity communication.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;