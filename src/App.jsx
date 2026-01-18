import {
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
  Route,
  useRouteError,
  Link,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthProvider";
import { SocketProvider } from "./context/SocketContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ToastProvider } from "./context/ToastContext";
import { ThemeProvider } from "./context/ThemeContext";
import { FiSlash } from "react-icons/fi";

// Layouts & Pages
import RootLayout from "./layout/Rootlayout";
import HelpLayout from "./layout/HelpLayout";
import DashboardLayout from "./layout/DashboardLayout";
import Home from "./pages/Home";
import Services from "./pages/Services";
import AddService from "./pages/AddService";
import AdminDashboard from "./pages/AdminDashboard";
import Join from "./pages/Join";
import Faq from "./pages/Faq";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import Report from "./pages/Report";
import NotFound from "./pages/NotFound";

// Dashboard Pages
import UserDashboard from "./pages/dashboard/UserDashboard";
import ProfessionalDashboard from "./pages/dashboard/ProfessionalDashboard";
import ProJobFeed from "./pages/dashboard/ProJobFeed";
import ProAnalytics from "./pages/dashboard/ProAnalytics";
import ProReviews from "./pages/dashboard/ProReviews";
import PostJob from "./pages/dashboard/PostJob";
import MyJobs from "./pages/dashboard/MyJobs";
import JobApplications from "./pages/dashboard/JobApplications";
import Messages from "./pages/dashboard/Messages";
import ChangePassword from "./pages/dashboard/ChangePassword";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import CategoryPage from "./pages/CategoryPage";
import Verify from "./pages/Verify";
import Profile from "./pages/Profile";
import ProfessionalDetail from "./pages/ProfessionalDetail";
import ProfessionalForm from "./pages/ProfessionalForm";
import VerifyEmail from "./pages/VerifyEmail";
import VerifyEmailSuccess from "./pages/VerifyEmailSuccess";
import ProfessionalDiscovery from "./pages/ProfessionalDiscovery";
import ProfessionalsPage from "./pages/dashboard/ProfessionalsPage";
import ConnectedUsers from "./pages/dashboard/ConnectedUsers";
import UserProfile from "./pages/UserProfile";
import ProProfile from "./pages/dashboard/ProProfile";
import Notifications from "./pages/dashboard/Notifications";

const ErrorElement = () => {
  const error = useRouteError();
  console.error('Route error details:', error);

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full card-premium p-10 text-center bg-white">
        <div className="w-16 h-16 bg-clay/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <FiSlash className="w-8 h-8 text-clay" />
        </div>
        <h2 className="text-2xl font-tight font-bold text-charcoal mb-4">Application Error</h2>
        <p className="text-graphite mb-8 leading-relaxed">
          The system encountered an unexpected condition. Our technical team has been notified.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => window.location.reload()}
            className="btn-primary w-full"
          >
            Refresh Platform
          </button>
          <Link
            to="/"
            className="btn-secondary w-full"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
};

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Main Site Routes (with header/footer) */}
      <Route path="/" element={<RootLayout />} errorElement={<ErrorElement />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="services" element={<Services />} />
        <Route path="/services/:category" element={<CategoryPage />} />
        <Route path="join" element={<Join />} />
        <Route path="verify" element={<Verify />} />
        <Route path="verify-email" element={<VerifyEmail />} />
        <Route path="verify-email/success" element={<VerifyEmailSuccess />} />
        <Route path="profile" element={<Profile />} />
        <Route path="davidobonyanoefe" element={<AdminDashboard />} />

        {/* Professional Routes */}
        <Route path="professionals/:id" element={<ProfessionalDetail />} />
        <Route path="professionals/:id/edit" element={<ProfessionalForm />} />
        <Route path="professional/:id" element={<ProfessionalDetail />} />
        <Route path="user/:id" element={<UserProfile />} />

        <Route path="help" element={<HelpLayout />}>
          <Route path="faq" element={<Faq />} />
          <Route path="contact" element={<Contact />} />
          <Route path="terms" element={<Terms />} />
          <Route path="report" element={<Report />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Dashboard Routes (no header/footer) */}
      <Route path="dashboard" element={<DashboardLayout userType="user" />} errorElement={<ErrorElement />}>
        <Route index element={<ProfessionalDiscovery />} />
        <Route path="overview" element={<UserDashboard />} />
        <Route path="professionals" element={<ProfessionalsPage />} />
        <Route path="post-job" element={<PostJob />} />
        <Route path="my-jobs" element={<MyJobs />} />
        <Route path="my-jobs/:jobId" element={<MyJobs />} />
        <Route path="my-jobs/:jobId/applications" element={<JobApplications />} />
        <Route path="messages" element={<Messages />} />
        <Route path="messages/:conversationId" element={<Messages />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
        <Route path="security" element={<ChangePassword />} />
        <Route path="professional/:id" element={<ProfessionalDetail />} />
        <Route path="user/:id" element={<UserProfile />} />
        {/* Add more user dashboard routes here */}
      </Route>

      <Route path="dashboard/professional" element={<DashboardLayout userType="professional" />} errorElement={<ErrorElement />}>
        <Route index element={<ProJobFeed />} />
        <Route path="connected-users" element={<ConnectedUsers />} />
        <Route path="my-jobs" element={<MyJobs />} />
        <Route path="my-jobs/:jobId" element={<MyJobs />} />
        <Route path="my-jobs/:jobId/applications" element={<JobApplications />} />
        <Route path="messages" element={<Messages />} />
        <Route path="messages/:conversationId" element={<Messages />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="analytics" element={<ProAnalytics />} />
        <Route path="reviews" element={<ProReviews />} />
        <Route path="profile" element={<ProProfile />} />
        <Route path="create-profile" element={<ProfessionalForm />} />
        <Route path="edit-profile" element={<ProfessionalForm />} />
        <Route path="verify-face" element={<Verify />} />
        {/* Add more professional dashboard routes here */}
      </Route>
    </>
  )
);

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <ToastProvider>
            <ThemeProvider>
              <RouterProvider router={router} />
            </ThemeProvider>
          </ToastProvider>
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
