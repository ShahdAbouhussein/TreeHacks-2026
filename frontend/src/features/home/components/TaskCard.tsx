interface TaskCardProps {
  title: string;
  dueDate: string;
  description: string;
  tag: string;
}

export function TaskCard({ title, dueDate, description, tag }: TaskCardProps) {
  return (
    <article className="flex w-[200px] h-[200px] shrink-0 flex-col justify-between rounded-[12px] bg-surface px-[16px] py-[16px] shadow-subtle">
      <div>
        <span className="text-[12px] leading-4 tracking-[0.04em] text-text-secondary">
          {dueDate}
        </span>
        <h3 className="mt-[6px] text-[17px] font-medium leading-6 text-text-strong">
          {title}
        </h3>
        <p className="mt-[4px] text-[13px] leading-[18px] text-text-tertiary">
          {description}
        </p>
      </div>
      <span className="mt-2xl inline-flex w-fit items-center rounded-full border border-border px-md py-xs text-[12px] leading-4 tracking-[0.04em] text-text-secondary">
        {tag}
      </span>
    </article>
  );
}
