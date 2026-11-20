import { useTranslation } from "react-i18next";
import { riseStyle } from "@/app/motion";
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
        data-rise
        data-press
        data-tap-slop
        style={riseStyle(0)}
        onClick={() => {
          onChange("all");
        }}
      >
        {t("meta:hangar.filterAll")}
      </button>
      {DIE_FILTERS.map((feature, index) => (
        <button
          key={feature}
          type="button"
          className={styles.chip}
          data-on={value === feature ? "1" : "0"}
          data-die-filter={feature}
          data-rise
          data-press
          data-tap-slop
          style={riseStyle(index + 1)}
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
