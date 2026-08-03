import type { ScreenId } from "@/types";

export interface StartTarget {
  screen: ScreenId;
  params?: Record<string, string>;
}

// `t.me/castadrift_bot/app?startapp=daily` and the bot's own `/daily` command
// both arrive here as `tgWebAppStartParam`. Telegram restricts the value to
// [A-Za-z0-9_-], so the routes are flat words rather than paths.
const ROUTES: Record<string, StartTarget> = {
  play: { screen: "modes" },
  modes: { screen: "modes" },
  daily: { screen: "modes", params: { focus: "daily" } },
  drift: { screen: "modes", params: { focus: "drift" } },
  contracts: { screen: "contracts" },
  board: { screen: "leaderboard", params: { tab: "drift" } },
  leaderboard: { screen: "leaderboard", params: { tab: "drift" } },
  chart: { screen: "chart" },
  hangar: { screen: "hangar" },
  codex: { screen: "codex" },
  profile: { screen: "profile" },
};

export const startTargetFor = (param: string | null): StartTarget | null => {
  if (param === null) return null;
  return ROUTES[param.trim().toLowerCase()] ?? null;
};
