"use client";

import { useEffect, useState } from "react";

type DisplayMode = "light" | "system" | "dark";

const DISPLAY_MODE_KEY = "display-mode";

function isDisplayMode(value: string | null): value is DisplayMode {
  return value === "light" || value === "system" || value === "dark";
}

function applyDisplayMode(mode: DisplayMode) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const shouldUseDark = mode === "dark" || (mode === "system" && prefersDark);

  document.documentElement.classList.toggle("dark", shouldUseDark);
  document.documentElement.dataset.display = mode;
}

export default function DisplaySettings() {
  const [mode, setMode] = useState<DisplayMode>("light");

  useEffect(() => {
    const savedMode = localStorage.getItem(DISPLAY_MODE_KEY);
    const initialMode = isDisplayMode(savedMode) ? savedMode : "light";

    setMode(initialMode);
    applyDisplayMode(initialMode);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      if (mode === "system") {
        applyDisplayMode("system");
      }
    };

    media.addEventListener("change", handleSystemThemeChange);
    return () => media.removeEventListener("change", handleSystemThemeChange);
  }, [mode]);

  const handleModeChange = (nextMode: DisplayMode) => {
    setMode(nextMode);
    localStorage.setItem(DISPLAY_MODE_KEY, nextMode);
    applyDisplayMode(nextMode);
  };

  return (
    <label className="inline-flex items-center gap-2 rounded-full border border-zinc-300/80 bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200">
      Display
      <select
        value={mode}
        onChange={(event) => handleModeChange(event.target.value as DisplayMode)}
        className="rounded-full border border-zinc-300/80 bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-700 outline-none transition hover:border-sky-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
        aria-label="Display mode"
      >
        <option value="light">Light</option>
        <option value="system">System</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
