import { MASTERY_MAX_RANK } from "@/data/shipMastery";
import styles from "./MasteryPips.module.css";

interface MasteryPipsProps {
  rank: number;
}

export const MasteryPips = ({ rank }: MasteryPipsProps) => (
  <span className={styles.pips} data-mastery-pips={rank} aria-hidden>
    {Array.from({ length: MASTERY_MAX_RANK }, (_, index) => (
      <span
        key={index}
        className={styles.pip}
        data-on={index < rank ? "1" : undefined}
      />
    ))}
  </span>
);
