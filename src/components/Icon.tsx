const PATHS: Record<string, string> = {
  building: "M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01",
  users: "M16 14a4 4 0 1 0-8 0M4 20a8 8 0 1 1 16 0",
  trending: "M3 17l6-6 4 4 7-7M14 8h6v6",
  dollar: "M12 2v20M17 6.5a4 4 0 0 0-4-2.5h-1.5a3.5 3.5 0 0 0 0 7h3a3.5 3.5 0 0 1 0 7H10a4 4 0 0 1-4-2.5",
  target: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
  trophy: "M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4zM7 4H4v2a3 3 0 0 0 3 3M17 4h3v2a3 3 0 0 0-3 3",
  plus: "M12 5v14M5 12h14",
};

export default function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: keyof typeof PATHS;
  className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
