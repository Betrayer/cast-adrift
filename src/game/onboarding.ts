import { trackEvent } from "@/services/analytics";
import { now } from "@/services/clock";
import { useMetaStore } from "@/stores/metaStore";
import { useNarrativeStore } from "@/stores/narrativeStore";

export const BATTLE_LAYOUT_HINT = "battleLayouts";

export const HINT_IDS: readonly string[] = [BATTLE_LAYOUT_HINT];

let startedAt: number | null = null;

const elapsed = (): number =>
  startedAt === null ? 0 : Math.max(0, now() - startedAt);

export const beginCheckFunnel = (): void => {
  startedAt = now();
  trackEvent({ name: "onboard_step", params: { step: 0, id: "start", ms: 0 } });
};

export const noteCheckStep = (index: number, id: string): void => {
  trackEvent({
    name: "onboard_step",
    params: { step: index + 1, id, ms: elapsed() },
  });
};

export const noteCheckSkipped = (index: number): void => {
  trackEvent({ name: "onboard_skip", params: { step: index, ms: elapsed() } });
};

export const offerLayoutHint = (): void => {
  const meta = useMetaStore.getState();
  if (meta.tutorialSeen.includes(BATTLE_LAYOUT_HINT)) return;
  meta.markTutorialSeen(BATTLE_LAYOUT_HINT);
  useNarrativeStore.getState().pushHint("battle:layoutHint");
};

export const noteCheckFinished = (sandbox: boolean, skipped: boolean): void => {
  if (sandbox) return;
  trackEvent({ name: "onboard_done", params: { ms: elapsed(), skipped } });
  startedAt = null;
  const meta = useMetaStore.getState();
  if (!meta.stats.systemsCheckDone) meta.markSystemsCheckDone();
  offerLayoutHint();
};
