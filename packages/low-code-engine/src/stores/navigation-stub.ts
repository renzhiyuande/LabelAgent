export function useNavigationStore<T>(_selector: (s: any) => T): T {
  return _selector({ loadMenus: async () => {} });
}
useNavigationStore.getState = () => ({ loadMenus: async () => {} });
