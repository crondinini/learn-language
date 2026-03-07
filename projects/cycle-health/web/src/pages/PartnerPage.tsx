import { useState } from "react";
import { useNavigate } from "react-router";
import {
  usePartnership,
  usePartnerData,
  useInvitePartner,
  useAcceptPartner,
  useRemovePartner,
} from "../hooks/useData";

export function PartnerPage() {
  const navigate = useNavigate();
  const { data: partnership, isLoading } = usePartnership();
  const { data: partnerData } = usePartnerData();
  const invite = useInvitePartner();
  const accept = useAcceptPartner();
  const remove = useRemovePartner();
  const [email, setEmail] = useState("");

  if (isLoading) return <div className="loading">Loading...</div>;

  return (
    <div className="page" style={{ paddingTop: 24 }}>
      <button className="back-btn" onClick={() => navigate(-1)}>
        &larr; Back
      </button>
      <h1 className="heading-lg" style={{ marginBottom: 28 }}>
        Partner
      </h1>

      {!partnership && (
        <div className="card">
          <div className="heading-sm" style={{ marginBottom: 8 }}>
            Invite your partner
          </div>
          <p className="body-dim" style={{ lineHeight: 1.5, marginBottom: 16 }}>
            Share your cycle data with someone you trust. They'll see your
            period dates and predictions (not symptoms).
          </p>
          <input
            className="input-field"
            type="email"
            placeholder="Partner's email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="gap-sm" />
          <button
            className="btn btn--primary"
            onClick={() => {
              if (email.trim()) {
                invite.mutate(email.trim());
                setEmail("");
              }
            }}
            disabled={invite.isPending}
          >
            {invite.isPending ? "Sending..." : "Send invite"}
          </button>
          {invite.isError && (
            <p
              style={{
                color: "var(--terracotta)",
                fontSize: 13,
                marginTop: 8,
              }}
            >
              {(invite.error as Error).message}
            </p>
          )}
        </div>
      )}

      {partnership?.status === "pending" && (
        <div className="card">
          <div className="heading-sm" style={{ marginBottom: 8 }}>
            Pending invite
          </div>
          <p className="body-dim" style={{ marginBottom: 16 }}>
            Invite to {partnership.partnerEmail} is pending.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn--primary"
              style={{ flex: 1 }}
              onClick={() => accept.mutate()}
            >
              Accept
            </button>
            <button
              className="btn btn--secondary"
              style={{ flex: 1 }}
              onClick={() => remove.mutate()}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {partnership?.status === "accepted" && (
        <div className="card">
          <div className="heading-sm" style={{ marginBottom: 8 }}>
            Connected
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg, var(--sage-bg), var(--sage-light))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-heading)",
                fontSize: 20,
                color: "white",
              }}
            >
              {partnerData?.partner.name[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <div className="body-text" style={{ fontWeight: 500 }}>
                {partnerData?.partner.name ?? partnership.partnerEmail}
              </div>
              <div className="label">{partnership.partnerEmail}</div>
            </div>
          </div>
          <button className="btn btn--danger" onClick={() => remove.mutate()}>
            Remove partner
          </button>
        </div>
      )}
    </div>
  );
}
