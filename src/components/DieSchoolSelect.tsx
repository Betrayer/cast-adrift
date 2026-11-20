import { Select } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { SCHOOL_FILTERS } from "@/game/dice/card";
import type { School } from "@/types/content";

interface DieSchoolSelectProps {
  value: School | "all";
  onChange: (value: School | "all") => void;
  testId?: string;
}

export const DieSchoolSelect = ({ value, onChange, testId }: DieSchoolSelectProps) => {
  const { t } = useTranslation(["meta"]);
  return (
    <Select
      size="xs"
      miw={120}
      value={value}
      data-testid={testId}
      onChange={(v) => {
        onChange((v as School | "all") ?? "all");
      }}
      data={SCHOOL_FILTERS.map((s) => ({
        value: s,
        label: s === "all" ? t("meta:hangar.filterAll") : t(`meta:constellation.${s}`),
      }))}
    />
  );
};
