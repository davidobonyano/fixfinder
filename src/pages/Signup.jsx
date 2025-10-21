import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../utils/api";
import { useAuth } from "../context/useAuth";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  // Role is fixed to customer here; pros must use Join as Pro
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    setLoading(true);
    setError("");
    try {
      const res = await registerUser({ name, email, password });
      login(res.token, res.user);
      // Redirect to user dashboard (signup is for customers)
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      {/* User Registration Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Create User Account</h1>
        <p className="text-gray-600 text-sm">Sign up to find and connect with trusted professionals</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <input 
          className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
          placeholder="Full name" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
        />
        <input 
          className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
          placeholder="Email" 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
        />
        <div className="relative">
          <input 
            className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
            placeholder="Password" 
            type={show ? "text" : "password"} 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          />
          <button 
            type="button" 
            onClick={() => setShow((s) => !s)} 
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600 hover:text-gray-800"
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
        
        {error && <p className="text-red-600 text-sm">{error}</p>}
        
        <button 
          disabled={loading} 
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
        >
          {loading ? "Creating Account..." : "Create User Account"}
        </button>
      </form>

      {/* Professional Registration Link */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Are you a Professional?</h3>
          <p className="text-xs text-gray-600">
            Use the professional portal to register your services and get clients.
            <Link to="/join" className="ml-1 text-blue-600 hover:text-blue-700 underline">Register as a Pro</Link>
          </p>
        </div>
      </div>

      <p className="text-sm mt-6 text-center">
        Already have an account? <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">Log in</Link>
      </p>
    </div>
  );
}


