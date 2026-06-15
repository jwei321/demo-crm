import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import CommandPalette from "@/components/CommandPalette";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-screen flex">
      <CommandPalette />
      <Sidebar user={{ name: user.name, email: user.email }} />
      <main className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-6 sm:py-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
