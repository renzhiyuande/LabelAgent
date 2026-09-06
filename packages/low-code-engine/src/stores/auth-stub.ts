import type { AuthenticatedUser } from "../lib/types";
export function useAuthStore<T>(_selector: (s: any) => T): T {
  return _selector({ currentUser: null as AuthenticatedUser | null, setCurrentUser: () => {} });
}
useAuthStore.getState = () => ({ currentUser: null, setCurrentUser: () => {} });
