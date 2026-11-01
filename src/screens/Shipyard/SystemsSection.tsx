import { Button, Divider, Group, Paper, Stack, Text } from "@mantine/core";
import { Fragment, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { flourishStyle, MOTION_MS, riseStyle } from "@/app/motion";
import { tokens } from "@/app/theme";
import { TapPopover } from "@/components/TapPopover";
import { SHIP_BY_ID } from "@/data/ships";
import { nextMkLevel, slotCapForMk, type MkLevel } from "@/data/slots";
import { discountedMkCost, MK_TOP } from "@/game/economy/prices";
import { mkFactFor } from "@/game/battle/systemFacts";
import { noteMkTop } from "@/game/meta/counters";
import { autosaveRun } from "@/game/run/flow";
import { playSfx } from "@/services/audio";
import { haptic } from "@/services/tma";
import { useRunStore } from "@/stores/runStore";
import type { SlotId } from "@/types/battle";
import styles from "./ShipyardScreen.module.css";

export const SystemsSection = () => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const scrap = useRunStore((s) => s.scrap);
  const mkLevels = useRunStore((s) => s.mkLevels);
  const shipId = useRunStore((s) => s.shipId);
  const shipyardDiscount = useRunStore((s) => s.shipyardDiscount);
  const vouchers = useRunStore((s) => s.vouchers);
  const [swept, setSwept] = useState<{ slotId: SlotId; key: number } | null>(
    null,
  );
  const sweepKey = useRef(0);

  const discountedMk = (target: Exclude<MkLevel, 1>): number =>
    discountedMkCost(target, shipyardDiscount);

  const mkWhy = (slotId: SlotId): string => {
    const fact = mkFactFor(slotId);
    return fact === undefined ? "" : t(fact.text, fact.vars({ shipId }));
  };

  const ship = SHIP_BY_ID.get(shipId);
  const slotIds = useMemo(
    () => (ship ? (Object.keys(ship.slots) as SlotId[]) : []),
    [ship],
  );

  const markUpgraded = (slotId: SlotId): void => {
    if ((useRunStore.getState().mkLevels[slotId] ?? 1) >= MK_TOP) noteMkTop();
    playSfx("buy");
    playSfx("mkSweep");
    haptic("purchase");
    setSwept({ slotId, key: sweepKey.current + 1 });
    sweepKey.current += 1;
  };

  const buyMk = (slotId: SlotId): void => {
    const state = useRunStore.getState();
    const target = nextMkLevel(state.mkLevels[slotId] ?? 1);
    if (target === null) return;
    const cost = discountedMkCost(target, state.shipyardDiscount);
    if (!state.spendScrap(cost)) return;
    state.bumpMk(slotId);
    if (state.shipyardDiscount > 0) useRunStore.setState({ shipyardDiscount: 0 });
    markUpgraded(slotId);
    autosaveRun();
  };

  const redeemVoucher = (slotId: SlotId): void => {
    const state = useRunStore.getState();
    if (nextMkLevel(state.mkLevels[slotId] ?? 1) === null) return;
    if (!state.spendVoucher()) return;
    state.bumpMk(slotId);
    markUpgraded(slotId);
    autosaveRun();
  };

  return (
    <>
      <Divider color={tokens.line} label={t("run:shipyard.systems")} />
      <Stack gap={6}>
        {slotIds.map((slotId, index) => {
          const mk = mkLevels[slotId] ?? 1;
          const target = nextMkLevel(mk);
          const maxed = target === null;
          const cost = target === null ? 0 : discountedMk(target);
          const capLabel = t("battle:slot.cap", {
            cap: slotCapForMk(slotId, mk),
            mk,
          });
          return (
            <Paper
              key={slotId}
              bg={tokens.surface1}
              p="xs"
              radius="md"
              withBorder
              className={styles.slot}
              data-yard-slot={slotId}
              data-rise
              style={riseStyle(index)}
            >
              {swept?.slotId === slotId ? (
                <Fragment key={swept.key}>
                  <span className={styles.sweep} />
                  <span
                    className={styles.mkRing}
                    data-mk-flourish={slotId}
                    style={flourishStyle(tokens.accent, MOTION_MS.xl)}
                  />
                </Fragment>
              ) : null}
              <Group justify="space-between" wrap="nowrap">
                <Stack gap={0}>
                  <Text size="sm" c={tokens.text}>
                    {t(`battle:slot.${slotId}`)}
                  </Text>
                  <TapPopover
                    label={capLabel}
                    testId={`shipyard-mk-${slotId}`}
                    align="start"
                    content={mkWhy(slotId)}
                  >
                    <Text size="xs" c={tokens.faint}>
                      {capLabel}
                    </Text>
                  </TapPopover>
                </Stack>
                <Group gap={6} wrap="nowrap">
                  {vouchers > 0 && !maxed ? (
                    <Button
                      size="compact-sm"
                      variant="light"
                      color="accent"
                      data-testid={`yard-mk-voucher-${slotId}`}
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
                    data-testid={`yard-mk-buy-${slotId}`}
                    onClick={() => {
                      buyMk(slotId);
                    }}
                  >
                    {target === null
                      ? t("run:shipyard.mkMax")
                      : t("run:shipyard.mk", { mk: target, cost })}
                  </Button>
                </Group>
              </Group>
            </Paper>
          );
        })}
      </Stack>
    </>
  );
};
