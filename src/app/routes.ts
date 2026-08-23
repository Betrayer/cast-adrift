import type { ScreenId } from '@/types';

export type RouteGroup = 'menu' | 'meta' | 'run' | 'node' | 'ceremony';

export type BackMode = 'stack' | 'locked' | 'guarded' | `fixed:${ScreenId}`;

export interface RouteDef {
  group: RouteGroup;
  backMode: BackMode;
  title?: string;
  swipeLock?: true;
  keepAlive?: true;
}

export const ROUTES: Record<ScreenId, RouteDef> = {
  menu: { group: 'menu', backMode: 'locked' },
  settings: { group: 'meta', backMode: 'stack', title: 'settings:title' },
  hangar: {
    group: 'meta',
    backMode: 'stack',
    title: 'meta:hangar.title',
    keepAlive: true,
  },
  chart: {
    group: 'meta',
    backMode: 'stack',
    title: 'meta:chart.title',
    swipeLock: true,
    keepAlive: true,
  },
  collection: { group: 'meta', backMode: 'stack', title: 'meta:collection.title' },
  engraving: {
    group: 'meta',
    backMode: 'fixed:hangar',
    title: 'meta:engraving.title',
  },
  codex: { group: 'meta', backMode: 'stack', title: 'run:codex.title' },
  modes: { group: 'meta', backMode: 'stack', title: 'meta:modes.title' },
  profile: { group: 'meta', backMode: 'stack', title: 'meta:profile.title' },
  achievements: {
    group: 'meta',
    backMode: 'stack',
    title: 'meta:achievements.title',
  },
  contracts: { group: 'meta', backMode: 'stack', title: 'meta:contracts.title' },
  leaderboard: { group: 'meta', backMode: 'stack', title: 'meta:board.title' },
  runSetup: { group: 'meta', backMode: 'stack', title: 'run:setup.title' },
  map: { group: 'run', backMode: 'guarded', swipeLock: true },
  journal: { group: 'run', backMode: 'stack', title: 'run:journal.title' },
  battle: { group: 'run', backMode: 'locked', swipeLock: true },
  event: { group: 'node', backMode: 'guarded' },
  puzzle: { group: 'node', backMode: 'guarded', swipeLock: true },
  shop: { group: 'node', backMode: 'guarded', title: 'run:shop.title' },
  shipyard: { group: 'node', backMode: 'guarded', title: 'run:shipyard.title' },
  rewards: { group: 'ceremony', backMode: 'locked' },
  summary: { group: 'ceremony', backMode: 'locked' },
  driftSummary: { group: 'ceremony', backMode: 'locked' },
  prologue: { group: 'ceremony', backMode: 'locked' },
  interstitial: { group: 'ceremony', backMode: 'locked' },
  finale: { group: 'ceremony', backMode: 'locked' },
  ending: { group: 'ceremony', backMode: 'locked' },
};

const FIXED_PREFIX = 'fixed:';

export const routeOf = (screen: ScreenId): RouteDef => ROUTES[screen];

export const fixedBackTarget = (mode: BackMode): ScreenId | null =>
  mode.startsWith(FIXED_PREFIX)
    ? (mode.slice(FIXED_PREFIX.length) as ScreenId)
    : null;

export const isGuardedRoute = (screen: ScreenId): boolean =>
  ROUTES[screen].backMode === 'guarded';

export const isSwipeLocked = (screen: ScreenId): boolean =>
  ROUTES[screen].swipeLock === true;

export const screenTitleKey = (screen: ScreenId): string | undefined =>
  ROUTES[screen].title;

export const KEEP_ALIVE_SCREENS: readonly ScreenId[] = (
  Object.keys(ROUTES) as ScreenId[]
).filter((screen) => ROUTES[screen].keepAlive === true);

export const RESUMABLE_GROUPS: ReadonlySet<RouteGroup> = new Set<RouteGroup>([
  'menu',
  'meta',
]);

export const isResumableScreen = (screen: ScreenId): boolean =>
  RESUMABLE_GROUPS.has(ROUTES[screen].group);
