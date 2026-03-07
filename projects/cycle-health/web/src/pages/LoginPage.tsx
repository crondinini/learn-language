import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export function LoginPage() {
  const { user, devLogin } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const handleGoogleLogin = () => {
    if (!GOOGLE_CLIENT_ID) {
      setError("Google Client ID not configured. Set VITE_GOOGLE_CLIENT_ID in web/.env");
      return;
    }
    // TODO: integrate @react-oauth/google when client ID is available
    setError("Google OAuth requires a valid client ID");
  };

  const handleDevLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await devLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  if (user) return null;

  return (
    <div className="login-page">
      <div className="login-page__bloom">
        <div className="login-page__circle login-page__circle--terracotta" />
        <div className="login-page__circle login-page__circle--sage" />
      </div>
      <h1 className="login-page__title">Cycle Health</h1>
      <p className="login-page__subtitle">
        Track your cycle, sync your fitness
      </p>
      <button
        className="btn btn--primary"
        style={{ maxWidth: 300 }}
        onClick={handleGoogleLogin}
      >
        Sign in with Google
      </button>
      <div className="gap-md" />
      <button
        className="btn btn--secondary"
        style={{ maxWidth: 300 }}
        onClick={handleDevLogin}
        disabled={loading}
      >
        {loading ? "Signing in..." : "Dev login (test account)"}
      </button>
      {error && (
        <p style={{ color: "var(--terracotta)", fontSize: 13, marginTop: 12, maxWidth: 300 }}>
          {error}
        </p>
      )}
    </div>
  );
}
