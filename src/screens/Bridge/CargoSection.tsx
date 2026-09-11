import { Button, Paper, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cargoDef, cargoDescVars, cargoPayout } from "@/data/cargo";
import { sectorDef } from "@/data/sectors";
import { nodeById } from "@/game/map/types";
import { dropCargo } from "@/game/run/cargo";
import { autosaveRun } from "@/game/run/flow";
import { playSfx } from "@/services/audio";
import { haptic } from "@/services/tma";
import { runCargoHold, useRunStore } from "@/stores/runStore";
import { cargoRows, emptyHoldSlots } from "./bridgeRows";
import styles from "./BridgeScreen.module.css";

export const CargoSection = () => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const held = useRunStore((s) => s.cargo);
  const hold = useRunStore(runCargoHold);
  const sector = useRunStore((s) => s.sector);
  const map = useRunStore((s) => s.map);
  const position = useRunStore((s) => s.position);
  const depthRow = useRunStore((s) => s.depthRow);
  const [dropping, setDropping] = useState<string | null>(null);

  const positionRow =
    map === null || position === null
      ? depthRow
      : (nodeById(map).get(position)?.row ?? depthRow);
  const scrapMult = sectorDef(sector).scrapMult;
  const rows = cargoRows(held, map, positionRow, scrapMult);
  const droppingDef = dropping === null ? undefined : cargoDef(dropping);

  const confirmDrop = (): void => {
    if (dropping === null) return;
    const done = dropCargo(dropping);
    setDropping(null);
    if (!done) return;
    playSfx("buy");
    haptic("purchase");
    autosaveRun();
  };

  return (
    <Paper
      bg={tokens.surface1}
      p="sm"
      radius="md"
      withBorder
      data-bridge-section="cargo"
    >
      <Stack gap={6}>
        <Text size="sm" fw={600} c={tokens.text}>
          {t("run:bridge.cargoTitle", { used: rows.length, max: hold })}
        </Text>
        {rows.map((row) => (
          <div
            key={row.def.id}
            className={styles.cargoRow}
            data-bridge-cargo={row.def.id}
          >
            <Text size="sm" fw={600} c={tokens.text}>
              {t(row.def.name)}
            </Text>
            <Text size="xs" c={tokens.dim}>
              {t(row.def.desc, cargoDescVars(row.def))}
            </Text>
            <Text size="xs" c={tokens.faint} data-bridge-cargo-terms>
              {t("run:bridge.cargoTerms", { rows: row.rows, n: row.payout })}
            </Text>
            <Button
              size="compact-sm"
              variant="light"
              color="gray"
              data-testid={`bridge-drop-${row.def.id}`}
              onClick={() => {
                setDropping(row.def.id);
              }}
            >
              {t("run:bridge.dropCargo")}
            </Button>
          </div>
        ))}
        {Array.from({ length: emptyHoldSlots(held, hold) }, (_, index) => (
          <div
            key={`hold-${String(index)}`}
            className={styles.cargoEmpty}
            data-bridge-cargo-empty={index}
          >
            <Text size="xs" c={tokens.faint}>
              {t("run:bridge.cargoEmpty")}
            </Text>
          </div>
        ))}
      </Stack>
      <ConfirmDialog
        opened={droppingDef !== undefined}
        testId="bridge-drop"
        title={t("run:bridge.dropTitle")}
        body={t(
          droppingDef?.drawback === "axisShift"
            ? "run:bridge.dropBodyAxis"
            : "run:bridge.dropBody",
          {
            name: droppingDef === undefined ? "" : t(droppingDef.name),
            n:
              droppingDef === undefined
                ? 0
                : cargoPayout(droppingDef, scrapMult),
          },
        )}
        cancelLabel={t("run:bridge.dropNo")}
        confirmLabel={t("run:bridge.dropYes")}
        onCancel={() => {
          setDropping(null);
        }}
        onConfirm={confirmDrop}
      />
    </Paper>
  );
};
