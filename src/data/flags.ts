// Flags the run writes outside the event pipeline: battle entry, the prologue,
// and the beacon counters the sector map stamps.
export const RUNTIME_FLAGS: readonly string[] = [
  "hunterEngaged",
  "prologueRun",
  "survivedLethal",
  "beacon1",
  "beacon2",
  "beacon3",
  "beacon4",
  "beacon5",
  "crossedThreshold",
];

// Written by R7 content, read by a system that lands in a later phase. The flag
// lint accepts these and nothing else as write-without-read.
export const RESERVED_FLAGS: readonly string[] = [];

// Numeric flags whose value is the payload, not just its presence. They are
// consumed by the screen that spends them down.
export const COUNTER_FLAGS: readonly string[] = ["courierDiscount"];
