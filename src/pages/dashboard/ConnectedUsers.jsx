import { useState, useEffect } from 'react';
import { resolveImageUrl } from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiMessageSquare, FiFilter, FiSearch, FiGrid, FiList, FiX, FiLoader, FiTrash2, FiMapPin, FiClock, FiArrowRight, FiAlertTriangle } from 'react-icons/fi';
import { getConnections, removeConnection, createOrGetConversation, getUser } from '../../utils/api';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/ToastContext';
import { formatDistance, calculateDistance as haversineDistance } from '../../utils/locationUtils';

const ConnectedUsers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [filters, setFilters] = useState({
    name: '',
    location: ''
  });
  const [deleteModal, setDeleteModal] = useState({ show: false, connectionId: null, name: '' });


  useEffect(() => {
    if (user) loadConnections();
  }, [user]);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const response = await getConnections();
      if (response.success) {
        const hydrated = await Promise.all(response.data.map(async conn => {
          const rawCounterpart = conn.requester._id === user.id ? conn.professional : conn.requester;

          // Hydrate user data to get profile pictures and full info
          let fullCounterpart = rawCounterpart;
          try {
            const userDetails = await getUser(rawCounterpart._id);
            if (userDetails?.success) {
              fullCounterpart = { ...rawCounterpart, ...userDetails.data };
            }
          } catch (e) {
            console.warn('Could not hydrate connection:', rawCounterpart._id);
          }

          const profilePic = fullCounterpart.profilePicture || fullCounterpart.avatarUrl;
          return {
            ...fullCounterpart,
            connectionId: conn._id,
            image: resolveImageUrl(profilePic)
          };
        }));
        setConnections(hydrated);
      }
    } catch (err) {
      console.error('Error loading connections:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnfriend = async () => {
    const { connectionId, name } = deleteModal;
    try {
      const resp = await removeConnection(connectionId);
      if (resp.success) {
        setConnections(prev => prev.filter(c => c.connectionId !== connectionId));
        success(`Disassociated from ${name}.`);
      }
    } catch (err) {
      error('Termination failure.');
    } finally {
      setDeleteModal({ show: false, connectionId: null, name: '' });
    }
  };

  const handleStartChat = async (counterpart) => {
    try {
      const response = await createOrGetConversation({ otherUserId: counterpart._id });
      if (response.success) navigate(`/dashboard/professional/messages/${response.data._id}`);
    } catch (err) {
      error('Communication link failure.');
    }
  };

  const filteredConnections = connections.filter(conn => {
    const nameMatch = !filters.name || conn.name?.toLowerCase().includes(filters.name.toLowerCase());
    const locMatch = !filters.location || conn.location?.address?.toLowerCase().includes(filters.location.toLowerCase());
    return nameMatch && locMatch;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <FiLoader className="w-12 h-12 animate-spin text-trust mb-4" />
        <p className="font-tight text-graphite text-lg">Retrieving node connections...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Premium Header */}
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <div className="label-caps mb-2 text-stone-400">Node Network</div>
          <h1 className="text-4xl md:text-5xl font-tight font-bold text-charcoal tracking-tight">Active Contacts</h1>
          <p className="mt-3 text-lg text-graphite max-w-xl leading-relaxed">
            Authenticated consumers and partners within your established ecosystem.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white border border-stone-100 rounded-2xl p-1 flex shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-3 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-stone-50 text-trust shadow-inner' : 'text-stone-300 hover:text-stone-400'}`}
            >
              <FiGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-3 rounded-xl transition-all ${viewMode === 'list' ? 'bg-stone-50 text-trust shadow-inner' : 'text-stone-300 hover:text-stone-400'}`}
            >
              <FiList className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card-premium bg-white p-6 mb-12 border-stone-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative group">
            <FiSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-trust transition-colors z-10" />
            <input
              type="text"
              placeholder="Filter by name..."
              className="input-field pl-14 h-16 rounded-2xl border-stone-100 focus:border-trust transition-all text-sm font-medium"
              value={filters.name}
              onChange={(e) => setFilters(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="relative group">
            <FiMapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-trust transition-colors" />
            <input
              type="text"
              placeholder="Filter by location..."
              className="input-field pl-14 h-16 rounded-2xl bg-stone-50/50"
              value={filters.location}
              onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Registry */}
      {filteredConnections.length === 0 ? (
        <div className="card-premium bg-white p-20 text-center border-dashed border-stone-200">
          <FiUser className="w-16 h-16 text-stone-200 mx-auto mb-6" />
          <h3 className="text-xl font-tight font-bold text-stone-400">Network Empty</h3>
          <p className="text-stone-300 mt-2">No active connections identified in your registry.</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-6"}>
          {filteredConnections.map((conn) => (
            <div
              key={conn._id}
              className={`card-premium bg-white overflow-hidden group hover:border-trust transition-all duration-500 ${viewMode === 'list' ? 'flex flex-row items-center p-6 gap-8' : ''}`}
            >
              <div className={`relative ${viewMode === 'list' ? 'w-24 h-24' : 'h-48'} overflow-hidden rounded-2xl bg-stone-50 border border-stone-100`}>
                <img
                  src={conn.image}
                  alt={conn.name}
                  className="w-full h-full object-cover transition-all duration-700 hover:scale-105"
                  onError={(e) => { e.target.src = '/images/placeholder.jpeg'; }}
                />
              </div>

              <div className={`flex-1 ${viewMode === 'grid' ? 'p-8' : ''}`}>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="label-caps text-trust mb-1">{conn.role || 'Client'}</div>
                    <h3 className="text-2xl font-tight font-bold text-charcoal">{conn.name}</h3>
                  </div>
                  <button
                    onClick={() => setDeleteModal({ show: true, connectionId: conn.connectionId, name: conn.name })}
                    className="p-2 text-stone-300 hover:text-clay transition-colors"
                    title="Remove connection"
                  >
                    <FiTrash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-4 text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-8">
                  <div className="flex items-center gap-2"><FiMapPin /> {conn.location?.city || 'Local Area'}</div>
                  <div className="flex items-center gap-2"><FiClock /> Active Now</div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleStartChat(conn)}
                    className="flex-1 btn-primary py-4 px-6 text-[11px] bg-charcoal"
                  >
                    SEND MESSAGE
                  </button>
                  <button
                    onClick={() => navigate(`/dashboard/professional/user/${conn._id}`)}
                    className="p-4 border border-stone-200 rounded-2xl hover:bg-stone-50 transition-all group/btn"
                  >
                    <FiArrowRight className="w-5 h-5 text-charcoal group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="card-premium bg-white p-10 max-w-md w-full animate-in fade-in zoom-in duration-300">
            <div className="flex items-start gap-6 mb-8">
              <div className="p-4 bg-clay/10 rounded-2xl">
                <FiAlertTriangle className="w-8 h-8 text-clay" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-tight font-bold text-charcoal mb-2">Confirm Termination</h2>
                <p className="text-graphite leading-relaxed">
                  Are you sure you want to remove <span className="font-bold text-charcoal">{deleteModal.name}</span> from your network? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setDeleteModal({ show: false, connectionId: null, name: '' })}
                className="flex-1 btn-secondary py-4 text-[11px] uppercase tracking-widest"
              >
                CANCEL
              </button>
              <button
                onClick={handleUnfriend}
                className="flex-1 bg-clay text-white py-4 px-6 font-bold uppercase tracking-widest text-[11px] rounded-2xl hover:bg-clay/90 transition-all"
              >
                REMOVE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectedUsers;
