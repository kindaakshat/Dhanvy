import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LEO — The Control Layer for Autonomous Payments",
  description: "AI agents can decide what to buy. LEO decides what they're actually allowed to pay for.",
  icons: {
    icon: "/favicon.ico",
  },
};

import { AuthProvider } from "@/context/AuthContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="font-sans h-full antialiased scroll-smooth">
      <body className="min-h-full flex flex-col bg-[#faf8fd] text-slate-900 selection:bg-purple-600 selection:text-white">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
