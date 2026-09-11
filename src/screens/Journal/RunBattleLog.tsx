import { Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { BattleLogList } from "@/screens/Battle/journal/BattleLogList";
import { useBattleStore } from "@/stores/battleStore";
import { useRunStore } from "@/stores/runStore";

export const RunBattleLog = () => {
  const { t } = useTranslation(["battle", "run"]);
  const live = useBattleStore((s) => s.log);
  const kept = useRunStore((s) => s.lastBattleLog);
  const log = live.length > 0 ? live : kept;

  return (
    <Paper bg={tokens.surface1} p="md" radius="md" withBorder>
      <Stack gap={8} data-run-battle-log>
        <Text size="xs" c={tokens.faint}>
          {t(live.length > 0 ? "run:journal.battleLive" : "run:journal.battleLast")}
        </Text>
        <BattleLogList log={log} />
      </Stack>
    </Paper>
  );
};
