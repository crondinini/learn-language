import { useAuth } from "../context/AuthContext";
import {
  usePeriods,
  usePrediction,
  usePartnership,
  usePartnerData,
  useCreatePeriod,
} from "../hooks/useData";
import { calculateCycleInfo, formatDate } from "../lib/cycleUtils";
import { getPartnerPhaseDetails } from "../lib/fitData";
import { WeekGarden } from "../components/WeekGarden";
import { CycleRing } from "../components/CycleRing";
import type { CyclePhase, PartnerData } from "../lib/types";

export function HomePage() {
  const { user } = useAuth();
  const { data: periods = [] } = usePeriods();
  const { data: prediction = null } = usePrediction();
  const { data: partnership } = usePartnership();
  const { data: partnerData } = usePartnerData();
  const createPeriod = useCreatePeriod();

  const firstName = user?.name.split(" ")[0] ?? "there";
  const greeting = getGreeting();
  const cycleInfo = calculateCycleInfo(periods, prediction);

  return (
    <div className="page">
      {/* Header */}
      <div className="page__header">
        <div>
          <h1 className="heading-lg">Cycle Health</h1>
          <div className="gap-sm" />
          <p className="label">
            {greeting}, {firstName}
          </p>
        </div>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "var(--sage-bg)",
            border: "2px solid var(--sage-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-heading)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--sage)",
          }}
        >
          {firstName[0]?.toUpperCase() ?? "?"}
        </div>
      </div>

      {/* Week Garden */}
      <WeekGarden periods={periods} prediction={prediction} />

      {/* Cycle Card */}
      {cycleInfo ? (
        <CycleCard
          cycleInfo={cycleInfo}
          onLogPeriod={() => createPeriod.mutate(formatDate(new Date()))}
          hasCurrentPeriod={periods.some((p) => {
            const now = new Date();
            const today = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate()
            );
            const start = new Date(p.startDate);
            const end = p.endDate ? new Date(p.endDate) : now;
            return today >= start && today <= end;
          })}
        />
      ) : (
        <EmptyCycleCard
          onLogPeriod={() => createPeriod.mutate(formatDate(new Date()))}
        />
      )}

      <div className="gap-md" />

      {/* Partner section */}
      {partnership?.status === "accepted" && partnerData && (
        <>
          <PartnerSection data={partnerData} />
          <div className="gap-md" />
        </>
      )}
      {partnership?.status === "pending" && (
        <>
          <PendingPartnerCard email={partnership.partnerEmail} />
          <div className="gap-md" />
        </>
      )}

      {/* Sync bloom */}
      <SyncBloom hasData={periods.length >= 3} />
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function CycleCard({
  cycleInfo,
  onLogPeriod,
  hasCurrentPeriod,
}: {
  cycleInfo: NonNullable<ReturnType<typeof calculateCycleInfo>>;
  onLogPeriod: () => void;
  hasCurrentPeriod: boolean;
}) {
  const isPeriod = cycleInfo.phaseName === "Period";
  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="heading-md">Your cycle</span>
        <span className={`badge ${isPeriod ? "badge--period" : "badge--sage"}`}>
          Day {cycleInfo.cycleDay} &middot; {cycleInfo.phaseName}
        </span>
      </div>
      <div className="gap-md" />
      <div className="cycle-ring">
        <CycleRing
          cycleDay={cycleInfo.cycleDay}
          cycleLength={cycleInfo.cycleLength}
          periodDuration={cycleInfo.periodDuration}
          phaseName={cycleInfo.phaseName}
        />
        <div className="cycle-ring__center">
          <span className="cycle-ring__number">{cycleInfo.daysUntilNext}</span>
          <span className="cycle-ring__label">
            days until
            <br />
            next period
          </span>
        </div>
      </div>
      <div className="gap-md" />
      <div style={{ display: "flex", gap: 8 }}>
        <div className="stat">
          <span className="stat__value">{cycleInfo.cycleLength}</span>
          <span className="stat__label">Cycle length</span>
        </div>
        <div className="stat">
          <span className="stat__value">{cycleInfo.periodDuration}</span>
          <span className="stat__label">Period days</span>
        </div>
      </div>
      {!hasCurrentPeriod && (
        <>
          <div className="gap-md" />
          <button className="btn btn--primary" onClick={onLogPeriod}>
            Log period today
          </button>
        </>
      )}
    </div>
  );
}

function EmptyCycleCard({ onLogPeriod }: { onLogPeriod: () => void }) {
  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="heading-md">Your cycle</span>
        <span className="badge badge--sage">No data yet</span>
      </div>
      <div className="gap-md" />
      <p className="body-dim" style={{ lineHeight: 1.5 }}>
        Log your first period to start tracking your cycle.
      </p>
      <div className="gap-md" />
      <button className="btn btn--primary" onClick={onLogPeriod}>
        Log period today
      </button>
    </div>
  );
}

function PartnerSection({ data }: { data: PartnerData }) {
  const name = data.partner.name.split(" ")[0];
  const phase = getPartnerPhase(data);
  const cycleDay = getPartnerCycleDay(data);
  const details = getPartnerPhaseDetails(phase);

  return (
    <div className="card">
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--sage-bg), var(--sage-light))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-heading)",
            fontSize: 20,
            color: "white",
          }}
        >
          {name[0]?.toUpperCase()}
        </div>
        <div>
          <div className="heading-md">{name}'s cycle</div>
          <div className="label" style={{ color: "var(--sage)" }}>
            {cycleDay > 0 ? `Day ${cycleDay} · ${phase}` : phase}
          </div>
        </div>
      </div>
      <div className="gap-md" />
      <div
        style={{
          background: "var(--sage-bg)",
          borderRadius: 18,
          padding: 20,
          border: "1px solid rgba(107,127,94,0.12)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: "8px 0 0 8px",
              background: "var(--sage-light)",
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 15,
              color: "var(--sage)",
            }}
          >
            Mood forecast
          </span>
        </div>
        <p className="body-dim" style={{ lineHeight: 1.7 }}>
          {name} {details.forecast}
        </p>
      </div>
      <div className="gap-sm" />
      {details.tips.map((tip, i) => (
        <div className="list-item" key={i}>
          <div className="list-item__icon">{tip.icon}</div>
          <div className="list-item__content">
            <div className="list-item__name">{tip.title}</div>
            <div className="list-item__desc">{tip.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PendingPartnerCard({ email }: { email: string }) {
  const { mutate: accept } = useAcceptPartner();
  const { mutate: remove } = useRemovePartner();
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ color: "var(--terracotta-light)" }}>&#x2661;</span>
        <span className="body-text">Partner invite from {email}</span>
      </div>
      <div className="gap-sm" />
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn--primary" style={{ flex: 1 }} onClick={() => accept()}>
          Accept
        </button>
        <button className="btn btn--secondary" style={{ flex: 1 }} onClick={() => remove()}>
          Decline
        </button>
      </div>
    </div>
  );
}

function SyncBloom({ hasData }: { hasData: boolean }) {
  return (
    <div className="card sync-bloom">
      <div className="sync-bloom__circles">
        <div
          className="sync-bloom__circle"
          style={{ background: "radial-gradient(circle, var(--terracotta-light), var(--terracotta))" }}
        />
        <div
          className="sync-bloom__circle"
          style={{ background: "radial-gradient(circle, var(--sage-light), var(--sage))" }}
        />
      </div>
      <div className="heading-sm" style={{ marginBottom: 4 }}>
        {hasData ? "Your rhythm is growing" : "Plant the first seed"}
      </div>
      <p className="label" style={{ lineHeight: 1.5 }}>
        {hasData
          ? "Keep logging to improve predictions and understand your unique cycle."
          : "Log at least 3 periods to unlock cycle predictions and insights."}
      </p>
    </div>
  );
}

function getPartnerPhase(data: PartnerData): CyclePhase {
  if (data.periods.length === 0) return "Follicular";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastPeriod = data.periods[0];
  const start = new Date(lastPeriod.startDate);
  const end = lastPeriod.endDate ? new Date(lastPeriod.endDate) : now;
  if (today >= start && today <= end) return "Period";
  const cycleLength = data.prediction?.avgCycleLength ?? 28;
  let cycleDay = Math.round((today.getTime() - start.getTime()) / 86400000) + 1;
  if (cycleDay > cycleLength) cycleDay = cycleDay % cycleLength;
  if (cycleDay <= 13) return "Follicular";
  if (cycleDay <= 16) return "Ovulation";
  return "Luteal";
}

function getPartnerCycleDay(data: PartnerData): number {
  if (data.periods.length === 0) return 0;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(data.periods[0].startDate);
  const cycleLength = data.prediction?.avgCycleLength ?? 28;
  let cycleDay = Math.round((today.getTime() - start.getTime()) / 86400000) + 1;
  if (cycleDay > cycleLength) cycleDay = cycleDay % cycleLength;
  return cycleDay;
}

// Import hooks used in sub-components
import { useAcceptPartner, useRemovePartner } from "../hooks/useData";
