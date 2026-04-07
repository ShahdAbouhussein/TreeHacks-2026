interface TaskListItemProps {
  title: string;
  dueDate: string;
  description: string;
  urgent?: boolean;
  onDismiss?: () => void;
  onToggleUrgent?: () => void;
}

export function TaskListItem({
  title,
  dueDate,
  description,
  urgent,
  onDismiss,
  onToggleUrgent,
}: TaskListItemProps) {
  return (
    <article
      className="flex w-full items-start justify-between rounded-[18px] bg-surface px-[20px] py-[16px]"
      style={{ border: "1px solid rgba(150, 150, 150, 0.2)" }}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-body leading-body font-medium text-text-strong pr-2">
            {title}
          </h3>
          {urgent && (
            <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-caption leading-caption font-medium text-red-600">
              Urgent
            </span>
          )}
        </div>
        <span className="mt-[3px] block text-caption leading-caption text-text-secondary">
          Due {dueDate}
        </span>
        {description && (
          <p className="mt-[10px] text-caption leading-caption text-text-tertiary">
            {description}
          </p>
        )}
      </div>
      <div className="ml-2 flex items-center gap-1.5">
        {/* Urgent toggle */}
        <button
          type="button"
          onClick={onToggleUrgent}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
            urgent ? "bg-red-100 text-red-500" : "bg-subtle-fill text-text-tertiary hover:text-red-400"
          }`}
          title={urgent ? "Remove urgent" : "Mark urgent"}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8v5M12 17.5h.01" />
          </svg>
        </button>
        {/* Complete (checkmark) */}
        <button
          type="button"
          onClick={onDismiss}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-subtle-fill text-text-tertiary hover:bg-accent/15 hover:text-accent transition-colors"
          title="Complete task"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </button>
      </div>
    </article>
  );
}
