import { Howl } from "howler";
import { SFX, type SfxId } from "@/data/audio";
import { useSettingsStore } from "@/stores/settingsStore";

const howls = new Map<SfxId, Howl>();
let initialized = false;
let unsubscribe: (() => void) | null = null;

const sfxVolume = (): number => useSettingsStore.getState().sfxVol;

export const initAudio = (): void => {
  if (initialized) return;
  initialized = true;
  const volume = sfxVolume();
  for (const id of Object.keys(SFX) as SfxId[]) {
    howls.set(id, new Howl({ src: [SFX[id]], volume, preload: true }));
  }
  unsubscribe = useSettingsStore.subscribe((state, prev) => {
    if (state.sfxVol === prev.sfxVol) return;
    for (const howl of howls.values()) howl.volume(state.sfxVol);
  });
};

export const playSfx = (id: SfxId): void => {
  if (typeof window === "undefined") return;
  if (!initialized) initAudio();
  const volume = sfxVolume();
  if (volume <= 0) return;
  const howl = howls.get(id);
  if (howl === undefined) return;
  howl.volume(volume);
  howl.play();
};

export const disposeAudio = (): void => {
  unsubscribe?.();
  unsubscribe = null;
  for (const howl of howls.values()) howl.unload();
  howls.clear();
  initialized = false;
};
