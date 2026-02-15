interface TaskCardProps {
  title: string;
  dueDate: string;
  description: string;
  tag: string;
  category?: string;
  onDismiss?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  protect: "Protect",
  progress: "Progress",
  maintain: "Maintain",
  flourish: "Flourish",
};

function formatDueLabel(dueDate: string): string {
  if (!dueDate) return "";
  const due = new Date(dueDate + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? "s" : ""} overdue`;
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  return `Due in ${diffDays} days`;
}

export function TaskCard({ title, dueDate, category, onDismiss }: TaskCardProps) {
  const dueLabel = formatDueLabel(dueDate);
  const categoryLabel = category ? CATEGORY_LABELS[category] || category : null;

  return (
    <article className="relative flex w-[200px] h-[220px] shrink-0 flex-col justify-between rounded-[20px] bg-surface px-[18px] pt-[18px] pb-[18px] shadow-subtle">
      {/* Dismiss button — top right */}
      <button
        type="button"
        onClick={onDismiss}
        className="absolute right-[14px] top-[14px] flex h-8 w-8 items-center justify-center rounded-full bg-subtle-fill"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M9 3L3 9M3 3L9 9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Top section */}
      <div>
        {dueLabel && (
          <span className="text-[13px] leading-4 text-text-secondary">
            {dueLabel}
          </span>
        )}
        <h3 className="mt-[4px] pr-8 text-[19px] font-bold leading-6 text-text-strong">
          {title}
        </h3>
      </div>

      {/* Bottom — category pill */}
      {categoryLabel && (
        <span className="inline-flex w-fit items-center rounded-full bg-accent px-[16px] py-[6px] text-[13px] font-medium leading-5 text-white">
          {categoryLabel}
        </span>
      )}
    </article>
  );
}
