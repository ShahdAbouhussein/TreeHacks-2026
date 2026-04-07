import { useState } from "react";

const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function InlineDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (d: string) => void;
}) {
  const parsed = value ? value.split("-").map(Number) : null;
  const initYear = parsed ? parsed[0] : new Date().getFullYear();
  const initMonth = parsed ? parsed[1] - 1 : new Date().getMonth();

  const [viewYear, setViewYear] = useState(initYear);
  const [viewMonth, setViewMonth] = useState(initMonth);

  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  const selectedDay = parsed && parsed[0] === viewYear && parsed[1] - 1 === viewMonth ? parsed[2] : null;

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const prevMonthNum = viewMonth === 0 ? 11 : viewMonth - 1;
  const prevYearNum = viewMonth === 0 ? viewYear - 1 : viewYear;
  const daysInPrevMonth = getDaysInMonth(prevYearNum, prevMonthNum);

  const cells: { day: number; isCurrentMonth: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, isCurrentMonth: true });
  }
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, isCurrentMonth: false });
    }
  }

  const goNext = () => {
    if (viewMonth >= 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };
  const goPrev = () => {
    if (viewMonth <= 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  return (
    <div className="rounded-[12px] bg-white p-3 shadow-lg border border-border" style={{ width: 280 }}>
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-body leading-body font-semibold text-text-strong">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <div className="flex gap-1">
          <button type="button" onClick={goPrev} className="flex h-7 w-7 items-center justify-center rounded-full text-text-secondary hover:bg-subtle-fill">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button type="button" onClick={goNext} className="flex h-7 w-7 items-center justify-center rounded-full text-text-secondary hover:bg-subtle-fill">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mt-1">
        {DAY_LABELS.map((label, i) => (
          <div key={i} className="py-1 text-center text-caption leading-caption font-medium tracking-[0.04em] text-text-tertiary">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const isSelected = cell.isCurrentMonth && cell.day === selectedDay;
          const isToday = cell.isCurrentMonth && viewYear === todayYear && viewMonth === todayMonth && cell.day === todayDay && !isSelected;
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (cell.isCurrentMonth) onChange(toDateStr(viewYear, viewMonth, cell.day));
              }}
              className={`relative flex h-[34px] items-center justify-center text-caption leading-caption ${
                cell.isCurrentMonth ? "text-text-strong" : "text-text-tertiary"
              }`}
            >
              {isSelected && (
                <span className="absolute inset-0 m-auto h-[28px] w-[28px] rounded-full bg-accent/15" />
              )}
              <span className={`relative z-10 ${
                isSelected ? "font-semibold text-accent" : isToday ? "text-accent" : ""
              }`}>
                {cell.day}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
