export type ScreenId =
  | 'menu'
  | 'settings'
  | 'hangar'
  | 'chart'
  | 'collection'
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
  | 'summary'
  | 'prologue'
  | 'interstitial'
  | 'finale'
  | 'ending';

export type Locale = 'en' | 'uk' | 'ru';

export type ReducedMotionSetting = 'auto' | 'on' | 'off';

export type EchoVerbosity = 'normal' | 'less' | 'off';

export type RunSnapshot = Record<string, unknown>;
