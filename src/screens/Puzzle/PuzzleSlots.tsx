import { Group, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { riseStyle } from "@/app/motion";
import { tokens } from "@/app/theme";
import type { PuzzleDef } from "@/data/puzzles";
import { slotCapForMk } from "@/data/slots";
import type { Placement } from "@/game/puzzles/evaluate";
import type { SlotId } from "@/types/battle";

export const PuzzleSlots = ({
  puzzle,
  placement,
  values,
  rerollMode,
  onTapSlot,
}: {
  puzzle: PuzzleDef;
  placement: Placement;
  values: readonly number[];
  rerollMode: boolean;
  onTapSlot: (slot: SlotId) => void;
}) => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const blocked = new Set<SlotId>(puzzle.blocked ?? []);
  return (
    <Stack gap={6}>
      {puzzle.slots.map((slot, index) => {
        const isBlocked = blocked.has(slot);
        const occupant = placement[slot];
        const value = occupant !== undefined ? values[occupant] : undefined;
        const mk = puzzle.mk?.[slot] ?? 1;
        return (
          <Paper
            key={slot}
            bg={isBlocked ? tokens.bg : tokens.surface1}
            p="xs"
            radius="sm"
            withBorder
            opacity={isBlocked ? 0.5 : 1}
            data-puzzle-slot={slot}
            data-rise
            data-press={isBlocked || rerollMode ? undefined : true}
            style={{
              cursor: isBlocked || rerollMode ? "default" : "pointer",
              ...riseStyle(index),
            }}
            onClick={() => {
              if (!isBlocked) onTapSlot(slot);
            }}
          >
            <Group justify="space-between" wrap="nowrap">
              <Stack gap={0}>
                <Text size="sm" c={tokens.text}>
                  {t(`battle:slot.${slot}`)}
                </Text>
                <Text size="xs" c={tokens.faint}>
                  {t("battle:slot.cap", { cap: slotCapForMk(slot, mk), mk })}
                </Text>
              </Stack>
              {isBlocked ? (
                <Text size="sm" c={tokens.danger}>
                  {t("battle:jam")}
                </Text>
              ) : value !== undefined ? (
                <Text size="lg" fw={700} c={tokens.text}>
                  {value}
                </Text>
              ) : (
                <Text size="sm" c={tokens.faint}>
                  +
                </Text>
              )}
            </Group>
          </Paper>
        );
      })}
    </Stack>
  );
};
