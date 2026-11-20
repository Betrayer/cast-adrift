# Changelog

One entry per released version, newest first. The development record before 2.3.0 lives in `docs/archive/` and `docs/horizon/`.

## 2.3.0

Revision 6, «Горизонт»: twelve phases between 2.2.0 and this release.

### Play

- **Telegram entry and touch.** A Telegram client that lands on the site root is forwarded to the game before the first paint, the account line says whether the game runs under a Telegram identity or as a guest and why, and dice drag on touch screens without the Telegram sheet taking the gesture.
- **Star Chart.** The chart starts from its core, earns two points a level plus milestones, and holds 246 nodes: ramped small nodes, reworked keystones, 14 confluences and 7 nexus ultimates. Four layouts (spiral, rings, constellations, nebulae) draw the same graph, a full reset is priced by the chart, and a search panel filters nodes by name, constellation, kind, tag and «available now».
- **Deck and forge.** Hands hold up to 15 dice and a table of 7 is drawn from a seeded bag each turn. Two dice of one school fuse at a shipyard's forge, keeping a chosen signature die; fourteen named recipes turn a pair of the same die into a new one, and the Codex records each recipe the first time it is forged.
- **Dice presentation.** A three-dimensional roll lands on the result face, legendary dice carry an aura and particles per school, and the roll style is a setting.
- **Motion.** A catalogue of motions for rewards, cards, counters and screen changes, each with a reduced-motion twin of at most 160 ms.
- **Bridge.** Tapping any ship slot opens a sheet that explains what the slot does, how dice change it, its caps, fire modes and modules, and how to improve it.
- **The road.** The black hole spans every lane, sectors are a third longer, and 82 new events join the run, four new event chains among them.
- **Difficulty.** Ascension reaches A15 with new modifiers, rewards and cosmetics; enemy groups mix their roles; the economy is re-derived for the longer road.
- **Ship progression.** Every ship gains mastery across runs (five ranks, a second passive at rank V), ranks inside a run with a draft of ship perks, and a model whose parts light up with each upgrade.
- **Echo's voice.** An optional setting lets the ship computer speak Echo's lines through the device's own speech voices. It is off by default and silent where the device has no voice for the game's language.
- **Sharing.** The run summary draws a recap card (the ship, the route, the result) to share or save.
- **Vibration.** Inside Telegram, haptics have their own switch and now also mark tap placement, the reserve, the rank draft and chart allocation.

### Fixes and tooling

- Overlays left open on a screen kept alive in the background no longer reach over the next screen.
- The Beacon Keeper speaks at beacon scenes, under his own name when another voice hosts the scene, as the game's text always intended.
- A fight in progress when the game updates to 2.3.0 starts again from its first turn; the run itself continues.
- A second ship rank reached together with the first now vibrates when its draft opens, and a system raised to Mk3 by the Targeting array counts toward «Refit».
- The landing's ship parade draws the Wanderer and the Hound in their in-game colours.
- An event that adds an enemy to the next fight keeps its word on a full board: the extra enemy waits and joins when a seat frees, and the fight is not won before it falls.
- An enemy that joins a fight after a death takes the fallen body's place, so the board no longer crowds and the others stay put.
- Every event option that requires scrap prints the amount on its card.
- Star chart cards print the numbers their node actually gives at its tier.
- The star chart's filter panel grows to show its groups on short screens.
- The size check refuses a build that skipped the site split, and asserts that a build without the voice carries no speech code.
- A layout contact sheet measures every screen and overlay on four viewports and three Telegram profiles.
