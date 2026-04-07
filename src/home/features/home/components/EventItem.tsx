interface EventItemProps {
  title: string;
  timeRange: string;
  onClick?: () => void;
}

export function EventItem({ title, timeRange, onClick }: EventItemProps) {
  return (
    <div
      className={`flex h-full min-h-[40px] items-center justify-between rounded-[2px] px-[14px] py-[8px]${onClick ? " cursor-pointer" : ""}`}
      style={{ backgroundColor: "#F7F7F7", borderLeft: "3px solid #6F8F7A" }}
      onClick={onClick}
    >
      <span className="text-body leading-body font-medium text-text-strong">{title}</span>
      <span className="text-caption leading-caption text-gray-400 whitespace-nowrap ml-[8px]">
        {timeRange}
      </span>
    </div>
  );
}
