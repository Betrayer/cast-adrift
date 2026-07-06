export type ScreenId =
  | 'menu'
  | 'settings'
  | 'hangar'
  | 'chart'
  | 'codex'
  | 'modes'
  | 'runSetup'
  | 'map'
  | 'battle'
  | 'event'
  | 'puzzle'
  | 'shop'
  | 'shipyard'
  | 'rewards'
  | 'summary';

export type Locale = 'en' | 'uk' | 'ru';

export type ReducedMotionSetting = 'auto' | 'on' | 'off';

export type EchoVerbosity = 'normal' | 'less' | 'off';

export type RunSnapshot = Record<string, unknown>;
