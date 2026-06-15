import "./globals.css";
import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export const metadata: Metadata = {
  title: "Relay — Relationships in motion",
  description:
    "Relay is a modern CRM for sales teams: track contacts, accounts, and your deal pipeline in one fast, beautiful workspace.",
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="min-h-screen flex">
          <Sidebar />
          <main className="flex-1 min-w-0 flex flex-col">
            <TopBar />
            <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-6 sm:py-8 animate-fade-in">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
