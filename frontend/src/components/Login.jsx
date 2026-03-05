import { useState } from "react";

import { loginUser, getProfile } from "../api/auth";
import { useToast } from "../contexts/ToastContext";
import "../styles/Login.css";

function Login({ onLogin }) {
  
  const { showSuccess, showError } = useToast();

  const [role, setRole] = useState("tenant");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");


 

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
  
    localStorage.clear();
  
    try {
      await loginUser(email, password, role);
  
      const profile = await getProfile();
  
      localStorage.setItem("user", JSON.stringify(profile.user));
      localStorage.setItem("userRole", profile.role || "owner");
      localStorage.setItem("userType", profile.userType || "tenant");
  
      if (profile.menuPermission) {
        localStorage.setItem(
          "menuPermission",
          JSON.stringify(profile.menuPermission)
        );
      }
  
      onLogin(profile.user, profile.role, profile);
  
      showSuccess("Login successful!");
  
      navigate("/dashboard", { replace: true });
  
    } catch (err) {
      console.error("Login error:", err);
  
      let customMessage = "Login failed";
  
      if (err.status === 401 && err.message === "SUBSCRIPTION_REQUIRED") {
        customMessage =
          "Your company doesn't have a current subscription plan. Please contact admin to subscribe.";
      } else if (err.message === "Invalid credentials") {
        customMessage = "Invalid email or password.";
      } else if (err.message === "Account is deactivated") {
        customMessage = "Your account has been deactivated. Contact admin.";
      } else {
        customMessage = err.message || "Login failed";
      }
  
      setErrorMessage(customMessage);
      setShowErrorModal(true);
      showError(customMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>WhatsApp Dashboard</h1>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "Logging in…" : "Login"}
          </button>
        </form>
      </div>

      {showErrorModal && (
        <div className="error-modal-overlay" onClick={() => setShowErrorModal(false)}>
          <div className="error-modal" onClick={(e) => e.stopPropagation()}>
            <div className="error-modal-icon">🔒</div>
            <h2>Access Denied</h2>
            <p>{errorMessage}</p>
            <button className="error-modal-btn" onClick={() => setShowErrorModal(false)}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;