"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
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
        className="rounded-full border border-zinc-300/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide transition hover:border-fuchsia-400 dark:border-zinc-700"
      >
        Sign in
      </Link>
    );
  }

  if (!user) {
    return (
      <Link
        href="/signin"
        className="rounded-full border border-fuchsia-300/80 bg-fuchsia-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-fuchsia-900 transition hover:bg-fuchsia-200/80 dark:border-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="max-w-36 truncate opacity-80">{user.email ?? "Signed in"}</span>
      <button
        type="button"
        onClick={() => signOut(auth)}
        className="rounded-full border border-zinc-300/80 px-3 py-1 font-semibold uppercase tracking-wide transition hover:border-fuchsia-400 dark:border-zinc-700"
      >
        Sign out
      </button>
    </div>
  );
}
