interface DayItem {
  date: number;
  label: string;
  isSelected?: boolean;
}

interface WeekStripProps {
  days: DayItem[];
  onDayPress?: (date: number) => void;
}

export function WeekStrip({ days, onDayPress }: WeekStripProps) {
  return (
    <nav
      aria-label="Week navigation"
      className="mx-[12px] mt-[12px] flex items-center justify-center gap-0 rounded-[12px] bg-[#F7F7F7] px-[2px] py-[4px]"
    >
      {days.map((day) => (
        <button
          key={day.date}
          type="button"
          onClick={() => onDayPress?.(day.date)}
          className={`flex h-[58px] flex-1 flex-col items-center justify-center gap-[2px] rounded-[8px] transition-colors ${
            day.isSelected
              ? "min-w-[60px] bg-surface shadow-subtle"
              : ""
          }`}
        >
          <span
            className={`text-[17px] font-medium leading-6 ${
              day.isSelected ? "text-text-strong" : "text-text-primary"
            }`}
          >
            {day.date}
          </span>
          <span
            className={`text-[12px] leading-4 ${
              day.isSelected ? "text-text-primary" : "text-text-secondary"
            }`}
          >
            {day.label}
          </span>
        </button>
      ))}
    </nav>
  );
}
