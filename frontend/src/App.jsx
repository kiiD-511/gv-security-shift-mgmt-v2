// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthProvider from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Support from "./pages/Support";
import AdminDashboard from "./pages/admin/AdminDashboard";
import SupervisorPortal from "./pages/supervisor/SupervisorPortal";
import GuardHome from "./pages/guard/GuardHome";
import Unauthorized from "./pages/Unauthorized";
import { useAuth } from "./auth/AuthContext";
import Navbar from "./components/Navbar";

export default function App(){
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar/>
        <Routes>
          <Route path="/login" element={<Login/>}/>
          <Route path="/forgot-password" element={<ForgotPassword/>}/>
          <Route path="/support" element={<Support/>}/>
          <Route path="/unauthorized" element={<Unauthorized/>}/>
          <Route path="/" element={
            <ProtectedRoute allow={['admin', 'supervisor', 'guard']}>
              <RoleSwitch />
            </ProtectedRoute>
          }/>
          <Route path="*" element={<Navigate to="/" replace />}/>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

function RoleSwitch(){
  const { role } = useAuth();
  if (role === 'admin') return <AdminDashboard/>;
  if (role === 'supervisor') return <SupervisorPortal/>;
  return <GuardHome/>;
}

