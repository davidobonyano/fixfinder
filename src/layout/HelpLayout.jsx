import { NavLink, Outlet, useLocation } from "react-router-dom";
import { FaQuestionCircle, FaEnvelope, FaArrowLeft } from "react-icons/fa";

const HelpLayout = () => {
  const location = useLocation();

  const breadcrumbs = location.pathname
    .split("/")
    .filter(Boolean)
    .map((crumb, index, arr) => {
      const path = "/" + arr.slice(0, index + 1).join("/");
      return {
        name: crumb.replace(/-/g, " ").charAt(0).toUpperCase() + crumb.slice(1),
        path,
      };
    });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 grid grid-cols-1 md:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <aside className="bg-white border-r border-gray-200 px-6 py-10 md:min-h-screen">
        <h2 className="text-2xl font-bold text-indigo-600 mb-8">FixFinder Help</h2>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          Need assistance? Our Help Center is here to guide you through common questions and support options. Whether you're a user or a service provider, we're ready to help.
        </p>
        <nav className="space-y-4 text-base">
          <NavLink
            to="/help/faq"
            className={({ isActive }) =>
              `flex items-center gap-2 transition ${
                isActive
                  ? "text-indigo-600 font-semibold"
                  : "text-gray-700 hover:text-indigo-500"
              }`
            }
          >
            <FaQuestionCircle />
            FAQs
          </NavLink>
          <NavLink
            to="/help/contact"
            className={({ isActive }) =>
              `flex items-center gap-2 transition ${
                isActive
                  ? "text-indigo-600 font-semibold"
                  : "text-gray-700 hover:text-indigo-500"
              }`
            }
          >
            <FaEnvelope />
            Contact Support
          </NavLink>
        </nav>
      </aside>

      {/* Main content area */}
      <main className="px-6 py-10 w-full">
        {/* Breadcrumb navigation */}
        <div className="mb-6">
          <NavLink
            to="/"
            className="inline-flex items-center text-sm text-indigo-600 hover:underline mb-2"
          >
            <FaArrowLeft className="mr-1 text-xs" />
            Back to Home
          </NavLink>

          <div className="text-sm text-gray-500 flex flex-wrap gap-1">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                <NavLink
                  to={crumb.path}
                  className="capitalize hover:underline text-gray-600"
                >
                  {crumb.name}
                </NavLink>
                {i < breadcrumbs.length - 1 && <span>/</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Intro text for Help Home */}
        {location.pathname === "/help" && (
          <section className="bg-white border rounded-lg shadow p-6">
            <h1 className="text-3xl font-bold mb-4 text-indigo-700">Welcome to the FixFinder Help Center</h1>
            <p className="text-gray-700 text-base leading-relaxed mb-4">
              Whether you're trying to hire a professional or manage your service profile, our Help Center is designed to make your experience smooth and stress-free.
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Visit our <NavLink to="/help/faq" className="text-indigo-600 underline">FAQ section</NavLink> to find quick answers to common questions.</li>
              <li>Need to talk to us? Head to the <NavLink to="/help/contact" className="text-indigo-600 underline">Contact Support</NavLink> page to reach our team.</li>
            </ul>
          </section>
        )}

        {/* Nested route (FAQ or Contact) */}
        {location.pathname !== "/help" && (
          <section className="bg-white border rounded-lg shadow p-6">
            <Outlet />
          </section>
        )}
      </main>
    </div>
  );
};

export default HelpLayout;
