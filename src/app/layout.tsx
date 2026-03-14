import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Script from "next/script";
import AuthNav from "./AuthNav";
import ConsultantNavLink from "./ConsultantNavLink";
import DisplaySettings from "./DisplaySettings";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chrissy's Verse",
  description: "Personal web presence updates, launches, and project notes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-gradient-to-b from-sky-50 via-yellow-50/80 to-rose-50 text-zinc-900 antialiased dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 dark:text-slate-100`}>
        <Script id="display-mode-init" strategy="beforeInteractive">
          {`(() => {
            try {
              const mode = localStorage.getItem("display-mode") || "light";
              const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
              const isDark = mode === "dark" || (mode === "system" && prefersDark);
              document.documentElement.classList.toggle("dark", isDark);
              document.documentElement.dataset.display = mode;
            } catch {}
          })();`}
        </Script>

        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-12 top-8 h-36 w-36 rounded-full bg-sky-200/40 blur-2xl dark:bg-sky-800/20" />
          <div className="absolute right-4 top-14 h-32 w-32 rounded-full bg-yellow-200/40 blur-2xl dark:bg-yellow-800/10" />
          <div className="absolute bottom-8 left-1/3 h-40 w-40 rounded-full bg-rose-200/40 blur-3xl dark:bg-rose-900/20" />
        </div>

        <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
          <header className="sticky top-3 z-20 py-3">
            <nav className="mx-auto flex w-full max-w-5xl items-center justify-between rounded-3xl border border-sky-200/70 bg-white/85 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/80">
              <Link
                href="/"
                className="group inline-flex items-center gap-2 rounded-full border border-yellow-300/80 bg-gradient-to-r from-rose-100 via-yellow-100 to-sky-100 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-900 transition hover:brightness-105 dark:border-slate-600 dark:from-rose-900/40 dark:via-yellow-900/25 dark:to-sky-900/40 dark:text-slate-100"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 via-yellow-400 to-sky-500 text-[10px] tracking-normal text-zinc-950">
                  CV
                </span>
                Chrissy&apos;s Verse
              </Link>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Link
                  href="/"
                  className="rounded-full px-3 py-1.5 text-zinc-700 transition hover:bg-sky-100 hover:text-sky-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-sky-300"
                >
                  Home
                </Link>
                <Link
                  href="/#updates"
                  className="rounded-full px-3 py-1.5 text-zinc-700 transition hover:bg-yellow-100 hover:text-yellow-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-yellow-300"
                >
                  Updates
                </Link>
                <ConsultantNavLink />
                <AuthNav />
              </div>
            </nav>
          </header>

          {children}

          <div className="fixed bottom-4 right-4 z-30">
            <DisplaySettings />
          </div>

          <footer className="mx-auto mb-10 mt-14 w-full max-w-5xl rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-4 text-sm text-zinc-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
            <p>© 2026 Chrissy&apos;s Verse · Web presence updates · Deployed on GitHub Pages</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
