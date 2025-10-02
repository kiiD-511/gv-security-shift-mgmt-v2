// src/pages/ForgotPassword.jsx
import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleReset(e) {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("✅ Password reset email sent! Please check your inbox.");
    } catch (err) {
      setError("❌ " + err.message);
    }
  }

  return (
    <>
      <header className="auth-header">
        <a href="/">Golden Valley Login</a>
      </header>

      <div className="auth-page">
        <div className="auth-card">
          <h1>Forgot Password</h1>
          <p className="subtitle">
            Enter your email and we’ll send you a reset link.
          </p>

          <form onSubmit={handleReset}>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit">Send Reset Email</button>
          </form>

          {message && <p className="success">{message}</p>}
          {error && <p className="error">{error}</p>}

          {/* Back button */}
          <button
            className="btn-secondary mt-3"
            onClick={() => navigate("/login")}
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </>
  );
}
