// src/pages/Support.jsx
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";

export default function Support() {
  const navigate = useNavigate();

  return (
    <>
      <header className="auth-header">
        <a href="/">Golden Valley Login</a>
      </header>

      <div className="auth-page">
        <div className="auth-card">
          <h1>Need Help?</h1>
          <p className="subtitle">
            For support, please reach out to our team.
          </p>

          <div className="support-info">
            <p>
              📧 Email:{" "}
              <a href="mailto:support@goldenvalley.com">
                support@goldenvalley.com
              </a>
            </p>
            <p>📞 Phone: +1 (555) 123-4567</p>
            <p>💬 Office Hours: Mon–Fri, 9 AM – 6 PM</p>
          </div>

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
