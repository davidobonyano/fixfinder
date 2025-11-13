import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserCircle } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../context/useAuth";
import { Menu as IconMenu, Search as IconSearch, Bell as IconBell, X as IconX, ChevronDown as IconChevronDown } from "lucide-react";
import Logo from "./Logo";
import ServiceSelector from "./ServiceSelector";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showServices, setShowServices] = useState(false);
  const servicesButtonRef = useRef(null);
  const servicesMenuRef = useRef(null);
  const [showPalette, setShowPalette] = useState(false);
  const [serviceSearchValue, setServiceSearchValue] = useState("");
  const [paletteSearchValue, setPaletteSearchValue] = useState("");
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isSolid = !isHome || isScrolled;

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);
  const closeDropdown = () => setDropdownOpen(false);

  const dashboardPath = user?.role === 'professional' ? '/dashboard/professional' : '/dashboard';

  const handleLogout = () => {
    logout();
    closeDropdown();
    navigate('/');
  };

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close Services dropdown when clicking outside
  useEffect(() => {
    if (!showServices) return;
    const onDocClick = (e) => {
      const btn = servicesButtonRef.current;
      const menu = servicesMenuRef.current;
      if (!btn || !menu) return;
      const target = e.target;
      if (!btn.contains(target) && !menu.contains(target)) {
        setShowServices(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showServices]);

  useEffect(() => {
    const onKey = (e) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      if ((isMac && e.metaKey && e.key.toLowerCase() === 'k') || (!isMac && e.ctrlKey && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setShowPalette((s) => !s);
      }
      if (e.key === 'Escape') {
        setShowPalette(false); setShowServices(false); setDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const linkClasses = ({ isActive }) =>
    isActive
      ? `${isSolid ? "text-indigo-600 dark:text-indigo-400" : "text-indigo-300"} font-semibold whitespace-nowrap`
      : `${isSolid ? "text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white" : "text-white/90 hover:text-white"} whitespace-nowrap`;

  const slugifyService = (name) =>
    name
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

  const handleServiceNavigate = (serviceName) => {
    if (!serviceName) return;
    const slug = slugifyService(serviceName);
    navigate(`/services/${slug}`);
  };

  return (
    <header
      className={`${isHome && !isScrolled ? "absolute" : "sticky"} top-0 z-40 w-full transition-all ${
        isSolid
          ? "bg-white/90 shadow-md border-b border-gray-200 backdrop-blur dark:bg-gray-900/90 dark:border-gray-800 dark:shadow-[0_15px_40px_-20px_rgba(0,0,0,0.6)]"
          : "bg-transparent"
      }`}
    >
      {/* Top Bar (Logo + Auth) */}
      <div className="lg:hidden container mx-auto px-4 py-3 flex justify-between items-center text-gray-800 dark:text-gray-100">
        <NavLink to="/">
          <Logo
            className="select-none"
            textClassName={`text-2xl ${
              isSolid ? "text-indigo-600 dark:text-indigo-400" : "text-indigo-300"
            }`}
            iconClassName="w-7 h-7"
          />
        </NavLink>

        <div className="flex items-center gap-3">
          {/* Mobile search trigger */}
          <button
            onClick={() => setShowPalette(true)}
            aria-label="Search"
            className={`${
              isSolid
                ? "text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                : "text-white/90 hover:text-white"
            } p-2 rounded-full`}
          >
            <IconSearch className="w-5 h-5" />
          </button>

          <ThemeToggle
            className={
              isSolid
                ? ""
                : "border-white/40 text-white hover:border-white/70 hover:text-white focus-visible:outline-white"
            }
          />

          <div className="relative">
            <button
              onClick={toggleDropdown}
              aria-label="Account"
              className={`${
                isSolid ? "text-gray-700 dark:text-gray-200" : "text-white"
              } text-xl focus:outline-none flex items-center gap-2`}
            >
              {isAuthenticated && (user?.profilePicture || user?.avatarUrl) ? (
                <img
                  src={user.profilePicture || user.avatarUrl}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <FontAwesomeIcon icon={faUserCircle} size="lg" />
              )}
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-50 py-1">
                {isAuthenticated ? (
                  <>
                    <NavLink
                      to={dashboardPath}
                      onClick={closeDropdown}
                      className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      Dashboard
                    </NavLink>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <NavLink
                      to="/login"
                      onClick={closeDropdown}
                      className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Log in
                    </NavLink>
                    <NavLink
                      to="/signup"
                      onClick={closeDropdown}
                      className="block w-full px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50"
                    >
                      Sign up
                    </NavLink>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Nav (Horizontal scrollable row) */}
      <nav className="lg:hidden px-2 py-2 overflow-x-auto">
        <div
          className={`flex space-x-6 pl-2 text-base font-medium ${
            isSolid ? "text-gray-700 dark:text-gray-200" : "text-white"
          } w-max`}
        >
          <NavLink to="/" className={linkClasses}>Home</NavLink>
          <NavLink to="/services" className={linkClasses}>Services</NavLink>
          <NavLink to="/join" className={linkClasses}>Join as Pro</NavLink>
          {isAuthenticated && (
            <NavLink to={dashboardPath} className={linkClasses}>Dashboard</NavLink>
          )}
         
        </div>
      </nav>

      {/* Desktop Nav - Centered glass pill that becomes solid on scroll/other pages */}
      <div className="hidden lg:flex items-center justify-center px-6 py-4">
        <div
          className={`${
            isSolid
              ? "bg-white text-gray-900 border border-gray-200 shadow-sm dark:bg-gray-900 dark:text-gray-100 dark:border-gray-800 dark:shadow-lg"
              : "backdrop-blur-md bg-white/10 text-white border border-white/15 dark:bg-gray-900/40 dark:border-gray-700/60"
          } rounded-full px-6 py-2.5 flex items-center gap-6 transition-colors w-[min(92vw,1100px)] justify-between`}
        >
          <NavLink to="/" className="flex items-center">
            <Logo className="select-none" textClassName={`${isSolid ? "text-indigo-600" : "text-indigo-300"} text-lg font-extrabold tracking-tight`} iconClassName="w-6 h-6" />
          </NavLink>
          <div className="flex items-center gap-4 text-sm">
            <div className="relative">
              <button
                ref={servicesButtonRef}
                onClick={() => setShowServices((s) => !s)}
                className={`inline-flex items-center gap-1 ${
                  isSolid
                    ? "text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                    : "text-white/90 hover:text-white"
                } transition`}
              >
                Services <IconChevronDown className="w-4 h-4"/>
              </button>
              {showServices && (
                <div
                  ref={servicesMenuRef}
                  className="absolute left-1/2 -translate-x-1/2 mt-3 w-[560px] rounded-2xl border border-white/10 bg-white/90 text-gray-900 backdrop-blur-md p-6 grid grid-cols-2 gap-4 shadow-xl dark:border-gray-700/60 dark:bg-gray-900/95 dark:text-gray-100"
                >
                  {['Electrician','Plumber','Tailor','AC Technician','Generator Repair','Hair Stylist'].map((item)=> (
                    <NavLink
                      key={item}
                      to={`/services/${slugifyService(item)}`}
                      onClick={() => setShowServices(false)}
                      className="block p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <div className="text-sm font-semibold">{item}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Top-rated pros near you</div>
                    </NavLink>
                  ))}
                  <NavLink
                    to="/services"
                    onClick={() => setShowServices(false)}
                    className="col-span-2 mt-2 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"
                  >
                    View all services
                  </NavLink>
                </div>
              )}
            </div>
            <NavLink
              to="/join"
              className={`${
                isSolid
                  ? "text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  : "text-white/90 hover:text-white"
              } transition`}
            >
              Join as Pro
            </NavLink>
          </div>
          <div className="ml-2 flex items-center gap-2">
          <div className="hidden xl:block w-64">
            <ServiceSelector
              value={serviceSearchValue}
              onChange={setServiceSearchValue}
              onSelect={(serviceName) => {
                handleServiceNavigate(serviceName);
                setServiceSearchValue("");
              }}
              onClear={() => setServiceSearchValue("")}
              placeholder="Search for services..."
              className="w-full"
            />
          </div>
          <button
            onClick={() => setShowPalette(true)}
            className={`xl:hidden flex items-center gap-2 px-4 h-9 rounded-full justify-start ${
              isSolid
                ? "bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200"
                : "bg-white/15 hover:bg-white/20 text-white"
            }`}
          >
            <IconSearch className="w-4 h-4"/> <span className="text-sm">Search</span>
          </button>
            <ThemeToggle
              className={
                isSolid
                  ? ""
                  : "border-white/40 text-white hover:border-white/70 hover:text-white focus-visible:outline-white"
              }
            />
            <button
              className={`p-2 rounded-full ${
                isSolid ? "hover:bg-gray-100 dark:hover:bg-gray-800" : "hover:bg-white/15"
              }`}
            >
              <IconBell className={`w-5 h-5 ${isSolid ? "text-gray-800 dark:text-gray-200" : "text-white"}`} />
            </button>
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <NavLink
                  to={dashboardPath}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                    isSolid
                      ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                      : "bg-white/15 text-white hover:bg-white/25"
                  }`}
                >
                  Dashboard
                </NavLink>
                <button
                  onClick={handleLogout}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                    isSolid
                      ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <NavLink
                  to="/login"
                  className={`${
                    isSolid
                      ? "text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                      : "text-white/90 hover:text-white"
                  }`}
                >
                  Log in
                </NavLink>
                <button
                  onClick={() => navigate("/signup")}
                  className="px-3 py-1.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-500"
                >
                  Sign up
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Command Palette */}
      {showPalette && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPalette(false)} />
          <div className="relative w-full max-w-2xl mx-auto rounded-2xl bg-white p-4 shadow-2xl dark:bg-gray-900 dark:border dark:border-gray-700">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <ServiceSelector
                  value={paletteSearchValue}
                  onChange={setPaletteSearchValue}
                  onSelect={(serviceName) => {
                    handleServiceNavigate(serviceName);
                    setPaletteSearchValue("");
                    setShowPalette(false);
                  }}
                  onClear={() => setPaletteSearchValue("")}
                  placeholder="Search services, pages, or actions..."
                  className="w-full"
                  inputProps={{ autoFocus: true }}
                />
              </div>
              <button onClick={() => setShowPalette(false)} className="p-2 text-gray-500 hover:text-gray-700"><IconX className="w-4 h-4"/></button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[{label:'Services',to:'/services'},{label:'Join as Pro',to:'/join'}].map(i=> (
                <NavLink
                  key={i.label}
                  to={i.to}
                  onClick={() => setShowPalette(false)}
                  className="block px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  {i.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer removed */}
    </header>
  );
}
