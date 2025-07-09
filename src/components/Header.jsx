import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserCircle } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../context/useAuth";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
    setMobileDropdownOpen(false); // close dropdown if menu closes
  };

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);
  const toggleMobileDropdown = () =>
    setMobileDropdownOpen(!mobileDropdownOpen);

  const closeDropdown = () => {
    setDropdownOpen(false);
    setMobileDropdownOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    closeDropdown();
  };

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";
    return () => (document.body.style.overflow = "auto");
  }, [isOpen]);

  const linkClasses = ({ isActive }) =>
    isActive
      ? "text-indigo-600 dark:text-indigo-400 font-semibold"
      : "hover:text-indigo-500";

  return (
    <header className="relative z-50 bg-white dark:bg-gray-800 shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
      <NavLink to={"/"}><h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
          FixFinder
        </h1></NavLink>  

        {/* Mobile Toggle */}
        <button
          className="lg:hidden text-gray-700 dark:text-white focus:outline-none"
          onClick={toggleMenu}
          aria-label="Toggle Menu"
        >
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex space-x-6 items-center text-sm font-medium">
          <NavLink to="/" className={linkClasses}>
            Home
          </NavLink>
          <NavLink to="/services" className={linkClasses}>
            Services
          </NavLink>
          <NavLink to="/add-service" className={linkClasses}>
            Post a Job
          </NavLink>
          <NavLink to="/help/faq" className={linkClasses}>
            FAQ
          </NavLink>
          <NavLink to="/help/contact" className={linkClasses}>
            Contact
          </NavLink>
          <NavLink to="/admin" className={linkClasses}>
            Admin
          </NavLink>

          {isAuthenticated && (
            <div className="relative">
              <button
                onClick={toggleDropdown}
                className="text-gray-700 dark:text-white text-xl focus:outline-none"
              >
                <FontAwesomeIcon icon={faUserCircle} size="lg" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-lg z-50">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900"
                  >
                    Logout
                  </button>
                  <NavLink
                    to="/join"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={closeDropdown}
                  >
                    Join as Pro
                  </NavLink>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>

      {/* Mobile Nav Menu */}
      <div
        className={`absolute top-full left-0 w-full z-40 bg-white dark:bg-gray-900 shadow-md transition-transform duration-300 ease-in-out lg:hidden transform ${
          isOpen ? "translate-y-0" : "-translate-y-[200%]"
        }`}
      >
        <div className="px-8 py-4 flex flex-col gap-3 text-sm font-medium text-gray-700 dark:text-white">
          <NavLink to="/" onClick={() => setIsOpen(false)} className={linkClasses}>
            Home
          </NavLink>
          <NavLink to="/services" onClick={() => setIsOpen(false)} className={linkClasses}>
            Services
          </NavLink>
          <NavLink to="/add-service" onClick={() => setIsOpen(false)} className={linkClasses}>
            Post a Job
          </NavLink>
          <NavLink to="/help/faq" onClick={() => setIsOpen(false)} className={linkClasses}>
            FAQ
          </NavLink>
          <NavLink to="/help/contact" onClick={() => setIsOpen(false)} className={linkClasses}>
            Contact
          </NavLink>
          <NavLink to="/admin" onClick={() => setIsOpen(false)} className={linkClasses}>
            Admin
          </NavLink>

          {/* Mobile Profile Dropdown */}
          {isAuthenticated && (
            <div className="relative ">
              <button
                onClick={toggleMobileDropdown}
                className="flex items-center gap-2 text-lg text-gray-700 dark:text-white focus:outline-none"
              >
                <FontAwesomeIcon icon={faUserCircle} size="lg" />
              </button>

              {mobileDropdownOpen && (
                <div className="mt-2 bg-white w-40 dark:bg-gray-800 rounded shadow-md border dark:border-gray-700">
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900"
                  >
                    Logout
                  </button>
                  <NavLink
                    to="/join"
                    onClick={() => {
                      setIsOpen(false);
                      setMobileDropdownOpen(false);
                    }}
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Join as Pro
                  </NavLink>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
