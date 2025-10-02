// Login.jsx
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import "../styles/auth.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, pw);

      if (!auth.currentUser) return;
      const token = await auth.currentUser.getIdToken(true);

      // Store session persistence
      if (keepSignedIn) {
        localStorage.setItem("authToken", token);
      } else {
        sessionStorage.setItem("authToken", token);
      }

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/whoami/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Backend verification failed");
      const data = await res.json();

      if (data.role === "admin") navigate("/admin");
      else if (data.role === "supervisor") navigate("/supervisor");
      else navigate("/guard");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <header className="auth-header">
        <a href="/">Golden Valley Login</a>
      </header>

      <div className="auth-page">
        <div className="auth-card">
          <img src={logo} alt="Golden Valley Security" className="logo" />
          <h1>Golden Valley Security</h1>
          <p className="subtitle">Sign in to your account</p>

          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"}
                placeholder="Password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                required
              />
              <span
                onClick={() => setShowPw(!showPw)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  color: "#6b7280"
                }}
              >
                {showPw ? "🙈" : "👁️"}
              </span>
            </div>

            <div className="checkbox-group">
              <input
                type="checkbox"
                checked={keepSignedIn}
                onChange={() => setKeepSignedIn(!keepSignedIn)}
                id="keepSignedIn"
              />
              <label htmlFor="keepSignedIn">Keep me signed in</label>
            </div>

            <button type="submit">Sign in</button>
          </form>

          <div className="links">
            <a href="/forgot-password">Forgot Password?</a>
            <a href="/support">Need Help?</a>
          </div>

          {error && <p className="error">{error}</p>}
        </div>
      </div>
    </>
  );
}
