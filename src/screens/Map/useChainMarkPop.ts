import { useEffect } from "react";
import type { NodeId } from "@/game/map/types";
import { playSfx } from "@/services/audio";
import styles from "./MapScreen.module.css";

const chainMemory = new Map<string, Set<NodeId>>();

const chainMemoryKey = (seed: number, sector: number): string =>
  `${String(seed)}:${String(sector)}`;

const CHAIN_MARK_MS = 520;

export const useChainMarkPop = (
  chainNodes: ReadonlySet<NodeId>,
  seed: number,
  sector: number,
): void => {
  useEffect(() => {
    const key = chainMemoryKey(seed, sector);
    for (const stale of [...chainMemory.keys()]) {
      if (!stale.startsWith(`${String(seed)}:`)) chainMemory.delete(stale);
    }
    const seated = chainMemory.has(key);
    const known = chainMemory.get(key) ?? new Set<NodeId>();
    const fresh = [...chainNodes].filter((id) => !known.has(id));
    for (const id of chainNodes) known.add(id);
    chainMemory.set(key, known);
    if (!seated || fresh.length === 0) return;
    playSfx("chainStep", { rate: 1 + Math.min(3, fresh.length) * 0.05 });
    const popped: Element[] = [];
    for (const id of fresh) {
      const mark = document.querySelector(`[data-chain-marker="${id}"]`);
      if (mark === null) continue;
      mark.classList.add(styles.chainMark ?? "");
      popped.push(mark);
    }
    const clear = window.setTimeout(() => {
      for (const mark of popped) mark.classList.remove(styles.chainMark ?? "");
    }, CHAIN_MARK_MS);
    return () => {
      window.clearTimeout(clear);
      for (const mark of popped) mark.classList.remove(styles.chainMark ?? "");
    };
  }, [chainNodes, seed, sector]);
};
