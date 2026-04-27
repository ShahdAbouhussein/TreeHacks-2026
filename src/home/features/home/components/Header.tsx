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
        <p className="text-body leading-body text-text-secondary">{greeting}</p>
        <h1 className="font-serif text-display leading-display tracking-[-0.3px] text-text-strong">
          {name}
        </h1>
      </div>
      <div className="flex items-center gap-[6px]">
        <button
          type="button"
          onClick={onAiPress}
          aria-label="AI assistant"
          className="flex h-11 w-11 items-center justify-center"
        >
          <svg width="28" height="24" viewBox="0 0 29 25" fill="none">
            <path d="M21.6333 0C22.9681 0.104094 24.0386 0.83307 24.7934 1.91075C25.5685 3.00821 25.8575 4.36986 25.5931 5.68214C25.0461 8.54764 21.8167 10.5302 19.1928 11.2148C18.8591 11.3019 18.3249 11.3661 18.0594 11.541L18.1543 11.6973C20.7611 13.1106 24.5205 10.6652 26.9663 10.1784C27.315 10.1177 28.0975 10.1924 28.3406 10.5011C29.7512 12.2944 28.6402 15.3338 27.4194 16.7284C26.3351 17.9687 24.7913 18.7254 23.1345 18.8276C19.1256 19.1096 17.183 16.9782 14.4873 14.6596C15.7129 17.401 20.4082 21.2419 16.6316 23.7253C14.9389 24.8355 12.8714 25.2428 10.8767 24.8591C6.54646 22.8821 9.96539 16.6931 10.9677 13.5786C10.3636 13.9381 9.87413 14.2608 9.33474 14.7033C7.65519 16.1355 5.08867 19.6262 2.72963 17.4132C-3.14951 11.8983 1.42686 9.32598 7.41625 9.32556C7.87663 9.32556 9.50469 8.97875 9.29871 8.34703C8.6172 6.19115 7.30356 4.37923 8.69599 2.17462C10.4063 -0.533312 13.8269 1.62773 15.0735 3.62752C15.549 4.39038 15.577 6.47522 16.1568 6.87086C17.8846 6.56595 18.6554 0.803285 21.6333 0Z" fill="#6F8F7A"/>
          </svg>
        </button>
        <button
          type="button"
          onClick={onAddPress}
          aria-label="Add new"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#6F8F7A] text-white shadow-subtle"
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
