import { useState } from "react";
import { useNavigate } from "react-router";
import { usePeriods, usePrediction } from "../hooks/useData";
import { getPeriodDaySet, getPredictedDaySet, formatDate } from "../lib/cycleUtils";

export function CalendarPage() {
  const [viewDate, setViewDate] = useState(new Date());
  const { data: periods = [] } = usePeriods();
  const { data: prediction = null } = usePrediction();
  const navigate = useNavigate();

  const periodDays = getPeriodDaySet(periods);
  const predictedDays = getPredictedDaySet(prediction);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString("default", { month: "long", year: "numeric" });

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-based
  const totalDays = lastDay.getDate();

  const today = formatDate(new Date());

  const prev = () => setViewDate(new Date(year, month - 1, 1));
  const next = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="heading-lg">Calendar</h1>
      </div>
      <div className="calendar">
        <div className="calendar__header">
          <button className="calendar__nav" onClick={prev}>
            &larr;
          </button>
          <span className="heading-sm">{monthName}</span>
          <button className="calendar__nav" onClick={next}>
            &rarr;
          </button>
        </div>
        <div className="calendar__grid">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="calendar__weekday">
              {d}
            </div>
          ))}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="calendar__day calendar__day--empty" />
          ))}
          {Array.from({ length: totalDays }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const isToday = dateStr === today;
            const isPeriod = periodDays.has(dateStr);
            const isPredicted = predictedDays.has(dateStr);

            let className = "calendar__day";
            if (isToday) className += " calendar__day--today";
            if (isPeriod) className += " calendar__day--period";
            else if (isPredicted) className += " calendar__day--predicted";

            return (
              <div
                key={dayNum}
                className={className}
                onClick={() => navigate(`/day/${dateStr}`)}
              >
                {dayNum}
              </div>
            );
          })}
        </div>
      </div>
      <div className="gap-md" />
      <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--terracotta)" }} />
          <span className="label">Period</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid var(--sage-light)" }} />
          <span className="label">Predicted</span>
        </div>
      </div>
    </div>
  );
}
