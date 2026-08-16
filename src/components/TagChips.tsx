import { useTranslation } from "react-i18next";
import { schools } from "@/data/schools";
import { type ContentTag } from "@/data/tags";
import { tokens } from "@/app/theme";
import type { School } from "@/types/content";
import styles from "./TagChips.module.css";

const SCHOOL_TAG_SET = new Set<string>(Object.keys(schools));

const chipColor = (tag: ContentTag): string =>
  SCHOOL_TAG_SET.has(tag) ? schools[tag as School].text : tokens.dim;

interface TagChipsProps {
  tags: readonly ContentTag[];
  counts?: Partial<Record<ContentTag, number>>;
  size?: "sm" | "xs";
}

export const TagChips = ({ tags, counts, size = "xs" }: TagChipsProps) => {
  const { t } = useTranslation(["run"]);
  if (tags.length === 0) return null;
  return (
    <div className={styles.row}>
      {tags.map((tag) => {
        const owned = counts?.[tag] ?? 0;
        return (
          <span
            key={tag}
            className={`${styles.chip ?? ""} ${size === "sm" ? styles.sm ?? "" : ""}`}
            style={{ color: chipColor(tag), borderColor: chipColor(tag) }}
          >
            {counts === undefined
              ? t(`run:tag.${tag}`)
              : t("run:tag.owned", { name: t(`run:tag.${tag}`), n: owned })}
          </span>
        );
      })}
    </div>
  );
};
