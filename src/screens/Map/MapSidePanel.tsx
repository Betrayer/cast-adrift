import { Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { riseStyle } from "@/app/motion";
import { tokens } from "@/app/theme";
import { sectorDef } from "@/data/sectors";
import { NODE_GLYPH } from "@/game/map/types";
import type { RunModifier } from "@/game/run/weather";
import { AxisMeter } from "@/components/AxisMeter";
import { MapShortcuts } from "./MapShortcuts";
import {
  glyphColorFor,
  LEGEND_TYPES,
  MOTIF_BADGE,
  motifColor,
  type MotifLegendEntry,
} from "./nodeLook";
import styles from "./MapScreen.module.css";

interface MapSidePanelProps {
  sector: number;
  positionRow: number;
  bossRow: number;
  tide: number;
  axis: number;
  wide: boolean;
  moduleCount: number;
  moduleNames: string;
  modifiers: readonly RunModifier[];
  motifLegend: readonly MotifLegendEntry[];
  stagger: boolean;
}

export const MapSidePanel = ({
  sector,
  positionRow,
  bossRow,
  tide,
  axis,
  wide,
  moduleCount,
  moduleNames,
  modifiers,
  motifLegend,
  stagger,
}: MapSidePanelProps) => {
  const { t } = useTranslation(["run", "common", "battle", "content"]);
  return (
    <aside className={styles.sidePanel}>
      <Text fw={600} c={tokens.text}>
        {t("run:map.title", { n: sector, name: t(sectorDef(sector).name) })}
      </Text>
      <Text size="xs" c={tokens.dim}>
        {t("run:map.depth", { cur: positionRow, max: bossRow })}
      </Text>
      <Text size="xs" c={tokens.dim}>
        {t("run:map.tide", { n: tide })}
      </Text>
      <AxisMeter axis={axis} />
      {wide ? (
        <div className={styles.panelShortcuts}>
          <MapShortcuts />
        </div>
      ) : null}
      {moduleCount > 0 ? (
        <Text size="xs" c={tokens.dim}>
          {moduleNames}
        </Text>
      ) : null}
      <Text size="xs" c={tokens.faint}>
        {t("run:map.legend")}
      </Text>
      {LEGEND_TYPES.map((type, index) => (
        <div
          key={type}
          className={styles.legendRow}
          data-rise={stagger ? true : undefined}
          style={riseStyle(index)}
        >
          <span
            className={styles.legendGlyph}
            style={{ color: glyphColorFor(type) }}
          >
            {t(NODE_GLYPH[type])}
          </span>
          <Text size="xs" c={tokens.dim}>
            {t(`run:map.node.${type}`)}
          </Text>
        </div>
      ))}
      {modifiers.length === 0 ? null : (
        <>
          <Text size="xs" c={tokens.faint}>
            {t("run:weather.title")}
          </Text>
          {modifiers.map((mod, index) => (
            <div
              key={mod.id}
              className={styles.legendRow}
              data-rise={stagger ? true : undefined}
              style={riseStyle(index)}
            >
              <Text size="xs" c={tokens.dim}>
                {t(mod.name)} — {t(mod.desc)}
              </Text>
            </div>
          ))}
        </>
      )}
      {motifLegend.length === 0 ? null : (
        <>
          <Text size="xs" c={tokens.faint}>
            {t("run:motif.title")}
          </Text>
          {motifLegend.map((entry, index) => (
            <div
              key={entry.key}
              className={styles.legendRow}
              data-rise={stagger ? true : undefined}
              style={riseStyle(index)}
            >
              <span
                className={styles.legendGlyph}
                style={{ color: motifColor(entry.key) }}
              >
                {MOTIF_BADGE[entry.key]}
              </span>
              <Text size="xs" c={tokens.dim}>
                {t(`run:motif.${entry.key}`)}
              </Text>
            </div>
          ))}
        </>
      )}
    </aside>
  );
};
