import "./globals.css";
import type { Metadata } from "next";

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
      <body>{children}</body>
    </html>
  );
}
