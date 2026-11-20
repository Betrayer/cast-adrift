import { useTranslation } from 'react-i18next';
import { tokens } from '@/app/theme';
import { schools } from '@/data/schools';
import { fmtPoint, type ChartDecor, type ChartLayout, type Point } from '@/game/chart/layouts';
import type { ChartGlow } from '@/game/chart/layouts/glow';
import styles from './ChartScreen.module.css';

const LABEL_UNITS = 22;
const BEAM_HALF_WIDTH = 9;

const pathOf = (points: readonly Point[]): string =>
  points.map((point, index) => `${index === 0 ? 'M' : 'L'}${fmtPoint(point)}`).join(' ');

interface Props {
  layout: ChartLayout;
  glow: ChartGlow;
  flashKey: number | null;
}

const DecorItem = ({
  item,
  glow,
  flashKey,
}: {
  item: ChartDecor;
  glow: ChartGlow;
  flashKey: number | null;
}) => {
  const { t } = useTranslation(['meta']);
  switch (item.kind) {
    case 'orbit':
      return (
        <ellipse
          cx={item.centre.x}
          cy={item.centre.y}
          rx={item.rx}
          ry={item.ry}
          fill="none"
          stroke={tokens.line}
          strokeWidth={item.major ? 1.6 : 1}
          strokeDasharray={item.major ? undefined : '4 9'}
          opacity={0.7}
        />
      );
    case 'wedge':
      return (
        <path
          d={item.path}
          fill={schools[item.school].stroke}
          opacity={glow.schools[item.school] * 0.55}
          data-chart-decor="wedge"
          data-school={item.school}
        />
      );
    case 'dust':
      return (
        <g data-chart-decor="dust" data-school={item.school}>
          <path
            d={pathOf(item.points)}
            fill="none"
            stroke={schools[item.school].stroke}
            strokeWidth={30}
            strokeLinecap="round"
            opacity={glow.schools[item.school] * 0.8}
          />
          <path
            d={pathOf(item.points)}
            fill="none"
            stroke={schools[item.school].stroke}
            strokeWidth={1.2}
            strokeDasharray="2 8"
            opacity={0.22}
          />
        </g>
      );
    case 'figure':
      return (
        <line
          x1={item.from.x}
          y1={item.from.y}
          x2={item.to.x}
          y2={item.to.y}
          stroke={schools[item.school].stroke}
          strokeWidth={1}
          opacity={0.1 + glow.schools[item.school] * 1.4}
          data-chart-decor="figure"
        />
      );
    case 'meridian':
      return (
        <line
          x1={item.from.x}
          y1={item.from.y}
          x2={item.to.x}
          y2={item.to.y}
          stroke={tokens.line}
          strokeWidth={0.8}
          opacity={0.5}
        />
      );
    case 'label':
      return (
        <text
          className={styles.clusterLabel}
          x={item.at.x}
          y={item.at.y}
          textAnchor="middle"
          fontSize={LABEL_UNITS}
          fill={schools[item.school].stroke}
          opacity={0.45 + glow.schools[item.school] * 1.5}
          data-chart-decor="label"
          data-school={item.school}
        >
          {t(`meta:constellation.${item.school}`)}
        </text>
      );
    case 'spike':
      return (
        <g className={styles.twinkle} opacity={0.75}>
          <line
            x1={item.at.x - item.size}
            y1={item.at.y}
            x2={item.at.x + item.size}
            y2={item.at.y}
            stroke={schools[item.school].stroke}
            strokeWidth={1.2}
          />
          <line
            x1={item.at.x}
            y1={item.at.y - item.size}
            x2={item.at.x}
            y2={item.at.y + item.size}
            stroke={schools[item.school].stroke}
            strokeWidth={1.2}
          />
        </g>
      );
    case 'thread':
      return (
        <path
          className={styles.dashflow}
          d={`M${fmtPoint(item.from)} Q${fmtPoint(item.via)} ${fmtPoint(item.to)}`}
          fill="none"
          stroke={tokens.line}
          strokeWidth={1.4}
          strokeDasharray="3 7"
        />
      );
    case 'beam':
      return (
        <g transform={`translate(${String(item.at.x)} ${String(item.at.y)})`}>
          <g
            className={styles.beam}
            data-chart-decor="beam"
            data-flash={flashKey === null ? undefined : '1'}
          >
            <g
              key={flashKey ?? 'idle'}
              className={flashKey === null ? undefined : styles.beamFlash}
            >
              <path
                d={`M0,0 L${String(-BEAM_HALF_WIDTH)},${String(-item.length)} L${String(BEAM_HALF_WIDTH)},${String(-item.length)} Z`}
                fill="url(#chart-beam)"
              />
              <path
                d={`M0,0 L${String(-BEAM_HALF_WIDTH)},${String(item.length)} L${String(BEAM_HALF_WIDTH)},${String(item.length)} Z`}
                fill="url(#chart-beam-down)"
              />
            </g>
          </g>
        </g>
      );
  }
};

export const ChartDecorLayer = ({ layout, glow, flashKey }: Props) => (
  <g
    key={layout.id}
    className={styles.decor}
    data-chart-decor-layer={layout.id}
    pointerEvents="none"
  >
    <defs>
      <linearGradient id="chart-beam" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor={tokens.accent} stopOpacity={0.4} />
        <stop offset="1" stopColor={tokens.accent} stopOpacity={0} />
      </linearGradient>
      <linearGradient id="chart-beam-down" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={tokens.accent} stopOpacity={0.4} />
        <stop offset="1" stopColor={tokens.accent} stopOpacity={0} />
      </linearGradient>
    </defs>
    {layout.decor.map((item, index) => (
      <DecorItem key={index} item={item} glow={glow} flashKey={flashKey} />
    ))}
  </g>
);
