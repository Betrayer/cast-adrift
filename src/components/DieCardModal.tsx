import { useCallback, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AppModal } from "@/components/AppModal";
import { DieCard } from "@/components/DieCard";
import { DIE_BY_ID } from "@/data/dice";
import type { EngravingMap } from "@/data/engravings";
import type { ContentTag } from "@/data/tags";
import styles from "./DieCard.module.css";

interface DieCardModalProps {
  defId: string;
  onClose: () => void;
  growthBonus?: number;
  engravings?: EngravingMap;
  engravingIds?: readonly string[];
  tagCounts?: Partial<Record<ContentTag, number>>;
  footer?: ReactNode;
}

export const DieCardModal = ({
  defId,
  onClose,
  growthBonus,
  engravings,
  engravingIds,
  tagCounts,
  footer,
}: DieCardModalProps) => {
  const { t } = useTranslation(["battle", "content"]);
  const def = DIE_BY_ID.get(defId);
  return (
    <AppModal
      label={def === undefined ? defId : t(def.name)}
      testId="die-card-modal"
      onClose={onClose}
      plain
    >
      <DieCard
        defId={defId}
        size="full"
        growthBonus={growthBonus}
        engravings={engravings}
        engravingIds={engravingIds}
        tagCounts={tagCounts}
        footer={
          <>
            {footer}
            <button
              type="button"
              className={styles.closeBtn}
              data-testid="die-card-close"
              onClick={onClose}
            >
              {t("battle:close")}
            </button>
          </>
        }
      />
    </AppModal>
  );
};

interface DieCardTriggerProps extends Omit<DieCardModalProps, "onClose"> {
  children: ReactNode;
  testId?: string;
  className?: string;
}

export const DieCardTrigger = ({
  children,
  testId,
  className,
  ...card
}: DieCardTriggerProps) => {
  const { t } = useTranslation(["battle", "content"]);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => {
    setOpen(false);
  }, []);
  const def = DIE_BY_ID.get(card.defId);
  return (
    <>
      <button
        type="button"
        className={[styles.trigger, className]
          .filter((name) => name !== undefined)
          .join(" ")}
        data-testid={testId}
        data-die-open={card.defId}
        aria-label={t("battle:die.open", {
          name: def === undefined ? card.defId : t(def.name),
        })}
        onClick={() => {
          setOpen(true);
        }}
      >
        {children}
      </button>
      {open ? <DieCardModal {...card} onClose={close} /> : null}
    </>
  );
};
