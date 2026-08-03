// Warmed while the player reads the sector map, so entering a node never waits
// on a network round trip for the Pixi + Matter chunk. Lives outside the router
// so the map screen does not have to import the module that renders it.
export const prefetchBattle = (): void => {
  void import('@/screens/Battle/BattleScreen');
};
