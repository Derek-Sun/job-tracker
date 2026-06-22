import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Briefcase } from "lucide-react";
import { getSession } from "@/lib/session";
import { logout } from "@/app/actions/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Job Tracker",
  description: "Track your job applications",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
                <Briefcase size={14} className="text-white" />
              </div>
              <span>JobTracker</span>
            </Link>
            {session ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600">{session.name}</span>
                <form action={logout}>
                  <button
                    type="submit"
                    className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  Get started
                </Link>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
