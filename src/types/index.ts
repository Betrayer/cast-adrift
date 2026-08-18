export type ScreenId =
  | 'menu'
  | 'settings'
  | 'hangar'
  | 'chart'
  | 'collection'
  | 'engraving'
  | 'codex'
  | 'modes'
  | 'profile'
  | 'contracts'
  | 'leaderboard'
  | 'driftSummary'
  | 'runSetup'
  | 'map'
  | 'journal'
  | 'battle'
  | 'event'
  | 'puzzle'
  | 'shop'
  | 'shipyard'
  | 'rewards'
  | 'summary'
  | 'prologue'
  | 'interstitial'
  | 'finale'
  | 'ending';

export const LOCALES = ['en', 'uk', 'ru', 'de', 'es', 'fr', 'pl'] as const;

export type Locale = (typeof LOCALES)[number];

export type ReducedMotionSetting = 'auto' | 'on' | 'off';

export type FontScale = 's' | 'm' | 'l';

export type BattleSpeed = 'normal' | 'fast';

export type BattleLayoutId = 'console' | 'orbit' | 'tablet';

export type EchoVerbosity = 'normal' | 'less' | 'off';

export type RunSnapshot = Record<string, unknown>;
