import { Button, Stack, Text, Title } from "@mantine/core";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AppModal } from "@/components/AppModal";
import { tokens } from "@/app/theme";
import { CODEX_BY_ID } from "@/data/codex";
import { memoryAt, MEMORY_TOTAL } from "@/data/narrative/memories";
import { duckMusic, playSfx } from "@/services/audio";
import { haptic } from "@/services/tma";
import { useNarrativeStore } from "@/stores/narrativeStore";
import styles from "./MemoryCeremony.module.css";

export const MemoryCeremony = () => {
  const { t } = useTranslation(["run", "content"]);
  const order = useNarrativeStore((s) => s.memoryQueue[0]);
  const dismiss = useNarrativeStore((s) => s.dismissMemory);

  useEffect(() => {
    if (order === undefined) return;
    playSfx("memoryReveal", { rate: 0.94 + order * 0.008 });
    duckMusic(2000);
    haptic("reveal");
  }, [order]);

  const close = (): void => {
    playSfx("journalStamp", { gain: 2.2 });
    dismiss();
  };

  if (order === undefined) return null;
  const memory = memoryAt(order);
  if (memory === undefined) return null;
  const entry = CODEX_BY_ID.get(memory.codexId);

  return (
    <AppModal
      label={t("run:memory.kicker", { n: order, max: MEMORY_TOTAL })}
      testId="memory-ceremony"
      ceremony
      plain
      className={styles.card}
      onClose={close}
    >
      <div data-memory-ceremony={order}>
        <Stack gap="xs">
          <Text className={styles.kicker} c={tokens.accent}>
            {t("run:memory.kicker", { n: order, max: MEMORY_TOTAL })}
          </Text>
          <Title order={4} c={tokens.text}>
            {t(entry?.title ?? memory.title)}
          </Title>
          <div className={styles.rule} />
          <Text size="sm" c={tokens.dim}>
            {t(entry?.body ?? memory.body)}
          </Text>
          <Button mt="sm" fullWidth data-memory-continue onClick={close}>
            {t("run:memory.continue")}
          </Button>
        </Stack>
      </div>
    </AppModal>
  );
};
