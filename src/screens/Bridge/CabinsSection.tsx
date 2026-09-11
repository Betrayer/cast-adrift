import { Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { CABIN_CAP, officerLabelVars } from "@/data/officers";
import { useRunStore } from "@/stores/runStore";
import { cabinRows } from "./bridgeRows";
import { officerPassiveLines } from "./officerText";
import styles from "./BridgeScreen.module.css";

export const CabinsSection = () => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const officers = useRunStore((s) => s.officers);
  const rows = cabinRows(officers);

  return (
    <Paper
      bg={tokens.surface1}
      p="sm"
      radius="md"
      withBorder
      data-bridge-section="crew"
    >
      <Stack gap={6}>
        <Text size="sm" fw={600} c={tokens.text}>
          {t("run:bridge.crewTitle", {
            used: rows.filter((row) => row.kind === "officer").length,
            max: CABIN_CAP,
          })}
        </Text>
        {rows.map((row) => {
          if (row.kind === "empty") {
            return (
              <div
                key={`cabin-${String(row.index)}`}
                className={styles.cabinEmpty}
                data-bridge-cabin-empty={row.index}
              >
                <Text size="xs" c={tokens.faint}>
                  {t("run:bridge.cabinEmpty")}
                </Text>
              </div>
            );
          }
          const def = row.def;
          return (
            <div
              key={def.id}
              className={styles.cabin}
              data-bridge-cabin={def.id}
            >
              <Text size="sm" fw={600} c={tokens.text}>
                {t(def.name)}
              </Text>
              <Text size="xs" c={tokens.faint}>
                {t("run:bridge.cabinWho", {
                  role: t(def.role),
                  origin: t(def.origin),
                })}
              </Text>
              <Text size="xs" c={tokens.dim} data-bridge-cabin-active>
                {t("run:bridge.cabinActive", {
                  text: t(def.short, officerLabelVars(def.active)),
                })}
              </Text>
              {officerPassiveLines(def.passive).map((line) => (
                <Text
                  key={line.field}
                  size="xs"
                  c={tokens.dim}
                  data-bridge-cabin-passive
                >
                  {t("run:bridge.cabinPassive", {
                    text: t(line.key, { n: line.n }),
                  })}
                </Text>
              ))}
            </div>
          );
        })}
      </Stack>
    </Paper>
  );
};
