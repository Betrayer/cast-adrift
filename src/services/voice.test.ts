import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  barkPriority,
  pickVoice,
  VOICE_GAP_MS,
  voiceDecision,
  type VoiceLike,
} from "@/services/voice";

vi.mock("i18next", () => ({ default: { t: (key: string) => `said:${key}` } }));

const VOICES: VoiceLike[] = [
  { name: "eSpeak Russian", lang: "ru" },
  { name: "Microsoft Irina", lang: "ru-RU" },
  { name: "Google русский", lang: "ru-RU" },
  { name: "Samantha", lang: "en-US" },
  { name: "Google UK English Female", lang: "en_GB" },
  { name: "Lesya", lang: "uk-UA" },
  { name: "Anna", lang: "de-DE" },
];

describe("pickVoice", () => {
  it("takes a voice of the locale's own language, Google before Microsoft before the rest", () => {
    expect(pickVoice(VOICES, "ru")?.name).toBe("Google русский");
    expect(pickVoice(VOICES, "en")?.name).toBe("Google UK English Female");
    expect(pickVoice(VOICES, "uk")?.name).toBe("Lesya");
    expect(pickVoice(VOICES, "de")?.name).toBe("Anna");
  });

  it("speaks no wrong language: a locale without a voice gets none", () => {
    expect(pickVoice(VOICES, "pl")).toBeNull();
    expect(pickVoice([{ name: "Ukulele", lang: "ukr" }], "uk")).toBeNull();
  });

  it("prefers the locale's named voice over an unnamed one", () => {
    expect(pickVoice([{ name: "Alex", lang: "en-US" }, { name: "Daniel", lang: "en-GB" }], "en")?.name).toBe("Daniel");
  });
});

describe("barkPriority", () => {
  it("ranks boss moments over near death over landmarks over chatter", () => {
    expect(barkPriority("bossPhase")).toBe(3);
    expect(barkPriority("minibossIntro")).toBe(3);
    expect(barkPriority("lowHull")).toBe(2);
    expect(barkPriority("threshold")).toBe(1);
    expect(barkPriority("sectorEnter:3")).toBe(1);
    expect(barkPriority("idleMap")).toBe(0);
    expect(barkPriority("firstKill:raider")).toBe(0);
  });
});

describe("voiceDecision", () => {
  it("lets only a strictly higher bark cut the one in flight", () => {
    expect(voiceDecision({ inFlight: 1, lastStartAt: 0 }, 3, 1000)).toBe("preempt");
    expect(voiceDecision({ inFlight: 1, lastStartAt: 0 }, 1, 1000)).toBe("drop");
    expect(voiceDecision({ inFlight: 2, lastStartAt: 0 }, 0, 1000)).toBe("drop");
  });

  it("starts at most one utterance per gap when nothing is in flight", () => {
    expect(voiceDecision({ inFlight: null, lastStartAt: 0 }, 3, VOICE_GAP_MS - 1)).toBe("drop");
    expect(voiceDecision({ inFlight: null, lastStartAt: 0 }, 0, VOICE_GAP_MS)).toBe("speak");
    expect(voiceDecision({ inFlight: null, lastStartAt: null }, 0, 0)).toBe("speak");
  });
});

interface Spoken {
  text: string;
  lang: string;
  rate: number;
  pitch: number;
  volume: number;
  voice: string;
}

const fakeSpeech = () => {
  const spoken: Spoken[] = [];
  let current: { onend: (() => void) | null } | null = null;
  const synth = {
    speaking: false,
    cancelled: 0,
    getVoices: () => VOICES,
    speak(utterance: { text: string; lang: string; rate: number; pitch: number; volume: number; voice: VoiceLike; onend: (() => void) | null }) {
      spoken.push({
        text: utterance.text,
        lang: utterance.lang,
        rate: utterance.rate,
        pitch: utterance.pitch,
        volume: utterance.volume,
        voice: utterance.voice.name,
      });
      synth.speaking = true;
      current = utterance;
    },
    cancel() {
      synth.cancelled += 1;
      synth.speaking = false;
    },
    finish() {
      synth.speaking = false;
      current?.onend?.();
    },
  };
  return { synth, spoken };
};

class FakeUtterance {
  text: string;
  lang = "";
  rate = 1;
  pitch = 1;
  volume = 1;
  voice: VoiceLike | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

const memoryStorage = () => ({ getItem: () => null, setItem: () => undefined, removeItem: () => undefined });

const boot = async (hidden = false) => {
  vi.resetModules();
  const { synth, spoken } = fakeSpeech();
  const storage = memoryStorage();
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", { speechSynthesis: synth, localStorage: storage });
  vi.stubGlobal("document", { hidden, addEventListener: vi.fn() });
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  const clock = await import("@/services/clock");
  let at = 100_000;
  clock.setClockSource(() => at);
  const { useSettingsStore } = await import("@/stores/settingsStore");
  useSettingsStore.setState({ voice: true, locale: "ru", sfxVol: 0.5 });
  const voice = await import("@/services/voice");
  return {
    voice,
    synth,
    spoken,
    settings: useSettingsStore,
    advance: (ms: number) => {
      at += ms;
    },
  };
};

describe("the voice at runtime", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("speaks a bark in the locale's voice at the computer's rate and pitch, as loud as the effects", async () => {
    const { voice, spoken } = await boot();
    expect(voice.sayBark("lowHull", "content:bark.lowHull.1")).toBe(true);
    expect(spoken).toEqual([
      { text: "said:content:bark.lowHull.1", lang: "ru-RU", rate: 1.05, pitch: 0.85, volume: 0.5, voice: "Google русский" },
    ]);
  });

  it("stays silent with the setting off, the effects muted or the tab hidden", async () => {
    const off = await boot();
    off.settings.setState({ voice: false });
    expect(off.voice.sayBark("lowHull", "content:bark.lowHull.1")).toBe(false);
    const muted = await boot();
    muted.settings.setState({ sfxVol: 0 });
    expect(muted.voice.sayBark("lowHull", "content:bark.lowHull.1")).toBe(false);
    const hidden = await boot(true);
    expect(hidden.voice.sayBark("lowHull", "content:bark.lowHull.1")).toBe(false);
    expect([...off.spoken, ...muted.spoken, ...hidden.spoken]).toEqual([]);
  });

  it("skips quietly where the browser has no speech", async () => {
    vi.resetModules();
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", { localStorage: storage });
    vi.stubGlobal("document", { hidden: false, addEventListener: vi.fn() });
    const { useSettingsStore } = await import("@/stores/settingsStore");
    useSettingsStore.setState({ voice: true, locale: "en", sfxVol: 0.5 });
    const voice = await import("@/services/voice");
    expect(voice.voiceAvailable()).toBe(false);
    expect(voice.sayBark("lowHull", "content:bark.lowHull.1")).toBe(false);
  });

  it("lets a boss moment cut idle chatter and drops chatter over a boss moment", async () => {
    const { voice, synth, spoken } = await boot();
    expect(voice.sayBark("idleMap", "content:bark.idleMap.1")).toBe(true);
    expect(voice.sayBark("bossPhase", "content:bark.bossPhase.1")).toBe(true);
    expect(synth.cancelled).toBe(1);
    expect(voice.sayBark("idleMap", "content:bark.idleMap.2")).toBe(false);
    expect(spoken.map((line) => line.text)).toEqual(["said:content:bark.idleMap.1", "said:content:bark.bossPhase.1"]);
  });

  it("waits out the twelve seconds after a finished line", async () => {
    const { voice, synth, advance } = await boot();
    expect(voice.sayBark("idleMap", "content:bark.idleMap.1")).toBe(true);
    synth.finish();
    advance(VOICE_GAP_MS - 1);
    expect(voice.sayBark("lowHull", "content:bark.lowHull.1")).toBe(false);
    advance(1);
    expect(voice.sayBark("lowHull", "content:bark.lowHull.1")).toBe(true);
  });

  it("finds no voice for a language the device does not speak", async () => {
    const { voice, settings, spoken } = await boot();
    settings.setState({ locale: "pl" });
    expect(voice.voiceFor("pl")).toBeNull();
    expect(voice.sayBark("lowHull", "content:bark.lowHull.1")).toBe(false);
    expect(spoken).toEqual([]);
  });
});
