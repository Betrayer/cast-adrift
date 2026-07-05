import { Container, Graphics, Sprite, Text } from "pixi.js";
import type { Application, FederatedPointerEvent, Ticker } from "pixi.js";
import { tokens } from "@/app/theme";
import { schools } from "@/data/schools";
import {
  dieTexture,
  PIXI_FONT_FAMILY,
  releaseDieTextures,
} from "@/pixi/textures";
import { easeOutQuad, linear, Tweens } from "@/pixi/tween";
import { useBattleStore } from "@/stores/battleStore";
import type { BattleState } from "@/stores/battleStore";
import type { Beat, EnemyBeat, RolledDie, SlotId } from "@/types/battle";

export interface BattleSceneLabels {
  slotTitle: (slot: SlotId) => string;
  capLabel: (cap: number, mk: number) => string;
}

const ACTIVE_SLOTS: readonly SlotId[] = ["weaponA", "shields", "reactor"];

const SLOT_GRID: Partial<Record<SlotId, { row: number; col: number }>> = {
  weaponA: { row: 0, col: 0 },
  shields: { row: 1, col: 0 },
  reactor: { row: 2, col: 1 },
};

const MINI_DIE_SIZE = 40;
const BEAT_GAP_MS = 150;
const GLOW_HZ = 1.2;
const DAMAGE_POOL_SIZE = 12;

const EMPTY_SLOT_FILL = "#131B2D";
const EMPTY_SLOT_STROKE = "#3D4C6E";
const ENEMY_FILL = "#182238";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Layout {
  dieSize: number;
  tray: { x: number; y: number }[];
  slots: Partial<Record<SlotId, Rect>>;
  enemies: { x: number; y: number }[];
  enemySize: number;
  playerHit: { x: number; y: number };
}

interface SlotView {
  box: Graphics;
  glow: Graphics;
  title: Text;
  cap: Text;
  occupied: boolean;
}

interface EnemyView {
  root: Container;
  flash: Graphics;
  cancelFlash?: () => void;
}

interface DragState {
  uid: string;
  sprite: Sprite;
  offsetX: number;
  offsetY: number;
  validSlots: SlotId[];
}

interface PooledNumber {
  text: Text;
  cancels: (() => void)[];
}

const contains = (rect: Rect, x: number, y: number): boolean =>
  x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;

const overlapArea = (
  rect: Rect,
  cx: number,
  cy: number,
  size: number,
): number => {
  const w =
    Math.min(rect.x + rect.w, cx + size / 2) - Math.max(rect.x, cx - size / 2);
  const h =
    Math.min(rect.y + rect.h, cy + size / 2) - Math.max(rect.y, cy - size / 2);
  return w > 0 && h > 0 ? w * h : 0;
};

const dashLine = (
  g: Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dash = 6,
  gap = 4,
): void => {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len === 0) return;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  let d = 0;
  while (d < len) {
    const e = Math.min(d + dash, len);
    g.moveTo(x1 + ux * d, y1 + uy * d).lineTo(x1 + ux * e, y1 + uy * e);
    d = e + gap;
  }
};

const dashedRoundRectStroke = (
  g: Graphics,
  rect: Rect,
  radius: number,
): void => {
  const { x, y, w, h } = rect;
  const r = Math.min(radius, w / 2, h / 2);
  dashLine(g, x + r, y, x + w - r, y);
  dashLine(g, x + w, y + r, x + w, y + h - r);
  dashLine(g, x + w - r, y + h, x + r, y + h);
  dashLine(g, x, y + h - r, x, y + r);
  g.moveTo(x + w - r, y).arc(x + w - r, y + r, r, -Math.PI / 2, 0);
  g.moveTo(x + w, y + h - r).arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  g.moveTo(x + r, y + h).arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  g.moveTo(x, y + r).arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
};

export class BattleScene {
  private readonly app: Application;
  private readonly labels: BattleSceneLabels;
  private readonly tweens: Tweens;

  private readonly bg = new Container();
  private readonly enemiesLayer = new Container();
  private readonly slotsLayer = new Container();
  private readonly trayLayer = new Container();
  private readonly dragLayer = new Container();
  private readonly fxLayer = new Container();

  private layout: Layout;
  private readonly slotViews = new Map<SlotId, SlotView>();
  private readonly enemyViews = new Map<string, EnemyView>();
  private readonly dieSprites = new Map<string, Sprite>();
  private readonly dieCancels = new Map<string, () => void>();
  private readonly animating = new Set<string>();
  private readonly numberPool: PooledNumber[] = [];
  private beatTimeouts: number[] = [];
  private drag: DragState | null = null;
  private glowTime = 0;
  private readonly unsubscribe: () => void;

  constructor(app: Application, labels: BattleSceneLabels) {
    this.app = app;
    this.labels = labels;
    this.tweens = new Tweens(app.ticker);
    this.layout = this.computeLayout();

    app.stage.addChild(
      this.bg,
      this.enemiesLayer,
      this.slotsLayer,
      this.trayLayer,
      this.dragLayer,
      this.fxLayer,
    );
    app.stage.eventMode = "static";
    app.stage.hitArea = app.screen;
    app.stage.on("globalpointermove", this.onPointerMove);
    app.stage.on("pointerup", this.onPointerUp);
    app.stage.on("pointerupoutside", this.onPointerUp);

    this.buildNumberPool();
    this.rebuild(useBattleStore.getState());
    this.unsubscribe = useBattleStore.subscribe(this.onStoreChange);
    this.app.renderer.on("resize", this.onResize);
    this.app.ticker.add(this.tick);
  }

  destroy(): void {
    for (const id of this.beatTimeouts) window.clearTimeout(id);
    this.beatTimeouts = [];
    this.unsubscribe();
    this.app.renderer.off("resize", this.onResize);
    this.app.ticker.remove(this.tick);
    this.app.stage.off("globalpointermove", this.onPointerMove);
    this.app.stage.off("pointerup", this.onPointerUp);
    this.app.stage.off("pointerupoutside", this.onPointerUp);
    this.tweens.destroy();
    this.app.stage.removeChildren();
    for (const layer of [
      this.bg,
      this.enemiesLayer,
      this.slotsLayer,
      this.trayLayer,
      this.dragLayer,
      this.fxLayer,
    ]) {
      layer.destroy({ children: true });
    }
    releaseDieTextures(this.app);
  }

  private computeLayout(): Layout {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const margin = 16;
    const gap = 12;
    const state = useBattleStore.getState();
    const diceCount = Math.max(state.dice.length, 1);
    const dieSize = Math.max(
      36,
      Math.min(64, (w - 2 * margin - (diceCount - 1) * gap) / diceCount),
    );

    const trayY = h * 0.36;
    const trayWidth = diceCount * dieSize + (diceCount - 1) * gap;
    const trayStart = (w - trayWidth) / 2 + dieSize / 2;
    const tray = Array.from({ length: diceCount }, (_, i) => ({
      x: trayStart + i * (dieSize + gap),
      y: trayY,
    }));

    const gridTop = h * 0.46;
    const gridBottom = h * 0.78;
    const cellW = (w - 2 * margin - gap) / 2;
    const cellH = (gridBottom - gridTop - 2 * gap) / 3;
    const slots: Partial<Record<SlotId, Rect>> = {};
    for (const slotId of ACTIVE_SLOTS) {
      const pos = SLOT_GRID[slotId];
      if (pos === undefined) continue;
      slots[slotId] = {
        x: margin + pos.col * (cellW + gap),
        y: gridTop + pos.row * (cellH + gap),
        w: cellW,
        h: cellH,
      };
    }

    const enemySize = 56;
    const enemyCount = Math.max(state.enemies.length, 1);
    const enemies = Array.from({ length: enemyCount }, (_, i) => ({
      x: (w * (i + 1)) / (enemyCount + 1),
      y: h * 0.26,
    }));

    return {
      dieSize,
      tray,
      slots,
      enemies,
      enemySize,
      playerHit: { x: w / 2, y: h * 0.8 },
    };
  }

  private buildNumberPool(): void {
    for (let i = 0; i < DAMAGE_POOL_SIZE; i += 1) {
      const text = new Text({
        text: "",
        style: {
          fontFamily: PIXI_FONT_FAMILY,
          fontSize: 20,
          fontWeight: "700",
          fill: tokens.text,
        },
      });
      text.anchor.set(0.5);
      text.visible = false;
      this.fxLayer.addChild(text);
      this.numberPool.push({ text, cancels: [] });
    }
  }

  private rebuild(state: BattleState): void {
    this.layout = this.computeLayout();
    this.buildSlots(state);
    this.buildEnemies(state);
    this.syncBoard(state);
    this.syncEnemies(state);
  }

  private buildSlots(state: BattleState): void {
    for (const view of this.slotViews.values()) {
      view.box.destroy();
      view.glow.destroy();
      view.title.destroy();
      view.cap.destroy();
    }
    this.slotViews.clear();
    for (const slotId of ACTIVE_SLOTS) {
      const rect = this.layout.slots[slotId];
      const slot = state.slots[slotId];
      if (rect === undefined) continue;
      const box = new Graphics();
      const glow = new Graphics();
      glow
        .roundRect(rect.x - 1.5, rect.y - 1.5, rect.w + 3, rect.h + 3, 13)
        .stroke({
          color: tokens.accent,
          width: 2,
        });
      glow.alpha = 0;
      const title = new Text({
        text: this.labels.slotTitle(slotId),
        style: { fontFamily: PIXI_FONT_FAMILY, fontSize: 13, fill: tokens.dim },
      });
      title.position.set(rect.x + 12, rect.y + 10);
      const cap = new Text({
        text: slot === undefined ? "" : this.labels.capLabel(slot.cap, slot.mk),
        style: {
          fontFamily: PIXI_FONT_FAMILY,
          fontSize: 11,
          fill: tokens.faint,
        },
      });
      cap.position.set(rect.x + 12, rect.y + 30);
      this.slotsLayer.addChild(box, glow, title, cap);
      const view: SlotView = { box, glow, title, cap, occupied: false };
      this.slotViews.set(slotId, view);
      this.drawSlotBox(slotId, false);
    }
  }

  private drawSlotBox(slotId: SlotId, occupied: boolean): void {
    const view = this.slotViews.get(slotId);
    const rect = this.layout.slots[slotId];
    if (view === undefined || rect === undefined) return;
    view.occupied = occupied;
    const g = view.box;
    g.clear();
    if (occupied) {
      g.roundRect(rect.x, rect.y, rect.w, rect.h, 12)
        .fill(tokens.surface2)
        .stroke({ color: tokens.line, width: 1 });
    } else {
      g.roundRect(rect.x, rect.y, rect.w, rect.h, 12).fill(EMPTY_SLOT_FILL);
      dashedRoundRectStroke(g, rect, 12);
      g.stroke({ color: EMPTY_SLOT_STROKE, width: 1 });
    }
    view.title.style.fill = occupied ? tokens.text : tokens.dim;
  }

  private buildEnemies(state: BattleState): void {
    for (const view of this.enemyViews.values()) {
      view.cancelFlash?.();
      view.root.destroy({ children: true });
    }
    this.enemyViews.clear();
    state.enemies.forEach((enemy, index) => {
      const anchor = this.layout.enemies[index];
      if (anchor === undefined) return;
      const size = this.layout.enemySize;
      const root = new Container();
      root.position.set(anchor.x, anchor.y);
      const body = new Graphics()
        .roundRect(-size / 2, -size / 2, size, size, 12)
        .fill(ENEMY_FILL)
        .stroke({ color: tokens.line, width: 1.5 })
        .moveTo(0, size * 0.28)
        .lineTo(-size * 0.26, -size * 0.18)
        .lineTo(0, -size * 0.02)
        .lineTo(size * 0.26, -size * 0.18)
        .closePath()
        .fill(tokens.danger);
      const flash = new Graphics()
        .roundRect(-size / 2, -size / 2, size, size, 12)
        .fill("#FFFFFF");
      flash.alpha = 0;
      root.addChild(body, flash);
      this.enemiesLayer.addChild(root);
      this.enemyViews.set(enemy.id, { root, flash });
    });
  }

  private syncEnemies(state: BattleState): void {
    for (const enemy of state.enemies) {
      const view = this.enemyViews.get(enemy.id);
      if (view === undefined) continue;
      view.root.alpha = enemy.hp > 0 ? 1 : 0.25;
    }
  }

  private slotDieAnchor(slotId: SlotId): { x: number; y: number } | undefined {
    const rect = this.layout.slots[slotId];
    if (rect === undefined) return undefined;
    return {
      x: rect.x + rect.w - MINI_DIE_SIZE / 2 - 12,
      y: rect.y + rect.h / 2,
    };
  }

  private trayAnchor(
    uid: string,
    state: BattleState,
  ): { x: number; y: number } {
    const index = state.dice.findIndex((d) => d.uid === uid);
    return (
      this.layout.tray[index] ?? {
        x: this.app.screen.width / 2,
        y: this.layout.tray[0]?.y ?? 0,
      }
    );
  }

  private dieTextureFor(die: RolledDie, size: number) {
    return dieTexture(this.app, {
      school: die.school,
      tier: die.tier,
      value: die.value,
      size,
    });
  }

  private ensureDieSprite(die: RolledDie): Sprite {
    let sprite = this.dieSprites.get(die.uid);
    if (sprite === undefined) {
      sprite = new Sprite();
      sprite.anchor.set(0.5);
      sprite.eventMode = "static";
      sprite.cursor = "pointer";
      const uid = die.uid;
      sprite.on("pointerdown", (e: FederatedPointerEvent) => {
        this.onDiePointerDown(uid, e);
      });
      this.trayLayer.addChild(sprite);
      this.dieSprites.set(die.uid, sprite);
    }
    return sprite;
  }

  private syncBoard(state: BattleState): void {
    const seen = new Set<string>();
    for (const die of state.dice) {
      seen.add(die.uid);
      const sprite = this.ensureDieSprite(die);
      if (this.drag?.uid === die.uid || this.animating.has(die.uid)) continue;
      if (die.state === "placed" && die.slot !== undefined) {
        const anchor = this.slotDieAnchor(die.slot);
        if (anchor === undefined) continue;
        sprite.texture = this.dieTextureFor(die, MINI_DIE_SIZE);
        sprite.position.set(anchor.x, anchor.y);
        sprite.scale.set(1);
        sprite.visible = true;
      } else if (die.state === "tray") {
        const anchor = this.trayAnchor(die.uid, state);
        sprite.texture = this.dieTextureFor(die, this.layout.dieSize);
        sprite.position.set(anchor.x, anchor.y);
        sprite.scale.set(1);
        sprite.visible = true;
      } else {
        sprite.visible = false;
      }
    }
    for (const [uid, sprite] of this.dieSprites) {
      if (!seen.has(uid)) {
        this.dieCancels.get(uid)?.();
        this.dieCancels.delete(uid);
        this.animating.delete(uid);
        sprite.destroy();
        this.dieSprites.delete(uid);
      }
    }
    for (const slotId of ACTIVE_SLOTS) {
      const occupied = state.slots[slotId]?.dieUid !== undefined;
      const view = this.slotViews.get(slotId);
      if (view !== undefined && view.occupied !== occupied) {
        this.drawSlotBox(slotId, occupied);
      }
    }
  }

  private readonly onStoreChange = (
    state: BattleState,
    prev: BattleState,
  ): void => {
    if (
      state.turn !== prev.turn ||
      state.enemies.length !== prev.enemies.length
    ) {
      this.cancelDrag(state);
      this.rebuild(state);
    } else {
      if (state.dice !== prev.dice || state.slots !== prev.slots)
        this.syncBoard(state);
      if (state.enemies !== prev.enemies) this.syncEnemies(state);
    }
    if (state.beatSeq !== prev.beatSeq) {
      this.playBeats(state.beats, state.enemyBeats);
    }
  };

  private readonly onResize = (): void => {
    this.cancelDrag(useBattleStore.getState());
    this.rebuild(useBattleStore.getState());
  };

  private readonly tick = (ticker: Ticker): void => {
    if (this.drag === null) return;
    this.glowTime += ticker.deltaMS;
    const alpha =
      0.75 + 0.25 * Math.sin((this.glowTime / 1000) * GLOW_HZ * Math.PI * 2);
    for (const slotId of this.drag.validSlots) {
      const view = this.slotViews.get(slotId);
      if (view !== undefined) view.glow.alpha = alpha;
    }
  };

  private cancelDrag(state: BattleState): void {
    if (this.drag === null) return;
    const { uid } = this.drag;
    this.clearGlow();
    this.drag = null;
    const die = state.dice.find((d) => d.uid === uid);
    if (die !== undefined) this.syncBoard(state);
  }

  private clearGlow(): void {
    for (const view of this.slotViews.values()) view.glow.alpha = 0;
  }

  private onDiePointerDown(uid: string, e: FederatedPointerEvent): void {
    if (this.drag !== null) return;
    const state = useBattleStore.getState();
    if (state.phase !== "placement") return;
    const die = state.dice.find((d) => d.uid === uid);
    if (die === undefined) return;
    if (die.state !== "tray" && die.state !== "placed") return;

    const sprite = this.dieSprites.get(uid);
    if (sprite === undefined) return;
    this.dieCancels.get(uid)?.();
    this.dieCancels.delete(uid);
    this.animating.delete(uid);
    const grab = sprite.getGlobalPosition();

    if (die.state === "placed") {
      useBattleStore.getState().unplaceDie(uid);
    }

    this.dragLayer.addChild(sprite);
    sprite.position.set(grab.x, grab.y);
    sprite.texture = this.dieTextureFor(die, this.layout.dieSize);
    sprite.scale.set(1.06);
    sprite.visible = true;

    const fresh = useBattleStore.getState();
    const validSlots = ACTIVE_SLOTS.filter((slotId) => {
      const slot = fresh.slots[slotId];
      return (
        slot !== undefined && slot.dieUid === undefined && die.tier <= slot.cap
      );
    });

    this.glowTime = 0;
    this.drag = {
      uid,
      sprite,
      offsetX: sprite.x - e.global.x,
      offsetY: sprite.y - e.global.y,
      validSlots,
    };
  }

  private readonly onPointerMove = (e: FederatedPointerEvent): void => {
    if (this.drag === null) return;
    this.drag.sprite.position.set(
      e.global.x + this.drag.offsetX,
      e.global.y + this.drag.offsetY,
    );
  };

  private readonly onPointerUp = (e: FederatedPointerEvent): void => {
    if (this.drag === null) return;
    const { uid, sprite, validSlots } = this.drag;
    this.drag = null;
    this.clearGlow();

    const px = e.global.x;
    const py = e.global.y;
    let best: SlotId | undefined;
    let bestArea = 0;
    for (const slotId of validSlots) {
      const rect = this.layout.slots[slotId];
      if (rect === undefined) continue;
      const area = overlapArea(rect, sprite.x, sprite.y, this.layout.dieSize);
      if (area > bestArea) {
        bestArea = area;
        best = slotId;
      }
    }
    if (best === undefined) {
      best = validSlots.find((slotId) => {
        const rect = this.layout.slots[slotId];
        return rect !== undefined && contains(rect, px, py);
      });
    }

    if (best !== undefined) {
      this.animatePlace(uid, best, sprite);
    } else {
      this.animateReturn(uid, sprite, true);
    }
  };

  private animatePlace(uid: string, slotId: SlotId, sprite: Sprite): void {
    useBattleStore.getState().placeDie(uid, slotId);
    const state = useBattleStore.getState();
    const die = state.dice.find((d) => d.uid === uid);
    const anchor = this.slotDieAnchor(slotId);
    if (
      die === undefined ||
      anchor === undefined ||
      state.slots[slotId]?.dieUid !== uid
    ) {
      this.animateReturn(uid, sprite, true);
      return;
    }
    this.animating.add(uid);
    sprite.texture = this.dieTextureFor(die, MINI_DIE_SIZE);
    sprite.scale.set(this.layout.dieSize / MINI_DIE_SIZE);
    const cancelScale = this.tweens.to(
      sprite.scale,
      { x: 1, y: 1 },
      120,
      easeOutQuad,
    );
    const cancelMove = this.tweens.to(
      sprite,
      { x: anchor.x, y: anchor.y },
      120,
      easeOutQuad,
      () => {
        this.finishDieAnimation(uid);
        this.pulseSlot(slotId);
      },
    );
    this.dieCancels.set(uid, () => {
      cancelScale();
      cancelMove();
    });
  }

  private animateReturn(uid: string, sprite: Sprite, withShake: boolean): void {
    const state = useBattleStore.getState();
    const anchor = this.trayAnchor(uid, state);
    this.animating.add(uid);
    const goBack = (): void => {
      const cancelScale = this.tweens.to(
        sprite.scale,
        { x: 1, y: 1 },
        150,
        easeOutQuad,
      );
      const cancelMove = this.tweens.to(
        sprite,
        { x: anchor.x, y: anchor.y },
        150,
        easeOutQuad,
        () => {
          this.finishDieAnimation(uid);
        },
      );
      this.dieCancels.set(uid, () => {
        cancelScale();
        cancelMove();
      });
    };
    if (!withShake) {
      goBack();
      return;
    }
    const offsets = [4, -4, 4, -4, 0];
    const baseX = sprite.x;
    const step = (i: number): void => {
      const offset = offsets[i];
      if (offset === undefined) {
        goBack();
        return;
      }
      const cancel = this.tweens.to(
        sprite,
        { x: baseX + offset },
        36,
        linear,
        () => {
          step(i + 1);
        },
      );
      this.dieCancels.set(uid, cancel);
    };
    step(0);
  }

  private finishDieAnimation(uid: string): void {
    this.animating.delete(uid);
    this.dieCancels.delete(uid);
    const sprite = this.dieSprites.get(uid);
    if (sprite !== undefined && sprite.parent === this.dragLayer) {
      this.trayLayer.addChild(sprite);
    }
    this.syncBoard(useBattleStore.getState());
  }

  private pulseSlot(slotId: SlotId): void {
    const view = this.slotViews.get(slotId);
    if (view === undefined) return;
    view.glow.alpha = 0.8;
    this.tweens.to(view.glow, { alpha: 0 }, 260, easeOutQuad);
  }

  private spawnNumber(x: number, y: number, value: string, fill: string): void {
    const slot =
      this.numberPool.find((p) => !p.text.visible) ?? this.numberPool[0];
    if (slot === undefined) return;
    for (const cancel of slot.cancels) cancel();
    slot.cancels = [];
    const { text } = slot;
    text.text = value;
    text.style.fill = fill;
    text.position.set(x, y);
    text.alpha = 1;
    text.scale.set(1);
    text.visible = true;
    slot.cancels.push(
      this.tweens.to(text, { y: y - 28 }, 350, easeOutQuad),
      this.tweens.to(text, { alpha: 0 }, 350, linear, () => {
        text.visible = false;
      }),
      this.tweens.to(text.scale, { x: 1.15, y: 1.15 }, 120, easeOutQuad, () => {
        slot.cancels.push(
          this.tweens.to(text.scale, { x: 1, y: 1 }, 230, easeOutQuad),
        );
      }),
    );
  }

  private flashEnemy(enemyId: string): void {
    const view = this.enemyViews.get(enemyId);
    if (view === undefined) return;
    view.cancelFlash?.();
    view.flash.alpha = 0.9;
    view.cancelFlash = this.tweens.to(view.flash, { alpha: 0 }, 160, linear);
  }

  private playBeats(
    beats: readonly Beat[],
    enemyBeats: readonly EnemyBeat[],
  ): void {
    for (const id of this.beatTimeouts) window.clearTimeout(id);
    this.beatTimeouts = [];
    beats.forEach((beat, index) => {
      const id = window.setTimeout(() => {
        this.playBeat(beat);
      }, index * BEAT_GAP_MS);
      this.beatTimeouts.push(id);
    });
    enemyBeats.forEach((beat, index) => {
      const id = window.setTimeout(
        () => {
          this.playEnemyBeat(beat);
        },
        (beats.length + index) * BEAT_GAP_MS + 200,
      );
      this.beatTimeouts.push(id);
    });
  }

  private playBeat(beat: Beat): void {
    if (beat.kind === "damage" && beat.targetId !== undefined) {
      const view = this.enemyViews.get(beat.targetId);
      if (view !== undefined) {
        this.flashEnemy(beat.targetId);
        this.spawnNumber(
          view.root.x,
          view.root.y - this.layout.enemySize / 2,
          `-${String(beat.amount)}`,
          schools.red.text,
        );
      }
      return;
    }
    const anchor = this.slotDieAnchor(beat.slot);
    if (anchor === undefined) return;
    const fill = beat.kind === "shield" ? schools.blue.text : tokens.amber;
    this.spawnNumber(anchor.x, anchor.y - 24, `+${String(beat.amount)}`, fill);
  }

  private playEnemyBeat(beat: EnemyBeat): void {
    if (beat.intent.t === "shield") {
      const view = this.enemyViews.get(beat.enemyId);
      if (view !== undefined) {
        this.spawnNumber(
          view.root.x,
          view.root.y - this.layout.enemySize / 2,
          `+${String(beat.intent.n)}`,
          schools.blue.text,
        );
      }
      return;
    }
    this.flashEnemy(beat.enemyId);
    const { playerHit } = this.layout;
    if (beat.hullDamage > 0) {
      this.spawnNumber(
        playerHit.x,
        playerHit.y,
        `-${String(beat.hullDamage)}`,
        schools.red.text,
      );
    } else if (beat.shieldDamage > 0) {
      this.spawnNumber(
        playerHit.x,
        playerHit.y,
        `-${String(beat.shieldDamage)}`,
        schools.blue.text,
      );
    }
  }
}

export const mountBattleScene = (
  app: Application,
  labels: BattleSceneLabels,
): (() => void) => {
  const scene = new BattleScene(app, labels);
  return () => {
    scene.destroy();
  };
};
