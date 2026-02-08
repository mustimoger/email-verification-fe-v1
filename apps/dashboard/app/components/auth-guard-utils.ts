export type AuthState = "loading" | "unauthenticated" | "authenticated";

export function resolveAuthState({
  loading,
  hasSession,
}: {
  loading: boolean;
  hasSession: boolean;
}): AuthState {
  if (loading) return "loading";
  return hasSession ? "authenticated" : "unauthenticated";
}
