import type { CSSProperties } from 'react';
import { MOTION_MS } from '@/app/motion';
import { contractDef } from '@/data/contracts';
import { CAMPAIGN_SECTORS, SECTORS, sectorDef } from '@/data/sectors';
import type { RunMode } from '@/stores/runStore';
import styles from './SectorLadder.module.css';

const VIEW_W = 240;
const VIEW_H = 24;
const PAD = 12;
const PIP_R = 5;
const MID_Y = VIEW_H / 2;

export type RoutePipState = 'cleared' | 'ended' | 'open';

export interface SectorRoute {
  total: number;
  from: number;
  to: number;
  win: boolean;
}

export interface RouteSource {
  sectorIndex: number;
  crossedThreshold: boolean;
  mode: RunMode;
  contractId: string | null;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Math.round(value)));

export const summaryRoute = (run: RouteSource, win: boolean): SectorRoute => {
  const total = run.crossedThreshold ? SECTORS.length : CAMPAIGN_SECTORS;
  const start =
    run.mode === 'contract' ? (contractDef(run.contractId)?.setup.sector ?? 1) : 1;
  const to = clamp(run.sectorIndex, 1, total);
  return { total, from: clamp(start, 1, to), to, win };
};

export const routePipState = (route: SectorRoute, sector: number): RoutePipState => {
  if (sector < route.from || sector > route.to) return 'open';
  return sector === route.to && !route.win ? 'ended' : 'cleared';
};

const pipX = (total: number, sector: number): number =>
  total <= 1 ? VIEW_W / 2 : PAD + ((sector - 1) * (VIEW_W - PAD * 2)) / (total - 1);

const pipStyle = (route: SectorRoute, sector: number): CSSProperties => {
  const span = route.to - route.from;
  const along = span <= 0 ? 0 : (sector - route.from) / span;
  return {
    '--ca-pip-color': sectorDef(sector).accent,
    '--ca-pip-delay': `${String(Math.round(Math.max(0, along) * MOTION_MS.xl))}ms`,
  } as CSSProperties;
};

export const SectorLadder = ({
  route,
  label,
}: {
  route: SectorRoute;
  label: string;
}) => {
  const sectors = Array.from({ length: route.total }, (_, index) => index + 1);
  const reached = Math.max(0, route.to - route.from + 1);
  return (
    <svg
      className={styles.ladder}
      viewBox={`0 0 ${String(VIEW_W)} ${String(VIEW_H)}`}
      width="100%"
      height={VIEW_H}
      role="img"
      aria-label={label}
      data-summary-route
      data-route-pips={route.total}
      data-route-reached={reached}
    >
      <path
        className={styles.track}
        d={`M ${String(pipX(route.total, 1))} ${String(MID_Y)} H ${String(pipX(route.total, route.total))}`}
      />
      {route.to > route.from ? (
        <path
          className={styles.stroke}
          d={`M ${String(pipX(route.total, route.from))} ${String(MID_Y)} H ${String(pipX(route.total, route.to))}`}
          pathLength={1}
          data-route-stroke
        />
      ) : null}
      {sectors.map((sector) => (
        <circle
          key={sector}
          className={styles.pip}
          cx={pipX(route.total, sector)}
          cy={MID_Y}
          r={PIP_R}
          style={pipStyle(route, sector)}
          data-route-pip={sector}
          data-route-state={routePipState(route, sector)}
        />
      ))}
    </svg>
  );
};
