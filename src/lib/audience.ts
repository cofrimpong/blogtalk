export const OWNER_EMAIL = (process.env.NEXT_PUBLIC_OWNER_EMAIL ?? "cof@njit.edu").trim().toLowerCase();

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  return normalizeEmail(email) === OWNER_EMAIL;
}
