import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FaSpinner, FaUser } from 'react-icons/fa';
import { getUser } from '../utils/api';

const UserProfile = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const resp = await getUser(id);
        if (resp.success) {
          setUser(resp.data);
        } else {
          setError('Failed to load user');
        }
      } catch (e) {
        setError(e.message || 'Failed to load user');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FaSpinner className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-red-600">{error}</div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        {user?.profilePicture || user?.avatarUrl ? (
          <img src={user.profilePicture || user.avatarUrl} alt={user?.name} className="w-24 h-24 rounded-full object-cover" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
            <FaUser className="w-8 h-8 text-gray-400" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{user?.name || 'Unknown User'}</h1>
          <p className="text-gray-600">{user?.email}</p>
          {user?.phone && <p className="text-gray-600">{user.phone}</p>}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">About</h2>
        <div className="space-y-2 text-gray-700">
          <div><span className="font-medium">Role:</span> <span className="capitalize">{user?.role || 'user'}</span></div>
          {user?.location?.address && (
            <div><span className="font-medium">Location:</span> {user.location.address}</div>
          )}
          {user?.createdAt && (
            <div><span className="font-medium">Member since:</span> {new Date(user.createdAt).toLocaleDateString()}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;


