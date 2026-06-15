import Logo from "@/components/Logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-radial p-10 text-white lg:flex">
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-accent-400/20 blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          <Logo className="h-10 w-10" />
          <span className="text-xl font-bold tracking-tight">Relay</span>
        </div>
        <div className="relative">
          <h1 className="text-3xl font-bold leading-tight">
            Relationships in motion.
          </h1>
          <p className="mt-3 max-w-md text-white/80">
            The CRM that keeps your deals moving. Track contacts, accounts, and
            your pipeline in one fast, beautiful workspace.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/90">
            {[
              "Drag-and-drop deal pipeline",
              "Live analytics & forecasting",
              "Your own private, secure workspace",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20">
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative text-xs text-white/60">
          © {new Date().getFullYear()} Relay · Demo
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Logo className="h-9 w-9" />
            <span className="text-lg font-bold tracking-tight">Relay</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
