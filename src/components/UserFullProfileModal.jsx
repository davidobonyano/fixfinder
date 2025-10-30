import { FaTimes, FaCheck, FaEnvelope, FaPhone, FaUser } from 'react-icons/fa';

const formatMemberSince = (dateString) => {
	if (!dateString) return '—';
	try {
		const date = new Date(dateString);
		return date.toLocaleString(undefined, { month: 'short', year: 'numeric' });
	} catch {
		return '—';
	}
};

const UserFullProfileModal = ({ isOpen, onClose, user }) => {
	if (!isOpen || !user) return null;

	const isVerified = Boolean(user?.emailVerification?.isVerified || user?.verified);
	const memberSince = formatMemberSince(user?.createdAt);

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
				<div className="flex items-center justify-between p-4 border-b">
					<h2 className="text-lg font-semibold">User Full Profile</h2>
					<button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
						<FaTimes className="w-5 h-5" />
					</button>
				</div>

				<div className="p-4 space-y-4">
					{/* Verification */}
					<div>
						<h3 className="text-sm font-medium text-gray-900 mb-2">Verification</h3>
						<div className={`inline-flex items-center gap-2 px-2 py-1 rounded ${isVerified ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
							{isVerified ? <FaCheck className="w-4 h-4" /> : <span className="w-2 h-2 rounded-full bg-yellow-500"></span>}
							<span className="text-sm">{isVerified ? 'Email Verified' : 'Email Not Verified'}</span>
						</div>
					</div>

					{/* Member Since */}
					<div>
						<h3 className="text-sm font-medium text-gray-900 mb-1">Member Since</h3>
						<p className="text-sm text-gray-700">{memberSince}</p>
					</div>

					{/* Profile Picture */}
					<div>
						<h3 className="text-sm font-medium text-gray-900 mb-2">Profile Picture</h3>
						<div className="flex items-center gap-4">
							<div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
								{user?.profilePicture || user?.avatarUrl ? (
									<img src={user.profilePicture || user.avatarUrl} alt={user?.name} className="w-full h-full object-cover" />
								) : (
									<FaUser className="w-8 h-8 text-gray-400" />
								)}
							</div>
							<div>
								<p className="text-sm text-gray-600">Profile</p>
							</div>
						</div>
					</div>

					{/* Profile Information */}
					<div>
						<div className="flex items-center justify-between mb-2">
							<h3 className="text-sm font-medium text-gray-900">Profile Information</h3>
						</div>
						<div className="space-y-3">
							<div>
								<p className="text-xs text-gray-500">Name</p>
								<p className="text-sm text-gray-900">{user?.name || '—'}</p>
							</div>
							<div>
								<p className="text-xs text-gray-500">Email</p>
								<div className="flex items-center gap-2 text-sm text-gray-900">
									<FaEnvelope className="w-4 h-4 text-gray-400" />
									<span>{user?.email || '—'}</span>
								</div>
							</div>
							<div>
								<p className="text-xs text-gray-500">Phone</p>
								<div className="flex items-center gap-2 text-sm text-gray-900">
									<FaPhone className="w-4 h-4 text-gray-400" />
									<span>{user?.phone || '—'}</span>
								</div>
							</div>
							<div>
								<p className="text-xs text-gray-500">Role</p>
								<p className="text-sm text-gray-900 capitalize">{user?.role || '—'}</p>
							</div>
							<div>
								<p className="text-xs text-gray-500">Verification Status</p>
								<p className={`text-sm ${isVerified ? 'text-green-700' : 'text-yellow-700'}`}>{isVerified ? 'Verified' : 'Not Verified'}</p>
							</div>
						</div>
					</div>
				</div>

				<div className="p-4 border-t bg-gray-50">
					<div className="flex justify-end">
						<button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
							Close
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default UserFullProfileModal;



