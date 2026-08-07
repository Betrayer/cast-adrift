import {
  Button,
  Divider,
  Group,
  Paper,
  Slider,
  Stack,
  Text,
} from "@mantine/core";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Screen } from "@/app/Screen";
import { tokens } from "@/app/theme";
import { DIE_BY_ID } from "@/data/dice";
import { fusionTarget } from "@/data/dice/fusion";
import { SHIP_BY_ID } from "@/data/ships";
import { slotCapForMk, type MkLevel } from "@/data/slots";
import { keeperLinesFor } from "@/data/narrative/keeperLines";
import { FUSION_COST, mkUpgradeCost } from "@/game/economy/prices";
import { autosaveRun, completeNode } from "@/game/run/flow";
import { playSfx } from "@/services/audio";
import { createStream, deriveSeed } from "@/services/rng";
import { useRunStore } from "@/stores/runStore";
import type { SlotId } from "@/types/battle";
import styles from "./ShipyardScreen.module.css";

export const ShipyardScreen = () => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const scrap = useRunStore((s) => s.scrap);
  const hull = useRunStore((s) => s.hull);
  const hullMax = useRunStore((s) => s.hullMax);
  const mkLevels = useRunStore((s) => s.mkLevels);
  const deck = useRunStore((s) => s.deck);
  const shipId = useRunStore((s) => s.shipId);
  const shipyardDiscount = useRunStore((s) => s.shipyardDiscount);
  const vouchers = useRunStore((s) => s.vouchers);
  const seed = useRunStore((s) => s.seed);
  const position = useRunStore((s) => s.position);
  const flags = useRunStore((s) => s.flags);
  const [repair, setRepair] = useState(0);
  const [swept, setSwept] = useState<{ slotId: SlotId; key: number } | null>(
    null,
  );
  const sweepKey = useRef(0);

  const greeting = createStream(
    deriveSeed(seed, `keeper:${position ?? "yard"}`),
  ).pick(keeperLinesFor("shipyard", flags));

  const discountedMk = (target: Exclude<MkLevel, 1>): number =>
    Math.max(1, mkUpgradeCost(target) - shipyardDiscount);

  const ship = SHIP_BY_ID.get(shipId);
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

  const markUpgraded = (slotId: SlotId): void => {
    playSfx("buy");
    setSwept({ slotId, key: sweepKey.current + 1 });
    sweepKey.current += 1;
  };

  const buyMk = (slotId: SlotId): void => {
    const state = useRunStore.getState();
    const current = state.mkLevels[slotId] ?? 1;
    if (current >= 3) return;
    const target = (current + 1) as Exclude<MkLevel, 1>;
    const cost = Math.max(1, mkUpgradeCost(target) - state.shipyardDiscount);
    if (state.scrap < cost) return;
    if (!state.spendScrap(cost)) return;
    state.bumpMk(slotId);
    if (state.shipyardDiscount > 0) useRunStore.setState({ shipyardDiscount: 0 });
    markUpgraded(slotId);
    autosaveRun();
  };

  // The mini-boss Mk-voucher: one free tier at any shipyard, no scrap spent.
  const redeemVoucher = (slotId: SlotId): void => {
    const state = useRunStore.getState();
    if ((state.mkLevels[slotId] ?? 1) >= 3) return;
    if (!state.spendVoucher()) return;
    state.bumpMk(slotId);
    markUpgraded(slotId);
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
    <Screen
      width="wide"
      footer={
        <Button
          size="md"
          fullWidth
          onClick={() => {
            completeNode({ outcome: "cleared" });
          }}
        >
          {t("run:shipyard.leave")}
        </Button>
      }
    >
      <Stack gap="sm">
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

      <Text size="xs" c={tokens.dim} fs="italic">
        {t(greeting.text)}
      </Text>

      {vouchers > 0 ? (
        <Text size="xs" c={tokens.accent}>
          {t("run:shipyard.voucher", { n: vouchers })}
        </Text>
      ) : null}

      <Divider color={tokens.line} label={t("run:shipyard.systems")} />
        <Stack gap={6}>
          {slotIds.map((slotId) => {
            const mk = mkLevels[slotId] ?? 1;
            const maxed = mk >= 3;
            const target = maxed ? 3 : ((mk + 1) as Exclude<MkLevel, 1>);
            const cost = maxed ? 0 : discountedMk(target);
            return (
              <Paper
                key={slotId}
                bg={tokens.surface1}
                p="xs"
                radius="md"
                withBorder
                className={styles.slot}
              >
                {swept?.slotId === slotId ? (
                  <span key={swept.key} className={styles.sweep} />
                ) : null}
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
                  <Group gap={6} wrap="nowrap">
                    {vouchers > 0 && !maxed ? (
                      <Button
                        size="compact-sm"
                        variant="light"
                        color="accent"
                        onClick={() => {
                          redeemVoucher(slotId);
                        }}
                      >
                        {t("run:shipyard.voucherUse")}
                      </Button>
                    ) : null}
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
                </Group>
              </Paper>
            );
          })}
        </Stack>

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
      </Stack>
    </Screen>
  );
};
