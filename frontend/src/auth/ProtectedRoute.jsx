// src/auth/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children, allow }) {
  const { user, role, loading } = useAuth();
  if (loading) return <p>Loading...</p>;; // splash screen
  if (!user) return <Navigate to="/login" replace />;
  if (allow && !allow.includes(role)) return <Navigate to="/unauthorized" replace />;
  return children;
  
}
