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
              <Link href="/" className="text-sm font-semibold uppercase tracking-[0.18em]">
                BlogTalk
              </Link>
              <div className="flex items-center gap-6 text-sm opacity-80">
                <Link href="/" className="transition-opacity hover:opacity-100">
                  Home
                </Link>
                <Link href="/#essays" className="transition-opacity hover:opacity-100">
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
