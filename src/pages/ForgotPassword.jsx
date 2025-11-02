import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { forgotPassword } from "../utils/api";
import { FaEnvelope, FaArrowLeft } from "react-icons/fa";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await forgotPassword(email);
      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.message || "Failed to send reset email");
      }
    } catch (e) {
      setError(e.message || "Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-gray-900">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30 z-0"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1508780709619-79562169bc64")',
        }}
      ></div>
      <div className="absolute inset-0 bg-black bg-opacity-50 z-0"></div>

      <div className="relative z-10 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-[90%] max-w-md">
        <Link 
          to="/login" 
          className="inline-flex items-center text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-500 mb-4"
        >
          <FaArrowLeft className="mr-2" />
          Back to Login
        </Link>

        <h2 className="text-2xl font-extrabold text-center mb-2 text-gray-800 dark:text-white">
          Forgot Password?
        </h2>
        <p className="text-center text-sm text-gray-600 dark:text-gray-300 mb-6">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        {success ? (
          <div className="text-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <FaEnvelope className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="font-semibold text-green-800 mb-2">Check your email!</h3>
              <p className="text-sm text-green-700">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <p className="text-xs text-green-600 mt-2">
                The link will expire in 1 hour. Please check your spam folder if you don't see it.
              </p>
            </div>
            <Link
              to="/login"
              className="text-indigo-500 font-medium hover:underline"
            >
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                Email Address
              </label>
              <div className="relative mt-1">
                <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className={`w-full py-2 px-4 rounded text-white font-semibold transition-colors ${
                email.trim() && !loading
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-indigo-300 cursor-not-allowed"
              }`}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">
              Remember your password?{" "}
              <Link to="/login" className="text-indigo-500 font-medium hover:underline cursor-pointer">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
