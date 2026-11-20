import { Text } from "@mantine/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAtLeast } from "@/app/breakpoints";
import { tokens } from "@/app/theme";
import { AppSheet } from "@/components/AppModal";
import { useMetaStore } from "@/stores/metaStore";
import { useRunStore } from "@/stores/runStore";
import type { SlotId } from "@/types/battle";
import type { BridgeFocus } from "./bridgeFocus";
import { slotSheetModel } from "./slotSheet";
import {
  DiceSection,
  FactLines,
  HeaderSection,
  ImproveSection,
  ModesSection,
  SheetSection,
  SourcesSection,
  ValueTable,
} from "./SlotSheetSections";
import styles from "./SlotInfoSheet.module.css";

interface SlotInfoSheetProps {
  slotId: SlotId;
  onClose: () => void;
  onSource: (focus: BridgeFocus) => void;
}

export const SlotInfoSheet = ({ slotId, onClose, onSource }: SlotInfoSheetProps) => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const run = useRunStore((s) => s);
  const engravings = useMetaStore((s) => s.engravings);
  const side = useAtLeast("md");
  const model = useMemo(
    () => slotSheetModel(run, engravings, slotId),
    [run, engravings, slotId],
  );
  if (model === null) return null;
  return (
    <AppSheet
      placement={side ? "side" : "bottom"}
      label={t(`battle:slot.${slotId}`)}
      testId="bridge-slot-sheet"
      panelData={{ "data-slot-sheet": slotId }}
      closeLabel={t("run:bridge.sheet.close")}
      closeTestId="bridge-slot-sheet-close"
      onClose={onClose}
    >
      <div className={styles.body}>
        <HeaderSection model={model} t={t} />
        <SheetSection id="what" order={1} title={t("run:bridge.sheet.what")}>
          <Text size="sm" c={tokens.dim}>
            {t(model.what)}
          </Text>
        </SheetSection>
        <SheetSection id="how" order={2} title={t("run:bridge.sheet.how")}>
          <FactLines
            facts={model.facts.filter((fact) => fact.section === "how")}
            t={t}
          />
        </SheetSection>
        <ValueTable model={model} t={t} />
        <DiceSection model={model} t={t} />
        <ModesSection model={model} t={t} />
        <SourcesSection model={model} t={t} onSource={onSource} />
        <ImproveSection model={model} t={t} />
      </div>
    </AppSheet>
  );
};
