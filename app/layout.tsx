import type { Metadata } from "next";
import "./globals.css";
import { SidebarNav } from "./components/sidebar-nav";

export const metadata: Metadata = {
  title: "Profile POC - EdTech Impact",
  description: "School & Product Profile Similarity System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="flex min-h-screen bg-slate-50">
        <SidebarNav />
        <main className="flex-1 overflow-auto">
          <div className="p-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
