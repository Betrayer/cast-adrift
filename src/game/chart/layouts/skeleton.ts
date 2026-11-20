import type { ChartNodeDef, ChartNodeKind } from "@/data/chart/types";
import type { School } from "@/types/content";

export interface ArmSkeleton {
  school: School;
  index: number;
  spine: readonly string[];
  sides: ReadonlyMap<string, readonly string[]>;
  tips: readonly string[];
}

export interface RingMember {
  id: string;
  index: number;
  count: number;
}

export interface NexusSkeleton {
  id: string;
  ends: readonly [string, string];
}

export interface ChartSkeleton {
  kinds: ReadonlyMap<string, ChartNodeKind>;
  arms: readonly ArmSkeleton[];
  inner: readonly RingMember[];
  outer: readonly RingMember[];
  nexus: readonly NexusSkeleton[];
}

const HUB_INNER = /^hub-i(\d+)$/;
const HUB_OUTER = /^hub-o(\d+)$/;

const ringMembers = (
  nodes: readonly ChartNodeDef[],
  pattern: RegExp,
): RingMember[] => {
  const found = nodes.flatMap((node) => {
    const match = pattern.exec(node.id);
    return match === null ? [] : [{ id: node.id, index: Number(match[1]) }];
  });
  return found
    .sort((a, b) => a.index - b.index)
    .map((member) => ({ ...member, count: found.length }));
};

const isSchool = (node: ChartNodeDef): boolean =>
  node.constellation !== "hub" && node.constellation !== "nexus";

export const chartSkeleton = (nodes: readonly ChartNodeDef[]): ChartSkeleton => {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const children = new Map<string, ChartNodeDef[]>();
  for (const node of nodes) {
    if (!isSchool(node) || node.kind === "gate") continue;
    const parent = node.links[0];
    if (parent === undefined) continue;
    const list = children.get(parent) ?? [];
    list.push(node);
    children.set(parent, list);
  }

  const arms: ArmSkeleton[] = [];
  for (const gate of nodes) {
    if (gate.kind !== "gate" || !isSchool(gate)) continue;
    const school = gate.constellation as School;
    const spine: string[] = [gate.id];
    const sides = new Map<string, string[]>();
    let tips: string[] = [];
    let current: ChartNodeDef = gate;
    for (;;) {
      const kids = children.get(current.id) ?? [];
      const beside = kids.filter((kid) => kid.depth === current.depth);
      if (beside.length > 0) sides.set(current.id, beside.map((kid) => kid.id));
      const keystones = kids.filter((kid) => kid.kind === "keystone");
      if (keystones.length > 0) tips = keystones.map((kid) => kid.id);
      const next = kids.find(
        (kid) => kid.depth === current.depth + 1 && kid.kind !== "keystone",
      );
      if (next === undefined) break;
      spine.push(next.id);
      current = next;
    }
    arms.push({ school, index: arms.length, spine, sides, tips });
  }

  const nexus: NexusSkeleton[] = nodes.flatMap((node) => {
    if (node.constellation !== "nexus") return [];
    const [a, b] = node.links;
    if (a === undefined || b === undefined) return [];
    if (!byId.has(a) || !byId.has(b)) return [];
    return [{ id: node.id, ends: [a, b] as const }];
  });

  return {
    kinds: new Map(nodes.map((node) => [node.id, node.kind])),
    arms,
    inner: ringMembers(nodes, HUB_INNER),
    outer: ringMembers(nodes, HUB_OUTER),
    nexus,
  };
};
