interface ChatBarProps {
  onMenuPress: () => void;
}

export function ChatBar({ onMenuPress }: ChatBarProps) {
  return (
    <nav
      aria-label="Chat bar"
      className="fixed bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-[10px] rounded-full bg-surface-alt px-[10px] py-[8px] shadow-subtle"
    >
      {/* Hamburger menu button */}
      <button
        type="button"
        onClick={onMenuPress}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text-secondary"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M3 5H17M3 10H17M3 15H17"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Chat input */}
      <input
        type="text"
        placeholder="Chat about tasks"
        className="h-10 flex-1 bg-transparent text-[15px] leading-5 text-text-strong placeholder:text-text-tertiary focus:outline-none"
        readOnly
      />

      {/* Mic button */}
      <button
        type="button"
        className="flex h-10 w-10 shrink-0 items-center justify-center text-text-secondary"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M10 1.5C9.20435 1.5 8.44129 1.81607 7.87868 2.37868C7.31607 2.94129 7 3.70435 7 4.5V10C7 10.7956 7.31607 11.5587 7.87868 12.1213C8.44129 12.6839 9.20435 13 10 13C10.7956 13 11.5587 12.6839 12.1213 12.1213C12.6839 11.5587 13 10.7956 13 10V4.5C13 3.70435 12.6839 2.94129 12.1213 2.37868C11.5587 1.81607 10.7956 1.5 10 1.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16 8.5V10C16 11.5913 15.3679 13.1174 14.2426 14.2426C13.1174 15.3679 11.5913 16 10 16C8.4087 16 6.88258 15.3679 5.75736 14.2426C4.63214 13.1174 4 11.5913 4 10V8.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 16V18.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Audio / voice button (dark circle) */}
      <button
        type="button"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-text-strong text-white"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="2" y="7" width="2" height="4" rx="1" fill="currentColor" />
          <rect x="5.5" y="4" width="2" height="10" rx="1" fill="currentColor" />
          <rect x="9" y="6" width="2" height="6" rx="1" fill="currentColor" />
          <rect x="12.5" y="3" width="2" height="12" rx="1" fill="currentColor" />
        </svg>
      </button>
    </nav>
  );
}
