"use client";

import Link from "next/link";
import useAudienceMode from "./useAudienceMode";

export default function ConsultantNavLink() {
  const { isObserver } = useAudienceMode();

  if (isObserver) {
    return null;
  }

  return (
    <Link
      href="/consultant"
      className="rounded-full px-3 py-1.5 text-zinc-700 transition hover:bg-rose-100 hover:text-rose-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-rose-300"
    >
      Consultant
    </Link>
  );
}
