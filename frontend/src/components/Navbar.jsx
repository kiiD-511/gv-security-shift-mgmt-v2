// src/components/Navbar.jsx
import { useAuth } from "../auth/AuthContext";
import { useNavigate, Link } from "react-router-dom";

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <nav className="navbar flex justify-between items-center p-4 bg-gray-800 text-white">
      <div className="left">
        <Link to="/" className="text-xl font-bold">Golden Valley</Link>
      </div>

      <div className="right flex gap-4 items-center">
        {user ? (
          <>
            {/* Role-based links */}
            {role === "admin" && (
              <Link to="/admin">Admin Dashboard</Link>
            )}
            {role === "supervisor" && (
              <Link to="/supervisor">Supervisor Dashboard</Link>
            )}
            {role === "guard" && (
              <Link to="/guard">Guard Dashboard</Link>
            )}

            {/* Always show for any logged-in user */}
            <span>{user.email} ({role})</span>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded"
            >
              Logout
            </button>
          </>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded"
          >
            Login
          </button>
        )}
      </div>
    </nav>
  );
}

