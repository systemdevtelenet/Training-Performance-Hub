'use client';

import { createContext, useContext } from 'react';

export interface NavigationLoadingState {
  pendingHref: string | null;
  startNavigation: (href: string) => void;
  finishNavigation: () => void;
}

export const NavigationLoadingContext = createContext<NavigationLoadingState>({
  pendingHref: null,
  startNavigation: () => {},
  finishNavigation: () => {},
});

export function useNavigationLoading() {
  return useContext(NavigationLoadingContext);
}
