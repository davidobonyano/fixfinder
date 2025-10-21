import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserCircle } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../context/useAuth";

export default function Header() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);
  const closeDropdown = () => setDropdownOpen(false);

  const handleLogout = () => {};

  const linkClasses = ({ isActive }) =>
    isActive
      ? "text-indigo-600 dark:text-indigo-400 font-semibold whitespace-nowrap"
      : "hover:text-indigo-500 whitespace-nowrap";

  return (
    <header className="bg-gray-50 dark:bg-gray-800 shadow-md">
      {/* Top Bar (Logo + Auth) */}
      <div className=" lg:hidden container mx-auto px-4 py-3 flex justify-between items-center">
        <NavLink to="/">
          <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">FixFinder</h1>
        </NavLink>

        {isAuthenticated ? (
          <div className="relative">
            <button
              onClick={toggleDropdown}
              className="text-gray-700 dark:text-white text-xl focus:outline-none flex items-center gap-2"
            >
              {user?.profilePicture || user?.avatarUrl ? (
                <img
                  src={user.profilePicture || user.avatarUrl}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <FontAwesomeIcon icon={faUserCircle} size="lg" />
              )}
              <span className="text-sm">{user?.name || "Account"}</span>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-lg z-50">
                <NavLink
                  to="/dashboard"
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={closeDropdown}
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/profile"
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={closeDropdown}
                >
                  Profile
                </NavLink>
                <button
                  onClick={() => { logout(); navigate("/"); closeDropdown(); }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <NavLink to="/login" className="text-indigo-600 dark:text-indigo-300 font-medium">Log in</NavLink>
            <button onClick={() => navigate("/signup")} className="px-3 py-1.5 bg-indigo-600 text-white rounded-md">Sign up</button>
          </div>
        )}
      </div>

      {/* Mobile Nav (Horizontal scrollable row) */}
      <nav className="lg:hidden bg-gray-100 dark:bg-gray-900 px-2 py-2 overflow-x-auto">
        <div className="flex space-x-6 pl-2 text-base font-medium text-gray-700 dark:text-white w-max">
          <NavLink to="/" className={linkClasses}>Home</NavLink>
          <NavLink to="/services" className={linkClasses}>Services</NavLink>
          <NavLink to="/join" className={linkClasses}>Join as Pro</NavLink>
         
        </div>
      </nav>

      {/* Desktop Nav (Original Style) */}
      <div className="hidden lg:flex justify-between items-center px-4 py-3">
        <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
          <NavLink to="/">FixFinder</NavLink>
        </div>

        <nav className="flex items-center space-x-6 text-sm font-medium text-gray-700 dark:text-white">
          <NavLink to="/" className={linkClasses}>Home</NavLink>
          <NavLink to="/services" className={linkClasses}>Services</NavLink>
          <NavLink to="/join" className={linkClasses}>Join as Pro</NavLink>
         

          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={toggleDropdown}
                className="text-xl focus:outline-none flex items-center gap-2"
              >
                {user?.profilePicture || user?.avatarUrl ? (
                  <img
                    src={user.profilePicture || user.avatarUrl}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <FontAwesomeIcon icon={faUserCircle} size="lg" />
                )}
                <span className="text-sm">{user?.name || "Account"}</span>
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-700 border rounded shadow-lg z-50">
                  <NavLink
                    to="/dashboard"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={closeDropdown}
                  >
                    Dashboard
                  </NavLink>
                  <NavLink
                    to="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={closeDropdown}
                  >
                    Profile
                  </NavLink>
                  <button
                    onClick={() => { logout(); navigate("/"); closeDropdown(); }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <NavLink to="/login" className="text-indigo-600 dark:text-indigo-300 font-medium">Log in</NavLink>
              <button onClick={() => navigate("/signup")} className="px-3 py-1.5 bg-indigo-600 text-white rounded-md">Sign up</button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
