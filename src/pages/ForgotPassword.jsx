import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { forgotPassword } from "../utils/api";
import { FiMail, FiArrowLeft, FiShield, FiSend } from "react-icons/fi";

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
        setError(res.message || "Email address not recognized. Please verify and try again.");
      }
    } catch (e) {
      setError("System failure. Our security protocols were unable to process your request. Please try again later.");
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
          <label className="label-caps mb-6 block text-trust">Account Recovery</label>
          <h1 className="text-5xl lg:text-6xl font-tight font-bold text-charcoal leading-[1.1] mb-8">
            Securing access to your ecosystem.
          </h1>
          <p className="text-xl text-graphite leading-relaxed">
            Protecting your account is our highest priority. Follow the recovery steps to restore access securely.
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
              {success ? "Recovery Initiated." : "Restore Access."}
            </h2>
            <p className="text-graphite mb-8 leading-relaxed">
              {success
                ? "If an account is associated with this address, you will receive instructions shortly."
                : "Enter your registered email address to receive a secure recovery link."}
            </p>

            {success ? (
              <div className="space-y-8">
                <div className="p-6 bg-stone-50 border border-stone-200">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-white border border-stone-200">
                      <FiSend className="w-4 h-4 text-trust" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-charcoal mb-1">Check your inbox</p>
                      <p className="text-xs text-graphite leading-relaxed">
                        A verification link has been sent to <span className="text-charcoal font-bold">{email}</span>.
                        It will remain valid for the next 60 minutes.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSuccess(false)}
                  className="w-full btn-secondary py-4"
                >
                  RETRY DIFFERENT EMAIL
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="label-caps mb-3 block">Official Email Address</label>
                  <div className="relative">
                    <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                    <input
                      type="email"
                      id="email"
                      placeholder="corporate@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field pl-12"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-clay/5 border border-clay/20">
                    <p className="text-xs font-bold text-clay uppercase tracking-tight leading-relaxed">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full btn-primary py-4 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white animate-spin" />
                  ) : (
                    "INITIALIZE RECOVERY"
                  )}
                </button>
              </form>
            )}

            {!success && (
              <p className="mt-8 text-center text-xs text-graphite font-medium">
                Remembered your credentials?{" "}
                <Link to="/login" className="text-trust font-bold hover:underline">
                  SIGN IN
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
