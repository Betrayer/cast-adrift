import { useEffect, useRef } from 'react';
import { hexToRgb } from '@/app/color';
import { createStream, deriveSeed } from '@/services/rng';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
}

interface Props {
  color: string;
  count?: number;
  durationMs?: number;
  seedLabel?: string;
  className?: string;
}

const GRAVITY = 0.00022;

export const ParticleRain = ({
  color,
  count = 90,
  durationMs = 2600,
  seedLabel = 'particleRain',
  className,
}: Props) => {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (document.documentElement.dataset.caMotion === 'reduced') return;
    const canvas = ref.current;
    if (canvas === null) return;
    const ctx = canvas.getContext('2d');
    if (ctx === null) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.scale(dpr, dpr);

    const rng = createStream(deriveSeed(0, seedLabel));
    const particles: Particle[] = Array.from({ length: count }, () => ({
      x: rng.next() * w,
      y: (rng.next() * 1.3 - 0.3) * h,
      vx: (rng.next() - 0.5) * 0.06,
      vy: 0.12 + rng.next() * 0.22,
      life: 0.5 + rng.next() * 0.5,
      size: 1.5 + rng.next() * 2.5,
    }));
    const rgb = hexToRgb(color);
    const rgbCss = `${String(Math.round(rgb.r * 255))}, ${String(
      Math.round(rgb.g * 255),
    )}, ${String(Math.round(rgb.b * 255))}`;

    let raf = 0;
    let last = 0;
    let elapsed = 0;
    const frame = (now: number): void => {
      const dt = last === 0 ? 16 : Math.min(48, now - last);
      last = now;
      elapsed += dt;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.vy += GRAVITY * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y > h) {
          p.y = -6;
          p.x = rng.next() * w;
          p.vy = 0.12 + rng.next() * 0.22;
        }
        const fade = Math.max(0, 1 - elapsed / durationMs) * p.life;
        ctx.fillStyle = `rgba(${rgbCss}, ${String(fade)})`;
        ctx.fillRect(p.x, p.y, p.size, p.size * 2.2);
      }
      if (elapsed < durationMs) raf = window.requestAnimationFrame(frame);
    };
    raf = window.requestAnimationFrame(frame);
    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [color, count, durationMs, seedLabel]);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
};
