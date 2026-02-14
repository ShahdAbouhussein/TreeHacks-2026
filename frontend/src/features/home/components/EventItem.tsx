interface EventItemProps {
  title: string;
  timeRange: string;
}

export function EventItem({ title, timeRange }: EventItemProps) {
  return (
    <div className="flex h-[56px] items-center justify-between rounded-[8px] bg-subtle-fill px-[16px]">
      <span className="text-[15px] leading-5 text-text-primary">{title}</span>
      <span className="text-[12px] leading-4 text-text-tertiary">
        {timeRange}
      </span>
    </div>
  );
}
