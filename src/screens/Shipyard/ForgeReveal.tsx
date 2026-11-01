import { Button, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRollSettings } from "@/app/rollSettings";
import { tokens } from "@/app/theme";
import { DiceRollOverlay } from "@/components/DiceRollOverlay";
import { DieCard } from "@/components/DieCard";
import { showcaseDie } from "@/components/showcaseDie";
import { DIE_BY_ID } from "@/data/dice";
import type { EngravingMap } from "@/data/engravings";
import { dieTier, forgeLevel, type HandDie } from "@/game/dice/tier";
import { haptic } from "@/services/tma";

const REVEAL_DIE_SIZE = 96;

const REVEAL_SEED = 2654435761;

interface ForgeRevealProps {
  die: HandDie;
  engravings: EngravingMap;
  onDone: () => void;
}

export const ForgeReveal = ({ die, engravings, onDone }: ForgeRevealProps) => {
  const { t } = useTranslation(["run", "content"]);
  const roll = useRollSettings();
  const showcase = useMemo(() => {
    const d = showcaseDie(die, `forged-${die.defId}`);
    return d === null ? [] : [d];
  }, [die]);

  return (
    <Stack gap="md" align="center" data-testid="forge-reveal">
      <DiceRollOverlay
        dice={showcase}
        seed={REVEAL_SEED}
        style={roll.style}
        durationMs={roll.durationMs}
        reduced={roll.reduced}
        size={REVEAL_DIE_SIZE}
        testId="forge-roll"
        onSettled={() => {
          haptic("resolveTick");
        }}
      >
        <Text size="sm" fw={600} c={tokens.text} ta="center">
          {t("run:shipyard.forgeRevealed", {
            name: t(DIE_BY_ID.get(die.defId)?.name ?? die.defId),
            tier: dieTier(die),
          })}
        </Text>
      </DiceRollOverlay>
      <DieCard defId={die.defId} fusion={forgeLevel(die)} engravings={engravings} />
      <Button data-testid="forge-done" onClick={onDone}>
        {t("run:shipyard.forgeDone")}
      </Button>
    </Stack>
  );
};
