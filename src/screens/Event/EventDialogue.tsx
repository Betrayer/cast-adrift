import { Text } from "@mantine/core";
import { useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { MOTION_MS, riseStyle, staggerStyle } from "@/app/motion";
import { tokens } from "@/app/theme";
import { SPEAKER_GLYPH, speakerTone } from "@/data/speakers";
import { Typewriter, typewriterLineDelays } from "@/components/Typewriter";
import type { EventRunState } from "@/stores/runStore";
import type { DialogueLine, DialogueVoice } from "@/types/events";
import styles from "./EventScreen.module.css";

export const DIALOGUE_LEAD_MS = MOTION_MS.m;

export const DIALOGUE_GAP_MS = MOTION_MS.s;

export const dialogueLineDelays = (texts: readonly string[]): number[] =>
  typewriterLineDelays(texts, DIALOGUE_LEAD_MS, DIALOGUE_GAP_MS);

export const dialogueTypesIn = (replay: EventRunState | null): boolean =>
  replay === null;

export const dialogueTone = (who: DialogueVoice): string => {
  if (who === "echo") return tokens.accent;
  if (who === "narration") return tokens.faint;
  return speakerTone(who);
};

const dialogueLineStyle = (tone: string, delay: number | null): CSSProperties =>
  ({
    "--ca-voice": tone,
    ...(delay === null ? {} : { ...staggerStyle(delay), ...riseStyle(1) }),
  }) as CSSProperties;

export const EventDialogue = ({
  lines,
  typesIn,
}: {
  lines: readonly DialogueLine[];
  typesIn: boolean;
}) => {
  const { t } = useTranslation(["run", "content"]);
  const [skipped, setSkipped] = useState(false);
  const [typed, setTyped] = useState<ReadonlySet<number>>(() => new Set());
  const instant = !typesIn || skipped;
  const texts = lines.map((line) =>
    line.who === "echo"
      ? t("run:prologue.echo", { line: t(line.line) })
      : t(line.line),
  );
  const delays = dialogueLineDelays(texts);
  const done = instant || lines.every((_, index) => typed.has(index));

  const skip = (): void => {
    setSkipped(true);
  };

  const markTyped = (index: number): void => {
    setTyped((prev) => (prev.has(index) ? prev : new Set(prev).add(index)));
  };

  return (
    <div
      className={styles.dialogue}
      data-event-dialogue={done ? "done" : "typing"}
      data-testid="event-dialogue"
      data-press={done ? undefined : ""}
      onClick={done ? undefined : skip}
    >
      {lines.map((line, index) => (
        <div
          key={`${String(index)}-${line.line}`}
          className={styles.dialogueLine}
          data-dialogue-line={index}
          data-who={line.who}
          data-rise={instant ? undefined : ""}
          style={dialogueLineStyle(
            dialogueTone(line.who),
            instant ? null : (delays[index] ?? 0),
          )}
        >
          {line.who === "echo" || line.who === "narration" ? null : (
            <div className={styles.who}>
              <span aria-hidden className={styles.glyph}>
                {SPEAKER_GLYPH[line.who]}
              </span>
              <span>{t(`content:speaker.${line.who}`)}</span>
            </div>
          )}
          <Text
            size="sm"
            className={styles.dialogueText}
            c={
              line.who === "echo"
                ? tokens.accent
                : line.who === "narration"
                  ? tokens.dim
                  : tokens.text
            }
            fw={line.who === "echo" ? 600 : 400}
            fs={line.who === "narration" ? "italic" : undefined}
          >
            <Typewriter
              text={texts[index] ?? ""}
              delayMs={delays[index] ?? 0}
              instant={instant}
              onDone={() => {
                markTyped(index);
              }}
              onSkip={skip}
            />
          </Text>
        </div>
      ))}
    </div>
  );
};
