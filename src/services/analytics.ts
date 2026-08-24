import type { Analytics } from "firebase/analytics";
import { now } from "@/services/clock";
import { APP_VERSION } from "@/services/version";

export type AnalyticsEvent =
  | { name: "session_start"; params: { platform: string } }
  | { name: "run_start"; params: { mode: string; ship: string } }
  | {
      name: "node_complete";
      params: { type: string; sector: number; depth: number };
    }
  | {
      name: "battle_result";
      params: { win: boolean; turns: number; sector: number };
    }
  | {
      name: "death";
      params: { sector: number; depth: number; cause: string };
    }
  | { name: "ending"; params: { id: string; ascension: number } }
  | { name: "meta_purchase"; params: { kind: string } }
  | { name: "daily_played"; params: { date: string; score: number } }
  | { name: "contract_star"; params: { contract: string; stars: number } }
  | { name: "threshold"; params: { ascension: number; axis: number } }
  | { name: "onboard_step"; params: { step: number; id: string; ms: number } }
  | { name: "onboard_skip"; params: { step: number; ms: number } }
  | { name: "onboard_done"; params: { ms: number; skipped: boolean } };

type EventParams = Record<string, string | number | boolean>;

let instance: Analytics | null = null;
let unavailable = false;
let pending: Promise<Analytics | null> | null = null;

const measurementId = (): string =>
  import.meta.env.VITE_FB_MEASUREMENT_ID.trim();

const ensureAnalytics = async (): Promise<Analytics | null> => {
  if (instance !== null) return instance;
  if (unavailable) return null;
  pending ??= (async (): Promise<Analytics | null> => {
    try {
      if (measurementId() === "") {
        unavailable = true;
        return null;
      }
      const { getAnalytics, isSupported, setUserProperties } = await import(
        "firebase/analytics"
      );
      if (!(await isSupported())) {
        unavailable = true;
        return null;
      }
      const { analyticsApp } = await import("@/services/firebase");
      instance = getAnalytics(analyticsApp());
      setUserProperties(instance, { app_version: APP_VERSION });
      return instance;
    } catch (error) {
      console.warn("analytics: unavailable", error);
      unavailable = true;
      return null;
    } finally {
      pending = null;
    }
  })();
  return pending;
};

export interface TrackedEvent {
  name: string;
  params: EventParams;
  at: number;
}

const TRACE_CAP = 64;
const trace: TrackedEvent[] = [];

export const trackedEvents = (): readonly TrackedEvent[] => trace;

export const trackEvent = (event: AnalyticsEvent): void => {
  trace.push({
    name: event.name,
    params: { ...(event.params as EventParams) },
    at: now(),
  });
  if (trace.length > TRACE_CAP) trace.shift();
  void (async () => {
    try {
      const analytics = await ensureAnalytics();
      if (analytics === null) return;
      const { logEvent } = await import("firebase/analytics");
      logEvent(analytics, event.name, {
        ...(event.params as EventParams),
        version: APP_VERSION,
      });
    } catch {}
  })();
};

export const trackSessionStart = (platform: string): void => {
  trackEvent({ name: "session_start", params: { platform } });
};
