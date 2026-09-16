import { describe, expect, it } from "vitest";
import { ALL_EVENTS } from "@/data/events";

const duplicateIds = (ids: readonly string[]): string[] => {
  const seen = new Set<string>();
  const twice = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) twice.add(id);
    seen.add(id);
  }
  return [...twice].sort();
};

describe("event option ids", () => {
  it("never repeats an option id inside one event", () => {
    const offenders = ALL_EVENTS.flatMap((event) =>
      duplicateIds(event.options.map((option) => option.id)).map(
        (id) => `${event.id}.${id}`,
      ),
    );
    expect(offenders).toEqual([]);
  });

  it("keeps every event option addressable by its own id", () => {
    for (const event of ALL_EVENTS) {
      for (const option of event.options) {
        expect(
          event.options.filter((other) => other.id === option.id),
        ).toHaveLength(1);
      }
    }
  });
});
