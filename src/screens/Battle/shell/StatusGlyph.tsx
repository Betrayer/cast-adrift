import styles from '@/screens/Battle/BattleScreen.module.css';

export type StatusGlyphKind = 'shield' | 'interference' | 'scrap' | 'charge';

const SOLID: Record<Exclude<StatusGlyphKind, 'interference'>, string> = {
  shield: 'M6 1 L10.5 2.8 V6 C10.5 8.6 8.6 10.4 6 11.2 C3.4 10.4 1.5 8.6 1.5 6 V2.8 Z',
  scrap:
    'M6 1 L10.3 3.5 V8.5 L6 11 L1.7 8.5 V3.5 Z M6 4.4 A1.6 1.6 0 1 0 6 7.6 A1.6 1.6 0 1 0 6 4.4 Z',
  charge: 'M7 0.8 L2.5 7 H5.6 L4.8 11.2 L9.5 4.8 H6.4 Z',
};

const WAVE = 'M1 6 L3 3 L5 9 L7 3 L9 9 L11 6';

export const StatusGlyph = ({ kind }: { kind: StatusGlyphKind }) => (
  <svg
    className={styles.statusGlyph}
    viewBox="0 0 12 12"
    width={12}
    height={12}
    aria-hidden
    focusable="false"
    data-status-glyph={kind}
  >
    {kind === 'interference' ? (
      <path
        d={WAVE}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    ) : (
      <path d={SOLID[kind]} fill="currentColor" fillRule="evenodd" />
    )}
  </svg>
);
