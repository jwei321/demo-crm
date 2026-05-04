import "./globals.css";
import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Demo CRM",
  description: "A simple CRM demo built with Next.js, Prisma, and PostgreSQL",
};

const themeInitScript = `
(function(){try{
var t=localStorage.getItem('theme');
if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){
document.documentElement.classList.add('dark');
}}catch(e){}})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <div className="min-h-screen flex">
          <Sidebar />
          <main className="flex-1 min-w-0">
            <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
