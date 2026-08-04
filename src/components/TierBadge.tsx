import type { PuzzleTier } from "@/data/puzzles";
import { schools } from "@/data/schools";
import type { School } from "@/types/content";

const TIER_SCHOOL: Record<PuzzleTier, School> = {
  1: "green",
  2: "blue",
  3: "yellow",
  4: "red",
  5: "prismatic",
};

export const TIER_GLYPH: Record<PuzzleTier, string> = {
  1: "I",
  2: "II",
  3: "III",
  4: "IV",
  5: "V",
};

export const tierPalette = (tier: PuzzleTier) => schools[TIER_SCHOOL[tier]];

export const TierBadge = ({
  tier,
  label,
  compact,
}: {
  tier: PuzzleTier;
  label?: string;
  compact?: boolean;
}) => {
  const palette = tierPalette(tier);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: compact === true ? "1px 7px" : "3px 10px",
        borderRadius: 999,
        background: palette.fill,
        border: `1px solid ${palette.stroke}`,
        color: palette.text,
        fontWeight: 800,
        fontSize: compact === true ? 11 : 13,
        letterSpacing: 0.5,
        lineHeight: 1.4,
        whiteSpace: "nowrap",
      }}
    >
      <span>{TIER_GLYPH[tier]}</span>
      {label === undefined ? null : (
        <span style={{ fontWeight: 600, letterSpacing: 0 }}>{label}</span>
      )}
    </span>
  );
};
