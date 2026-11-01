import { useMemo, type CSSProperties } from 'react';
import { deviceTier } from '@/app/deviceTier';
import { legendaryFx, PARTICLE_KIND, particleSeeds } from '@/app/legendaryFx';
import { useReducedMotion } from '@/stores/settingsStore';
import type { School } from '@/types/content';
import styles from './LegendaryAura.module.css';

interface Props {
  defId: string;
  school: School;
}

export const auraHostClass = styles.host ?? '';

export const LegendaryAura = ({ defId, school }: Props) => {
  const reduced = useReducedMotion();
  const fx = legendaryFx({ reduced, tier: deviceTier(), surface: 'dom' });
  const seeds = useMemo(() => particleSeeds(defId, fx.particles), [defId, fx.particles]);
  const kind = PARTICLE_KIND[school];
  return (
    <span
      className={styles.aura}
      data-aura={school}
      data-aura-motion={fx.motion ? 'live' : 'still'}
      data-aura-particles={seeds.length}
      aria-hidden
    >
      <span className={styles.glow} />
      <span className={styles.accent} />
      {seeds.map((seed, index) => (
        <span
          key={index}
          className={styles.particle}
          data-kind={kind}
          style={
            {
              '--px': `${String(Math.round(50 + seed.x * 48))}%`,
              '--py': `${String(Math.round(50 + seed.y * 48))}%`,
              '--pa': `${String(Math.round(seed.angle))}deg`,
              '--pdx': `${String(Math.round(seed.drift * 8))}px`,
              '--pd': `${String(seed.durationMs)}ms`,
              '--pdl': `${String(-seed.delayMs)}ms`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
};