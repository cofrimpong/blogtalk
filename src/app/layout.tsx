import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "Thinking in Public",
  description: "Essays on systems, product, and decision-making.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="mx-auto w-full max-w-6xl px-6">
          <header className="sticky top-0 z-10 border-b border-zinc-200/70 bg-background/90 py-4 backdrop-blur dark:border-zinc-800">
            <nav className="mx-auto flex w-full max-w-5xl items-center justify-between">
              <Link
                href="/"
                className="group inline-flex items-center gap-2 rounded-full border border-fuchsia-300/70 bg-fuchsia-100/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-fuchsia-900 transition-all hover:bg-fuchsia-200/80 hover:shadow-sm dark:border-fuchsia-800/80 dark:bg-fuchsia-900/30 dark:text-fuchsia-200"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-700 text-[10px] tracking-normal text-violet-50 dark:bg-violet-500 dark:text-zinc-950">
                  BT
                </span>
                BlogTalk
              </Link>
              <div className="flex items-center gap-6 text-sm font-medium">
                <Link href="/" className="transition-colors hover:text-fuchsia-700 dark:hover:text-fuchsia-300">
                  Home
                </Link>
                <Link href="/#essays" className="transition-colors hover:text-fuchsia-700 dark:hover:text-fuchsia-300">
                  Essays
                </Link>
              </div>
            </nav>
          </header>

          {children}

          <footer className="mx-auto mt-20 w-full max-w-5xl border-t border-zinc-200/70 py-8 text-sm opacity-75 dark:border-zinc-800">
            <p>© 2026 BlogTalk · Crafted with Next.js · Deployed on GitHub Pages</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
