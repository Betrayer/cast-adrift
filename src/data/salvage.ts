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

const salvageFace = (
  id: SalvageFaceId,
  body: Omit<SalvageFace, "id" | "name" | "desc" | "line">,
): SalvageFace => ({
  id,
  name: `content:salvage.${id}.name`,
  desc: `content:salvage.${id}.desc`,
  line: `content:salvage.${id}.line`,
  ...body,
});

export const SALVAGE_FACES: readonly SalvageFace[] = [
  salvageFace("scrap", {
    weight: 3,
    effects: [{ k: "scrap", n: SALVAGE_SCRAP }],
  }),
  salvageFace("repair", {
    weight: 3,
    effects: [{ k: "hull", n: SALVAGE_REPAIR }],
  }),
  salvageFace("recon", {
    weight: 2,
    effects: [{ k: "nodeMod", mod: "sectorReveal", n: SALVAGE_RECON_ROWS }],
  }),
  salvageFace("discount", {
    weight: 2,
    effects: [
      { k: "nodeMod", mod: "shipyardDiscount", n: SALVAGE_DISCOUNT_SCRAP },
    ],
  }),
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
