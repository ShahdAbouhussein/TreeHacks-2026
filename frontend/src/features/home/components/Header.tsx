interface HeaderProps {
  greeting: string;
  name: string;
  onAddPress?: () => void;
  onAiPress?: () => void;
}

export function Header({ greeting, name, onAddPress, onAiPress }: HeaderProps) {
  return (
    <header className="flex items-end justify-between px-lg pt-5xl pb-2xl">
      <div className="flex flex-col gap-xs">
        <p className="text-[15px] leading-5 text-text-secondary">{greeting}</p>
        <h1 className="font-serif text-[28px] leading-[34px] tracking-[-0.3px] text-text-strong">
          {name}
        </h1>
      </div>
      <div className="flex items-center gap-md">
        <button
          type="button"
          onClick={onAiPress}
          aria-label="AI assistant"
          className="flex h-11 w-11 items-center justify-center"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="text-icon-primary"
          >
            <path
              d="M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={onAddPress}
          aria-label="Add new"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white shadow-subtle"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 4V16M4 10H16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
