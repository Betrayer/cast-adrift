import type { ScreenId } from '@/types';

export type RouteGroup = 'menu' | 'meta' | 'run' | 'node' | 'ceremony';

export type BackMode = 'stack' | 'locked' | 'guarded' | `fixed:${ScreenId}`;

export type EnterMode = 'slide' | 'bespoke';

export type NavDirection = 'forward' | 'back';

export interface RouteDef {
  group: RouteGroup;
  backMode: BackMode;
  title?: string;
  swipeLock?: true;
  keepAlive?: true;
  enter?: 'bespoke';
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
  battle: { group: 'run', backMode: 'locked', swipeLock: true, enter: 'bespoke' },
  event: { group: 'node', backMode: 'guarded' },
  puzzle: {
    group: 'node',
    backMode: 'guarded',
    swipeLock: true,
    enter: 'bespoke',
  },
  shop: { group: 'node', backMode: 'guarded', title: 'run:shop.title' },
  shipyard: { group: 'node', backMode: 'guarded', title: 'run:shipyard.title' },
  rewards: { group: 'ceremony', backMode: 'locked', enter: 'bespoke' },
  summary: { group: 'ceremony', backMode: 'locked', enter: 'bespoke' },
  driftSummary: { group: 'ceremony', backMode: 'locked', enter: 'bespoke' },
  prologue: { group: 'ceremony', backMode: 'locked', enter: 'bespoke' },
  interstitial: { group: 'ceremony', backMode: 'locked', enter: 'bespoke' },
  finale: { group: 'ceremony', backMode: 'locked', enter: 'bespoke' },
  ending: { group: 'ceremony', backMode: 'locked', enter: 'bespoke' },
};

const FIXED_PREFIX = 'fixed:';

export const fixedBackTarget = (mode: BackMode): ScreenId | null =>
  mode.startsWith(FIXED_PREFIX)
    ? (mode.slice(FIXED_PREFIX.length) as ScreenId)
    : null;

export const isSwipeLocked = (screen: ScreenId): boolean =>
  ROUTES[screen].swipeLock === true;

export const enterModeFor = (screen: ScreenId): EnterMode =>
  ROUTES[screen].enter === 'bespoke' ? 'bespoke' : 'slide';

export const navAttrFor = (
  screen: ScreenId,
  direction: NavDirection,
): NavDirection | 'none' =>
  enterModeFor(screen) === 'bespoke' ? 'none' : direction;

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
