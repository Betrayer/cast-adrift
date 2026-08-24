import { isResumableScreen } from "@/app/routes";
import { ROOT_SCREEN, type StackEntry } from "@/stores/appStore";
import type { ScreenId } from "@/types";

export interface StartTarget {
  screen: ScreenId;
  params?: Record<string, string>;
  under?: readonly ScreenId[];
}

const ROUTES: Record<string, StartTarget> = {
  play: { screen: "modes" },
  modes: { screen: "modes" },
  daily: { screen: "modes", params: { focus: "daily" } },
  drift: { screen: "modes", params: { focus: "drift" } },
  contracts: { screen: "contracts", under: ["menu", "modes"] },
  board: { screen: "leaderboard", params: { tab: "drift" }, under: ["menu", "modes"] },
  leaderboard: {
    screen: "leaderboard",
    params: { tab: "drift" },
    under: ["menu", "modes"],
  },
  chart: { screen: "chart" },
  hangar: { screen: "hangar" },
  codex: { screen: "codex" },
  profile: { screen: "profile" },
  achievements: { screen: "achievements" },
  collection: { screen: "collection" },
  engraving: { screen: "engraving", under: ["menu", "hangar"] },
  settings: { screen: "settings" },
};

export const startTargetFor = (param: string | null): StartTarget | null => {
  if (param === null) return null;
  return ROUTES[param.trim().toLowerCase()] ?? null;
};

export const seedStackFor = (target: StartTarget): StackEntry[] => {
  if (target.screen === ROOT_SCREEN || !isResumableScreen(target.screen)) {
    return [];
  }
  const under = target.under ?? [ROOT_SCREEN];
  return under
    .filter((screen) => screen !== target.screen)
    .map((screen) => ({ screen, params: undefined }));
};
