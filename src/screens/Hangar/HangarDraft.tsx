import { Badge, Button, Group, Paper, Progress, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { DIE_BY_ID } from "@/data/dice";
import { schools } from "@/data/schools";
import { diePoints, HANGAR_DECK_CAP } from "@/data/metaShop";
import type { DeckValidation } from "@/game/meta/deck";
import { dieLabel } from "./dieLabel";

interface HangarDraftProps {
  draft: readonly string[];
  budget: number;
  validation: DeckValidation;
  dirty: boolean;
  onRemove: (index: number) => void;
  onSave: () => void;
}

export const HangarDraft = ({
  draft,
  budget,
  validation,
  dirty,
  onRemove,
  onSave,
}: HangarDraftProps) => {
  const { t } = useTranslation(["meta", "common", "content", "battle"]);

  return (
    <Paper bg={tokens.surface1} p="md" radius="md" withBorder>
      <Group justify="space-between">
        <Text size="sm" c={validation.over ? tokens.danger : tokens.dim}>
          {t("meta:hangar.budget", { used: validation.pts, max: budget })}
        </Text>
        <Text size="sm" c={tokens.faint}>
          {draft.length}/{HANGAR_DECK_CAP}
        </Text>
      </Group>
      <Progress
        mt={4}
        value={Math.min(100, (validation.pts / budget) * 100)}
        color={validation.over ? "danger" : "accent"}
      />
      <Text size="xs" mt={4} c={validation.valid ? "teal" : tokens.danger}>
        {validation.over
          ? t("meta:hangar.invalidOver")
          : validation.overCap
            ? t("meta:hangar.invalidCap", { n: HANGAR_DECK_CAP })
            : validation.underMin
              ? t("meta:hangar.invalidMin")
              : validation.multiFate
                ? t("meta:hangar.invalidFate")
                : t("meta:hangar.valid")}
      </Text>
      <Group gap={4} mt="xs" data-testid="hangar-draft">
        {draft.length === 0 ? (
          <Text size="xs" c={tokens.faint}>
            {t("meta:hangar.empty")}
          </Text>
        ) : (
          draft.map((id, i) => {
            const def = DIE_BY_ID.get(id);
            if (def === undefined) return null;
            return (
              <Badge
                key={`${id}-${String(i)}`}
                variant="outline"
                data-press
                style={{ color: schools[def.school].text, cursor: "pointer" }}
                onClick={() => { onRemove(i); }}
              >
                {dieLabel(def, t)} · {diePoints(id)}
              </Badge>
            );
          })
        )}
      </Group>
      <Button
        mt="sm"
        size="xs"
        fullWidth
        disabled={!validation.valid || !dirty}
        onClick={onSave}
      >
        {dirty ? t("meta:hangar.save") : t("meta:hangar.saved")}
      </Button>
    </Paper>
  );
};
