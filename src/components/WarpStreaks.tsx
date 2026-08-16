import { useMemo } from 'react';
import styles from './WarpStreaks.module.css';

interface Props {
  color: string;
  count?: number;
  durationMs?: number;
}

// The sector-jump warp, extracted so the battle-enter transition is literally
// the same effect rather than a second one that looks almost like it.
export const WarpStreaks = ({ color, count = 18, durationMs }: Props) => {
  const streaks = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        angle: (i / count) * 360 + (i % 3) * 7,
        delay: (i % 6) * 40,
      })),
    [count],
  );

  return (
    <div
      className={styles.warp}
      data-warp
      style={
        durationMs === undefined
          ? undefined
          : ({ '--ca-warp-ms': `${String(durationMs)}ms` } as React.CSSProperties)
      }
    >
      {streaks.map((streak) => (
        <span
          key={streak.angle}
          className={styles.streak}
          style={{
            background: color,
            transform: `rotate(${String(streak.angle)}deg)`,
            animationDelay: `${String(streak.delay)}ms`,
          }}
        />
      ))}
    </div>
  );
};
