"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebaseClient";
import { isOwnerEmail } from "@/lib/audience";

export type AudienceMode = "guest" | "owner" | "observer";

export default function useAudienceMode(): {
  authReady: boolean;
  user: User | null;
  mode: AudienceMode;
  isOwner: boolean;
  isObserver: boolean;
} {
  const auth = useMemo(() => getFirebaseAuth(), []);
  const [authReady, setAuthReady] = useState(!auth);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!auth) {
      return;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
  }, [auth]);

  const isOwner = Boolean(user) && isOwnerEmail(user?.email);
  const isObserver = Boolean(user) && !isOwner;
  const mode: AudienceMode = !user ? "guest" : isOwner ? "owner" : "observer";

  return {
    authReady,
    user,
    mode,
    isOwner,
    isObserver,
  };
}
