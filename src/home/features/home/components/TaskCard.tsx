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

const CATEGORY_COLORS: Record<string, string> = {
  protect: "#4A6352",
  progress: "#6F8F7A",
  maintain: "#8B7A6B",
  flourish: "#7A8F6F",
};

const CATEGORY_ICONS: Record<string, JSX.Element> = {
  protect: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 8V12M12 16H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  progress: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L10.6985 7.20599C10.4445 8.22185 10.3176 8.72978 10.0531 9.14309C9.81915 9.50868 9.50868 9.81915 9.14309 10.0531C8.72978 10.3176 8.22185 10.4445 7.20599 10.6985L2 12L7.20599 13.3015C8.22185 13.5555 8.72978 13.6824 9.14309 13.9469C9.50868 14.1808 9.81915 14.4913 10.0531 14.8569C10.3176 15.2702 10.4445 15.7782 10.6985 16.794L12 22L13.3015 16.794C13.5555 15.7782 13.6824 15.2702 13.9469 14.8569C14.1808 14.4913 14.4913 14.1808 14.8569 13.9469C15.2702 13.6824 15.7782 13.5555 16.794 13.3015L22 12L16.794 10.6985C15.7782 10.4445 15.2702 10.3176 14.8569 10.0531C14.4913 9.81915 14.1808 9.50868 13.9469 9.14309C13.6824 8.72978 13.5555 8.22185 13.3015 7.20599L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  maintain: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M9 11.4999L11 13.4999L15.5 8.99987M20 11.9999C20 16.9083 14.646 20.4783 12.698 21.6147C12.4766 21.7439 12.3659 21.8085 12.2097 21.842C12.0884 21.868 11.9116 21.868 11.7903 21.842C11.6341 21.8085 11.5234 21.7439 11.302 21.6147C9.35396 20.4783 4 16.9083 4 11.9999V7.21747C4 6.41796 4 6.0182 4.13076 5.67457C4.24627 5.37101 4.43398 5.10015 4.67766 4.8854C4.9535 4.64231 5.3278 4.50195 6.0764 4.22122L11.4382 2.21054C11.6461 2.13258 11.75 2.0936 11.857 2.07815C11.9518 2.06444 12.0482 2.06444 12.143 2.07815C12.25 2.0936 12.3539 2.13258 12.5618 2.21054L17.9236 4.22122C18.6722 4.50195 19.0465 4.64231 19.3223 4.8854C19.566 5.10015 19.7537 5.37101 19.8692 5.67457C20 6.0182 20 6.41796 20 7.21747V11.9999Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  flourish: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M15.5455 9.92543C15.9195 9.26103 16.2313 8.66151 16.4236 8.20521C17.3573 5.98947 16.434 3.44077 14.1769 2.40112C11.9199 1.36148 9.65341 2.4395 8.65871 4.52093C6.75657 3.2157 4.21918 3.40739 2.81989 5.44424C1.42059 7.48108 1.85975 10.142 3.77629 11.594C4.6461 12.253 6.36636 13.2242 7.98596 14.0884M16.2972 11.7499C15.8751 9.482 13.9454 7.82334 11.5156 8.27415C9.08592 8.72497 7.51488 10.9171 7.84335 13.299C8.10725 15.2127 9.56392 19.7027 10.1264 21.394C10.2032 21.6248 10.2415 21.7402 10.3175 21.8206C10.3837 21.8907 10.4717 21.9416 10.5655 21.9638C10.6732 21.9894 10.7923 21.9649 11.0306 21.916C12.7765 21.5575 17.3933 20.574 19.1826 19.8457C21.4096 18.9392 22.5589 16.4841 21.6981 14.153C20.8372 11.8219 18.4723 10.9815 16.2972 11.7499Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
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
  const categoryIcon = category ? CATEGORY_ICONS[category] : null;
  const categoryColor = category ? CATEGORY_COLORS[category] || "#6F8F7A" : "#6F8F7A";

  return (
    <article className="relative flex w-[200px] h-[160px] shrink-0 flex-col rounded-[18px] bg-surface px-[18px] pt-[12px] pb-[12px]" style={{ border: "1px solid rgba(150, 150, 150, 0.2)" }}>
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
          <span className="text-caption leading-caption text-text-secondary">
            {dueLabel}
          </span>
        )}
        <h3 className="mt-[4px] pr-8 text-body leading-body font-medium text-text-strong">
          {title}
        </h3>
      </div>

      {/* Bottom — category pill with icon */}
      <div className="flex-1" />
      {categoryIcon && (
        <span className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-full bg-accent">
          {categoryIcon}
        </span>
      )}
    </article>
  );
}
