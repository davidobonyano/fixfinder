import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import RouteGuard from "../components/RouteGuard";
import NotificationContainer from "../components/NotificationContainer";

export default function Rootlayout() {
  return (
    <RouteGuard>
      <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-white transition-colors duration-300">
        <Header />

        <main>
          <Outlet />
        </main>

        <Footer />
        <NotificationContainer />
      </div>
    </RouteGuard>
  );
}
