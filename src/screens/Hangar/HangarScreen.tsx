import { Badge, Stack } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import { Screen } from "@/app/Screen";
import { useUnlockContext } from "@/app/useUnlockContext";
import { AppHeader } from "@/components/AppHeader";
import { HANGAR_DECK_CAP } from "@/data/metaShop";
import { hubBudgetBonus } from "@/game/chart/engine";
import { validateDeck } from "@/game/meta/deck";
import {
  freshDiceIds,
  freshUnlockIdsOfKind,
} from "@/game/meta/unlockState";
import { hangarBudget } from "@/data/milestones";
import { useMetaStore } from "@/stores/metaStore";
import { HangarDiceList } from "./HangarDiceList";
import { HangarDraft } from "./HangarDraft";
import { HangarShips } from "./HangarShips";
import { ShipMasteryPanel } from "./ShipMasteryPanel";

export const HangarScreen = () => {
  const savedDeck = useMetaStore((s) => s.hangar.deck);
  const collection = useMetaStore((s) => s.collection);
  const chartPicks = useMetaStore((s) => s.chartPicks);
  const level = useMetaStore((s) => s.level);
  const shards = useMetaStore((s) => s.shards);
  const unlocksSeen = useMetaStore((s) => s.unlocksSeen);
  const setDeck = useMetaStore((s) => s.setDeck);
  const selectedShip = useMetaStore((s) => s.selectedShip);

  const unlockCtx = useUnlockContext();

  const [freshAtMount] = useState(() => ({
    dice: freshDiceIds(unlockCtx, unlocksSeen),
    ids: freshUnlockIdsOfKind(unlockCtx, unlocksSeen, "diceWave"),
  }));
  const fresh = freshAtMount.dice;
  useEffect(() => {
    useMetaStore.getState().markUnlocksSeen(freshAtMount.ids);
  }, [freshAtMount]);

  const [tab, setTab] = useState("build");
  const [draft, setDraft] = useState<string[]>([...savedDeck]);

  const budget = hangarBudget(level, hubBudgetBonus(chartPicks));
  const validation = useMemo(
    () => validateDeck(draft, budget),
    [draft, budget],
  );
  const owned = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of collection) map.set(e.defId, e.count);
    return map;
  }, [collection]);
  const inDeck = useMemo(() => {
    const map = new Map<string, number>();
    for (const id of draft) map.set(id, (map.get(id) ?? 0) + 1);
    return map;
  }, [draft]);

  const dirty =
    draft.length !== savedDeck.length ||
    draft.some((id, i) => id !== savedDeck[i]);

  const addToDeck = (id: string): void => {
    const have = owned.get(id) ?? 0;
    if ((inDeck.get(id) ?? 0) >= have) return;
    if (draft.length >= HANGAR_DECK_CAP) return;
    setDraft((d) => [...d, id]);
  };

  const removeFromDeck = (index: number): void => {
    setDraft((d) => d.filter((_, i) => i !== index));
  };

  const save = (): void => {
    if (validation.valid) setDeck(draft);
  };

  return (
    <Screen
      width="grid"
      header={
        <AppHeader
          actions={
            <Badge variant="light" color="yellow">
              {shards} ◈
            </Badge>
          }
        />
      }
    >
      <Stack gap="sm">
        <ShipMasteryPanel shipId={selectedShip} />
        <HangarShips unlockCtx={unlockCtx} tab={tab} onTab={setTab} />
        <HangarDraft
          draft={draft}
          budget={budget}
          validation={validation}
          dirty={dirty}
          onRemove={removeFromDeck}
          onSave={save}
        />
        <HangarDiceList
          tab={tab}
          owned={owned}
          inDeck={inDeck}
          draftLength={draft.length}
          fresh={fresh}
          unlockCtx={unlockCtx}
          onAdd={addToDeck}
        />
      </Stack>
    </Screen>
  );
};
