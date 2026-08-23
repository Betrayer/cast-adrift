import { useTranslation } from "react-i18next";
import {
  DIE_BADGE_GLYPH,
  DIE_FILTERS,
  type DieFeature,
} from "@/game/dice/card";
import styles from "./DieFilterChips.module.css";

interface DieFilterChipsProps {
  value: DieFeature | "all";
  onChange: (value: DieFeature | "all") => void;
  testId?: string;
}

const glyphFor = (feature: DieFeature): string =>
  feature === "prismatic" ? "◈" : DIE_BADGE_GLYPH[feature];

export const DieFilterChips = ({
  value,
  onChange,
  testId,
}: DieFilterChipsProps) => {
  const { t } = useTranslation(["battle", "meta"]);
  return (
    <div className={styles.row} data-testid={testId}>
      <button
        type="button"
        className={styles.chip}
        data-on={value === "all" ? "1" : "0"}
        data-die-filter="all"
        onClick={() => {
          onChange("all");
        }}
      >
        {t("meta:hangar.filterAll")}
      </button>
      {DIE_FILTERS.map((feature) => (
        <button
          key={feature}
          type="button"
          className={styles.chip}
          data-on={value === feature ? "1" : "0"}
          data-die-filter={feature}
          onClick={() => {
            onChange(value === feature ? "all" : feature);
          }}
        >
          <span className={styles.glyph}>{glyphFor(feature)}</span>
          {feature === "prismatic"
            ? t("battle:school.prismatic")
            : t(`battle:die.filter.${feature}`)}
        </button>
      ))}
    </div>
  );
};
