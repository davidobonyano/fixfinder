import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { loginUser, snapToLGAApi } from "../utils/api";
import { useLocation } from "../hooks/useLocation";
import { FiArrowRight, FiShield, FiCheckCircle } from "react-icons/fi";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [tinyLoc, setTinyLoc] = useState("");

  const { location } = useLocation(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!location?.latitude || !location?.longitude) return;
      try {
        const res = await snapToLGAApi(location.latitude, location.longitude);
        const lga = res?.data?.lga;
        const state = res?.data?.state;
        const label = lga || state;
        if (!cancelled && label) setTinyLoc(label);
      } catch (e) { }
    })();
    return () => { cancelled = true; };
  }, [location?.latitude, location?.longitude]);

  const isFormValid = email.trim() && password.trim();

  const handleLogin = async () => {
    if (!isFormValid || loading) return;
    setLoading(true);
    setError("");
    try {
      const loginData = { email, password };
      if (location) {
        loginData.latitude = location.latitude;
        loginData.longitude = location.longitude;
      }

      const res = await loginUser(loginData);
      login(res.token, res.user);
      if (res.user?.role === 'professional') {
        navigate("/dashboard/professional");
      } else {
        navigate("/dashboard");
      }
    } catch (e) {
      setError(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-stone-50 dark:bg-charcoal font-sans selection:bg-trust/10 transition-colors">
      {/* Left Panel - Brand Promise */}
      <div className="hidden lg:flex w-1/2 bg-stone-100 dark:bg-stone-900/20 flex-col justify-between p-16 border-r border-stone-200 dark:border-stone-800 transition-colors">
        <div className="space-y-8">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-trust"></div>
            <span className="font-tight text-xl font-bold tracking-tight text-charcoal dark:text-stone-50">FYF</span>
          </div>

          <div className="pt-20">
            <h1 className="text-5xl font-tight font-bold leading-[1.05] text-charcoal dark:text-stone-50">
              Redefining trust in local services.
            </h1>
            <p className="mt-8 text-lg text-graphite dark:text-stone-400 max-w-md leading-relaxed">
              Log in to manage your service requests and connect with the community's most reliable professionals.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <FiShield className="mt-1 text-trust h-5 w-5" />
            <div>
              <p className="text-sm font-bold text-charcoal dark:text-stone-50 uppercase tracking-wider">Secured Access</p>
              <p className="text-sm text-graphite dark:text-stone-400">Your data is encrypted and protected by industry-standard protocols.</p>
            </div>
          </div>
          {tinyLoc && (
            <div className="flex items-start gap-4">
              <FiCheckCircle className="mt-1 text-trust h-5 w-5" />
              <div>
                <p className="text-sm font-bold text-charcoal dark:text-stone-50 uppercase tracking-wider">Localized Service</p>
                <p className="text-sm text-graphite dark:text-stone-400">Detected LGA: {tinyLoc}. You're seeing the best pros in your area.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-24 bg-stone-50 dark:bg-charcoal transition-colors">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-12">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-trust"></div>
              <span className="font-tight text-xl font-bold tracking-tight text-charcoal dark:text-stone-50">FYF</span>
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-tight font-bold text-charcoal dark:text-stone-50">Welcome back</h2>
            <p className="mt-3 text-graphite dark:text-stone-400">Enter your details to access your account.</p>
          </div>

          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
          >
            <div className="space-y-2">
              <label htmlFor="email" className="label-caps">Email Address</label>
              <input
                type="email"
                id="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="label-caps">Password</label>
                <Link to="/forgot-password" size="sm" className="text-[10px] font-bold uppercase tracking-wider text-trust hover:underline">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-14"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-graphite hover:text-charcoal"
                >
                  {show ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!isFormValid || loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? "AUTHENTICATING..." : "SIGN IN"}
              {!loading && <FiArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-10 text-center text-sm text-graphite dark:text-stone-400">
            Don't have an account?{" "}
            <Link to="/signup" className="text-trust font-bold hover:underline transition-colors">
              Create an account
            </Link>
          </p>

          <div className="mt-20 pt-8 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between transition-colors">
            <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 tracking-widest uppercase">FYF &copy; 2024</p>
            <div className="flex gap-4">
              <Link to="/help/terms" className="text-[10px] font-bold text-stone-400 dark:text-stone-500 tracking-widest uppercase hover:text-graphite dark:hover:text-stone-300 transition-colors">Privacy</Link>
              <Link to="/help/terms" className="text-[10px] font-bold text-stone-400 dark:text-stone-500 tracking-widest uppercase hover:text-graphite dark:hover:text-stone-300 transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

