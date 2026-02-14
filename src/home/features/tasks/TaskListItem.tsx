interface TaskListItemProps {
  title: string;
  dueDate: string;
  description: string;
  onDismiss?: () => void;
}

export function TaskListItem({
  title,
  dueDate,
  description,
  onDismiss,
}: TaskListItemProps) {
  return (
    <article className="flex w-full items-start justify-between rounded-[16px] bg-surface px-[20px] py-[18px] shadow-subtle">
      <div className="flex-1">
        <span className="text-[12px] leading-4 tracking-[0.04em] text-text-secondary">
          Due {dueDate}
        </span>
        <h3 className="mt-[4px] text-[17px] font-semibold leading-6 text-text-strong">
          {title}
        </h3>
        <p className="mt-[2px] text-[13px] leading-[18px] text-text-tertiary">
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="ml-md mt-[2px] flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-subtle-fill"
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
    </article>
  );
}
