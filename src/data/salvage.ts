import type { RngStream } from "@/services/rng";
import type { LocKey } from "@/types/content";
import type { EventEffect } from "@/types/events";

export type SalvageFaceId = "scrap" | "repair" | "recon" | "discount";

export interface SalvageFace {
  id: SalvageFaceId;
  name: LocKey;
  desc: LocKey;
  line: LocKey;
  weight: number;
  effects: readonly EventEffect[];
}

export const SALVAGE_SCRAP = 18;
export const SALVAGE_REPAIR = 3;
export const SALVAGE_RECON_ROWS = 1;
export const SALVAGE_DISCOUNT_SCRAP = 25;

export const SALVAGE_OFFER_SIZE = 3;

export const SALVAGE_FACES: readonly SalvageFace[] = [
  {
    id: "scrap",
    name: "content:salvage.scrap.name",
    desc: "content:salvage.scrap.desc",
    line: "content:salvage.scrap.line",
    weight: 3,
    effects: [{ k: "scrap", n: SALVAGE_SCRAP }],
  },
  {
    id: "repair",
    name: "content:salvage.repair.name",
    desc: "content:salvage.repair.desc",
    line: "content:salvage.repair.line",
    weight: 3,
    effects: [{ k: "hull", n: SALVAGE_REPAIR }],
  },
  {
    id: "recon",
    name: "content:salvage.recon.name",
    desc: "content:salvage.recon.desc",
    line: "content:salvage.recon.line",
    weight: 2,
    effects: [{ k: "nodeMod", mod: "sectorReveal", n: SALVAGE_RECON_ROWS }],
  },
  {
    id: "discount",
    name: "content:salvage.discount.name",
    desc: "content:salvage.discount.desc",
    line: "content:salvage.discount.line",
    weight: 2,
    effects: [
      { k: "nodeMod", mod: "shipyardDiscount", n: SALVAGE_DISCOUNT_SCRAP },
    ],
  },
];

export const SALVAGE_BY_ID: ReadonlyMap<string, SalvageFace> = new Map(
  SALVAGE_FACES.map((face) => [face.id, face]),
);

export const drawSalvageOffer = (
  stream: RngStream,
  size = SALVAGE_OFFER_SIZE,
  exclude: readonly SalvageFaceId[] = [],
): SalvageFaceId[] => {
  const pool = SALVAGE_FACES.filter((face) => !exclude.includes(face.id));
  const offer: SalvageFaceId[] = [];
  while (offer.length < size && pool.length > 0) {
    const picked = stream.weighted(
      pool.map((face) => [face.id, face.weight] as const),
    );
    offer.push(picked);
    const at = pool.findIndex((face) => face.id === picked);
    if (at >= 0) pool.splice(at, 1);
  }
  return offer;
};
