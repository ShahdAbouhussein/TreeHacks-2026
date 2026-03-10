interface TaskListItemProps {
  title: string;
  dueDate: string;
  description: string;
  category?: "progress" | "protect" | "maintain" | "flourish";
  onDismiss?: () => void;
}

export function TaskListItem({
  title,
  dueDate,
  description,
  category,
  onDismiss,
}: TaskListItemProps) {
  return (
    <article
      className="flex w-full items-start justify-between rounded-[18px] bg-surface px-[20px] py-[16px]"
      style={{ border: "1px solid rgba(150, 150, 150, 0.2)" }}
      data-category={category}
    >
      <div className="flex-1">
        <h3 className="text-body leading-body font-medium text-text-strong pr-8">
          {title}
        </h3>
        <span className="mt-[3px] block text-caption leading-caption text-text-secondary">
          Due {dueDate}
        </span>
        {description && (
          <p className="mt-[10px] text-caption leading-caption text-text-tertiary">
            {description}
          </p>
        )}
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
