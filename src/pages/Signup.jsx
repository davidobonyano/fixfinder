import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../utils/api";
import { useAuth } from "../context/useAuth";
import { useLocation } from "../hooks/useLocation";
import { FiArrowRight, FiShield, FiBriefcase } from "react-icons/fi";
import { snapToLGAApi } from "../utils/api";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tinyLoc, setTinyLoc] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

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

  const isFormValid = name.trim() && email.trim() && password.trim();

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid || loading) return;
    setLoading(true);
    setError("");
    try {
      const userData = { name, email, password, role: "customer" };
      if (location) {
        userData.latitude = location.latitude;
        userData.longitude = location.longitude;
      }

      const res = await registerUser(userData);
      login(res.token, res.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-stone-50 font-sans selection:bg-trust/10">
      {/* Left Panel - Brand Promise */}
      <div className="hidden lg:flex w-1/2 bg-stone-100 flex-col justify-between p-16 border-r border-stone-200">
        <div className="space-y-8">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-trust"></div>
            <span className="font-tight text-xl font-bold tracking-tight text-charcoal">FINDYOURFIXER</span>
          </div>

          <div className="pt-20">
            <h1 className="text-5xl font-tight font-bold leading-[1.05] text-charcoal">
              A community built on verified quality.
            </h1>
            <p className="mt-8 text-lg text-graphite max-w-md leading-relaxed">
              Create an account to discover verified local professionals and manage your service requests with ease.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <FiShield className="mt-1 text-trust h-5 w-5" />
            <div>
              <p className="text-sm font-bold text-charcoal uppercase tracking-wider">Quality Assured</p>
              <p className="text-sm text-graphite">We verify every professional to ensure they meet our standards.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <FiBriefcase className="mt-1 text-trust h-5 w-5" />
            <div>
              <p className="text-sm font-bold text-charcoal uppercase tracking-wider">Pro Dashboard</p>
              <p className="text-sm text-graphite">Are you a service provider? <Link to="/join" className="text-trust underline">Join as a professional</Link> instead.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-24 bg-stone-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-12">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-trust"></div>
              <span className="font-tight text-xl font-bold tracking-tight text-charcoal">FINDYOURFIXER</span>
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-tight font-bold text-charcoal">Join FindYourFixer</h2>
            <p className="mt-3 text-graphite">Connect with the best local artisans today.</p>
          </div>

          <form
            className="space-y-6"
            onSubmit={onSubmit}
          >
            <div className="space-y-2">
              <label htmlFor="name" className="label-caps">Full Name</label>
              <input
                type="text"
                id="name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                required
              />
            </div>

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
              <label htmlFor="password" className="label-caps">Password</label>
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
              <div className="p-4 bg-red-50 border border-red-200 text-xs text-red-800 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!isFormValid || loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
              {!loading && <FiArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-graphite leading-relaxed">
            By signing up, you agree to our{" "}
            <Link to="/help/terms" className="text-trust font-bold">Terms of Service</Link> and{" "}
            <Link to="/help/terms" className="text-trust font-bold">Privacy Policy</Link>.
          </p>

          <p className="mt-10 text-center text-sm text-graphite">
            Already have an account?{" "}
            <Link to="/login" className="text-trust font-bold hover:underline">
              Sign in
            </Link>
          </p>

          <div className="mt-20 pt-8 border-t border-stone-200 flex items-center justify-between">
            <p className="text-[10px] font-bold text-stone-400 tracking-widest uppercase">FINDYOURFIXER &copy; 2024</p>
            {tinyLoc && (
              <p className="text-[10px] font-bold text-stone-400 tracking-widest uppercase">{tinyLoc}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

