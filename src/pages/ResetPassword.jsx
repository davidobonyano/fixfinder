import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { resetPassword } from "../utils/api";
import { FiLock, FiEye, FiEyeOff, FiCheckCircle, FiArrowLeft, FiShield } from "react-icons/fi";

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
      setError("The recovery token is invalid or has expired. Please initiate a new recovery request.");
    }
  }, [token]);

  const validatePassword = (pwd) => {
    if (pwd.length < 6) {
      return "Security protocol requires a minimum of 6 characters.";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Password confirmation does not match. Please verify.");
      return;
    }

    if (!token) {
      setError("Authorization token missing. Request denied.");
      return;
    }

    setLoading(true);

    try {
      const res = await resetPassword(token, password);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } else {
        setError(res.message || "Credential update failed. Please try again.");
      }
    } catch (e) {
      setError("An unexpected error occurred during password synchronization. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      {/* Brand Side */}
      <div className="hidden md:flex w-1/2 bg-stone-50 flex-col justify-between p-16 lg:p-24 border-r border-stone-100">
        <div>
          <Link to="/" className="text-2xl font-tight font-bold text-charcoal tracking-tighter">
            FindYourFixer.
          </Link>
        </div>

        <div className="max-w-md">
          <label className="label-caps mb-6 block text-trust">Account Synchronization</label>
          <h1 className="text-5xl lg:text-6xl font-tight font-bold text-charcoal leading-[1.1] mb-8">
            Define your new access credentials.
          </h1>
          <p className="text-xl text-graphite leading-relaxed">
            Ensure your new password meets our security requirements to maintain the integrity of your account.
          </p>
        </div>

        <div className="flex items-center gap-4 text-stone-400">
          <FiShield className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest">Enterprise Grade Security Protocols</span>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-paper">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="md:hidden mb-12 text-center">
            <Link to="/" className="text-2xl font-tight font-bold text-charcoal">FindYourFixer.</Link>
          </div>

          <div className="card-premium p-10 lg:p-12 bg-white">
            <Link
              to="/login"
              className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-charcoal mb-8 transition-colors"
            >
              <FiArrowLeft className="mr-2 w-3 h-3" />
              Return to Login
            </Link>

            <h2 className="text-3xl font-tight font-bold text-charcoal mb-4">
              {success ? "Success." : "Reset Credentials."}
            </h2>
            <p className="text-graphite mb-8 leading-relaxed">
              {success
                ? "Your credentials have been updated. Redirecting to access portal..."
                : "Enter and confirm your new account password below."}
            </p>

            {success ? (
              <div className="text-center py-8">
                <div className="inline-flex p-4 rounded-full bg-trust/5 text-trust mb-6">
                  <FiCheckCircle className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-bold text-charcoal mb-2">Update Complete</h3>
                <p className="text-sm text-graphite">Redirecting to login in 3 seconds...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="password" className="label-caps mb-3 block">New Password</label>
                  <div className="relative">
                    <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field pl-12 pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-charcoal transition-colors"
                    >
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="label-caps mb-3 block">Confirm Password</label>
                  <div className="relative">
                    <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input-field pl-12 pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-charcoal transition-colors"
                    >
                      {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-clay/5 border border-clay/20">
                    <p className="text-xs font-bold text-clay uppercase tracking-tight leading-relaxed">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !password.trim() || !confirmPassword.trim() || !token}
                  className="w-full btn-primary py-4 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white animate-spin" />
                  ) : (
                    "UPDATE CREDENTIALS"
                  )}
                </button>
              </form>
            )}

            {!success && (
              <p className="mt-8 text-center text-xs text-graphite font-medium">
                Need a new reset link?{" "}
                <Link to="/forgot-password" className="text-trust font-bold hover:underline">
                  REQUEST RECOVERY
                </Link>
              </p>
            )}
          </div>

          <p className="mt-8 text-center text-[10px] text-stone-400 font-bold uppercase tracking-widest">
            Privacy Policy &bull; Security Standards &bull; Support
          </p>
        </div>
      </div>
    </div>
  );
}
