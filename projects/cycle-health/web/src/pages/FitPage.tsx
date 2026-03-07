import { usePeriods, usePrediction, useTrainingToday } from "../hooks/useData";
import { calculateCycleInfo } from "../lib/cycleUtils";
import {
  getExercises,
  getNutrition,
  getExerciseSubtitle,
  getNutritionSubtitle,
} from "../lib/fitData";
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

      {!cycleInfo ? (
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, color: "var(--sand)", marginBottom: 16 }}>
            🧘
          </div>
          <p className="body-dim" style={{ lineHeight: 1.5 }}>
            Log your first period to get personalized fitness recommendations.
          </p>
        </div>
      ) : (
        <>
          {/* Today's Training */}
          {trainingData?.today && (
            <>
              <TrainingCard
                dayName={trainingData.today.name}
                emphasis={trainingData.today.emphasis}
                exercises={trainingData.today.exercises}
                cycleTip={trainingData.cycleTips?.find((t) => t.phase === phase.toLowerCase())?.tip}
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

          {/* Exercise recommendations */}
          <ExerciseCard phase={phase} />
          <div className="gap-md" />

          {/* Nutrition recommendations */}
          <NutritionCard phase={phase} />
        </>
      )}
    </div>
  );
}

function TrainingCard({
  dayName,
  emphasis,
  exercises,
  cycleTip,
}: {
  dayName: string;
  emphasis: string | null;
  exercises: Array<{
    id: string;
    label: string;
    name: string;
    setsReps: string | null;
    rest: string | null;
    notes: string | null;
    isWarmup: boolean;
    isFinisher: boolean;
  }>;
  cycleTip?: string;
}) {
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

      {cycleTip && (
        <div
          style={{
            background: "var(--sage-bg)",
            borderRadius: 12,
            padding: "10px 14px",
            marginTop: 12,
            fontSize: 12,
            color: "var(--sage)",
            lineHeight: 1.5,
          }}
        >
          {cycleTip}
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        {exercises.map((ex) => (
          <div key={ex.id} className="exercise-card">
            <div className="exercise-card__top">
              <div style={{ display: "flex", alignItems: "center" }}>
                <span
                  className={`exercise-card__label${ex.isWarmup || ex.isFinisher ? " exercise-card__label--warmup" : ""}`}
                >
                  {ex.label}
                </span>
                <span className="exercise-card__name">{ex.name}</span>
              </div>
              {ex.setsReps && (
                <span className="exercise-card__meta">{ex.setsReps}</span>
              )}
            </div>
            {ex.rest && (
              <div className="exercise-card__meta">Rest: {ex.rest}</div>
            )}
            {ex.notes && (
              <div className="exercise-card__notes">{ex.notes}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ExerciseCard({ phase }: { phase: CyclePhase }) {
  const exercises = getExercises(phase);
  return (
    <div className="card">
      <div className="section-header">
        <div className="section-header__icon section-header__icon--terracotta">
          💪
        </div>
        <span className="heading-sm">Exercise</span>
      </div>
      <div className="label" style={{ marginBottom: 16 }}>
        {getExerciseSubtitle(phase)}
      </div>
      {exercises.map((e, i) => (
        <div key={i} className="list-item">
          <div className="list-item__icon">{e.icon}</div>
          <div className="list-item__content">
            <div className="list-item__header">
              <span className="list-item__name">{e.name}</span>
              <span className="list-item__detail">{e.detail}</span>
            </div>
            <div className="list-item__desc">{e.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function NutritionCard({ phase }: { phase: CyclePhase }) {
  const items = getNutrition(phase);
  return (
    <div className="card">
      <div className="section-header">
        <div className="section-header__icon section-header__icon--sage">
          🥗
        </div>
        <span className="heading-sm">Nutrition</span>
      </div>
      <div className="label" style={{ marginBottom: 16 }}>
        {getNutritionSubtitle(phase)}
      </div>
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
