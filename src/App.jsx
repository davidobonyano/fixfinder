import {
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
  Route,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthProvider";
import PrivateRoute from "./components/PrivateRoute";

// Layouts & Pages
import RootLayout from "./layout/Rootlayout";
import Home from "./pages/Home";
import Services from "./pages/Services";
import AddService from "./pages/AddService";
import AdminDashboard from "./pages/AdminDashboard";
import Join from "./pages/Join";
import Faq from "./pages/Faq";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/login" element={<Login />} />

      <Route element={<PrivateRoute />}>
        <Route path="/" element={<RootLayout />}>
          <Route index element={<Home />} />
          <Route path="services" element={<Services />} />
          <Route path="add-service" element={<AddService />} />
          <Route path="join" element={<Join />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="help/faq" element={<Faq />} />
          <Route path="help/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </>
  )
);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
