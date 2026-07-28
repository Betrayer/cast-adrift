import type { LocKey } from "@/types/content";

export interface FragmentDef {
  id: string;
  sector: number;
  text: LocKey;
}

// Jump fragments: one-line world facts shown on the sector interstitial,
// weighted unseen-first. DESIGN §2.1 target: 80, sixteen per sector.
export const FRAGMENTS_PER_SECTOR = 16;

const fragment = (sector: number, index: number): FragmentDef => ({
  id: `f${String(sector)}-${String(index)}`,
  sector,
  text: `content:fragment.f${String(sector)}-${String(index)}`,
});

export const FRAGMENTS: readonly FragmentDef[] = [1, 2, 3, 4, 5].flatMap(
  (sector) =>
    Array.from({ length: FRAGMENTS_PER_SECTOR }, (_, i) =>
      fragment(sector, i + 1),
    ),
);

export const fragmentsForSector = (sector: number): FragmentDef[] =>
  FRAGMENTS.filter((f) => f.sector === sector);
