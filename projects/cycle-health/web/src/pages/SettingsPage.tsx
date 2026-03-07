import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";

export function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="heading-lg">Settings</h1>
      </div>

      {/* Account */}
      <div className="card">
        <div className="heading-sm" style={{ marginBottom: 16 }}>
          Account
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--sage-bg)",
              border: "2px solid var(--sage-light)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-heading)",
              fontSize: 20,
              fontWeight: 600,
              color: "var(--sage)",
            }}
          >
            {user?.name[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <div className="body-text" style={{ fontWeight: 500 }}>
              {user?.name}
            </div>
            <div className="label">{user?.email}</div>
          </div>
        </div>
      </div>

      <div className="gap-md" />

      {/* Partner */}
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
          }}
          onClick={() => navigate("/partner")}
        >
          <div>
            <div className="heading-sm">Partner sharing</div>
            <div className="label" style={{ marginTop: 2 }}>
              Share your cycle with someone you trust
            </div>
          </div>
          <span style={{ color: "var(--text-dim)", fontSize: 18 }}>&rarr;</span>
        </div>
      </div>

      <div className="gap-md" />

      {/* Sign out */}
      <button className="btn btn--danger" onClick={logout}>
        Sign out
      </button>
    </div>
  );
}
