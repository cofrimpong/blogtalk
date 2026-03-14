"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { isOwnerEmail } from "@/lib/audience";
import { getFirebaseAuth } from "@/lib/firebaseClient";

export default function AuthNav() {
  const [user, setUser] = useState<User | null>(null);
  const auth = getFirebaseAuth();

  useEffect(() => {
    if (!auth) {
      return;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
    });
  }, [auth]);

  if (!auth) {
    return (
      <Link
        href="/signin"
        className="rounded-full border border-sky-300/80 bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-700 transition hover:border-sky-400 hover:bg-sky-50 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Sign in
      </Link>
    );
  }

  if (!user) {
    return (
      <Link
        href="/signin"
        className="rounded-full border border-yellow-300/80 bg-gradient-to-r from-rose-100 via-yellow-100 to-sky-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-800 transition hover:brightness-105 dark:border-slate-600 dark:from-rose-900/40 dark:via-yellow-900/25 dark:to-sky-900/40 dark:text-slate-100"
      >
        Sign in
      </Link>
    );
  }

  const isObserver = !isOwnerEmail(user.email);

  return (
    <div className="flex items-center gap-3 text-xs">
      {isObserver ? (
        <span className="rounded-full border border-sky-300/80 bg-sky-100/80 px-3 py-1.5 font-semibold uppercase tracking-wide text-sky-800 dark:border-sky-700 dark:bg-sky-900/35 dark:text-sky-200">
          Observer mode
        </span>
      ) : null}
      <span className="max-w-36 truncate rounded-full border border-zinc-300/80 bg-white/80 px-3 py-1.5 font-medium text-zinc-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
        {user.email ?? "Signed in"}
      </span>
      <button
        type="button"
        onClick={() => signOut(auth)}
        className="rounded-full border border-rose-300/80 bg-white/80 px-3 py-1.5 font-semibold uppercase tracking-wide text-zinc-700 transition hover:border-rose-400 hover:bg-rose-50 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Sign out
      </button>
    </div>
  );
}
