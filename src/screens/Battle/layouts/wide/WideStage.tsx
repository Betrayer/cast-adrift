import type { ReactNode } from 'react';
import styles from './Wide.module.css';

interface WideStageProps {
  left: ReactNode;
  centre: ReactNode;
  right: ReactNode;
  arena?: 'capped' | 'wide';
}

export const WideStage = ({
  left,
  centre,
  right,
  arena = 'capped',
}: WideStageProps) => (
  <div
    className={`${styles.stage ?? ''} ${
      arena === 'wide' ? styles.stageWide ?? '' : ''
    }`}
    data-battle-wide={arena}
  >
    <aside className={styles.gutter} data-gutter="left">
      {left}
    </aside>
    <div className={styles.centre} data-gutter="centre">
      {centre}
    </div>
    <aside className={styles.gutter} data-gutter="right">
      {right}
    </aside>
  </div>
);

export const WideRail = ({ children }: { children: ReactNode }) => (
  <div className={styles.rail} data-wide-rail>
    {children}
  </div>
);

export const WideCentre = ({
  body,
  foot,
}: {
  body: ReactNode;
  foot?: ReactNode;
}) => (
  <>
    <div className={styles.centreBody}>{body}</div>
    {foot === undefined ? null : (
      <div className={styles.centreFoot}>{foot}</div>
    )}
  </>
);
