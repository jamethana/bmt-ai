import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          <div className="min-h-screen bg-background text-foreground">
            <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
              <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500 text-sm font-bold text-white">
                    BP
                  </span>
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-semibold text-foreground">
                      Badminton Pairing
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Session control
                    </span>
                  </div>
                </div>
                <nav className="flex items-center gap-1 text-xs sm:text-sm">
                  <Link
                    href="/sessions"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors px-3"
                  >
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
