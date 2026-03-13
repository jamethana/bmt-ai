import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { AuthProvider } from "@/src/ui/auth/AuthContext";
import { HeaderAuth } from "@/src/ui/layout/HeaderAuth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Badminton Pairing v2",
  description:
    "Run fair, fast badminton sessions with live court assignments and ratings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-50`}
      >
        <AuthProvider>
          <div className="min-h-screen bg-slate-950 text-slate-50">
            <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
              <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500 text-sm font-bold text-slate-950">
                    BP
                  </span>
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-semibold">
                      Badminton Pairing v2
                    </span>
                    <span className="text-xs text-slate-400">
                      Session control for moderators
                    </span>
                  </div>
                </div>
                <nav className="flex items-center gap-4 text-xs sm:text-sm">
                  <Link href="/sessions" className="text-slate-400 hover:text-slate-200 transition-colors">
                    Sessions
                  </Link>
                  <HeaderAuth />
                </nav>
              </div>
            </header>
            <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
