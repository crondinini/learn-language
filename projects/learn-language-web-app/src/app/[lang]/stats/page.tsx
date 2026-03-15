"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import SpeakerButton from "@/components/SpeakerButton";

interface DayStats {
  date: string;
  reviews: number;
  cards_learned: number;
  cards_added: number;
}

interface WeekStats {
  week_start: string;
  reviews: number;
  cards_learned: number;
  cards_added: number;
  days_practiced: number;
}

interface HardWord {
  id: number;
  front: string;
  back: string;
  difficulty: number;
  lapses: number;
  reps: number;
  state: number;
  audio_url: string | null;
  ratings: number[]; // 1=Again, 2=Hard, 3=Good, 4=Easy — chronological
}

interface StatsData {
  daily: DayStats[];
  weekly: WeekStats[];
  streak: { current: number; best: number };
  totals: {
    reviews: number;
    days_practiced: number;
    total_cards: number;
    new_cards: number;
    learning_cards: number;
    mastered_cards: number;
  };
  hardest_words: HardWord[];
}

// Generate last N days as date strings
function getLastNDays(n: number): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
}

function getMonthLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { month: "short" });
}

// Activity heatmap grid — last 15 weeks (rows = days of week, cols = weeks)
function ActivityGrid({ daily }: { daily: DayStats[] }) {
  const WEEKS = 15;
  const days = getLastNDays(WEEKS * 7);
  const reviewMap = new Map(daily.map((d) => [d.date, d.reviews]));

  // Find max for color scaling
  const maxReviews = Math.max(1, ...daily.map((d) => d.reviews));

  // Group into weeks (cols) x days (rows)
  const weeks: string[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    weeks.push(days.slice(w * 7, (w + 1) * 7));
  }

  function getOpacity(count: number): number {
    if (count === 0) return 0;
    // Use a curve so low counts still show
    return 0.2 + 0.8 * Math.pow(count / maxReviews, 0.5);
  }

  const dayLabels = ["Mon", "", "Wed", "", "Fri", "", ""];
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Month labels for the top
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = "";
  weeks.forEach((week, i) => {
    // Use the first day of the week for the month label
    const m = getMonthLabel(week[0]);
    if (m !== lastMonth) {
      monthLabels.push({ label: m, col: i });
      lastMonth = m;
    }
  });

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex flex-col gap-0.5 min-w-fit">
        {/* Month labels */}
        <div className="flex gap-0.5 pl-8 mb-1">
          {weeks.map((week, wi) => {
            const ml = monthLabels.find((m) => m.col === wi);
            return (
              <div
                key={wi}
                className="text-[10px] text-ink-faint font-medium"
                style={{ width: 14, textAlign: "left" }}
              >
                {ml ? ml.label : ""}
              </div>
            );
          })}
        </div>
        {/* Grid rows (days of week) */}
        {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => (
          <div key={dayIdx} className="flex items-center gap-0.5">
            <span className="text-[10px] text-ink-faint w-7 text-right pr-1.5 select-none">
              {dayLabels[dayIdx]}
            </span>
            {weeks.map((week, wi) => {
              const dateStr = week[dayIdx];
              if (!dateStr) return <div key={wi} className="w-3.5 h-3.5" />;
              const count = reviewMap.get(dateStr) || 0;
              const isFuture = dateStr > todayStr;
              const isToday = dateStr === todayStr;
              return (
                <div
                  key={wi}
                  className={`w-3.5 h-3.5 rounded-[3px] transition-colors ${
                    isFuture ? "bg-transparent" : ""
                  } ${isToday ? "ring-1 ring-accent/40" : ""}`}
                  style={{
                    backgroundColor: isFuture
                      ? "transparent"
                      : count > 0
                        ? `rgba(139, 126, 200, ${getOpacity(count)})`
                        : "var(--color-surface-active)",
                  }}
                  title={
                    isFuture
                      ? ""
                      : `${dateStr}: ${count} review${count !== 1 ? "s" : ""}`
                  }
                />
              );
            })}
          </div>
        ))}
        {/* Legend */}
        <div className="flex items-center gap-1.5 pl-8 mt-2">
          <span className="text-[10px] text-ink-faint">Less</span>
          {[0, 0.2, 0.4, 0.7, 1].map((opacity, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-[3px]"
              style={{
                backgroundColor:
                  opacity === 0
                    ? "var(--color-surface-active)"
                    : `rgba(139, 126, 200, ${0.2 + 0.8 * opacity})`,
              }}
            />
          ))}
          <span className="text-[10px] text-ink-faint">More</span>
        </div>
      </div>
    </div>
  );
}

// Bar chart for weekly words learned
function WeeklyBars({ weekly }: { weekly: WeekStats[] }) {
  // Show last 12 weeks
  const recent = weekly.slice(-12);
  const maxLearned = Math.max(1, ...recent.map((w) => w.cards_learned));
  const maxReviews = Math.max(1, ...recent.map((w) => w.reviews));

  if (recent.length === 0) {
    return (
      <p className="text-sm text-ink-faint py-8 text-center">
        No data yet. Start reviewing cards to see weekly stats.
      </p>
    );
  }

  const BAR_MAX_HEIGHT = 120; // px

  return (
    <div className="flex items-end gap-1.5" style={{ height: BAR_MAX_HEIGHT + 24 }}>
      {recent.map((week, i) => {
        const barHeight = Math.max(
          3,
          Math.round((week.cards_learned / maxLearned) * BAR_MAX_HEIGHT)
        );
        return (
          <div
            key={week.week_start}
            className="flex-1 flex flex-col items-center justify-end group"
            style={{ height: "100%" }}
          >
            {/* Tooltip on hover */}
            <div className="relative mb-auto">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-0 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-sm)] bg-ink text-surface text-[11px] px-2 py-1 pointer-events-none z-10">
                <div>{week.cards_learned} words learned</div>
                <div className="text-surface/60">{week.reviews} reviews</div>
                <div className="text-surface/60">
                  {week.days_practiced}/7 days
                </div>
              </div>
            </div>
            {/* Bar */}
            <div
              className="w-full rounded-t-[4px] bg-accent transition-all duration-500"
              style={{
                height: barHeight,
                opacity: week.cards_learned > 0 ? 1 : 0.15,
                animation: `progress-fill 0.6s ease-out ${i * 50}ms both`,
              }}
            />
            {/* Label */}
            <span className="text-[9px] text-ink-faint leading-none mt-1.5 tabular-nums">
              {formatWeekLabel(week.week_start)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Donut chart for card state distribution
function CardDistribution({
  totals,
}: {
  totals: StatsData["totals"];
}) {
  const { total_cards, new_cards, learning_cards, mastered_cards } = totals;
  if (total_cards === 0) {
    return (
      <p className="text-sm text-ink-faint py-8 text-center">
        No cards yet.
      </p>
    );
  }

  const segments = [
    {
      label: "Mastered",
      count: mastered_cards,
      color: "var(--color-success)",
      bg: "bg-success-subtle",
      text: "text-success",
    },
    {
      label: "Learning",
      count: learning_cards,
      color: "#d97706",
      bg: "bg-amber-50",
      text: "text-amber-600",
    },
    {
      label: "New",
      count: new_cards,
      color: "var(--color-accent)",
      bg: "bg-accent-subtle",
      text: "text-accent",
    },
  ];

  // SVG donut
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative flex-shrink-0">
        <svg width="108" height="108" viewBox="0 0 108 108">
          {segments.map((seg) => {
            const pct = seg.count / total_cards;
            const dashLen = pct * circumference;
            const dashOffset = -offset * circumference;
            offset += pct;
            if (seg.count === 0) return null;
            return (
              <circle
                key={seg.label}
                cx="54"
                cy="54"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth="10"
                strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className="transition-all duration-700"
                style={{
                  transformOrigin: "center",
                  transform: "rotate(-90deg)",
                }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-ink tabular-nums">
            {total_cards}
          </span>
          <span className="text-[10px] text-ink-faint">cards</span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-sm text-ink-soft">{seg.label}</span>
            <span className="text-sm font-medium text-ink tabular-nums ml-auto">
              {seg.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}


// Year calendar — 12 months, each showing a mini calendar grid with practiced days highlighted
function YearCalendar({ daily }: { daily: DayStats[] }) {
  const reviewMap = new Map(daily.map((d) => [d.date, d.reviews]));
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Show last 6 months (ending with current month)
  const months: { year: number; month: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  }

  const dayHeaders = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
      {months.map(({ year, month }) => {
        const monthName = new Date(year, month, 1).toLocaleDateString("en-GB", {
          month: "short",
        });

        // Build the grid: find what day of week the 1st falls on (Mon=0)
        const firstDay = new Date(year, month, 1);
        const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const cells: (number | null)[] = [];
        for (let i = 0; i < startDow; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);
        // Pad to fill last row
        while (cells.length % 7 !== 0) cells.push(null);

        return (
          <div key={`${year}-${month}`}>
            <h3 className="text-[11px] font-semibold text-ink-soft mb-1.5 tracking-wide">
              {monthName}
            </h3>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-px mb-0.5">
              {dayHeaders.map((d, i) => (
                <span
                  key={i}
                  className="text-[8px] text-ink-faint text-center select-none"
                >
                  {d}
                </span>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7 gap-px">
              {cells.map((day, i) => {
                if (day === null) {
                  return <div key={i} className="w-full aspect-square" />;
                }
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const reviews = reviewMap.get(dateStr) || 0;
                const isFuture = dateStr > todayStr;
                const isToday = dateStr === todayStr;
                const practiced = reviews > 0;

                return (
                  <div
                    key={i}
                    className={`w-full aspect-square flex items-center justify-center rounded-[2px] text-[8px] tabular-nums transition-colors ${
                      isFuture
                        ? "text-ink-faint/30"
                        : practiced
                          ? "bg-accent text-white font-medium"
                          : "text-ink-faint"
                    } ${isToday && !practiced ? "ring-1 ring-accent/50" : ""}`}
                    title={
                      isFuture
                        ? ""
                        : `${dateStr}: ${reviews} review${reviews !== 1 ? "s" : ""}`
                    }
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Year timeline — horizontal bar graph showing reviews per day for the last 12 months
function YearTimeline({ daily }: { daily: DayStats[] }) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Generate all days for the last 12 months
  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() - 12);
  startDate.setDate(1); // Start from 1st of that month for clean labels

  const allDays: string[] = [];
  const d = new Date(startDate);
  while (d <= today) {
    allDays.push(d.toISOString().split("T")[0]);
    d.setDate(d.getDate() + 1);
  }

  const reviewMap = new Map(daily.map((d) => [d.date, d.reviews]));
  const maxReviews = Math.max(1, ...daily.map((d) => d.reviews));
  const BAR_HEIGHT = 90;
  const BAR_WIDTH = 2.2;

  // Month markers
  const monthMarkers: { label: string; index: number }[] = [];
  let lastMonth = -1;
  allDays.forEach((dateStr, idx) => {
    const m = new Date(dateStr + "T00:00:00").getMonth();
    if (m !== lastMonth) {
      const dateObj = new Date(dateStr + "T00:00:00");
      monthMarkers.push({
        label: dateObj.toLocaleDateString("en-GB", {
          month: "short",
          year: dateObj.getMonth() === 0 ? "2-digit" : undefined,
        }),
        index: idx,
      });
      lastMonth = m;
    }
  });

  // Stats
  const practicedDays = allDays.filter(
    (d) => (reviewMap.get(d) || 0) > 0
  ).length;
  const totalDaysElapsed = allDays.length;
  const pct = Math.round((practicedDays / totalDaysElapsed) * 100);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-sm text-ink-soft">
          <span className="font-medium text-ink tabular-nums">{practicedDays}</span>
          <span className="text-ink-faint"> / {totalDaysElapsed} days</span>
          <span className="ml-2 text-xs text-ink-faint">({pct}%)</span>
        </span>
        <span className="text-[11px] text-ink-faint">Last 12 months</span>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <div
          className="flex items-end"
          style={{
            height: BAR_HEIGHT + 20,
            minWidth: allDays.length * (BAR_WIDTH + 0.5),
            gap: "0.5px",
          }}
        >
          {allDays.map((dateStr) => {
            const reviews = reviewMap.get(dateStr) || 0;
            const barH =
              reviews > 0
                ? Math.max(4, Math.round((reviews / maxReviews) * BAR_HEIGHT))
                : 0;
            const isToday = dateStr === todayStr;

            return (
              <div
                key={dateStr}
                className="flex flex-col items-center justify-end group"
                style={{ flex: `0 0 ${BAR_WIDTH}px`, height: "100%" }}
              >
                {/* Hover tooltip */}
                {reviews > 0 && (
                  <div className="relative">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-sm)] bg-ink text-surface text-[10px] px-1.5 py-0.5 pointer-events-none z-10">
                      {reviews}
                    </div>
                  </div>
                )}
                <div
                  className={`w-full rounded-t-[1px] transition-colors ${
                    reviews > 0
                      ? "bg-accent group-hover:bg-accent-hover"
                      : isToday
                        ? "bg-line"
                        : ""
                  }`}
                  style={{ height: barH || (isToday ? 2 : 0) }}
                  title={`${dateStr}: ${reviews} reviews`}
                />
              </div>
            );
          })}
        </div>
        {/* Month labels below */}
        <div
          className="relative"
          style={{
            minWidth: allDays.length * (BAR_WIDTH + 0.5),
            height: 16,
          }}
        >
          {monthMarkers.map((m) => (
            <span
              key={`${m.label}-${m.index}`}
              className="absolute text-[9px] text-ink-faint"
              style={{ left: m.index * (BAR_WIDTH + 0.5) }}
            >
              {m.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Line chart — unique cards reviewed per day over the last 6 months
function ReviewLineChart({ daily }: { daily: DayStats[] }) {
  const today = new Date();

  // Last 30 days
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 29);

  const allDays: string[] = [];
  const d = new Date(startDate);
  while (d <= today) {
    allDays.push(d.toISOString().split("T")[0]);
    d.setDate(d.getDate() + 1);
  }

  const reviewMap = new Map(daily.map((dd) => [dd.date, dd.cards_learned]));
  const maxCards = Math.max(1, ...allDays.map((d) => reviewMap.get(d) || 0));

  const W = 800;
  const H = 140;
  const PAD_Y = 10;
  const chartH = H - PAD_Y * 2;

  // Points — one per day, actual values
  const points = allDays.map((dateStr, i) => {
    const count = reviewMap.get(dateStr) || 0;
    return {
      x: (i / (allDays.length - 1)) * W,
      y: PAD_Y + chartH - (count / maxCards) * chartH,
      count,
      date: dateStr,
    };
  });

  // Build straight-line path connecting all days
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  // Area fill
  const areaD = pathD + ` L ${points[points.length - 1].x} ${PAD_Y + chartH} L ${points[0].x} ${PAD_Y + chartH} Z`;

  // Day labels on x-axis — show every ~5 days
  const dayMarkers: { label: string; x: number }[] = [];
  allDays.forEach((dateStr, idx) => {
    if (idx % 5 === 0 || idx === allDays.length - 1) {
      const d = new Date(dateStr + "T00:00:00");
      dayMarkers.push({
        label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        x: (idx / (allDays.length - 1)) * W,
      });
    }
  });

  // Y-axis labels
  const yLabels = [0, Math.round(maxCards / 2), maxCards];

  // Hover state
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const relX = e.clientX - rect.left;
      const pct = relX / rect.width;
      const idx = Math.round(pct * (points.length - 1));
      if (idx >= 0 && idx < points.length) {
        setHoverIndex(idx);
      }
    },
    [points.length]
  );

  const hoverPoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverIndex(null)}
    >
      <svg
        viewBox={`0 0 ${W} ${H + 18}`}
        className="w-full"
        style={{ height: 180 }}
      >
        {/* Grid lines */}
        {yLabels.map((val) => {
          const y = PAD_Y + chartH - (val / maxCards) * chartH;
          return (
            <g key={val}>
              <line
                x1={0}
                y1={y}
                x2={W}
                y2={y}
                stroke="var(--color-line)"
                strokeWidth="0.5"
                strokeDasharray="4 4"
              />
              <text
                x={W - 2}
                y={y - 3}
                textAnchor="end"
                className="fill-[var(--color-ink-faint)]"
                style={{ fontSize: 9 }}
              >
                {val > 0 ? val : ""}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaD} fill="url(#cardsGradient)" opacity="0.2" />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Hover crosshair + dot */}
        {hoverPoint && (
          <>
            <line
              x1={hoverPoint.x}
              y1={PAD_Y}
              x2={hoverPoint.x}
              y2={PAD_Y + chartH}
              stroke="var(--color-ink-faint)"
              strokeWidth="0.75"
              strokeDasharray="3 3"
            />
            <circle
              cx={hoverPoint.x}
              cy={hoverPoint.y}
              r="4"
              fill="var(--color-surface)"
              stroke="var(--color-accent)"
              strokeWidth="2"
            />
          </>
        )}

        {/* Day labels */}
        {dayMarkers.map((m, i) => (
          <text
            key={i}
            x={m.x}
            y={H + 12}
            textAnchor="middle"
            className="fill-[var(--color-ink-faint)]"
            style={{ fontSize: 9 }}
          >
            {m.label}
          </text>
        ))}

        <defs>
          <linearGradient id="cardsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Tooltip */}
      {hoverPoint && (
        <div
          className="absolute pointer-events-none z-10"
          style={{
            left: `${(hoverPoint.x / W) * 100}%`,
            top: 0,
            transform: "translateX(-50%)",
          }}
        >
          <div className="rounded-[var(--radius-sm)] bg-ink text-surface text-[11px] px-2 py-1 whitespace-nowrap shadow-lg">
            <div className="font-medium tabular-nums">{hoverPoint.count} cards</div>
            <div className="text-surface/60 text-[10px]">
              {new Date(hoverPoint.date + "T00:00:00").toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Rating colors: 1=Again (red), 2=Hard (amber), 3=Good (accent), 4=Easy (green)
const RATING_COLORS: Record<number, string> = {
  1: "var(--color-error)",
  2: "#d97706",
  3: "var(--color-accent)",
  4: "var(--color-success)",
};
const RATING_LABELS: Record<number, string> = {
  1: "Again",
  2: "Hard",
  3: "Good",
  4: "Easy",
};

// Top 10 hardest words with review dots colored by rating
function HardestWords({ words }: { words: HardWord[] }) {
  if (words.length === 0) {
    return (
      <p className="text-sm text-ink-faint py-4 text-center">
        No difficult words yet — keep practicing!
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {words.map((word, i) => {
        const diffPct = Math.min(100, (word.difficulty / 10) * 100);
        const againCount = word.ratings.filter((r) => r === 1).length;
        const hardCount = word.ratings.filter((r) => r === 2).length;
        return (
          <div
            key={word.id}
            className="flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 bg-surface-hover/50 group"
          >
            {/* Rank */}
            <span className="text-[11px] font-medium text-ink-faint w-4 text-right tabular-nums flex-shrink-0">
              {i + 1}
            </span>

            {/* Play button */}
            <SpeakerButton
              text={word.front}
              audioUrl={word.audio_url}
              entityType="card"
              entityId={word.id}
              size="sm"
            />

            {/* Word */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span
                  className="text-[15px] font-medium text-ink truncate"
                  style={{ fontFamily: "var(--font-arabic)" }}
                  dir="rtl"
                >
                  {word.front}
                </span>
                <span className="text-xs text-ink-faint truncate">
                  {word.back}
                </span>
              </div>
              {/* Rating summary text */}
              <div className="flex items-center gap-2 mt-0.5">
                {againCount > 0 && (
                  <span className="text-[10px] text-error tabular-nums">
                    {againCount}x Again
                  </span>
                )}
                {hardCount > 0 && (
                  <span className="text-[10px] text-amber-600 tabular-nums">
                    {hardCount}x Hard
                  </span>
                )}
              </div>
            </div>

            {/* Review dots — each dot is a review colored by rating */}
            <div className="flex items-center gap-[3px] flex-shrink-0 flex-wrap justify-end max-w-[140px]">
              {word.ratings.slice(-20).map((rating, j) => (
                <div
                  key={j}
                  className="w-[6px] h-[6px] rounded-full"
                  style={{ backgroundColor: RATING_COLORS[rating] || RATING_COLORS[3] }}
                  title={RATING_LABELS[rating]}
                />
              ))}
            </div>

            {/* Difficulty badge */}
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 tabular-nums ${
                diffPct >= 70
                  ? "bg-error-subtle text-error"
                  : diffPct >= 40
                    ? "bg-amber-50 text-amber-600"
                    : "bg-accent-subtle text-accent"
              }`}
            >
              {word.difficulty.toFixed(1)}
            </span>
          </div>
        );
      })}
      {/* Legend */}
      <div className="flex items-center gap-3 pt-2 pl-7">
        {[1, 2, 3, 4].map((rating) => (
          <div key={rating} className="flex items-center gap-1">
            <div
              className="w-[6px] h-[6px] rounded-full"
              style={{ backgroundColor: RATING_COLORS[rating] }}
            />
            <span className="text-[10px] text-ink-faint">
              {RATING_LABELS[rating]}
            </span>
          </div>
        ))}
        <span className="text-[10px] text-ink-faint ml-auto">
          Last 20 reviews
        </span>
      </div>
    </div>
  );
}

// This Week — shows Mon-Sun with review counts and visual indicator
function ThisWeek({ daily, language }: { daily: DayStats[]; language: string }) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const dow = (today.getDay() + 6) % 7; // Mon=0

  // Get this week's Monday
  const monday = new Date(today);
  monday.setDate(today.getDate() - dow);

  const weekDays: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDays.push(d.toISOString().split("T")[0]);
  }

  const reviewMap = new Map(daily.map((d) => [d.date, d]));
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const weekReviews = weekDays.reduce(
    (sum, d) => sum + (reviewMap.get(d)?.reviews || 0),
    0
  );
  const weekDaysPracticed = weekDays.filter(
    (d) => (reviewMap.get(d)?.reviews || 0) > 0
  ).length;
  const practicedToday = (reviewMap.get(todayStr)?.reviews || 0) > 0;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <span className="text-sm text-ink-soft">
          <span className="font-medium text-ink tabular-nums">
            {weekReviews}
          </span>{" "}
          words reviewed
          <span className="mx-1.5 text-ink-faint">·</span>
          <span className="tabular-nums">{weekDaysPracticed}/7</span> days
        </span>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((dateStr, i) => {
          const day = reviewMap.get(dateStr);
          const reviews = day?.reviews || 0;
          const isToday = dateStr === todayStr;
          const isFuture = dateStr > todayStr;
          const practiced = reviews > 0;

          return (
            <div key={dateStr} className="flex flex-col items-center gap-1.5">
              <span
                className={`text-[11px] font-medium ${
                  isToday ? "text-accent" : "text-ink-faint"
                }`}
              >
                {dayNames[i]}
              </span>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  practiced
                    ? "bg-accent text-white"
                    : isToday
                      ? "ring-2 ring-accent/30 bg-accent-subtle/50 text-accent"
                      : isFuture
                        ? "bg-surface-active/50 text-ink-faint/40"
                        : "bg-surface-active text-ink-faint"
                }`}
              >
                {practiced ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : isFuture ? (
                  ""
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </div>
              <span
                className={`text-[11px] tabular-nums ${
                  practiced ? "text-ink font-medium" : "text-ink-faint"
                }`}
              >
                {practiced ? `${reviews}` : isFuture ? "" : "0"}
              </span>
            </div>
          );
        })}
      </div>

    </div>
  );
}

// Review Rate — dual line chart: words added vs reviewed per week over 12 months
function ReviewRate({
  weekly,
  totals,
}: {
  weekly: WeekStats[];
  totals: StatsData["totals"];
}) {
  const totalAdded = totals.total_cards;
  const totalReviewed = totals.mastered_cards + totals.learning_cards;
  const overallRate =
    totalAdded > 0 ? Math.round((totalReviewed / totalAdded) * 100) : 0;

  if (weekly.length < 2) {
    return (
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm text-ink-soft">
            <span className="font-medium text-ink tabular-nums">{totalReviewed}</span> of{" "}
            <span className="tabular-nums">{totalAdded}</span> cards reviewed
          </span>
          <span className={`text-lg font-bold tabular-nums ${overallRate >= 80 ? "text-success" : overallRate >= 50 ? "text-amber-600" : "text-error"}`}>
            {overallRate}%
          </span>
        </div>
        <p className="text-sm text-ink-faint py-4 text-center">Not enough data yet.</p>
      </div>
    );
  }

  const maxVal = Math.max(
    1,
    ...weekly.map((w) => Math.max(w.cards_added, w.cards_learned))
  );

  const W = 800;
  const H = 140;
  const PAD = 10;
  const chartW = W - PAD * 2;
  const chartH = H - PAD * 2;

  function buildPath(values: number[]): string {
    const points = values.map((v, i) => ({
      x: PAD + (i / (values.length - 1)) * chartW,
      y: PAD + chartH - (v / maxVal) * chartH,
    }));

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const p0 = points[Math.max(0, i - 2)];
      const p1 = points[i - 1];
      const p2 = points[i];
      const p3 = points[Math.min(points.length - 1, i + 1)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }

  const addedPath = buildPath(weekly.map((w) => w.cards_added));
  const reviewedPath = buildPath(weekly.map((w) => w.cards_learned));

  // Month markers
  const monthMarkers: { label: string; x: number }[] = [];
  let lastMo = "";
  weekly.forEach((w, i) => {
    const mo = getMonthLabel(w.week_start);
    if (mo !== lastMo) {
      monthMarkers.push({
        label: mo,
        x: PAD + (i / (weekly.length - 1)) * chartW,
      });
      lastMo = mo;
    }
  });

  return (
    <div className="space-y-4">
      {/* Overall rate bar */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm text-ink-soft">
            <span className="font-medium text-ink tabular-nums">{totalReviewed}</span> of{" "}
            <span className="tabular-nums">{totalAdded}</span> cards reviewed
          </span>
          <span className={`text-lg font-bold tabular-nums ${overallRate >= 80 ? "text-success" : overallRate >= 50 ? "text-amber-600" : "text-error"}`}>
            {overallRate}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-surface-active overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${overallRate >= 80 ? "bg-success" : overallRate >= 50 ? "bg-amber-500" : "bg-error"}`}
            style={{ width: `${overallRate}%`, animation: "progress-fill 0.8s ease-out" }}
          />
        </div>
      </div>

      {/* Dual line chart */}
      <div>
        <svg
          viewBox={`0 0 ${W} ${H + 18}`}
          className="w-full"
          preserveAspectRatio="none"
          style={{ height: 160 }}
        >
          {/* Grid */}
          {[0, 0.5, 1].map((frac) => {
            const y = PAD + chartH - frac * chartH;
            return (
              <line
                key={frac}
                x1={PAD}
                y1={y}
                x2={W - PAD}
                y2={y}
                stroke="var(--color-line)"
                strokeWidth="0.5"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Added line (lighter) */}
          <path
            d={addedPath}
            fill="none"
            stroke="var(--color-accent-soft)"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Reviewed line (solid) */}
          <path
            d={reviewedPath}
            fill="none"
            stroke="var(--color-success)"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Month labels */}
          {monthMarkers.map((m, i) => (
            <text
              key={i}
              x={m.x}
              y={H + 12}
              textAnchor="start"
              style={{ fontSize: 9 }}
              className="fill-[var(--color-ink-faint)]"
            >
              {m.label}
            </text>
          ))}
        </svg>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 rounded bg-accent-soft" />
            <span className="text-[10px] text-ink-faint">Words added</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 rounded bg-success" />
            <span className="text-[10px] text-ink-faint">Words reviewed</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Confetti particle colors — mix of accent and warm tones
const CONFETTI_COLORS = [
  "#8b7ec8", "#c4b5fd", "#e07356", "#f0abfc", "#fbbf24", "#34d399", "#f472b6",
];

function StudyNowButton({ language }: { language: string }) {
  const router = useRouter();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; color: string; angle: number; distance: number; size: number; rotation: number }[]
  >([]);

  const handleClick = () => {
    // Spawn confetti particles from the button
    const newParticles = Array.from({ length: 24 }, (_, i) => ({
      id: Date.now() + i,
      x: 0,
      y: 0,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      angle: Math.random() * 360,
      distance: 40 + Math.random() * 80,
      size: 4 + Math.random() * 6,
      rotation: Math.random() * 720 - 360,
    }));
    setParticles(newParticles);

    // Navigate after confetti has mostly played out
    setTimeout(() => {
      router.push(`/${language}/review`);
    }, 750);

    // Clean up particles
    setTimeout(() => setParticles([]), 1200);
  };

  return (
    <div className="relative">
      {/* Confetti particles */}
      {particles.map((p) => {
        const rad = (p.angle * Math.PI) / 180;
        const tx = Math.cos(rad) * p.distance;
        const ty = Math.sin(rad) * p.distance;
        return (
          <span
            key={p.id}
            className="confetti-particle"
            style={{
              "--tx": `${tx}px`,
              "--ty": `${ty}px`,
              "--rot": `${p.rotation}deg`,
              "--size": `${p.size}px`,
              backgroundColor: p.color,
              position: "absolute",
              top: "50%",
              left: "50%",
              width: `${p.size}px`,
              height: `${p.size * 0.6}px`,
              borderRadius: "2px",
              pointerEvents: "none",
              zIndex: 50,
            } as React.CSSProperties}
          />
        );
      })}

      <button
        ref={btnRef}
        onClick={handleClick}
        className="study-now-btn group inline-flex items-center gap-2 rounded-[var(--radius-md)] px-5 py-2.5 text-sm font-medium text-white cursor-pointer"
      >
        <svg className="arrow-icon w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
        <span>Keep the streak going</span>
      </button>
    </div>
  );
}

export default function StatsPage() {
  const params = useParams();
  const language = params.lang as string;
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/stats?language=${language}&range=365`)
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [language]);

  return (
    <div className="min-h-screen bg-bg">
      <Header />

      <main className="mx-auto max-w-5xl px-7 pt-11 pb-20">
        {(() => {
          const todayStr = new Date().toISOString().split("T")[0];
          const practicedToday = stats?.daily.some(
            (d) => d.date === todayStr && d.reviews > 0
          );
          return (
            <div className="mb-8 flex items-end justify-between">
              <h1 className="text-[28px] font-bold tracking-tight text-ink">
                Stats
              </h1>
              {!isLoading && stats && !practicedToday && (
                <StudyNowButton language={language} />
              )}
            </div>
          );
        })()}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="skeleton h-32 rounded-[var(--radius-md)]"
              />
            ))}
          </div>
        ) : !stats ? (
          <p className="text-ink-faint">Failed to load stats.</p>
        ) : (
          <div className="space-y-6 stagger-children">
            {/* Streak + summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="Current Streak"
                value={`${stats.streak.current}`}
                unit={stats.streak.current === 1 ? "day" : "days"}
                accent={stats.streak.current > 0}
              />
              <StatCard
                label="Best Streak"
                value={`${stats.streak.best}`}
                unit={stats.streak.best === 1 ? "day" : "days"}
              />
              <StatCard
                label="Total Reviews"
                value={stats.totals.reviews.toLocaleString()}
              />
              <StatCard
                label="Days Practiced"
                value={`${stats.totals.days_practiced}`}
              />
            </div>

            {/* This Week */}
            <section
              className="rounded-[var(--radius-md)] border border-line/50 bg-surface p-5"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <h2 className="text-[13px] font-medium uppercase tracking-wide text-ink-faint mb-4">
                Weekly Streak
              </h2>
              <ThisWeek daily={stats.daily} language={language} />
            </section>

            {/* Review Rate */}
            <section
              className="rounded-[var(--radius-md)] border border-line/50 bg-surface p-5"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <h2 className="text-[13px] font-medium uppercase tracking-wide text-ink-faint mb-4">
                Review Rate
              </h2>
              <ReviewRate weekly={stats.weekly} totals={stats.totals} />
            </section>

            {/* Reviews line chart — 12 months */}
            <section
              className="rounded-[var(--radius-md)] border border-line/50 bg-surface p-5"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <h2 className="text-[13px] font-medium uppercase tracking-wide text-ink-faint mb-4">
                Cards Reviewed per Day
              </h2>
              <ReviewLineChart daily={stats.daily} />
            </section>

            {/* Two-col: Weekly words + Card distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <section
                className="rounded-[var(--radius-md)] border border-line/50 bg-surface p-5"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <h2 className="text-[13px] font-medium uppercase tracking-wide text-ink-faint mb-4">
                  Words Learned per Week
                </h2>
                <WeeklyBars weekly={stats.weekly} />
              </section>

              <section
                className="rounded-[var(--radius-md)] border border-line/50 bg-surface p-5"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <h2 className="text-[13px] font-medium uppercase tracking-wide text-ink-faint mb-4">
                  Card Progress
                </h2>
                <CardDistribution totals={stats.totals} />
              </section>
            </div>

            {/* Hardest Words */}
            <section
              className="rounded-[var(--radius-md)] border border-line/50 bg-surface p-5"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <h2 className="text-[13px] font-medium uppercase tracking-wide text-ink-faint mb-4">
                Hardest Words
              </h2>
              <HardestWords words={stats.hardest_words} />
            </section>

            {/* Calendar — last 6 months */}
            <section
              className="rounded-[var(--radius-md)] border border-line/50 bg-surface p-5"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <h2 className="text-[13px] font-medium uppercase tracking-wide text-ink-faint mb-4">
                Practice History
              </h2>
              <YearCalendar daily={stats.daily} />
            </section>

          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-[var(--radius-md)] border border-line/50 bg-surface p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
        {label}
      </p>
      <p className="mt-1.5 flex items-baseline gap-1.5">
        <span
          className={`text-2xl font-bold tabular-nums ${accent ? "text-accent" : "text-ink"}`}
        >
          {value}
        </span>
        {unit && (
          <span className="text-sm text-ink-faint">{unit}</span>
        )}
      </p>
    </div>
  );
}
