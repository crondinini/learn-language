import { useNavigate } from "react-router";
import type { Period, Prediction } from "../lib/types";
import {
  getPeriodDaySet,
  getPredictedDaySet,
  getMonday,
  addDays,
  formatDate,
} from "../lib/cycleUtils";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Props {
  periods: Period[];
  prediction: Prediction | null;
}

export function WeekGarden({ periods, prediction }: Props) {
  const navigate = useNavigate();
  const now = new Date();
  const today = formatDate(now);
  const monday = getMonday(now);
  const periodDays = getPeriodDaySet(periods);
  const predictedDays = getPredictedDaySet(prediction);

  return (
    <div className="week-garden">
      <div className="week-garden__title">Your week in bloom</div>
      <div className="week-garden__row">
        {DAY_NAMES.map((name, i) => {
          const day = addDays(monday, i);
          const dateStr = formatDate(day);
          const isToday = dateStr === today;
          const isPeriod = periodDays.has(dateStr);
          const isPredicted = predictedDays.has(dateStr);

          let circleClass = "week-garden__circle";
          if (isPeriod) circleClass += " week-garden__circle--period";
          else if (isPredicted) circleClass += " week-garden__circle--predicted";
          if (isToday) circleClass += " week-garden__circle--today";

          let dotClass = "week-garden__dot";
          if (isPeriod) dotClass += " week-garden__dot--period";
          else if (isPredicted) dotClass += " week-garden__dot--predicted";

          return (
            <div
              key={i}
              className="week-garden__day"
              onClick={() => navigate(`/day/${dateStr}`)}
            >
              <span className="week-garden__dayname">{name}</span>
              <div className={circleClass}>{day.getDate()}</div>
              <div className={dotClass} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
