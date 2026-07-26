import type { LocKey } from "@/types/content";

export interface FragmentDef {
  id: string;
  sector: number;
  text: LocKey;
}

// Jump fragments: one-line world facts shown on the sector interstitial. The pool
// grows toward the DESIGN §2.1 target of 80 in Phase 10; these are the seams the
// campaign needs now — three per sector, unseen-first.
const fragment = (sector: number, index: number): FragmentDef => ({
  id: `f${String(sector)}-${String(index)}`,
  sector,
  text: `content:fragment.f${String(sector)}-${String(index)}`,
});

export const FRAGMENTS: readonly FragmentDef[] = [1, 2, 3, 4, 5].flatMap(
  (sector) => [1, 2, 3].map((index) => fragment(sector, index)),
);

export const fragmentsForSector = (sector: number): FragmentDef[] =>
  FRAGMENTS.filter((f) => f.sector === sector);
