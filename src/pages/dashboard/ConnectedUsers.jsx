import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaStar, FaClock, FaComments, FaHeart, FaFilter, FaSearch, FaTh, FaList, FaTimes } from 'react-icons/fa';
import { getConnections, removeConnection, createOrGetConversation } from '../../utils/api';
import { useAuth } from '../../context/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';

const ConnectedUsers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [filters, setFilters] = useState({
    service: '',
    location: '',
    rating: 0
  });
  const [showUnfriendModal, setShowUnfriendModal] = useState(false);
  const [userToUnfriend, setUserToUnfriend] = useState(null);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const response = await getConnections();
      if (response.success) {
        // For professionals, we want to show the users who sent them connection requests
        const userConnections = response.data.map(conn => {
          // If current user is the professional, show the requester (user)
          if (conn.professional?.user?.toString() === user?.id) {
            return {
              ...conn.requester,
              connectionId: conn._id,
              userType: 'user'
            };
          }
          // If current user is the requester, show the professional
          else {
            return {
              ...conn.professional,
              connectionId: conn._id,
              userType: 'professional'
            };
          }
        }).filter(conn => conn && conn.connectionId); // Filter out any invalid connections
        setConnections(userConnections);
      }
    } catch (err) {
      console.error('Error loading connections:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnfriendClick = (connectedUser) => {
    setUserToUnfriend(connectedUser);
    setShowUnfriendModal(true);
  };

  const handleUnfriendConfirm = async () => {
    if (!userToUnfriend) return;
    
    try {
      const response = await removeConnection(userToUnfriend.connectionId);
      if (response.success) {
        setConnections(prev => prev.filter(c => c.connectionId !== userToUnfriend.connectionId));
        success(`Removed ${userToUnfriend.name} from your connections.`);
      } else {
        error('Failed to remove connection. Please try again.');
      }
    } catch (err) {
      console.error('Error removing connection:', err);
      error('Failed to remove connection. Please try again.');
    }
    
    setShowUnfriendModal(false);
    setUserToUnfriend(null);
  };

  const handleStartChat = async (connectedUser) => {
    try {
      console.log('💬 Starting chat with user:', connectedUser._id);
      
      const response = await createOrGetConversation({
        otherUserId: connectedUser._id
      });
      
      if (response.success) {
        console.log('✅ Conversation created/found:', response.data);
        // Use the correct dashboard route based on user type
        const basePath = user?.role === 'professional' ? '/dashboard/professional' : '/dashboard';
        navigate(`${basePath}/messages/${response.data._id}`);
      } else {
        error('Failed to create conversation');
      }
    } catch (err) {
      error('Failed to start chat');
      console.error('Error starting chat:', err);
    }
  };

  const filteredConnections = connections.filter(conn => {
    const matchesService = !filters.service || 
      conn.category?.toLowerCase().includes(filters.service.toLowerCase());
    const matchesLocation = !filters.location || 
      conn.location?.address?.toLowerCase().includes(filters.location.toLowerCase());
    const matchesRating = (conn.rating || 0) >= filters.rating;
    
    return matchesService && matchesLocation && matchesRating;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading connected users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Connected Users</h1>
              <p className="text-gray-600">{filteredConnections.length} connected users</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                  title="Grid View"
                >
                  <FaTh className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
                  title="List View"
                >
                  <FaList className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or service..."
                  value={filters.service}
                  onChange={(e) => setFilters(prev => ({ ...prev, service: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by location..."
                  value={filters.location}
                  onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Users Grid/List */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredConnections.map((connectedUser) => (
              <div
                key={connectedUser._id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="relative">
                  <img
                    src={connectedUser.profilePicture || '/images/placeholder.jpeg'}
                    alt={connectedUser.name}
                    className="w-full h-48 object-cover"
                  />
                </div>
                
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{connectedUser.name}</h3>
                    <div className="flex items-center gap-1">
                      <FaStar className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-medium text-gray-700">
                        {connectedUser.rating || '4.5'}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-2">{connectedUser.category || 'User'}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-1">
                      <FaClock className="w-3 h-3" />
                      <span>Available</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStartChat(connectedUser)}
                      className="flex-1 py-2 rounded-lg flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 transition-colors"
                    >
                      <FaComments className="w-4 h-4" />
                      Message
                    </button>
                    <button
                      onClick={() => handleUnfriendClick(connectedUser)}
                      className="px-4 py-2 rounded-lg flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 transition-colors"
                    >
                      Unfriend
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredConnections.map((connectedUser) => (
              <div
                key={connectedUser._id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={connectedUser.profilePicture || '/images/placeholder.jpeg'}
                    alt={connectedUser.name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{connectedUser.name}</h3>
                        <p className="text-gray-600">{connectedUser.category || 'User'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <FaStar className="w-4 h-4 text-yellow-400" />
                          <span className="text-sm font-medium text-gray-700">
                            {connectedUser.rating || '4.5'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-500 mb-4">
                      <div className="flex items-center gap-1">
                        <FaClock className="w-3 h-3" />
                        <span>Available</span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleStartChat(connectedUser)}
                        className="px-6 py-2 rounded-lg flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 transition-colors"
                      >
                        <FaComments className="w-4 h-4" />
                        Message
                      </button>
                      <button
                        onClick={() => handleUnfriendClick(connectedUser)}
                        className="px-4 py-2 rounded-lg flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 transition-colors"
                      >
                        Unfriend
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unfriend Confirmation Modal */}
      {showUnfriendModal && userToUnfriend && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Unfriend {userToUnfriend.name}?
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to unfriend {userToUnfriend.name}? This action is irreversible and will:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Remove them from your connections</li>
                  <li>Remove you from their connections</li>
                  <li className="text-red-600 font-semibold">Delete all chat history permanently</li>
                  <li>Remove them from your messaging interface</li>
                </ul>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowUnfriendModal(false);
                    setUserToUnfriend(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnfriendConfirm}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Unfriend
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectedUsers;
