import { Button, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { AppModal } from "@/components/AppModal";
import { DieCard } from "@/components/DieCard";
import { rarityColor } from "@/app/rarity";
import { tokens } from "@/app/theme";
import { DIE_BY_ID } from "@/data/dice";
import { MODULE_BY_ID } from "@/data/modules";
import { moduleTags } from "@/data/modules/types";
import { schools } from "@/data/schools";
import { moduleSellValue, ptsForDie, sellValue } from "@/game/economy/prices";
import { TagChips } from "@/components/TagChips";
import { useMetaStore } from "@/stores/metaStore";
import { useRunStore, type PendingSwap } from "@/stores/runStore";
import styles from "./ReplaceCard.module.css";

export interface ReplaceCandidate {
  key: string;
  name: string;
  detail: string;
  value: number;
  accent: string;
}

export const useReplaceCandidates = (
  swap: PendingSwap,
): readonly ReplaceCandidate[] => {
  const { t } = useTranslation(["run", "content", "battle"]);
  const deck = useRunStore((s) => s.deck);
  const modules = useRunStore((s) => s.modules);
  if (swap.kind === "die") {
    return deck.flatMap((die) => {
      const def = DIE_BY_ID.get(die.defId);
      if (def === undefined) return [];
      return [
        {
          key: die.uid,
          name: t(def.name),
          detail: t(`battle:school.${def.school}`),
          value: sellValue(ptsForDie(die.defId)),
          accent: schools[def.school].stroke,
        },
      ];
    });
  }
  return modules.flatMap((moduleId) => {
    const def = MODULE_BY_ID.get(moduleId);
    if (def === undefined) return [];
    return [
      {
        key: moduleId,
        name: t(def.name),
        detail: t(def.desc),
        value: moduleSellValue(def.price),
        accent: rarityColor(def.rarity),
      },
    ];
  });
};

interface ReplaceCardProps {
  swap: PendingSwap;
  used: number;
  cap: number;
  footerLabel: string;
  onPick: (key: string) => void;
  onFooter: () => void;
  onClose: () => void;
}

const Incoming = ({ swap }: { swap: PendingSwap }) => {
  const { t } = useTranslation(["run", "content", "battle"]);
  const engravings = useMetaStore((s) => s.engravings);
  if (swap.kind === "die") {
    const def = DIE_BY_ID.get(swap.defId);
    if (def === undefined) return null;
    return <DieCard defId={swap.defId} plain engravings={engravings} />;
  }
  const def = MODULE_BY_ID.get(swap.moduleId);
  if (def === undefined) return null;
  return (
    <div
      className={styles.incomingModule}
      style={{ borderLeftColor: rarityColor(def.rarity) }}
    >
      <Text size="sm" fw={700} c={tokens.text}>
        {t(def.name)}
      </Text>
      <Text size="xs" c={tokens.dim}>
        {t(def.desc)}
      </Text>
      <TagChips tags={moduleTags(def)} />
    </div>
  );
};

export const ReplaceCard = ({
  swap,
  used,
  cap,
  footerLabel,
  onPick,
  onFooter,
  onClose,
}: ReplaceCardProps) => {
  const { t } = useTranslation(["run", "content", "battle"]);
  const candidates = useReplaceCandidates(swap);
  return (
    <AppModal
      label={t("run:replace.title")}
      testId="replace-card"
      dismiss="none"
      onClose={onClose}
    >
      <div className={styles.head} data-replace-kind={swap.kind}>
        <Text size="xs" c={tokens.faint}>
          {t(
            swap.kind === "die"
              ? "run:replace.titleDie"
              : "run:replace.titleModule",
          )}
        </Text>
      </div>

      <div className={styles.incoming}>
        <Incoming swap={swap} />
      </div>

      <Text size="sm" c={tokens.amber} className={styles.prompt}>
        {t(
          swap.kind === "die" ? "run:replace.fullDeck" : "run:replace.fullBay",
          { used, max: cap },
        )}
      </Text>

      <div className={styles.list}>
        {candidates.map((candidate) => (
          <button
            key={candidate.key}
            type="button"
            className={styles.row}
            style={{ borderLeftColor: candidate.accent }}
            data-testid={`replace-pick-${candidate.key}`}
            onClick={() => {
              onPick(candidate.key);
            }}
          >
            <span className={styles.rowText}>
              <span className={styles.rowName}>{candidate.name}</span>
              <span className={styles.rowDetail}>{candidate.detail}</span>
            </span>
            <span className={styles.rowValue}>
              {t("run:replace.toScrap", { n: candidate.value })}
            </span>
          </button>
        ))}
      </div>

      <Button
        size="sm"
        variant="default"
        fullWidth
        data-testid="replace-footer"
        onClick={onFooter}
      >
        {footerLabel}
      </Button>
    </AppModal>
  );
};
