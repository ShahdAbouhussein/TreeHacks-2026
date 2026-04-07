import { TaskCard } from "./TaskCard";

interface Task {
  id: string;
  title: string;
  dueDate: string;
  description: string;
  tag: string;
  category?: string;
}

interface TasksSectionProps {
  tasks: Task[];
  onSeeAll?: () => void;
}

export function TasksSection({ tasks, onSeeAll }: TasksSectionProps) {
  return (
    <section aria-label="Tasks" className="mt-5xl">
      <div className="flex items-center justify-between px-lg lg:px-0">
        <h2 className="font-serif text-section leading-section text-text-strong lg:font-normal">
          Tasks
        </h2>
        <button
          type="button"
          onClick={onSeeAll}
          className="flex items-center gap-xs text-body leading-body text-text-secondary"
        >
          See all
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M6 4L10 8L6 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <div className="mt-lg flex gap-md overflow-x-auto px-lg lg:px-0 pb-sm">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            title={task.title}
            dueDate={task.dueDate}
            description={task.description}
            tag={task.tag}
            category={task.category}
          />
        ))}
      </div>
    </section>
  );
}
