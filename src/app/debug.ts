export const debugRequested = (): boolean =>
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('debug') === '1';

export const devDebug = (): boolean => import.meta.env.DEV && debugRequested();
