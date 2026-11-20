import { useEffect, useRef } from "react";
import { scrollIntoFocus } from "@/app/motion";
import type { SlotId } from "@/types/battle";

export type BridgeFocusKind = "module" | "perk";

export interface BridgeFocus {
  kind: BridgeFocusKind;
  id: string;
}

export interface BridgePanelProps {
  focus: BridgeFocus | null;
  onOpenSlot: (slotId: SlotId) => void;
}

export const useFocusScroll = <T extends HTMLElement>(focusId: string | null) => {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (focusId === null) return;
    const node = ref.current;
    if (node === null) return;
    scrollIntoFocus(node);
    node.focus({ preventScroll: true });
  }, [focusId]);
  return ref;
};
