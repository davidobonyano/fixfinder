import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstTime, setFirstTime] = useState(true);

  const isFormValid = email.trim() && password.trim();

  useEffect(() => {
    const hasLoggedInBefore = localStorage.getItem("hasLoggedIn");
    if (hasLoggedInBefore) {
      setFirstTime(false);
    }
  }, []);

  const handleLogin = () => {
    if (!isFormValid) return;

    login();
    localStorage.setItem("hasLoggedIn", "true");
    navigate("/");
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
        <h2 className="text-2xl font-extrabold text-center mb-6 text-gray-800 dark:text-white">
          {firstTime ? "Welcome to FixFinder" : "Welcome back to FixFinder"}
        </h2>

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
          <input
            type="password"
            id="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={!isFormValid}
          className={`w-full py-2 px-4 rounded text-white font-semibold transition-colors ${
            isFormValid
              ? "bg-indigo-600 hover:bg-indigo-700"
              : "bg-indigo-300 cursor-not-allowed"
          }`}
        >
          Sign In
        </button>

        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">
          Don't have an account?{" "}
          <span className="text-indigo-500 font-medium hover:underline cursor-pointer">
            Create one
          </span>
        </p>
      </div>
    </div>
  );
}
