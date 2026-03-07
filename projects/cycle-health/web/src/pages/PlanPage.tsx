import { useState } from "react";
import { useTrainingPlans, useTrainingPlan } from "../hooks/useData";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function PlanPage() {
  const { data: plans } = useTrainingPlans();
  const planId = plans?.[0]?.id;
  const { data: plan } = useTrainingPlan(planId);
  const [activeIndex, setActiveIndex] = useState(0);

  const days = plan?.days ?? [];
  const activeDay = days[activeIndex];

  if (!plan) {
    return (
      <div className="page">
        <div className="page__header">
          <h1 className="heading-lg">Plan</h1>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <p className="body-dim" style={{ lineHeight: 1.5 }}>
            No training plan yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="heading-lg">Plan</h1>
        <span className="label">{plan.daysPerWeek}x / week</span>
      </div>

      {/* Day selector — horizontal pill strip */}
      <div className="plan-day-strip">
        {days.map((day, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={day.id}
              className={`plan-day-chip${isActive ? " plan-day-chip--active" : ""}`}
              onClick={() => setActiveIndex(i)}
            >
              <span className="plan-day-chip__day">
                {DAY_LABELS[day.dayNumber - 1]}
              </span>
              <span className="plan-day-chip__name">
                {day.name.split(":")[0].trim()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active day content */}
      {activeDay && (
        <div className="plan-day-view" key={activeDay.id}>
          {/* Day header card */}
          <div className="plan-day-header">
            <h2 className="plan-day-header__title">{activeDay.name}</h2>
            {activeDay.emphasis && (
              <p className="plan-day-header__emphasis">{activeDay.emphasis}</p>
            )}
            <div className="plan-day-header__stats">
              <div className="plan-day-header__stat">
                <span className="plan-day-header__stat-val">
                  ~{estimateTime(activeDay.exercises)}
                </span>
                <span className="plan-day-header__stat-label">min</span>
              </div>
              <div className="plan-day-header__stat-divider" />
              <div className="plan-day-header__stat">
                <span className="plan-day-header__stat-val">
                  {activeDay.exercises.filter(e => !e.isWarmup && !e.isFinisher).length}
                </span>
                <span className="plan-day-header__stat-label">exercises</span>
              </div>
              <div className="plan-day-header__stat-divider" />
              <div className="plan-day-header__stat">
                <span className="plan-day-header__stat-val">
                  {countSupersets(activeDay.exercises)}
                </span>
                <span className="plan-day-header__stat-label">supersets</span>
              </div>
            </div>
          </div>

          {/* Exercise list */}
          <div className="plan-exercises">
            {groupExercises(activeDay.exercises).map((group, gi) => (
              <div key={gi} className="plan-exercise-group">
                {group.type === "superset" && (
                  <div className="superset-connector" />
                )}
                {group.exercises.map((ex) => (
                  <ExerciseRow key={ex.id} exercise={ex} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface Exercise {
  id: string;
  label: string;
  name: string;
  setsReps: string | null;
  rest: string | null;
  notes: string | null;
  isWarmup: boolean;
  isFinisher: boolean;
}

function ExerciseRow({ exercise }: { exercise: Exercise }) {
  const parsed = parseSetsReps(exercise.setsReps);
  const isAccessory = exercise.isWarmup || exercise.isFinisher;

  return (
    <div className={`ex-row${isAccessory ? " ex-row--accessory" : ""}`}>
      <div className="ex-row__badge-col">
        <span className={`ex-row__badge${isAccessory ? " ex-row__badge--muted" : ""}`}>
          {exercise.label}
        </span>
      </div>

      <div className="ex-row__body">
        <div className="ex-row__name">{exercise.name}</div>

        {parsed && (
          <div className="ex-row__metrics">
            {parsed.sets && (
              <span className="ex-row__metric">
                <strong>{parsed.sets}</strong> sets
              </span>
            )}
            {parsed.reps && (
              <span className="ex-row__metric">
                <strong>{parsed.reps}</strong> reps
              </span>
            )}
            {parsed.duration && (
              <span className="ex-row__metric">
                <strong>{parsed.duration}</strong>
              </span>
            )}
            {exercise.rest && (
              <span className="ex-row__metric ex-row__metric--rest">
                {exercise.rest} rest
              </span>
            )}
          </div>
        )}

        {!parsed && exercise.setsReps && (
          <div className="ex-row__metrics">
            <span className="ex-row__metric"><strong>{exercise.setsReps}</strong></span>
          </div>
        )}

        {exercise.notes && (
          <div className="ex-row__notes">{exercise.notes}</div>
        )}
      </div>
    </div>
  );
}

/** Group exercises into singles and supersets based on label pattern (A1/A2, B1/B2) */
function groupExercises(exercises: Exercise[]): Array<{
  type: "single" | "superset";
  exercises: Exercise[];
}> {
  const groups: Array<{ type: "single" | "superset"; exercises: Exercise[] }> = [];
  let i = 0;

  while (i < exercises.length) {
    const ex = exercises[i];
    const labelBase = ex.label.replace(/\d+$/, "");
    const labelNum = ex.label.match(/\d+$/)?.[0];

    // Check if this is part of a superset (has a number suffix like A1, B1)
    if (labelNum === "1" && i + 1 < exercises.length) {
      const next = exercises[i + 1];
      const nextBase = next.label.replace(/\d+$/, "");
      if (nextBase === labelBase) {
        groups.push({ type: "superset", exercises: [ex, next] });
        i += 2;
        continue;
      }
    }

    groups.push({ type: "single", exercises: [ex] });
    i++;
  }

  return groups;
}

function countSupersets(exercises: Exercise[]): number {
  return groupExercises(exercises).filter(g => g.type === "superset").length;
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

function parseSetsReps(raw: string | null): {
  sets?: string;
  reps?: string;
  duration?: string;
} | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  if (/^\d[\d\-]*\s*min/i.test(trimmed)) {
    return { duration: trimmed };
  }

  const match = trimmed.match(/^(\d+)\s*x\s*(.+)$/i);
  if (match) {
    return { sets: match[1], reps: match[2].trim() };
  }

  return null;
}
