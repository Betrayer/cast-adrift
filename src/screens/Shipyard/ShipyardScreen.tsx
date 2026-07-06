import {
  Button,
  Divider,
  Group,
  Paper,
  ScrollArea,
  Slider,
  Stack,
  Text,
} from "@mantine/core";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { DIE_BY_ID } from "@/data/dice";
import { fusionTarget } from "@/data/dice/fusion";
import { SHIP_BY_ID } from "@/data/ships";
import { slotCapForMk, type MkLevel } from "@/data/slots";
import { FUSION_COST, mkUpgradeCost } from "@/game/economy/prices";
import { autosaveRun, completeNode } from "@/game/run/flow";
import { useRunStore } from "@/stores/runStore";
import type { SlotId } from "@/types/battle";

export const ShipyardScreen = () => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const scrap = useRunStore((s) => s.scrap);
  const hull = useRunStore((s) => s.hull);
  const hullMax = useRunStore((s) => s.hullMax);
  const mkLevels = useRunStore((s) => s.mkLevels);
  const deck = useRunStore((s) => s.deck);
  const [repair, setRepair] = useState(0);

  const ship = SHIP_BY_ID.get("wanderer");
  const slotIds = useMemo(
    () => (ship ? (Object.keys(ship.slots) as SlotId[]) : []),
    [ship],
  );

  const fusable = useMemo(() => {
    const groups = new Map<string, number>();
    for (const die of deck) {
      if (fusionTarget(die.defId) !== undefined) {
        groups.set(die.defId, (groups.get(die.defId) ?? 0) + 1);
      }
    }
    return [...groups.entries()].filter(([, count]) => count >= 2);
  }, [deck]);

  const maxRepair = Math.min(hullMax - hull, Math.floor(scrap / 2));

  const buyMk = (slotId: SlotId): void => {
    const state = useRunStore.getState();
    const current = state.mkLevels[slotId] ?? 1;
    if (current >= 3) return;
    const target = (current + 1) as Exclude<MkLevel, 1>;
    const cost = mkUpgradeCost(target);
    if (state.scrap < cost) return;
    if (!state.spendScrap(cost)) return;
    state.bumpMk(slotId);
    autosaveRun();
  };

  const fuse = (defId: string): void => {
    const state = useRunStore.getState();
    const target = fusionTarget(defId);
    if (target === undefined || state.scrap < FUSION_COST) return;
    const [first, second] = state.deck.filter((d) => d.defId === defId);
    if (first === undefined || second === undefined) return;
    if (!state.spendScrap(FUSION_COST)) return;
    state.removeDie(first.uid);
    state.removeDie(second.uid);
    state.addDie(target);
    autosaveRun();
  };

  const doRepair = (): void => {
    const state = useRunStore.getState();
    if (repair <= 0 || state.scrap < repair * 2) return;
    if (!state.spendScrap(repair * 2)) return;
    state.healHull(repair);
    autosaveRun();
    setRepair(0);
  };

  return (
    <Stack mih="100dvh" p="md" gap="sm" bg={tokens.bg}>
      <Group justify="space-between">
        <Text fw={600} c={tokens.text}>
          {t("run:shipyard.title")}
        </Text>
        <Group gap="xs">
          <Text size="sm" c={tokens.amber}>
            {t("run:shipyard.scrap", { n: scrap })}
          </Text>
          <Text size="sm" c={tokens.dim}>
            {t("run:shipyard.hull", { cur: hull, max: hullMax })}
          </Text>
        </Group>
      </Group>

      <Divider color={tokens.line} label={t("run:shipyard.systems")} />
      <ScrollArea.Autosize mah={260}>
        <Stack gap={6}>
          {slotIds.map((slotId) => {
            const mk = mkLevels[slotId] ?? 1;
            const maxed = mk >= 3;
            const target = maxed ? 3 : ((mk + 1) as Exclude<MkLevel, 1>);
            const cost = maxed ? 0 : mkUpgradeCost(target);
            return (
              <Paper key={slotId} bg={tokens.surface1} p="xs" radius="md" withBorder>
                <Group justify="space-between" wrap="nowrap">
                  <Stack gap={0}>
                    <Text size="sm" c={tokens.text}>
                      {t(`battle:slot.${slotId}`)}
                    </Text>
                    <Text size="xs" c={tokens.faint}>
                      {t("battle:slot.cap", {
                        cap: slotCapForMk(slotId, mk),
                        mk,
                      })}
                    </Text>
                  </Stack>
                  <Button
                    size="compact-sm"
                    disabled={maxed || scrap < cost}
                    onClick={() => {
                      buyMk(slotId);
                    }}
                  >
                    {maxed
                      ? t("run:shipyard.mkMax")
                      : t("run:shipyard.mk", { mk: target, cost })}
                  </Button>
                </Group>
              </Paper>
            );
          })}
        </Stack>
      </ScrollArea.Autosize>

      <Divider color={tokens.line} label={t("run:shipyard.fusionTitle")} />
      {fusable.length === 0 ? (
        <Text size="xs" c={tokens.faint}>
          {t("run:shipyard.fusionHint")}
        </Text>
      ) : (
        <Group gap="xs">
          {fusable.map(([defId]) => {
            const def = DIE_BY_ID.get(defId);
            const target = fusionTarget(defId);
            const targetDef = target ? DIE_BY_ID.get(target) : undefined;
            if (def === undefined || targetDef === undefined) return null;
            return (
              <Button
                key={defId}
                size="compact-sm"
                variant="light"
                disabled={scrap < FUSION_COST}
                onClick={() => {
                  fuse(defId);
                }}
              >
                {`${t(def.name)} → ${t(targetDef.name)} (${String(FUSION_COST)})`}
              </Button>
            );
          })}
        </Group>
      )}

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
        label={(v) => `+${String(v)} · ${String(v * 2)}`}
      />
      <Button
        variant="default"
        disabled={repair <= 0 || repair > maxRepair}
        onClick={doRepair}
      >
        {`${t("run:shipyard.repair")} +${String(repair)} (${String(repair * 2)})`}
      </Button>

      <Button
        size="md"
        mt="auto"
        onClick={() => {
          completeNode({ outcome: "cleared" });
        }}
      >
        {t("run:shipyard.leave")}
      </Button>
    </Stack>
  );
};
