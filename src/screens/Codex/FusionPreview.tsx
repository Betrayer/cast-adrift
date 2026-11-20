import { Group, Stack, Text } from "@mantine/core";
import { useRollSettings } from "@/app/rollSettings";
import { tokens } from "@/app/theme";
import { DiceRollOverlay } from "@/components/DiceRollOverlay";
import { DieCard } from "@/components/DieCard";
import { DIE_BY_ID } from "@/data/dice";
import { dieFaces, dieTier } from "@/game/dice/tier";

const PREVIEW_SIZE = 64;

export const FusionPreview = ({ base, result }: { base: string; result: string }) => {
  const { style, durationMs, reduced } = useRollSettings();
  const def = DIE_BY_ID.get(result);
  const faces = dieFaces({ defId: result }) ?? [];
  const top = faces.length === 0 ? dieTier({ defId: result }) : Math.max(...faces);
  return (
    <Stack gap={8} data-fusion-preview={result}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
          alignItems: "center",
          gap: 6,
        }}
      >
        <DieCard defId={base} />
        <Text size="xs" c={tokens.faint} ta="center">
          ×2 →
        </Text>
        <DieCard defId={result} />
      </div>
      {def === undefined ? null : (
        <Group justify="center">
          <DiceRollOverlay
            dice={[{ key: `fusion-${result}`, defId: result, tier: dieTier({ defId: result }), value: top, school: def.school }]}
            seed={result.length * 104729}
            style={style}
            durationMs={durationMs}
            reduced={reduced}
            size={PREVIEW_SIZE}
          />
        </Group>
      )}
    </Stack>
  );
};
