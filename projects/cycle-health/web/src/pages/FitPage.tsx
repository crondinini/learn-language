import { usePeriods, usePrediction, useTrainingToday } from "../hooks/useData";
import { calculateCycleInfo } from "../lib/cycleUtils";
import { getNutrition, getNutritionSubtitle, getNutritionCallout } from "../lib/fitData";
import type { CyclePhase } from "../lib/types";

export function FitPage() {
  const { data: periods = [] } = usePeriods();
  const { data: prediction = null } = usePrediction();
  const cycleInfo = calculateCycleInfo(periods, prediction);

  // Get today's day of week (1=Mon, 7=Sun)
  const jsDay = new Date().getDay();
  const dayOfWeek = jsDay === 0 ? 7 : jsDay;
  const { data: trainingData } = useTrainingToday(dayOfWeek);

  const phase: CyclePhase = cycleInfo?.phaseName ?? "Follicular";

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="heading-lg">Fit</h1>
        {cycleInfo && (
          <span
            className={`badge ${phase === "Period" ? "badge--period" : "badge--sage"}`}
          >
            Day {cycleInfo.cycleDay} &middot; {phase}
          </span>
        )}
      </div>

      {/* Today's Training */}
      {trainingData?.today && (
        <>
          <TrainingCard
            dayName={trainingData.today.name}
            emphasis={trainingData.today.emphasis}
            exercises={trainingData.today.exercises}
            cycleTip={
              cycleInfo
                ? trainingData.cycleTips?.find(
                    (t) => t.phase === phase.toLowerCase()
                  )?.tip
                : undefined
            }
          />
          <div className="gap-md" />
        </>
      )}

      {trainingData?.isRestDay && trainingData.plan && (
        <>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🌿</div>
            <div className="heading-sm">Rest Day</div>
            <p className="label" style={{ marginTop: 4 }}>
              Recovery is part of the plan. Take it easy today.
            </p>
          </div>
          <div className="gap-md" />
        </>
      )}

      {!trainingData?.plan && (
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, color: "var(--sand)", marginBottom: 16 }}>
            🏋️
          </div>
          <p className="body-dim" style={{ lineHeight: 1.5 }}>
            No training plan yet. Log in to get started.
          </p>
        </div>
      )}

      {cycleInfo && <NutritionCard phase={phase} />}
    </div>
  );
}

interface ExerciseData {
  id: string;
  label: string;
  name: string;
  setsReps: string | null;
  rest: string | null;
  notes: string | null;
  isWarmup: boolean;
  isFinisher: boolean;
}

function TrainingCard({
  dayName,
  emphasis,
  exercises,
  cycleTip,
}: {
  dayName: string;
  emphasis: string | null;
  exercises: ExerciseData[];
  cycleTip?: string;
}) {
  const mainCount = exercises.filter((e) => !e.isWarmup && !e.isFinisher).length;
  const timeEst = estimateTime(exercises);

  return (
    <div className="card">
      <div className="section-header">
        <div className="section-header__icon section-header__icon--terracotta">
          🏋️
        </div>
        <span className="heading-sm">Today's Training</span>
      </div>
      <div className="heading-md" style={{ fontSize: 16, marginTop: 4 }}>
        {dayName}
      </div>
      {emphasis && (
        <div className="label" style={{ marginTop: 2 }}>
          {emphasis}
        </div>
      )}

      <div className="time-estimate-bar" style={{ marginTop: 12 }}>
        <span className="time-estimate-bar__text">
          ~<span className="time-estimate-bar__value">{timeEst}</span> min
        </span>
        <span className="time-estimate-bar__right">{mainCount} exercises</span>
      </div>

      {cycleTip && (
        <div
          style={{
            background: "var(--sage-bg)",
            borderRadius: 12,
            padding: "10px 14px",
            marginBottom: 8,
            fontSize: 12,
            color: "var(--sage)",
            lineHeight: 1.5,
          }}
        >
          {cycleTip}
        </div>
      )}

      <div>
        {exercises.map((ex) => (
          <ExerciseCard key={ex.id} exercise={ex} />
        ))}
      </div>
    </div>
  );
}

function ExerciseCard({ exercise }: { exercise: ExerciseData }) {
  const parsed = parseSetsReps(exercise.setsReps);
  const isAccessory = exercise.isWarmup || exercise.isFinisher;

  return (
    <div className={`ex-card${isAccessory ? " ex-card--accessory" : ""}`}>
      <div className="ex-card__badge-col">
        <span
          className={`ex-card__badge${isAccessory ? " ex-card__badge--muted" : ""}`}
        >
          {exercise.label}
        </span>
      </div>

      <div className="ex-card__body">
        <div className="ex-card__name">{exercise.name}</div>

        {parsed && (
          <div className="ex-card__metrics">
            {parsed.sets && (
              <span className="ex-card__metric">
                <strong>{parsed.sets}</strong> sets
              </span>
            )}
            {parsed.reps && (
              <span className="ex-card__metric">
                <strong>{parsed.reps}</strong> reps
              </span>
            )}
            {parsed.duration && (
              <span className="ex-card__metric">
                <strong>{parsed.duration}</strong>
              </span>
            )}
            {exercise.rest && (
              <span className="ex-card__metric ex-card__metric--rest">
                {exercise.rest} rest
              </span>
            )}
          </div>
        )}

        {!parsed && exercise.setsReps && (
          <div className="ex-card__duration-line">{exercise.setsReps}</div>
        )}

        {exercise.notes && (
          <div className="ex-card__notes">{exercise.notes}</div>
        )}
      </div>
    </div>
  );
}

function NutritionCard({ phase }: { phase: CyclePhase }) {
  const items = getNutrition(phase);
  const callout = getNutritionCallout(phase);
  return (
    <div className="card">
      <div className="section-header">
        <div className="section-header__icon section-header__icon--sage">🥗</div>
        <span className="heading-sm">Nutrition</span>
      </div>
      <div className="label" style={{ marginBottom: callout ? 12 : 16 }}>
        {getNutritionSubtitle(phase)}
      </div>

      {callout && (
        <div className="nutrition-callout">
          <span className="nutrition-callout__icon">{callout.icon}</span>
          <p className="nutrition-callout__text">{callout.text}</p>
        </div>
      )}

      {items.map((n, i) => (
        <div key={i} className="list-item">
          <div className="list-item__icon">{n.icon}</div>
          <div className="list-item__content">
            <div className="list-item__header">
              <span className="list-item__name">{n.name}</span>
              <span className="list-item__detail">{n.detail}</span>
            </div>
            <div className="list-item__desc">{n.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function parseSetsReps(raw: string | null): {
  sets?: string;
  reps?: string;
  duration?: string;
} | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^\d[\d\-]*\s*min/i.test(trimmed)) return { duration: trimmed };
  const match = trimmed.match(/^(\d+)\s*x\s*(.+)$/i);
  if (match) return { sets: match[1], reps: match[2].trim() };
  return null;
}

function estimateTime(
  exercises: Array<{
    setsReps: string | null;
    rest: string | null;
    isWarmup: boolean;
    isFinisher: boolean;
  }>
): number {
  let total = 0;
  for (const ex of exercises) {
    if (ex.isWarmup || ex.isFinisher) {
      const durMatch = ex.setsReps?.match(/(\d+)/);
      total += durMatch ? parseInt(durMatch[1]) : 5;
      continue;
    }
    const parsed = parseSetsReps(ex.setsReps);
    if (parsed?.sets) {
      const sets = parseInt(parsed.sets);
      const restSec = ex.rest ? parseInt(ex.rest) || 45 : 45;
      total += (sets * (40 + restSec)) / 60;
    } else if (parsed?.duration) {
      const durMatch = parsed.duration.match(/(\d+)/);
      total += durMatch ? parseInt(durMatch[1]) : 5;
    } else {
      total += 3;
    }
  }
  return Math.round(total / 5) * 5;
}
