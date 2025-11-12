import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { loginUser, snapToLGAApi } from "../utils/api";
import { useLocation } from "../hooks/useLocation";
import { FiArrowRight, FiGlobe, FiShield, FiZap } from "react-icons/fi";
import { FaGoogle, FaApple } from "react-icons/fa";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [tinyLoc, setTinyLoc] = useState("");
  
  // Auto location detection (no click needed)
  const { location } = useLocation(true);

  // Resolve human-readable tiny location from coords
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!location?.latitude || !location?.longitude) {
        setTinyLoc("");
        return;
      }
      try {
        console.log('📡 Login: raw detected location', {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        });
      } catch (e) {}
      try {
        const res = await snapToLGAApi(location.latitude, location.longitude);
        const lga = res?.data?.lga;
        const state = res?.data?.state;
        const label = lga || state || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
        try {
          console.log('📍 Login: snapped location', {
            lga: res?.data?.lga,
            state: res?.data?.state,
            city: res?.data?.city,
            address: res?.data?.address,
            input: { lat: location.latitude, lng: location.longitude }
          });
        } catch (e) {}
        if (!cancelled) setTinyLoc(label);
      } catch {
        if (!cancelled) setTinyLoc(`${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`);
      }
    })();
    return () => { cancelled = true; };
  }, [location?.latitude, location?.longitude]);

  const isFormValid = email.trim() && password.trim();

  const handleLogin = async () => {
    if (!isFormValid || loading) return;
    setLoading(true);
    setError("");
    try {
      // Include location if available
      const loginData = { email, password };
      if (location) {
        loginData.latitude = location.latitude;
        loginData.longitude = location.longitude;
      }
      
      const res = await loginUser(loginData);
      login(res.token, res.user);
      // Redirect to appropriate dashboard based on user role
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
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1f2937,transparent_55%),radial-gradient(circle_at_bottom,#3730a3,transparent_60%)]" />
      <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-emerald-500/30 blur-3xl" />
      <div className="absolute top-48 -right-24 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

      <div className="relative z-10 flex min-h-screen flex-col md:flex-row">
        <div className="flex w-full flex-col justify-between px-6 py-12 md:w-1/2 md:px-16 lg:px-20 lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs font-semibold tracking-wide text-emerald-200 ring-1 ring-white/10 backdrop-blur">
              <FiGlobe className="h-3 w-3" /> FindYourFixer
            </span>
            <h1 className="mt-8 text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-[52px] lg:leading-[1.1]">
              Sign in and get matched with verified pros in minutes.
            </h1>
            <p className="mt-6 max-w-xl text-base text-slate-300 sm:text-lg">
              Track your service requests, manage jobs, and chat seamlessly with professionals who already earned the community’s trust.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: <FiShield className="h-5 w-5 text-emerald-300" />,
                  title: "Secure by design",
                  copy: "Multi-factor ready with encryption at rest"
                },
                {
                  icon: <FiZap className="h-5 w-5 text-indigo-300" />,
                  title: "Lightning fast",
                  copy: "Get recommended experts tailored to your LGA"
                },
              ].map((feature, idx) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/10 backdrop-blur-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                      {feature.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{feature.title}</p>
                      <p className="mt-1 text-xs text-slate-300">{feature.copy}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 hidden md:flex items-center gap-6 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-300">
                LIVE COVERAGE
              </p>
              <p className="mt-2 text-sm text-white">
                {tinyLoc
                  ? `You're connecting from ${tinyLoc}.`
                  : "Allow location access for hyper-local search results."}
              </p>
            </div>
            <FiArrowRight className="h-6 w-6 text-emerald-300" />
          </div>
        </div>

        <div className="flex w-full items-center justify-center px-6 py-12 md:w-1/2 md:px-12 lg:px-16 lg:py-20">
          <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-10">
            {tinyLoc && (
              <div className="absolute -top-3 right-6 rounded-full border border-emerald-300/60 bg-emerald-400/10 px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-emerald-200 shadow-sm">
                {tinyLoc}
              </div>
            )}
            <div className="mb-8 space-y-2">
              <h2 className="text-3xl font-semibold text-white">Welcome back</h2>
              <p className="text-sm text-slate-300">
                Sign in to continue managing your bookings and conversations.
              </p>
            </div>

            <div className="mb-6" />

            <form
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
            >
              <div className="space-y-2">
                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Email address
                </label>
                <input
                  type="email"
                  id="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/60"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    id="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 pr-14 text-sm text-white placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center text-xs font-semibold text-emerald-200/80 transition hover:text-emerald-200"
                  >
                    {show ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-300">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-white/10 bg-transparent text-emerald-400 focus:ring-emerald-300/60"
                  />
                  Keep me signed in
                </label>
                <Link to="/forgot-password" className="font-semibold text-emerald-200 transition hover:text-emerald-100">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={!isFormValid || loading}
                className={`w-full rounded-full px-6 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-300/70 ${
                  isFormValid
                    ? "bg-emerald-400 text-slate-900 hover:bg-emerald-300"
                    : "bg-emerald-400/40 text-slate-500 cursor-not-allowed"
                }`}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-slate-300">
              New to FindYourFixer?{" "}
              <Link to="/signup" className="font-semibold text-emerald-200 transition hover:text-emerald-100">
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
