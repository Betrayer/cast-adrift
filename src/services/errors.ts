import { APP_VERSION } from "@/services/version";
import { useAppStore } from "@/stores/appStore";

export interface ErrorReport {
  at: number;
  message: string;
  stack: string;
  screen: string;
  version: string;
}

const RING_SIZE = 20;
const SESSION_QUOTA = 5;
const MIN_GAP_MS = 10_000;
const STACK_LIMIT = 1000;
const MESSAGE_LIMIT = 300;

const ring: ErrorReport[] = [];
const seen = new Set<string>();

let installed = false;
let sent = 0;
let lastSentAt = 0;

export const recentErrors = (): readonly ErrorReport[] => ring;

const dayKey = (at: number): string =>
  new Date(at).toISOString().slice(0, 10).replace(/-/g, "");

const clip = (value: string, limit: number): string =>
  value.length > limit ? value.slice(0, limit) : value;

const describe = (reason: unknown): { message: string; stack: string } => {
  if (reason instanceof Error) {
    return {
      message: clip(reason.message, MESSAGE_LIMIT),
      stack: clip(reason.stack ?? "", STACK_LIMIT),
    };
  }
  return { message: clip(String(reason), MESSAGE_LIMIT), stack: "" };
};

const shouldSend = (report: ErrorReport): boolean => {
  const key = `${report.message}@${report.screen}`;
  if (seen.has(key)) return false;
  if (sent >= SESSION_QUOTA) return false;
  if (report.at - lastSentAt < MIN_GAP_MS) return false;
  seen.add(key);
  sent += 1;
  lastSentAt = report.at;
  return true;
};

const push = async (report: ErrorReport): Promise<void> => {
  try {
    const { ensureAnonAuth, db } = await import("@/services/firebase");
    const uid = await ensureAnonAuth();
    if (uid === null) return;
    const { addDoc, collection } = await import("firebase/firestore");
    await addDoc(collection(db(), "errors", dayKey(report.at), "items"), {
      at: report.at,
      message: report.message,
      stack: report.stack,
      screen: report.screen,
      version: report.version,
    });
  } catch {}
};

export const reportError = (reason: unknown): void => {
  const { message, stack } = describe(reason);
  if (message === "") return;
  const report: ErrorReport = {
    at: Date.now(),
    message,
    stack,
    screen: useAppStore.getState().screen,
    version: APP_VERSION,
  };
  ring.push(report);
  if (ring.length > RING_SIZE) ring.shift();
  if (shouldSend(report)) void push(report);
};

export const setupErrorReporting = (): void => {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (event) => {
    reportError(event.error ?? event.message);
  });
  window.addEventListener("unhandledrejection", (event) => {
    reportError(event.reason);
  });
};
