import { useMemo } from "react";
import { riseStyle } from "@/app/motion";
import { tokens } from "@/app/theme";
import { useRollSettings } from "@/app/rollSettings";
import { DiceRollOverlay } from "@/components/DiceRollOverlay";
import { DIE_BY_ID } from "@/data/dice";
import { deriveSeed } from "@/services/rng";

const PUZZLE_DIE_SIZE = 60;

interface PuzzleDieProps {
  defId: string;
  index: number;
  value: number;
  gen: number;
  seed: number;
  active: boolean;
  faded: boolean;
  reserved: boolean;
  locked: boolean;
  color: string;
  riseIndex: number;
  onTap: () => void;
}

export const PuzzleDie = ({
  defId,
  index,
  value,
  gen,
  seed,
  active,
  faded,
  reserved,
  locked,
  color,
  riseIndex,
  onTap,
}: PuzzleDieProps) => {
  const roll = useRollSettings();
  const def = DIE_BY_ID.get(defId);
  const school = def?.school ?? "grey";
  const dice = useMemo(
    () => [{ key: `${defId}-${String(index)}`, defId, tier: def?.tier ?? 6, school, value }],
    [defId, index, def, school, value],
  );
  return (
    <button
      type="button"
      onClick={onTap}
      data-puzzle-die={index}
      data-value={value}
      data-rise
      data-press={locked ? undefined : true}
      style={{
        ...riseStyle(riseIndex),
        position: "relative",
        padding: 2,
        borderRadius: 10,
        background: "transparent",
        border: `2px solid ${reserved ? tokens.amber : active ? color : "transparent"}`,
        opacity: faded || locked ? 0.4 : 1,
        cursor: locked ? "not-allowed" : "pointer",
      }}
    >
      <DiceRollOverlay
        dice={dice}
        seed={deriveSeed(seed, `present:${String(index)}:${String(gen)}`)}
        style={roll.style}
        durationMs={roll.durationMs}
        reduced={roll.reduced}
        size={PUZZLE_DIE_SIZE}
        idle={gen === 0}
      />
      {reserved ? (
        <span
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            background: tokens.amber,
            color: "#1B1300",
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 800,
            padding: "0 4px",
          }}
        >
          R
        </span>
      ) : null}
      {locked ? (
        <span
          style={{
            position: "absolute",
            bottom: -6,
            right: -6,
            background: tokens.line,
            color: tokens.text,
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 800,
            padding: "0 4px",
          }}
        >
          ✕
        </span>
      ) : null}
    </button>
  );
};
