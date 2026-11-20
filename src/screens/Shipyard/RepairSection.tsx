import { Button, Divider, Slider, Text } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { REPAIR_PER_HULL, repairCost } from "@/game/economy/prices";
import { autosaveRun } from "@/game/run/flow";
import { useRunStore } from "@/stores/runStore";

export const RepairSection = () => {
  const { t } = useTranslation(["run"]);
  const scrap = useRunStore((s) => s.scrap);
  const hull = useRunStore((s) => s.hull);
  const hullMax = useRunStore((s) => s.hullMax);
  const [repair, setRepair] = useState(0);

  const maxRepair = Math.min(
    hullMax - hull,
    Math.floor(scrap / REPAIR_PER_HULL),
  );

  const doRepair = (): void => {
    const state = useRunStore.getState();
    if (repair <= 0) return;
    if (!state.spendScrap(repairCost(repair))) return;
    state.healHull(repair);
    autosaveRun();
    setRepair(0);
  };

  return (
    <>
      <Divider color={tokens.line} label={t("run:shipyard.repair")} />
      <Text size="xs" c={tokens.faint}>
        {t("run:shipyard.repairHint")}
      </Text>
      <Slider
        min={0}
        max={Math.max(0, maxRepair)}
        value={Math.min(repair, Math.max(0, maxRepair))}
        onChange={setRepair}
        disabled={maxRepair <= 0}
        label={(v) => `+${String(v)} · ${String(repairCost(v))}`}
      />
      <Button
        variant="default"
        disabled={repair <= 0 || repair > maxRepair}
        onClick={doRepair}
      >
        {`${t("run:shipyard.repair")} +${String(repair)} (${String(repairCost(repair))})`}
      </Button>
    </>
  );
};
