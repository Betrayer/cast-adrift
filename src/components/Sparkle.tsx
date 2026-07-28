import type { CSSProperties } from 'react';
import styles from './Sparkle.module.css';

const SPARK_COUNT = 10;
const RADIUS = 46;

export interface SparkleBurst {
  key: number;
  x: number;
  y: number;
  color: string;
}

const sparkStyle = (index: number, color: string): CSSProperties => {
  const angle = (index / SPARK_COUNT) * Math.PI * 2;
  const style: Record<string, string> = {
    background: color,
    '--sx': `${String(Math.cos(angle) * RADIUS)}px`,
    '--sy': `${String(Math.sin(angle) * RADIUS)}px`,
  };
  return style as CSSProperties;
};

// A one-shot burst anchored at a screen point: used by the engraving station
// the moment a rune takes on a die. The layer stays mounted and fades itself
// out — a new burst restarts the animation by changing the React key.
export const Sparkle = ({ burst }: { burst: SparkleBurst | null }) => {
  if (burst === null) return null;
  return (
    <div className={styles.layer} key={burst.key}>
      {Array.from({ length: SPARK_COUNT }, (_, i) => (
        <span
          key={i}
          className={styles.spark}
          style={{ ...sparkStyle(i, burst.color), left: burst.x, top: burst.y }}
        />
      ))}
    </div>
  );
};
