import { Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { cx } from "@/app/cx";
import { tokens } from "@/app/theme";
import { cargoDef, cargoDescVars, cargoPayout } from "@/data/cargo";
import { sectorDef } from "@/data/sectors";
import type { MapGraph } from "@/game/map/types";
import { cargoRowsLeft } from "@/game/run/cargo";
import { TIDE_HP_PCT } from "@/game/run/encounter";
import type { RunModifier } from "@/game/run/weather";
import { AxisMeter } from "@/components/AxisMeter";
import { TapPopover } from "@/components/TapPopover";
import type { RunCargo } from "@/stores/runStore";
import { MapShortcuts } from "./MapShortcuts";
import styles from "./MapScreen.module.css";

interface MapHeaderProps {
  map: MapGraph;
  sector: number;
  positionRow: number;
  axis: number;
  wide: boolean;
  hull: number;
  hullMax: number;
  scrap: number;
  tide: number;
  tidePulse: boolean;
  interference: number;
  modifiers: readonly RunModifier[];
  deliveries: readonly RunCargo[];
  moduleCount: number;
  moduleCap: number;
  moduleNames: string;
}

export const MapHeader = ({
  map,
  sector,
  positionRow,
  axis,
  wide,
  hull,
  hullMax,
  scrap,
  tide,
  tidePulse,
  interference,
  modifiers,
  deliveries,
  moduleCount,
  moduleCap,
  moduleNames,
}: MapHeaderProps) => {
  const { t } = useTranslation(["run", "common", "battle", "content"]);
  const sectorInfo = sectorDef(sector);

  const modifierChipLabel =
    modifiers.length === 1 && modifiers[0] !== undefined
      ? t(modifiers[0].name)
      : t("run:map.conditions", { n: modifiers.length });

  const firstDelivery = deliveries[0];
  const cargoChipLabel =
    deliveries.length === 1 && firstDelivery !== undefined
      ? t("run:map.cargo", {
          n: cargoRowsLeft(map, firstDelivery, positionRow),
        })
      : t("run:map.cargoMany", { n: deliveries.length });

  const modulesLabel = t("run:map.modules", {
    used: moduleCount,
    max: moduleCap,
  });

  return (
    <div className={styles.header}>
      <div className={styles.headTitle}>
        <Text fw={600} c={sectorInfo.accent}>
          {t("run:map.title", {
            n: sector,
            name: t(sectorInfo.name),
          })}
        </Text>
        <Text size="xs" c={tokens.faint}>
          {t("run:map.depth", { cur: positionRow, max: map.shape.bossRow })}
        </Text>
      </div>
      <div className={styles.headChips}>
        <AxisMeter axis={axis} compact withLabel={false} explain />
        {wide ? null : <MapShortcuts />}
        <span className={styles.tideChip ?? ""} data-map-hull>
          {t("run:map.hull", { cur: hull, max: hullMax })}
        </span>
        <span className={styles.tideChip ?? ""} data-map-scrap>
          {t("run:map.scrap", { n: scrap })}
        </span>
        <TapPopover
          label={t("battle:tideTitle")}
          testId="map-tide"
          align="end"
          content={
            <>
              <b>{t("battle:tideTitle")}</b>
              <br />
              {t("battle:tideWhy", { n: tide, pct: tide * TIDE_HP_PCT })}
            </>
          }
        >
          <span className={cx(styles.tideChip, tidePulse && styles.tidePulse)}>
            {t("run:map.tide", { n: tide })}
          </span>
        </TapPopover>
        {interference > 0 ? (
          <TapPopover
            label={t("battle:interferenceTitle")}
            testId="map-interference"
            align="end"
            content={
              <>
                <b>{t("battle:interferenceTitle")}</b>
                <br />
                {t("battle:interferenceWhy")}
              </>
            }
          >
            <span className={styles.tideChip ?? ""}>
              {t("run:map.interference", { n: interference })}
            </span>
          </TapPopover>
        ) : null}
        {modifiers.length === 0 ? null : (
          <TapPopover
            label={t("run:weather.title")}
            testId="map-modifiers"
            align="end"
            content={
              <>
                <b>{t("run:weather.title")}</b>
                {modifiers.map((mod) => (
                  <span key={mod.id} className={styles.modLine}>
                    {t(mod.name)} — {t(mod.desc)}
                  </span>
                ))}
              </>
            }
          >
            <span className={styles.modChip ?? ""} data-map-modifiers>
              {modifierChipLabel}
            </span>
          </TapPopover>
        )}
        {deliveries.length === 0 ? null : (
          <TapPopover
            label={t("run:cargo.title")}
            testId="map-cargo"
            align="end"
            content={
              <>
                <b>{t("run:cargo.title")}</b>
                {deliveries.map((held) => {
                  const def = cargoDef(held.defId);
                  return def === undefined ? null : (
                    <span key={held.defId} className={styles.modLine}>
                      {t(def.name)} — {t(def.desc, cargoDescVars(def))} ·{" "}
                      {t("run:cargo.rows", {
                        n: cargoRowsLeft(map, held, positionRow),
                      })}
                      {" · "}
                      {t("run:cargo.payout", {
                        n: cargoPayout(def, sectorInfo.scrapMult),
                      })}
                    </span>
                  );
                })}
              </>
            }
          >
            <span className={styles.modChip ?? ""} data-map-cargo>
              {cargoChipLabel}
            </span>
          </TapPopover>
        )}
        {moduleCount > 0 ? (
          <TapPopover
            label={modulesLabel}
            testId="map-modules"
            align="end"
            content={moduleNames}
          >
            <span className={styles.tideChip ?? ""}>{modulesLabel}</span>
          </TapPopover>
        ) : null}
      </div>
    </div>
  );
};
