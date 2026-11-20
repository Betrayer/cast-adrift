import i18n from "i18next";
import { isMajorBarkTrigger } from "@/game/narrative/barks";
import { now } from "@/services/clock";
import { useSettingsStore } from "@/stores/settingsStore";

export const VOICE_GAP_MS = 12_000;
export const VOICE_RATE = 1.05;
export const VOICE_PITCH = 0.85;
export const SAMPLE_PRIORITY = 4;

const GENERIC_NAMES: readonly string[] = ["Google", "Microsoft"];

const LOCALE_NAMES: Readonly<Record<string, readonly string[]>> = {
  ru: ["Milena", "Yuri"],
  en: ["Samantha", "Daniel"],
  uk: ["Lesya"],
};

const BOSS_TRIGGERS: ReadonlySet<string> = new Set(["minibossIntro", "bossPhase", "bossPartDown"]);

const PERIL_TRIGGERS: ReadonlySet<string> = new Set(["lowHull", "nearDeathWin"]);

export interface VoiceLike {
  name: string;
  lang: string;
}

const langOf = (voice: VoiceLike): string => voice.lang.toLowerCase().replace("_", "-");

export const pickVoice = <T extends VoiceLike>(voices: readonly T[], locale: string): T | null => {
  const own = voices.filter((voice) => {
    const lang = langOf(voice);
    return lang === locale || lang.startsWith(`${locale}-`);
  });
  const names = [...GENERIC_NAMES, ...(LOCALE_NAMES[locale] ?? [])];
  const rank = (voice: T): number => {
    const index = names.findIndex((name) => voice.name.includes(name));
    return index < 0 ? names.length : index;
  };
  let best: T | null = null;
  for (const voice of own) if (best === null || rank(voice) < rank(best)) best = voice;
  return best;
};

export const barkPriority = (trigger: string): number => {
  if (BOSS_TRIGGERS.has(trigger)) return 3;
  if (PERIL_TRIGGERS.has(trigger)) return 2;
  if (isMajorBarkTrigger(trigger)) return 1;
  return 0;
};

export interface VoiceClock {
  inFlight: number | null;
  lastStartAt: number | null;
}

export type VoiceDecision = "speak" | "preempt" | "drop";

export const voiceDecision = (clock: VoiceClock, priority: number, at: number): VoiceDecision => {
  if (clock.inFlight !== null) return priority > clock.inFlight ? "preempt" : "drop";
  if (clock.lastStartAt !== null && at - clock.lastStartAt < VOICE_GAP_MS) return "drop";
  return "speak";
};

const speech = (): SpeechSynthesis | null => {
  if (typeof window === "undefined" || typeof SpeechSynthesisUtterance === "undefined") return null;
  return (window.speechSynthesis as SpeechSynthesis | undefined) ?? null;
};

export const voiceAvailable = (): boolean => speech() !== null;

export const voiceFor = (locale: string): SpeechSynthesisVoice | null => {
  const synth = speech();
  return synth === null ? null : pickVoice(synth.getVoices(), locale);
};

let inFlight: { utterance: SpeechSynthesisUtterance; priority: number } | null = null;
let lastStartAt: number | null = null;
let hideBound = false;

export const stopVoice = (): void => {
  inFlight = null;
  speech()?.cancel();
};

const bindHide = (): void => {
  if (hideBound || typeof document === "undefined") return;
  hideBound = true;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopVoice();
  });
};

const utter = (text: string, priority: number): boolean => {
  const synth = speech();
  if (synth === null) return false;
  const { locale, sfxVol } = useSettingsStore.getState();
  if (sfxVol <= 0) return false;
  const voice = pickVoice(synth.getVoices(), locale);
  if (voice === null) return false;
  bindHide();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = VOICE_RATE;
  utterance.pitch = VOICE_PITCH;
  utterance.volume = Math.min(1, sfxVol);
  const settle = (): void => {
    if (inFlight?.utterance === utterance) inFlight = null;
  };
  utterance.onend = settle;
  utterance.onerror = settle;
  inFlight = { utterance, priority };
  lastStartAt = now();
  synth.speak(utterance);
  return true;
};

const liveClock = (): VoiceClock => ({
  inFlight: inFlight !== null && speech()?.speaking === true ? inFlight.priority : null,
  lastStartAt,
});

export const sayBark = (trigger: string, key: string): boolean => {
  if (!useSettingsStore.getState().voice) return false;
  if (typeof document !== "undefined" && document.hidden) return false;
  const priority = barkPriority(trigger);
  const decision = voiceDecision(liveClock(), priority, now());
  if (decision === "drop") return false;
  if (decision === "preempt") stopVoice();
  return utter(i18n.t(key), priority);
};

export const sampleVoice = (text: string): boolean => {
  stopVoice();
  return utter(text, SAMPLE_PRIORITY);
};
