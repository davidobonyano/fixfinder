import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { createReport } from "../utils/api";
import { FaExclamationTriangle, FaCheckCircle } from "react-icons/fa";

const Report = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [formData, setFormData] = useState({
    reportedUsername: location.state?.reportedUsername || "",
    reason: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setError("Please log in to submit a report");
      return;
    }

    if (!formData.reportedUsername || !formData.reason) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const response = await createReport({
        reportedUsername: formData.reportedUsername,
        reason: formData.reason,
        description: formData.description,
      });

      if (response.success) {
        setSuccess(true);
        setFormData({
          reportedUsername: "",
          reason: "",
          description: "",
        });
      } else {
        setError(response.message || "Failed to submit report");
      }
    } catch (err) {
      setError(err.message || "Failed to submit report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6 text-indigo-700 dark:text-indigo-400">Report a User</h1>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <p className="text-gray-700 dark:text-gray-300">
            You need to be logged in to submit a report. Please{" "}
            <a href="/login" className="text-indigo-600 dark:text-indigo-400 underline">
              log in
            </a>{" "}
            or{" "}
            <a href="/signup" className="text-indigo-600 dark:text-indigo-400 underline">
              create an account
            </a>{" "}
            first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-indigo-700 dark:text-indigo-400">Report a User or Professional</h1>
      <p className="text-gray-700 dark:text-gray-300 mb-8">
        If you've encountered inappropriate behavior, harassment, or violations of our Terms and Conditions, 
        please report it below. We take all reports seriously and will review them promptly.
      </p>

      {success && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
          <FaCheckCircle className="text-green-600 dark:text-green-400 w-5 h-5" />
          <div>
            <p className="text-green-800 dark:text-green-200 font-semibold">Report Submitted Successfully</p>
            <p className="text-green-700 dark:text-green-300 text-sm">
              Thank you for your report. Our team will review it and take appropriate action.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
          <FaExclamationTriangle className="text-red-600 dark:text-red-400 w-5 h-5" />
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="reportedUsername" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Username or Email of User/Professional to Report <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="reportedUsername"
            value={formData.reportedUsername}
            onChange={(e) => setFormData({ ...formData, reportedUsername: e.target.value })}
            placeholder="Enter the name or email of the user you want to report"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100"
            required
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            You can enter either the user's display name or email address
          </p>
        </div>

        <div>
          <label htmlFor="reason" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Reason for Report <span className="text-red-500">*</span>
          </label>
          <select
            id="reason"
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100"
            required
          >
            <option value="">Select a reason</option>
            <option value="Harassment or Bullying">Harassment or Bullying</option>
            <option value="Inappropriate Content">Inappropriate Content</option>
            <option value="Spam or Scam">Spam or Scam</option>
            <option value="Fake Profile">Fake Profile</option>
            <option value="Violation of Terms">Violation of Terms</option>
            <option value="Unprofessional Behavior">Unprofessional Behavior</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Additional Details (Optional)
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Please provide any additional information that might help us understand the situation..."
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            The more details you provide, the better we can investigate
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> False reports may result in action against your account. 
            Please only report genuine violations of our Terms and Conditions.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-spin">⏳</span>
              Submitting Report...
            </>
          ) : (
            <>
              <FaExclamationTriangle />
              Submit Report
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default Report;

