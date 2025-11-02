import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { loginUser, snapToLGAApi } from "../utils/api";
import { useLocation } from "../hooks/useLocation";

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
        <h2 className="text-2xl font-extrabold text-center mb-6 text-gray-800 dark:text-white">Log in</h2>

        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
            Password
          </label>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600"
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {/* Tiny location indicator (bottom-right) */}
        {tinyLoc && (
          <div className="absolute bottom-2 right-3 text-[10px] text-green-700 bg-green-50/70 px-2 py-0.5 rounded">
            {tinyLoc}
          </div>
        )}

        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

        <button
          onClick={handleLogin}
          disabled={!isFormValid || loading}
          className={`w-full py-2 px-4 rounded text-white font-semibold transition-colors ${
            isFormValid
              ? "bg-indigo-600 hover:bg-indigo-700"
              : "bg-indigo-300 cursor-not-allowed"
          }`}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <div className="mt-4 text-center">
          <Link 
            to="/forgot-password" 
            className="text-sm text-indigo-500 font-medium hover:underline cursor-pointer block mb-3"
          >
            Forgot Password?
          </Link>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Don't have an account?{" "}
            <Link to="/signup" className="text-indigo-500 font-medium hover:underline cursor-pointer">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
