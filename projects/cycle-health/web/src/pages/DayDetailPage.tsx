import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  usePeriods,
  useSymptoms,
  useLogPeriodDay,
  useDeletePeriodDay,
  useCreatePeriod,
  useCreateSymptom,
  useDeleteSymptom,
} from "../hooks/useData";
import type { SymptomType } from "../lib/types";

const FLOW_OPTIONS = [
  { value: "spotting", label: "Spotting", size: 10 },
  { value: "light", label: "Light", size: 14 },
  { value: "medium", label: "Medium", size: 18 },
  { value: "heavy", label: "Heavy", size: 22 },
] as const;

const SYMPTOM_TYPES: { type: SymptomType; icon: string; label: string }[] = [
  { type: "cramps", icon: "😣", label: "Cramps" },
  { type: "headache", icon: "🤕", label: "Headache" },
  { type: "bloating", icon: "🫧", label: "Bloating" },
  { type: "mood_swings", icon: "🎭", label: "Mood" },
  { type: "fatigue", icon: "😴", label: "Fatigue" },
  { type: "acne", icon: "😤", label: "Acne" },
  { type: "breast_tenderness", icon: "💗", label: "Breast" },
  { type: "backache", icon: "🦴", label: "Back" },
];

export function DayDetailPage() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { data: periods = [] } = usePeriods();
  const { data: symptoms = [] } = useSymptoms(date, date);
  const logDay = useLogPeriodDay();
  const deleteDay = useDeletePeriodDay();
  const createPeriod = useCreatePeriod();
  const createSymptom = useCreateSymptom();
  const deleteSymptom = useDeleteSymptom();

  const [selectedSymptom, setSelectedSymptom] = useState<SymptomType | null>(null);
  const [severity, setSeverity] = useState(1);

  if (!date) return null;

  const displayDate = new Date(date + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Find period and flow for this day
  let currentPeriod = periods.find((p) =>
    p.periodDays.some((pd) => pd.date === date)
  );
  const currentDay = currentPeriod?.periodDays.find((pd) => pd.date === date);
  const currentFlow = currentDay?.flow ?? null;

  // Day symptoms
  const daySymptoms = symptoms.filter((s) => s.date === date);

  const handleFlowSelect = (flow: string) => {
    if (currentFlow === flow && currentPeriod) {
      // Deselect: remove day
      deleteDay.mutate({ periodId: currentPeriod.id, date });
    } else if (currentPeriod) {
      // Update flow
      logDay.mutate({ periodId: currentPeriod.id, date, flow });
    } else {
      // Need to find or create a period for this date
      // Find the most recent period, or create one
      const recentPeriod = periods[0];
      if (recentPeriod) {
        logDay.mutate({ periodId: recentPeriod.id, date, flow });
      } else {
        createPeriod.mutate(date);
      }
    }
  };

  const handleAddSymptom = () => {
    if (!selectedSymptom) return;
    createSymptom.mutate({
      date,
      type: selectedSymptom,
      severity,
    });
    setSelectedSymptom(null);
    setSeverity(1);
  };

  return (
    <div className="page" style={{ paddingTop: 24 }}>
      <button className="back-btn" onClick={() => navigate(-1)}>
        &larr; Back
      </button>

      <h1 className="heading-lg" style={{ fontSize: 24, marginBottom: 4 }}>
        {displayDate}
      </h1>
      <div className="gap-lg" />

      {/* Flow */}
      <div className="card">
        <div className="heading-sm" style={{ marginBottom: 16 }}>
          Flow
        </div>
        <div className="flow-options">
          {FLOW_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`flow-option${currentFlow === opt.value ? " flow-option--active" : ""}`}
              onClick={() => handleFlowSelect(opt.value)}
            >
              <div
                className="flow-option__dot"
                style={{ width: opt.size, height: opt.size }}
              />
              <span className="flow-option__label">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="gap-md" />

      {/* Symptoms */}
      <div className="card">
        <div className="heading-sm" style={{ marginBottom: 16 }}>
          Symptoms
        </div>

        {/* Logged symptoms */}
        {daySymptoms.length > 0 && (
          <>
            {daySymptoms.map((s) => {
              const info = SYMPTOM_TYPES.find((st) => st.type === s.type);
              return (
                <div
                  key={s.id}
                  className="list-item"
                  style={{ alignItems: "center" }}
                >
                  <div className="list-item__icon">{info?.icon}</div>
                  <div className="list-item__content">
                    <div className="list-item__name">{info?.label}</div>
                    <div className="list-item__desc">
                      Severity: {"●".repeat(s.severity)}
                      {"○".repeat(3 - s.severity)}
                    </div>
                  </div>
                  <button
                    style={{ color: "var(--text-dim)", fontSize: 18 }}
                    onClick={() => deleteSymptom.mutate(s.id)}
                  >
                    &times;
                  </button>
                </div>
              );
            })}
            <hr className="divider" style={{ margin: "12px 0" }} />
          </>
        )}

        {/* Symptom picker */}
        <div className="symptom-grid">
          {SYMPTOM_TYPES.map((st) => (
            <button
              key={st.type}
              className={`symptom-chip${selectedSymptom === st.type ? " symptom-chip--active" : ""}`}
              onClick={() =>
                setSelectedSymptom(selectedSymptom === st.type ? null : st.type)
              }
            >
              <span className="symptom-chip__icon">{st.icon}</span>
              {st.label}
            </button>
          ))}
        </div>

        {selectedSymptom && (
          <>
            <div className="gap-sm" />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span className="label">Severity</span>
              <div className="severity-row">
                {[1, 2, 3].map((s) => (
                  <button
                    key={s}
                    className={`severity-dot${severity === s ? " severity-dot--active" : ""}`}
                    onClick={() => setSeverity(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="gap-sm" />
            <button className="btn btn--primary" onClick={handleAddSymptom}>
              Add symptom
            </button>
          </>
        )}
      </div>
    </div>
  );
}
