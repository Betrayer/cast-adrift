import { Button, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { riseStyle, useSweepWhen } from "@/app/motion";
import { tokens } from "@/app/theme";
import { DieCard } from "@/components/DieCard";
import { DIE_BY_ID } from "@/data/dice";
import type { EngravingMap } from "@/data/engravings";
import type { ForgeOption } from "@/game/dice/forge";
import { forgeLevel, type HandDie } from "@/game/dice/tier";
import styles from "./ShipyardScreen.module.css";

interface ForgeConfirmProps {
  testId: string;
  enabled: boolean;
  label: string;
  onConfirm: () => void;
}

const ForgeConfirm = ({ testId, enabled, label, onConfirm }: ForgeConfirmProps) => {
  const attach = useSweepWhen<HTMLButtonElement>(enabled);

  return (
    <Button
      ref={attach}
      size="compact-sm"
      fullWidth
      disabled={!enabled}
      className={styles.confirmSweep}
      data-sweep-host
      data-testid={testId}
      onClick={onConfirm}
    >
      {label}
    </Button>
  );
};

interface ForgeOptionCardProps {
  optionKey: string;
  option: ForgeOption;
  riseIndex: number;
  source: HandDie | undefined;
  signature: HandDie | undefined;
  engravings: EngravingMap;
  enabled: boolean;
  onConfirm: () => void;
}

export const ForgeOptionCard = ({
  optionKey,
  option,
  riseIndex,
  source,
  signature,
  engravings,
  enabled,
  onConfirm,
}: ForgeOptionCardProps) => {
  const { t } = useTranslation(["run", "content"]);

  const title = (): string => {
    if (option.kind === "recipe") {
      const result = DIE_BY_ID.get(option.result);
      return t("run:shipyard.forgeRecipe", { name: result === undefined ? "" : t(result.name) });
    }
    const def = signature === undefined ? undefined : DIE_BY_ID.get(signature.defId);
    return t("run:shipyard.forgeColour", { name: def === undefined ? "" : t(def.name) });
  };

  return (
    <div
      className={styles.forgeOption}
      data-forge-option={optionKey}
      data-rise
      style={riseStyle(riseIndex)}
    >
      <Text size="sm" fw={600} c={tokens.text}>
        {title()}
      </Text>
      <div className={styles.forgePreview}>
        {option.kind === "recipe" ? (
          <>
            <DieCard defId={source?.defId ?? ""} engravings={engravings} />
            <span className={styles.fuseArrow}>→</span>
            <DieCard defId={option.result} engravings={engravings} />
          </>
        ) : signature === undefined ? null : (
          <>
            <DieCard defId={signature.defId} fusion={forgeLevel(signature)} engravings={engravings} />
            <span className={styles.fuseArrow}>→</span>
            <DieCard defId={signature.defId} fusion={option.level} engravings={engravings} />
          </>
        )}
      </div>
      <ForgeConfirm
        testId={`forge-confirm-${optionKey}`}
        enabled={enabled}
        label={t("run:shipyard.forgeConfirm", { n: option.cost })}
        onConfirm={onConfirm}
      />
    </div>
  );
};
