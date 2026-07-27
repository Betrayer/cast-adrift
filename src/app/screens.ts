import type { ScreenId } from "@/types";

// Screens still waiting on a later phase. Empty as of Phase 9 — every ScreenId
// now has a real component behind it.
export const screenPhase: Partial<Record<ScreenId, number>> = {};
