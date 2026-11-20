import { memo } from 'react';
import { CHART_EDGES, CHART_NODES } from '@/data/chart';
import { layoutChart } from '@/game/chart/layouts';
import { constellationColor } from '@/screens/Chart/chartPresentation';
import type { ChartLayoutId } from '@/types';

const DOT_UNITS = 9;

export const ChartLayoutThumb = memo(({ id, size }: { id: ChartLayoutId; size: number }) => {
  const layout = layoutChart(CHART_NODES, id);
  const { bounds } = layout;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`${String(bounds.x)} ${String(bounds.y)} ${String(bounds.w)} ${String(bounds.h)}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
      data-chart-thumb={id}
    >
      {CHART_EDGES.map(([from, to]) => {
        const a = layout.pos.get(from.id);
        const b = layout.pos.get(to.id);
        if (a === undefined || b === undefined) return null;
        return (
          <line
            key={`${from.id}|${to.id}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={constellationColor(to.constellation).stroke}
            strokeWidth={4}
            opacity={0.45}
          />
        );
      })}
      {CHART_NODES.map((node) => {
        const point = layout.pos.get(node.id);
        if (point === undefined) return null;
        return (
          <circle
            key={node.id}
            cx={point.x}
            cy={point.y}
            r={node.kind === 'small' ? DOT_UNITS : DOT_UNITS * 1.6}
            fill={constellationColor(node.constellation).stroke}
          />
        );
      })}
    </svg>
  );
});

ChartLayoutThumb.displayName = 'ChartLayoutThumb';
