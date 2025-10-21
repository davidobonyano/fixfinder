import {
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
  Route,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthProvider";
import { SocketProvider } from "./context/SocketContext";

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
import PostJob from "./pages/dashboard/PostJob";
import MyJobs from "./pages/dashboard/MyJobs";
import Messages from "./pages/dashboard/Messages";
import ChangePassword from "./pages/dashboard/ChangePassword";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CategoryPage from "./pages/CategoryPage";
import Verify from "./pages/Verify";
import Profile from "./pages/Profile";
import ProfessionalDetail from "./pages/ProfessionalDetail";
import ProfessionalForm from "./pages/ProfessionalForm";
import VerifyEmail from "./pages/VerifyEmail";
import ProfessionalDiscovery from "./pages/ProfessionalDiscovery";
import ProfessionalsPage from "./pages/dashboard/ProfessionalsPage";

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Main Site Routes (with header/footer) */}
      <Route path="/" element={<RootLayout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="services" element={<Services />} />
          <Route path="/services/:category" element={<CategoryPage />} />
          <Route path="join" element={<Join />} />
          <Route path="verify" element={<Verify />} />
          <Route path="verify-email" element={<VerifyEmail />} />
          <Route path="profile" element={<Profile />} />
          <Route path="admin" element={<AdminDashboard />} />
          
          {/* Professional Routes */}
          <Route path="professionals/:id" element={<ProfessionalDetail />} />
          <Route path="professionals/:id/edit" element={<ProfessionalForm />} />

          <Route path="help" element={<HelpLayout />}>
            <Route path="faq" element={<Faq />} />
            <Route path="contact" element={<Contact />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>

      {/* Dashboard Routes (no header/footer) */}
      <Route path="dashboard" element={<DashboardLayout userType="user" />}>
        <Route index element={<ProfessionalDiscovery />} />
        <Route path="overview" element={<UserDashboard />} />
        <Route path="professionals" element={<ProfessionalsPage />} />
        <Route path="post-job" element={<PostJob />} />
        <Route path="my-jobs" element={<MyJobs />} />
        <Route path="messages" element={<Messages />} />
        <Route path="messages/:conversationId" element={<Messages />} />
        <Route path="profile" element={<Profile />} />
        <Route path="security" element={<ChangePassword />} />
        {/* Add more user dashboard routes here */}
      </Route>
      
      <Route path="dashboard/professional" element={<DashboardLayout userType="professional" />}>
        <Route index element={<ProfessionalDashboard />} />
        <Route path="profile" element={<Profile />} />
        {/* Add more professional dashboard routes here */}
      </Route>
    </>
  )
);

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <RouterProvider router={router} />
      </SocketProvider>
    </AuthProvider>
  );
}
