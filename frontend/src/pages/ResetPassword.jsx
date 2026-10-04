import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/ResetPassword.css";

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const API =
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/api";

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!password || !confirmPassword) {
      setError("Please enter both passwords");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API}/auth/reset-password/${token}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Something went wrong");
        return;
      }

      setMessage("Password reset successfully!");

      setTimeout(() => {
        navigate("/business/login");
      }, 2000);
    } catch (error) {
      console.error(error);
      setError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="reset-password-page">
    <div className="reset-password-container">

      <div className="reset-password-icon">
        🔐
      </div>

      <h1 className="reset-password-title">
        Reset Password
      </h1>

      <p className="reset-password-subtitle">
        Create a new password for your BookEasy account.
      </p>

      <form
        onSubmit={handleSubmit}
        className="reset-password-form"
      >
        <div className="reset-password-field">
          <label className="reset-password-label">
            New Password
          </label>

          <div className="reset-password-input-wrapper">
            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Enter new password"
              className="reset-password-input"
            />
          </div>
        </div>

        <div className="reset-password-field">
          <label className="reset-password-label">
            Confirm Password
          </label>

          <div className="reset-password-input-wrapper">
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              placeholder="Confirm new password"
              className="reset-password-input"
            />
          </div>
        </div>

        {error && (
          <div className="reset-password-error">
            {error}
          </div>
        )}

        {message && (
          <div className="reset-password-success">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="reset-password-button"
        >
          {loading
            ? "Resetting..."
            : "Reset Password"}
        </button>
      </form>

      <div className="reset-password-login">
        Remember your password?{" "}
        <button
          type="button"
          onClick={() =>
            navigate("/business/login")
          }
        >
          Sign in
        </button>
      </div>

    </div>
  </div>
);
}

export default ResetPassword;