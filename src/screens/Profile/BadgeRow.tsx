import { Group, Text, Tooltip } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { BADGES, BADGE_BY_ID } from "@/data/cosmetics";
import { useMetaStore } from "@/stores/metaStore";
import styles from "./BadgeRow.module.css";

export const BadgeRow = () => {
  const { t } = useTranslation(["meta"]);
  const badges = useMetaStore((s) => s.badges);
  const earned = BADGES.filter((def) => badges.includes(def.id));

  if (earned.length === 0) {
    return (
      <Text size="xs" c={tokens.faint} data-badges-empty>
        {t("meta:profile.none")}
      </Text>
    );
  }

  return (
    <Group gap={8} data-badges>
      {earned.map((def) => (
        <Tooltip key={def.id} label={t(def.name)} withArrow>
          <span
            className={`${styles.badge ?? ""} ${def.kind === "animated" ? (styles.animated ?? "") : ""}`}
            data-badge={def.id}
            aria-label={t(def.name)}
          >
            {def.glyph}
          </span>
        </Tooltip>
      ))}
    </Group>
  );
};

export const menuBadgeId = (badges: readonly string[]): string | null => {
  for (let i = BADGES.length - 1; i >= 0; i -= 1) {
    const def = BADGES[i];
    if (def !== undefined && badges.includes(def.id)) return def.id;
  }
  return null;
};

export const MenuBadge = ({ id }: { id: string }) => {
  const { t } = useTranslation(["meta"]);
  const def = BADGE_BY_ID.get(id);
  if (def === undefined) return null;
  return (
    <span
      className={`${styles.ring ?? ""} ${def.kind === "animated" ? (styles.animated ?? "") : ""}`}
      data-menu-badge={def.id}
      aria-label={t(def.name)}
    >
      {def.glyph}
    </span>
  );
};
