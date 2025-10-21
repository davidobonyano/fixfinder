import { useState } from 'react';
import { FaLock, FaCheck, FaTimes, FaSpinner } from 'react-icons/fa';
import { changePassword } from '../../utils/api';

export default function ChangePassword() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const validate = () => {
    const e = {};
    if (!form.currentPassword || form.currentPassword.length < 6) e.currentPassword = 'Enter your current password';
    if (!form.newPassword || form.newPassword.length < 6) e.newPassword = 'New password must be at least 6 characters';
    if (form.newPassword && /\s/.test(form.newPassword)) e.newPassword = 'Password must not contain spaces';
    if (form.confirmPassword !== form.newPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    if (!validate()) return;
    try {
      setSubmitting(true);
      const res = await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      if (res.success) {
        setSuccess('Password changed successfully');
        setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      const msg = err?.data?.message || err.message || 'Failed to change password';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Change Password</h1>

      {success && (
        <div className="mb-4 p-3 rounded border border-green-300 bg-green-50 text-green-700 flex items-center gap-2">
          <FaCheck /> {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded border border-red-300 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4 bg-white p-6 rounded-lg border">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
          <div className="relative">
            <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              name="currentPassword"
              value={form.currentPassword}
              onChange={onChange}
              className="w-full pl-10 pr-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter current password"
            />
          </div>
          {errors.currentPassword && <p className="text-sm text-red-600 mt-1">{errors.currentPassword}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <div className="relative">
            <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              name="newPassword"
              value={form.newPassword}
              onChange={onChange}
              className="w-full pl-10 pr-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter new password"
            />
          </div>
          {errors.newPassword && <p className="text-sm text-red-600 mt-1">{errors.newPassword}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
          <div className="relative">
            <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={onChange}
              className="w-full pl-10 pr-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Re-enter new password"
            />
          </div>
          {errors.confirmPassword && <p className="text-sm text-red-600 mt-1">{errors.confirmPassword}</p>}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 disabled:opacity-50"
          >
            {submitting ? <FaSpinner className="inline mr-2 animate-spin" /> : null}
            {submitting ? 'Saving...' : 'Change Password'}
          </button>
          {success && (
            <button type="button" onClick={() => setSuccess('')} className="text-gray-600 hover:text-gray-800 flex items-center gap-1">
              <FaTimes /> Dismiss
            </button>
          )}
        </div>
      </form>
    </div>
  );
}






