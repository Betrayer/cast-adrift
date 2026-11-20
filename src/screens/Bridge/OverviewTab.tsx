import { Badge, Group, Paper, Stack, Text } from "@mantine/core";
import { useMemo, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { riseStyle } from "@/app/motion";
import { tokens } from "@/app/theme";
import { ShipSilhouette } from "@/components/ShipSilhouette";
import { shipModelPins, useShipModel } from "@/components/shipModel";
import { SHIP_BY_ID, shipPassiveText } from "@/data/ships";
import { passiveTierFor } from "@/game/battle/passives";
import { runSlotStates } from "@/game/run/battleInit";
import { runModuleSlots, useRunStore } from "@/stores/runStore";
import type { SlotId } from "@/types/battle";
import { CabinsSection } from "./CabinsSection";
import { CargoSection } from "./CargoSection";
import { RowChevron } from "./RowChevron";
import type { BridgePanelProps } from "./bridgeFocus";
import styles from "./BridgeScreen.module.css";

const PIN_PHASE_VAR = "--ca-pin-phase";

const pinPhaseStyle = (index: number): CSSProperties =>
  ({ [PIN_PHASE_VAR]: String(index) }) as CSSProperties;

export const OverviewTab = ({ onOpenSlot }: BridgePanelProps) => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const shipId = useRunStore((s) => s.shipId);
  const mkLevels = useRunStore((s) => s.mkLevels);
  const chartPicks = useRunStore((s) => s.chartPicks);
  const mutators = useRunStore((s) => s.mutators);
  const cargo = useRunStore((s) => s.cargo);
  const contractId = useRunStore((s) => s.contractId);
  const perks = useRunStore((s) => s.perks);
  const hull = useRunStore((s) => s.hull);
  const hullMax = useRunStore((s) => s.hullMax);
  const scrap = useRunStore((s) => s.scrap);
  const modules = useRunStore((s) => s.modules);
  const bays = useRunStore(runModuleSlots);
  const masteryRank = useRunStore((s) => s.masteryRank);
  const model = useShipModel(shipId);
  const def = SHIP_BY_ID.get(shipId);
  const fightSlots = useMemo(
    () =>
      runSlotStates({ shipId, mkLevels, chartPicks, mutators, cargo, contractId, perks }),
    [shipId, mkLevels, chartPicks, mutators, cargo, contractId, perks],
  );
  if (def === undefined) return null;
  const passiveText = shipPassiveText(def, passiveTierFor(masteryRank));
  const slotIds = Object.keys(def.slots) as SlotId[];
  const systems = slotIds.map((slotId) => {
    const mk = mkLevels[slotId] ?? def.slots[slotId]?.mk ?? 1;
    const cap = fightSlots[slotId]?.cap ?? null;
    return {
      slotId,
      mk,
      cap,
      name: t(`battle:slot.${slotId}`),
      capLabel:
        cap === null
          ? t("run:bridge.sheet.pinOff")
          : t("battle:slot.pin", { cap, mk }),
    };
  });
  const anchors = model === null ? {} : shipModelPins(model);
  const pins = systems.flatMap((system) => {
    const point = anchors[system.slotId];
    return point === undefined ? [] : [{ ...system, point }];
  });
  return (
    <Stack gap="sm">
      <ShipSilhouette shipId={shipId} masteryRank={masteryRank} perks={perks} pinned>
        {pins.map((pin, index) => (
          <span
            key={pin.slotId}
            className={styles.pinAnchor}
            style={pin.point}
          >
            <button
              type="button"
              className={styles.pin}
              data-bridge-pin={pin.slotId}
              data-testid={`bridge-pin-${pin.slotId}`}
              data-cap={pin.cap ?? undefined}
              data-offline={pin.cap === null ? "1" : undefined}
              data-press
              aria-label={t("run:bridge.sheet.open", { name: pin.name })}
              aria-haspopup="dialog"
              style={pinPhaseStyle(index)}
              onClick={() => {
                onOpenSlot(pin.slotId);
              }}
            >
              <span className={styles.pinName}>{pin.name}</span>
              <span className={styles.pinCap}>{pin.capLabel}</span>
            </button>
          </span>
        ))}
      </ShipSilhouette>

      <div className={styles.systems} data-bridge-systems>
        {systems.map((system, index) => (
          <button
            key={system.slotId}
            type="button"
            className={styles.system}
            data-testid={`bridge-system-${system.slotId}`}
            data-bridge-system={system.slotId}
            data-cap={system.cap ?? undefined}
            data-offline={system.cap === null ? "1" : undefined}
            data-press
            data-rise
            aria-haspopup="dialog"
            style={riseStyle(index)}
            onClick={() => {
              onOpenSlot(system.slotId);
            }}
          >
            <span className={styles.systemName}>{system.name}</span>
            <span className={styles.systemCap}>{system.capLabel}</span>
            <RowChevron className={styles.systemChevron} />
          </button>
        ))}
      </div>

      <Group gap="xs" justify="center" data-bridge-stats>
        <Badge variant="light" color="gray" data-bridge-stat="hull">
          {t("run:bridge.hull", { cur: hull, max: hullMax })}
        </Badge>
        <Badge variant="light" color="yellow" data-bridge-stat="scrap">
          {t("run:bridge.scrap", { n: scrap })}
        </Badge>
        <Badge variant="light" color="accent" data-bridge-stat="bays">
          {t("run:bridge.bays", { used: modules.length, max: bays })}
        </Badge>
      </Group>

      <Paper bg={tokens.surface1} p="sm" radius="md" withBorder>
        <Text size="sm" fw={600} c={tokens.text}>
          {passiveText.name === undefined
            ? t("battle:ship.passiveNone")
            : t(passiveText.name)}
        </Text>
        {passiveText.desc === undefined ? null : (
          <Text size="xs" c={tokens.dim}>
            {t(passiveText.desc)}
          </Text>
        )}
      </Paper>

      <CabinsSection />

      <CargoSection />
    </Stack>
  );
};
