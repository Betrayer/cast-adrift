import type { ChartNodeDef, ChartNodeKind, Constellation } from "@/data/chart/types";

export interface ChartFilter {
  text: string;
  constellations: readonly Constellation[];
  kinds: readonly ChartNodeKind[];
  tags: readonly string[];
  availableOnly: boolean;
}

export const EMPTY_CHART_FILTER: ChartFilter = {
  text: "",
  constellations: [],
  kinds: [],
  tags: [],
  availableOnly: false,
};

export const CHART_FILTER_CONSTELLATIONS: readonly Constellation[] = [
  "hub",
  "red",
  "blue",
  "green",
  "yellow",
  "black",
  "grey",
  "prismatic",
  "nexus",
];

export const CHART_FILTER_KINDS: readonly ChartNodeKind[] = [
  "small",
  "gate",
  "notable",
  "confluence",
  "nexus",
  "keystone",
];

const normalised = (text: string): string => text.trim().toLocaleLowerCase();

export const chartFilterCount = (filter: ChartFilter): number =>
  (normalised(filter.text) === "" ? 0 : 1) +
  filter.constellations.length +
  filter.kinds.length +
  filter.tags.length +
  (filter.availableOnly ? 1 : 0);

export interface ChartFilterReads {
  title: (node: ChartNodeDef) => string;
  available: (id: string) => boolean;
}

export const matchesChartFilter = (
  node: ChartNodeDef,
  filter: ChartFilter,
  reads: ChartFilterReads,
): boolean => {
  if (filter.constellations.length > 0 && !filter.constellations.includes(node.constellation)) return false;
  if (filter.kinds.length > 0 && !filter.kinds.includes(node.kind)) return false;
  if (filter.tags.length > 0 && !(node.tags ?? []).some((tag) => filter.tags.includes(tag))) return false;
  if (filter.availableOnly && !reads.available(node.id)) return false;
  const query = normalised(filter.text);
  return query === "" || normalised(reads.title(node)).includes(query);
};
