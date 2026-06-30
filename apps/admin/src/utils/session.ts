import type { Session } from "../types/admin";

const SESSION_KEY = "ali-oss-admin-session";

export function readStoredSession(): Session | null {
  const rawValue = window.localStorage.getItem(SESSION_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as Session;
  } catch {
    return null;
  }
}

export function storeSession(session: Session): void {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearStoredSession(): void {
  window.localStorage.removeItem(SESSION_KEY);
}
