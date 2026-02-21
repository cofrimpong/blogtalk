"use client";

import { useEffect, useState } from "react";

export default function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const documentElement = document.documentElement;
      const scrollTop = documentElement.scrollTop;
      const scrollableHeight = documentElement.scrollHeight - documentElement.clientHeight;

      if (scrollableHeight <= 0) {
        setProgress(0);
        return;
      }

      const nextProgress = Math.min(100, Math.max(0, (scrollTop / scrollableHeight) * 100));
      setProgress(nextProgress);
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  return (
    <div className="sticky top-[57px] z-10 mb-6 h-1 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800">
      <div
        className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 transition-[width] duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
