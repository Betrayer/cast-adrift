import { useEffect, useState } from 'react';
import { tokens } from '@/app/theme';
import { readPerf, type PerfSnapshot } from '@/pixi/perf';

const isPerfDebug = (): boolean =>
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('perf') === '1';

const EMPTY: PerfSnapshot = {
  fps: 0,
  objects: 0,
  textures: 0,
  textureMb: 0,
  poolUsed: 0,
  poolSize: 0,
};

export const PerfOverlay = () => {
  const [snapshot, setSnapshot] = useState<PerfSnapshot>(EMPTY);
  const enabled = isPerfDebug();

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      setSnapshot(readPerf());
    }, 500);
    return () => {
      window.clearInterval(id);
    };
  }, [enabled]);

  if (!enabled) return null;

  const rows: [string, string][] = [
    ['fps', String(snapshot.fps)],
    ['objects', String(snapshot.objects)],
    ['textures', `${String(snapshot.textures)} · ${snapshot.textureMb.toFixed(1)} MB`],
    ['pools', `${String(snapshot.poolUsed)}/${String(snapshot.poolSize)}`],
  ];

  return (
    <div
      style={{
        position: 'fixed',
        right: 8,
        bottom: 8,
        zIndex: 'var(--z-dev)',
        padding: '6px 8px',
        borderRadius: 8,
        border: `1px solid ${tokens.line}`,
        background: 'rgba(0,0,0,0.72)',
        color: tokens.dim,
        fontSize: 11,
        fontFamily: 'monospace',
        minWidth: 138,
      }}
    >
      <div style={{ fontWeight: 700, color: tokens.text }}>perf</div>
      {rows.map(([label, value]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{label}</span>
          <span>{value}</span>
        </div>
      ))}
    </div>
  );
};
