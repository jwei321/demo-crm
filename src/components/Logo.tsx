export default function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span
      className={`${className} grid place-items-center rounded-xl bg-brand-gradient shadow-sm`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-1/2 w-1/2 text-white"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* A forward "relay" chevron flow — relationships in motion */}
        <path d="M4 8h9" />
        <path d="M4 16h6" />
        <path d="M13 4l6 8-6 8" />
      </svg>
    </span>
  );
}
