"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { getFirebaseAuth, hasFirebaseConfig } from "@/lib/firebaseClient";

export default function SignInPage() {
  const auth = useMemo(() => getFirebaseAuth(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const withLoading = async (action: () => Promise<void>) => {
    if (!auth) {
      setMessage("Firebase config missing. Add NEXT_PUBLIC_FIREBASE_* variables.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await action();
      setMessage("Success. You are signed in.");
    } catch (error) {
      const authError = error as { message?: string };
      setMessage(authError.message ?? "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (event: FormEvent) => {
    event.preventDefault();

    await withLoading(async () => {
      await signInWithEmailAndPassword(auth!, email, password);
    });
  };

  const createAccount = async () => {
    await withLoading(async () => {
      await createUserWithEmailAndPassword(auth!, email, password);
    });
  };

  const signInWithGoogle = async () => {
    await withLoading(async () => {
      await signInWithPopup(auth!, new GoogleAuthProvider());
    });
  };

  const signInWithApple = async () => {
    await withLoading(async () => {
      const provider = new OAuthProvider("apple.com");
      provider.addScope("email");
      provider.addScope("name");
      await signInWithPopup(auth!, provider);
    });
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-6 py-10 md:py-14">
      <section className="rounded-2xl border border-zinc-200/80 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 md:p-8">
        <h1 className="editorial-serif text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm opacity-80">Use email/password, Google, or Apple.</p>

        {!hasFirebaseConfig ? (
          <p className="mt-4 rounded-lg border border-fuchsia-300/60 bg-fuchsia-100/70 p-3 text-sm text-fuchsia-900 dark:border-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-100">
            Missing Firebase config. Add `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`,
            `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, and `NEXT_PUBLIC_FIREBASE_APP_ID`.
          </p>
        ) : null}

        <form onSubmit={signInWithEmail} className="mt-6 space-y-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-zinc-300/80 bg-white px-3 py-2 text-sm outline-none transition focus:border-fuchsia-400 dark:border-zinc-700 dark:bg-zinc-950"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-zinc-300/80 bg-white px-3 py-2 text-sm outline-none transition focus:border-fuchsia-400 dark:border-zinc-700 dark:bg-zinc-950"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-fuchsia-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-600 disabled:opacity-50"
            >
              Sign in with Email
            </button>
            <button
              type="button"
              onClick={createAccount}
              disabled={loading}
              className="rounded-lg border border-zinc-300/80 px-4 py-2 text-sm font-semibold transition hover:border-fuchsia-400 disabled:opacity-50 dark:border-zinc-700"
            >
              Create Account
            </button>
          </div>
        </form>

        <div className="mt-6 grid gap-2">
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={loading}
            className="rounded-lg border border-zinc-300/80 px-4 py-2 text-sm font-semibold transition hover:border-fuchsia-400 disabled:opacity-50 dark:border-zinc-700"
          >
            Continue with Google
          </button>
          <button
            type="button"
            onClick={signInWithApple}
            disabled={loading}
            className="rounded-lg border border-zinc-300/80 px-4 py-2 text-sm font-semibold transition hover:border-fuchsia-400 disabled:opacity-50 dark:border-zinc-700"
          >
            Continue with Apple
          </button>
        </div>

        {message ? <p className="mt-4 text-sm opacity-85">{message}</p> : null}
      </section>
    </main>
  );
}
