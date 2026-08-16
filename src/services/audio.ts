import { Howl } from "howler";
import {
  HOT_SFX,
  musicSources,
  sfxSources,
  SFX_GAIN,
  SFX_IDS,
  SFX_JITTER,
  SFX_VARIANTS,
  variantId,
  type MusicId,
  type SfxId,
} from "@/data/audio";
import { useSettingsStore } from "@/stores/settingsStore";

const howls = new Map<string, Howl>();
const beds = new Map<MusicId, Howl>();
let initialized = false;
let unsubscribe: (() => void) | null = null;
let visibilityBound = false;
let lifecycleBound = false;

const CROSSFADE_MS = 900;
const DEFAULT_LAYER_GAIN = 0.55;
const DUCK_GAIN = 0.35;
const VOICE_CAP = 3;
const WARM_DELAY_MS = 2500;

interface BedState {
  track: MusicId | null;
  layer: MusicId | null;
  layerGain: number;
  suspended: boolean;
}

const bed: BedState = {
  track: null,
  layer: null,
  layerGain: DEFAULT_LAYER_GAIN,
  suspended: false,
};

// Ducks nest: a loot fanfare inside a level-up ceremony must not un-duck the bed
// when the shorter of the two expires, so the depth is a count, not a flag.
let duckDepth = 0;

interface Voice {
  howl: Howl;
  soundId: number;
}

const voices = new Map<SfxId, Voice[]>();
const cursors = new Map<SfxId, number>();

// Detune walks a fixed ring instead of a random draw: the same reason the clips
// themselves are seeded — two identical sessions must sound identical.
const JITTER_RING = [0, 0.62, -0.41, 0.93, -0.78, 0.25, -0.95, 0.47];
let jitterCursor = 0;

const sfxVolume = (): number => useSettingsStore.getState().sfxVol;
const musicVolume = (): number => useSettingsStore.getState().musicVol;

const bedHowl = (id: MusicId): Howl => {
  let howl = beds.get(id);
  if (howl === undefined) {
    howl = new Howl({
      src: [...musicSources(id)],
      loop: true,
      volume: 0,
      html5: false,
    });
    beds.set(id, howl);
  }
  return howl;
};

const targetGain = (id: MusicId): number => {
  if (bed.suspended) return 0;
  const base = musicVolume() * (duckDepth > 0 ? DUCK_GAIN : 1);
  if (id === bed.layer) return base * bed.layerGain;
  return id === bed.track ? base : 0;
};

const retune = (fadeMs: number): void => {
  for (const [id, howl] of beds) {
    const target = targetGain(id);
    const current = howl.volume();
    if (target <= 0.0001) {
      if (howl.playing()) {
        howl.fade(typeof current === "number" ? current : 0, 0, fadeMs);
        setTimeout(() => {
          if (targetGain(id) <= 0.0001) howl.stop();
        }, fadeMs + 40);
      }
      continue;
    }
    if (!howl.playing()) {
      howl.volume(0);
      howl.play();
    }
    howl.fade(typeof current === "number" ? current : 0, target, fadeMs);
  }
};

const stopAllVoices = (): void => {
  for (const list of voices.values()) {
    for (const voice of list) voice.howl.stop(voice.soundId);
  }
  voices.clear();
};

const onVisibility = (): void => {
  bed.suspended = document.hidden;
  if (document.hidden) stopAllVoices();
  retune(document.hidden ? 200 : CROSSFADE_MS);
};

const onPageHide = (event: PageTransitionEvent): void => {
  if (event.persisted) return;
  disposeAudio();
};

const sfxHowl = (fileId: string): Howl => {
  let howl = howls.get(fileId);
  if (howl === undefined) {
    howl = new Howl({ src: [...sfxSources(fileId)], preload: true });
    howls.set(fileId, howl);
  }
  return howl;
};

const warmAll = (): void => {
  for (const id of SFX_IDS) {
    const count = SFX_VARIANTS[id] ?? 1;
    for (let v = 0; v < count; v += 1) sfxHowl(variantId(id, v));
  }
};

export const initAudio = (): void => {
  if (initialized) return;
  initialized = true;
  for (const id of HOT_SFX) sfxHowl(id);
  unsubscribe = useSettingsStore.subscribe((state, prev) => {
    if (state.sfxVol !== prev.sfxVol && state.sfxVol <= 0) stopAllVoices();
    if (state.musicVol !== prev.musicVol) retune(180);
  });
  if (!visibilityBound && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibility);
    visibilityBound = true;
  }
  if (!lifecycleBound && typeof window !== "undefined") {
    window.addEventListener("pagehide", onPageHide);
    lifecycleBound = true;
  }
  if (typeof window === "undefined") return;
  const idle = window.requestIdleCallback;
  if (typeof idle === "function") idle(warmAll, { timeout: WARM_DELAY_MS });
  else setTimeout(warmAll, WARM_DELAY_MS);
};

const takeVoiceSlot = (id: SfxId): Voice[] => {
  const list = voices.get(id) ?? [];
  const live = list.filter((voice) => voice.howl.playing(voice.soundId));
  while (live.length >= VOICE_CAP) {
    const oldest = live.shift();
    oldest?.howl.stop(oldest.soundId);
  }
  voices.set(id, live);
  return live;
};

export interface SfxOptions {
  rate?: number;
  gain?: number;
}

export const playSfx = (id: SfxId, options?: SfxOptions): void => {
  if (typeof window === "undefined") return;
  if (!initialized) initAudio();
  if (bed.suspended) return;
  const volume = sfxVolume();
  if (volume <= 0) return;

  const variants = SFX_VARIANTS[id] ?? 1;
  const cursor = (cursors.get(id) ?? 0) % variants;
  cursors.set(id, cursor + 1);
  const howl = sfxHowl(variantId(id, cursor));

  const live = takeVoiceSlot(id);
  const soundId = howl.play();
  live.push({ howl, soundId });

  howl.volume(volume * (SFX_GAIN[id] ?? 1) * (options?.gain ?? 1), soundId);
  const jitter = SFX_JITTER[id] ?? 0;
  const step = JITTER_RING[jitterCursor % JITTER_RING.length] ?? 0;
  jitterCursor += 1;
  const rate = (options?.rate ?? 1) * (1 + step * jitter);
  if (rate !== 1) howl.rate(Math.max(0.5, Math.min(4, rate)), soundId);
};

// One bed at a time plus an optional layer that rides on top of it: the boss
// intensity track is the same length, so it stays phase-locked to the battle bed.
export const playMusic = (
  track: MusicId | null,
  options?: { layer?: MusicId | null; layerGain?: number; fadeMs?: number },
): void => {
  if (typeof window === "undefined") return;
  if (!initialized) initAudio();
  const layer = options?.layer ?? null;
  const layerGain = options?.layerGain ?? DEFAULT_LAYER_GAIN;
  if (
    bed.track === track &&
    bed.layer === layer &&
    bed.layerGain === layerGain
  ) {
    return;
  }
  const gainOnly = bed.track === track && bed.layer === layer;
  bed.track = track;
  bed.layer = layer;
  bed.layerGain = layerGain;
  if (track !== null) bedHowl(track);
  if (layer !== null) bedHowl(layer);
  retune(options?.fadeMs ?? (gainOnly ? 700 : CROSSFADE_MS));
};

// DESIGN §10: fanfares own the mix for their length — the bed steps back
// instead of fighting them.
export const duckMusic = (ms = 1600): void => {
  duckDepth += 1;
  retune(160);
  setTimeout(() => {
    duckDepth = Math.max(0, duckDepth - 1);
    if (duckDepth === 0) retune(500);
  }, ms);
};

export const musicDuckDepth = (): number => duckDepth;

export const disposeAudio = (): void => {
  unsubscribe?.();
  unsubscribe = null;
  if (visibilityBound && typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", onVisibility);
    visibilityBound = false;
  }
  if (lifecycleBound && typeof window !== "undefined") {
    window.removeEventListener("pagehide", onPageHide);
    lifecycleBound = false;
  }
  voices.clear();
  cursors.clear();
  for (const howl of howls.values()) howl.unload();
  howls.clear();
  for (const howl of beds.values()) howl.unload();
  beds.clear();
  bed.track = null;
  bed.layer = null;
  bed.layerGain = DEFAULT_LAYER_GAIN;
  bed.suspended = false;
  duckDepth = 0;
  initialized = false;
};
