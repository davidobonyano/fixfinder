import {
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
  Route,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthProvider";
import { SocketProvider } from "./context/SocketContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ToastProvider } from "./context/ToastContext";

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
import ProfessionalProfile from "./pages/ProfessionalProfile";
import ProProfile from "./pages/dashboard/ProProfile";
import Notifications from "./pages/dashboard/Notifications";

const ErrorElement = ({ error, resetErrorBoundary }) => {
  console.error('Route error:', error);
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border rounded-lg p-6 text-center">
        <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-4">Please try again or go back.</p>
        <div className="space-x-3">
          <button 
            onClick={resetErrorBoundary}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try again
          </button>
          <a href="/" className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 inline-block">
            Go home
          </a>
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
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="davidobonyanoefe" element={<AdminDashboard />} />
          
          {/* Professional Routes */}
          <Route path="professionals/:id" element={<ProfessionalDetail />} />
          <Route path="professionals/:id/edit" element={<ProfessionalForm />} />
          <Route path="professional/:id" element={<ProfessionalProfile />} />
          <Route path="user/:id" element={<UserProfile />} />

          <Route path="help" element={<HelpLayout />}>
            <Route path="faq" element={<Faq />} />
            <Route path="contact" element={<Contact />} />
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
        <Route path="professional/:id" element={<ProfessionalProfile />} />
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
            <RouterProvider router={router} />
          </ToastProvider>
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
