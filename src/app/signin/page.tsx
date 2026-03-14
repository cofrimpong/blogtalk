"use client";

import { FormEvent, useState } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { getFirebaseAuth, hasFirebaseConfig } from "@/lib/firebaseClient";

export default function SignInPage() {
  const authAvailable = hasFirebaseConfig;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const getNormalizedEmail = (): string | null => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setMessage("Enter your email address.");
      return null;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(normalizedEmail)) {
      setMessage("Use a valid email format like name@example.com.");
      return null;
    }

    return normalizedEmail;
  };

  const withLoading = async (action: (auth: NonNullable<ReturnType<typeof getFirebaseAuth>>) => Promise<void>) => {
    const auth = getFirebaseAuth();

    if (!auth) {
      setMessage("Sign-in is unavailable on this deployment right now.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await action(auth);
      setMessage("Success. You are signed in.");
    } catch (error) {
      const authError = error as { code?: string; message?: string };

      if (authError.code === "auth/invalid-email") {
        setMessage("Use a valid email format like name@example.com.");
      } else if (authError.code === "auth/email-already-in-use") {
        setMessage("That email already has an account. Try Sign in with Email.");
      } else if (authError.code === "auth/weak-password") {
        setMessage("Password must be at least 6 characters.");
      } else {
        setMessage(authError.message ?? "Sign-in failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (event: FormEvent) => {
    event.preventDefault();

    const normalizedEmail = getNormalizedEmail();
    if (!normalizedEmail) {
      return;
    }

    await withLoading(async (auth) => {
      await signInWithEmailAndPassword(auth, normalizedEmail, password);
    });
  };

  const createAccount = async () => {
    const normalizedEmail = getNormalizedEmail();
    if (!normalizedEmail) {
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    await withLoading(async (auth) => {
      await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    });
  };

  const signInWithGoogle = async () => {
    await withLoading(async (auth) => {
      await signInWithPopup(auth, new GoogleAuthProvider());
    });
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-4 py-6 md:px-6 md:py-10">
      <section className="rounded-[1.6rem] border border-zinc-200/80 bg-white/85 p-6 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/75 md:p-8">
        <h1 className="editorial-serif text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm opacity-80">Join the feed with email/password or Google.</p>

        <form onSubmit={signInWithEmail} className="mt-6 space-y-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-zinc-300/80 bg-white/90 px-3 py-2 text-sm outline-none transition focus:border-sky-400 dark:border-slate-700 dark:bg-slate-950"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-zinc-300/80 bg-white/90 px-3 py-2 text-sm outline-none transition focus:border-sky-400 dark:border-slate-700 dark:bg-slate-950"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-gradient-to-r from-rose-500 via-yellow-400 to-sky-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:brightness-105 disabled:opacity-50"
            >
              Sign in with Email
            </button>
            <button
              type="button"
              onClick={createAccount}
              disabled={loading}
              className="rounded-full border border-zinc-300/80 bg-white/90 px-4 py-2 text-sm font-semibold transition hover:border-yellow-400 hover:bg-yellow-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
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
            className="rounded-full border border-zinc-300/80 bg-white/90 px-4 py-2 text-sm font-semibold transition hover:border-sky-400 hover:bg-sky-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            Continue with Google
          </button>
        </div>

        {!authAvailable ? (
          <p className="mt-4 text-sm opacity-85">Sign-in is unavailable on this deployment right now.</p>
        ) : null}
        {message ? <p className="mt-4 text-sm opacity-85">{message}</p> : null}
      </section>
    </main>
  );
}
