import { Divider, Group, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { schoolGlyphPath } from "@/data/glyphs";
import { SCHOOL_IDS, schools } from "@/data/schools";
import { STATUS_KEYS } from "@/game/battle/statuses";
import { DIE_BADGE_GLYPH, DIE_BADGE_ORDER } from "@/game/dice/card";

export const GlyphLegend = () => {
  const { t } = useTranslation(["run", "battle"]);
  return (
    <Paper bg={tokens.surface1} p="sm" radius="sm" withBorder>
      <Text size="sm" fw={600} c={tokens.text}>
        {t("run:codex.glyphLegend.title")}
      </Text>
      <Group gap="sm" mt="xs" wrap="wrap">
        {SCHOOL_IDS.map((school) => {
          const glyph = schoolGlyphPath(school, 11, 11, 8);
          return (
            <Group key={school} gap={6} wrap="nowrap">
              <svg width={22} height={22} role="presentation">
                <path
                  d={glyph.d}
                  fill={glyph.mode === "fill" ? schools[school].stroke : "none"}
                  stroke={
                    glyph.mode === "stroke" ? schools[school].stroke : "none"
                  }
                  strokeWidth={glyph.width}
                />
              </svg>
              <Text size="xs" c={tokens.dim}>
                {t(`battle:school.${school}`)}
              </Text>
            </Group>
          );
        })}
      </Group>
      <Text size="xs" c={tokens.faint} mt="xs">
        {t("run:codex.glyphLegend.body")}
      </Text>

      <Divider my="xs" color={tokens.line} />
      <Text size="sm" fw={600} c={tokens.text}>
        {t("run:codex.badgeLegend")}
      </Text>
      <Stack gap={2} mt={4} data-badge-legend>
        {DIE_BADGE_ORDER.map((badge) => (
          <Group key={badge} gap={6} wrap="nowrap" data-legend-badge={badge}>
            <Text size="sm" fw={700} c={tokens.text} w={18} ta="center">
              {DIE_BADGE_GLYPH[badge]}
            </Text>
            <Text size="xs" c={tokens.dim}>
              {t(`battle:badge.${badge}`)}
            </Text>
          </Group>
        ))}
        <Group gap={6} wrap="nowrap" data-legend-badge="prismatic">
          <Text size="sm" fw={700} c={schools.prismatic.text} w={18} ta="center">
            ◈
          </Text>
          <Text size="xs" c={tokens.dim}>
            {t("battle:die.feature.prismatic")}
          </Text>
        </Group>
        <Group gap={6} wrap="nowrap" data-legend-badge="legendary">
          <Group w={18} justify="center">
            <span
              aria-hidden
              style={{
                width: 12,
                height: 12,
                borderRadius: 4,
                border: `1px solid ${schools.yellow.stroke}`,
                boxShadow: `0 0 8px 1px ${schools.yellow.stroke}`,
              }}
            ></span>
          </Group>
          <Text size="xs" c={tokens.dim}>
            {t("battle:die.feature.legendary")}
          </Text>
        </Group>
      </Stack>

      <Divider my="xs" color={tokens.line} />
      <Text size="sm" fw={600} c={tokens.text}>
        {t("battle:statusLegend")}
      </Text>
      <Stack gap={2} mt={4} data-status-legend>
        {STATUS_KEYS.map((key) => (
          <Group key={key} gap={6} wrap="nowrap" data-legend-status={key}>
            <Text size="sm" fw={700} c={tokens.text} w={18} ta="center">
              {t(`battle:status.${key}`)}
            </Text>
            <Stack gap={0}>
              <Text size="xs" c={tokens.dim}>
                {t(`battle:statusName.${key}`)}
              </Text>
              <Text size="xs" c={tokens.faint}>
                {t(`battle:statusDesc.${key}`)}
              </Text>
            </Stack>
          </Group>
        ))}
      </Stack>
    </Paper>
  );
};
