import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { resetPassword } from "../utils/api";
import { FaLock, FaEye, FaEyeSlash, FaCheckCircle, FaArrowLeft } from "react-icons/fa";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
    }
  }, [token]);

  const validatePassword = (pwd) => {
    if (pwd.length < 6) {
      return "Password must be at least 6 characters long";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!token) {
      setError("Invalid reset link");
      return;
    }

    setLoading(true);

    try {
      const res = await resetPassword(token, password);
      if (res.success) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } else {
        setError(res.message || "Failed to reset password");
      }
    } catch (e) {
      setError(e.message || "Failed to reset password. The link may have expired. Please request a new one.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
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

        <div className="relative z-10 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-[90%] max-w-md text-center">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <FaCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-extrabold text-green-800 mb-2">
              Password Reset Successful!
            </h2>
            <p className="text-sm text-green-700 mb-4">
              Your password has been reset successfully. You can now login with your new password.
            </p>
            <p className="text-xs text-green-600 mb-4">
              Redirecting to login page in 3 seconds...
            </p>
            <Link
              to="/login"
              className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

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

        <div className="text-center mb-6">
          <FaLock className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
          <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white mb-2">
            Reset Your Password
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
              New Password
            </label>
            <div className="relative mt-1">
              <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                placeholder="Enter new password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters long</p>
          </div>

          <div className="mb-4">
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
              Confirm Password
            </label>
            <div className="relative mt-1">
              <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim() || !confirmPassword.trim() || !token}
            className={`w-full py-2 px-4 rounded text-white font-semibold transition-colors ${
              password.trim() && confirmPassword.trim() && token && !loading
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "bg-indigo-300 cursor-not-allowed"
            }`}
          >
            {loading ? "Resetting Password..." : "Reset Password"}
          </button>

          <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">
            Remember your password?{" "}
            <Link to="/login" className="text-indigo-500 font-medium hover:underline cursor-pointer">
              Sign in
            </Link>
          </p>

          {!token && (
            <p className="mt-2 text-center text-sm text-red-600">
              Need a new reset link?{" "}
              <Link to="/forgot-password" className="text-indigo-500 font-medium hover:underline">
                Request one
              </Link>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
