import { Circle, Container, Graphics, Rectangle, Sprite, Text } from "pixi.js";
import type { Application, FederatedPointerEvent, Ticker } from "pixi.js";
import { tokens } from "@/app/theme";
import { schools } from "@/data/schools";
import { canPlaceDie } from "@/game/battle/setup";
import type { StatusKey } from "@/game/battle/statuses";
import {
  dieTexture,
  PIXI_FONT_FAMILY,
  releaseDieTextures,
} from "@/pixi/textures";
import { easeOutQuad, linear, Tweens } from "@/pixi/tween";
import {
  resolveReducedMotion,
  useSettingsStore,
} from "@/stores/settingsStore";
import { useBattleStore } from "@/stores/battleStore";
import type { BattleState } from "@/stores/battleStore";
import type {
  Beat,
  EnemyBeat,
  ResolutionBundle,
  RolledDie,
  SlotId,
} from "@/types/battle";

export interface BattleSceneLabels {
  slotTitle: (slot: SlotId) => string;
  capLabel: (cap: number, mk: number) => string;
  reserveTitle: string;
  statusGlyph: (key: StatusKey) => string;
  jamLabel: string;
}

const SLOT_GRID: Partial<Record<SlotId, { row: number; col: number }>> = {
  weaponA: { row: 0, col: 0 },
  weaponB: { row: 0, col: 1 },
  spinal: { row: 0, col: 0 },
  shields: { row: 1, col: 0 },
  engines: { row: 1, col: 1 },
  sensors: { row: 2, col: 0 },
  reactor: { row: 2, col: 1 },
  repairBay: { row: 2, col: 0 },
};

const MINI_DIE_SIZE = 40;
const BEAT_GAP_MS = 180;
const GLOW_HZ = 1.2;
const DAMAGE_POOL_SIZE = 12;
const DRAG_THRESHOLD = 6;
const REROLL_LIFT = 4;
const CHARGE_PIP_COUNT = 10;

const EMPTY_SLOT_FILL = "#131B2D";
const EMPTY_SLOT_STROKE = "#3D4C6E";
const ENEMY_FILL = "#182238";
const STATUS_TINTS: Record<StatusKey, string> = {
  burn: "#E8963A",
  mark: "#E8B23A",
  jam: "#4A90E2",
  charge: "#B08CFF",
};

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
  reserve: Rect;
  enemies: { x: number; y: number }[];
  enemySize: number;
  playerHit: { x: number; y: number };
}

interface SlotView {
  box: Graphics;
  glow: Graphics;
  title: Text;
  cap: Text;
  pips: Graphics;
  occupied: boolean;
  blocked: boolean;
}

interface EnemyView {
  root: Container;
  body: Graphics;
  flash: Graphics;
  targetRing: Graphics;
  statusTexts: Map<StatusKey, Text>;
  subsystemViews: Map<string, { chip: Container; ring: Graphics; hp: Text }>;
  cancelFlash?: () => void;
}

interface PendingPress {
  uid: string;
  startX: number;
  startY: number;
}

interface DragState {
  uid: string;
  sprite: Sprite;
  offsetX: number;
  offsetY: number;
  validSlots: SlotId[];
  reserveValid: boolean;
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

const activeSlotIds = (state: BattleState): SlotId[] =>
  Object.keys(state.slots) as SlotId[];

const isDieLockedNow = (state: BattleState, uid: string): boolean =>
  state.lockedDice.some((l) => l.uid === uid && l.untilTurn >= state.turn);

const isSlotBlockedNow = (state: BattleState, slotId: SlotId): boolean =>
  state.blockedSlots.some(
    (b) => b.slot === slotId && b.untilTurn >= state.turn,
  );

export class BattleScene {
  private readonly app: Application;
  private readonly labels: BattleSceneLabels;
  private readonly tweens: Tweens;

  private readonly bg = new Container();
  private readonly enemiesLayer = new Container();
  private readonly slotsLayer = new Container();
  private readonly trayLayer = new Container();
  private readonly overlayLayer = new Container();
  private readonly dragLayer = new Container();
  private readonly fxLayer = new Container();

  private layout: Layout;
  private readonly slotViews = new Map<SlotId, SlotView>();
  private readonly enemyViews = new Map<string, EnemyView>();
  private readonly dieSprites = new Map<string, Sprite>();
  private readonly lockOverlays = new Map<string, Graphics>();
  private readonly selectionRings = new Map<string, Graphics>();
  private readonly dieCancels = new Map<string, () => void>();
  private readonly animating = new Set<string>();
  private readonly numberPool: PooledNumber[] = [];
  private reserveBox: Graphics | null = null;
  private reserveGlow: Graphics | null = null;
  private reserveTitle: Text | null = null;
  private beatTimeouts: number[] = [];
  private beatRun: { cancelled: boolean } | null = null;
  private pendingPress: PendingPress | null = null;
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
      this.overlayLayer,
      this.dragLayer,
      this.fxLayer,
    );
    app.stage.eventMode = "static";
    app.stage.hitArea = app.screen;
    app.stage.on("pointerdown", this.onStagePointerDown);
    app.stage.on("globalpointermove", this.onPointerMove);
    app.stage.on("pointerup", this.onPointerUp);
    app.stage.on("pointerupoutside", this.onPointerUp);

    this.buildNumberPool();
    this.rebuild(useBattleStore.getState());
    this.unsubscribe = useBattleStore.subscribe(this.onStoreChange);
    this.app.renderer.on("resize", this.onResize);
    this.app.ticker.add(this.tick);
    if (useBattleStore.getState().phase === "resolving") {
      this.startResolution(useBattleStore.getState());
    }
  }

  destroy(): void {
    this.stopBeats();
    if (useBattleStore.getState().phase === "resolving") {
      useBattleStore.getState().finishResolution();
    }
    this.unsubscribe();
    this.app.renderer.off("resize", this.onResize);
    this.app.ticker.remove(this.tick);
    this.app.stage.off("pointerdown", this.onStagePointerDown);
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
      this.overlayLayer,
      this.dragLayer,
      this.fxLayer,
    ]) {
      layer.destroy({ children: true });
    }
    releaseDieTextures(this.app);
  }

  private stopBeats(): void {
    if (this.beatRun !== null) this.beatRun.cancelled = true;
    this.beatRun = null;
    for (const id of this.beatTimeouts) window.clearTimeout(id);
    this.beatTimeouts = [];
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
      Math.min(56, (w - 2 * margin - (diceCount - 1) * gap) / diceCount),
    );

    const trayY = h * 0.345;
    const trayWidth = diceCount * dieSize + (diceCount - 1) * gap;
    const trayStart = (w - trayWidth) / 2 + dieSize / 2;
    const tray = Array.from({ length: diceCount }, (_, i) => ({
      x: trayStart + i * (dieSize + gap),
      y: trayY,
    }));

    const gridTop = h * 0.435;
    const gridBottom = h * 0.745;
    const cellW = (w - 2 * margin - gap) / 2;
    const cellH = (gridBottom - gridTop - 2 * gap) / 3;
    const slots: Partial<Record<SlotId, Rect>> = {};
    for (const slotId of activeSlotIds(state)) {
      const pos = SLOT_GRID[slotId];
      if (pos === undefined) continue;
      slots[slotId] = {
        x: margin + pos.col * (cellW + gap),
        y: gridTop + pos.row * (cellH + gap),
        w: cellW,
        h: cellH,
      };
    }

    const reserve: Rect = {
      x: margin,
      y: gridBottom + 10,
      w: cellW,
      h: Math.max(46, cellH * 0.8),
    };

    const enemySize = 56;
    const enemyCount = Math.max(state.enemies.length, 1);
    const enemies = Array.from({ length: enemyCount }, (_, i) => ({
      x: (w * (i + 1)) / (enemyCount + 1),
      y: h * 0.25,
    }));

    return {
      dieSize,
      tray,
      slots,
      reserve,
      enemies,
      enemySize,
      playerHit: { x: w / 2, y: h * 0.82 },
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
    this.buildReserve();
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
      view.pips.destroy();
    }
    this.slotViews.clear();
    for (const slotId of activeSlotIds(state)) {
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
      const pips = new Graphics();
      this.slotsLayer.addChild(box, glow, title, cap, pips);
      const view: SlotView = {
        box,
        glow,
        title,
        cap,
        pips,
        occupied: false,
        blocked: false,
      };
      this.slotViews.set(slotId, view);
      this.drawSlotBox(slotId, false, isSlotBlockedNow(state, slotId));
    }
  }

  private drawSlotBox(
    slotId: SlotId,
    occupied: boolean,
    blocked: boolean,
  ): void {
    const view = this.slotViews.get(slotId);
    const rect = this.layout.slots[slotId];
    if (view === undefined || rect === undefined) return;
    view.occupied = occupied;
    view.blocked = blocked;
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
    if (blocked) {
      g.roundRect(rect.x, rect.y, rect.w, rect.h, 12).fill({
        color: tokens.danger,
        alpha: 0.12,
      });
      const inset = 14;
      g.moveTo(rect.x + inset, rect.y + inset)
        .lineTo(rect.x + rect.w - inset, rect.y + rect.h - inset)
        .moveTo(rect.x + rect.w - inset, rect.y + inset)
        .lineTo(rect.x + inset, rect.y + rect.h - inset)
        .stroke({ color: tokens.danger, width: 3 });
    }
    view.title.style.fill = occupied ? tokens.text : tokens.dim;
    view.title.alpha = blocked ? 0.55 : 1;
  }

  private drawChargePips(state: BattleState): void {
    const view = this.slotViews.get("reactor");
    const rect = this.layout.slots.reactor;
    if (view === undefined || rect === undefined) return;
    const g = view.pips;
    g.clear();
    const usable = rect.w - 24;
    const step = usable / CHARGE_PIP_COUNT;
    const y = rect.y + rect.h - 12;
    for (let i = 0; i < CHARGE_PIP_COUNT; i += 1) {
      const x = rect.x + 12 + step * i + step / 2;
      if (i < state.charge) {
        g.circle(x, y, Math.min(4, step * 0.3)).fill(tokens.amber);
      } else {
        g.circle(x, y, Math.min(4, step * 0.3)).stroke({
          color: tokens.faint,
          width: 1,
        });
      }
    }
  }

  private buildReserve(): void {
    this.reserveBox?.destroy();
    this.reserveGlow?.destroy();
    this.reserveTitle?.destroy();
    const rect = this.layout.reserve;
    const box = new Graphics();
    box.roundRect(rect.x, rect.y, rect.w, rect.h, 12).fill(EMPTY_SLOT_FILL);
    dashedRoundRectStroke(box, rect, 12);
    box.stroke({ color: EMPTY_SLOT_STROKE, width: 1 });
    const glow = new Graphics();
    glow
      .roundRect(rect.x - 1.5, rect.y - 1.5, rect.w + 3, rect.h + 3, 13)
      .stroke({ color: tokens.accent, width: 2 });
    glow.alpha = 0;
    const title = new Text({
      text: this.labels.reserveTitle,
      style: { fontFamily: PIXI_FONT_FAMILY, fontSize: 13, fill: tokens.dim },
    });
    title.position.set(rect.x + 12, rect.y + 10);
    this.slotsLayer.addChild(box, glow, title);
    this.reserveBox = box;
    this.reserveGlow = glow;
    this.reserveTitle = title;
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
      body.eventMode = "none";
      const flash = new Graphics()
        .roundRect(-size / 2, -size / 2, size, size, 12)
        .fill("#FFFFFF");
      flash.alpha = 0;
      flash.eventMode = "none";
      const targetRing = new Graphics()
        .roundRect(-size / 2 - 5, -size / 2 - 5, size + 10, size + 10, 14)
        .stroke({ color: tokens.accent, width: 2.5 });
      targetRing.visible = false;
      targetRing.eventMode = "none";
      root.addChild(body, targetRing, flash);

      const enemyId = enemy.id;
      root.eventMode = "static";
      root.cursor = "pointer";
      root.hitArea = new Rectangle(
        -size * 0.85,
        -size * 0.85,
        size * 1.7,
        size * 1.7,
      );
      root.on("pointertap", () => {
        if (useBattleStore.getState().phase === "placement") {
          useBattleStore.getState().setTarget(enemyId);
        }
      });

      const statusTexts = new Map<StatusKey, Text>();
      (["burn", "mark", "jam", "charge"] as const).forEach((key) => {
        const text = new Text({
          text: this.labels.statusGlyph(key),
          style: {
            fontFamily: PIXI_FONT_FAMILY,
            fontSize: 12,
            fontWeight: "700",
            fill: STATUS_TINTS[key],
          },
        });
        text.anchor.set(0.5, 0);
        text.visible = false;
        text.eventMode = "none";
        root.addChild(text);
        statusTexts.set(key, text);
      });

      const subsystemViews = new Map<
        string,
        { chip: Container; ring: Graphics; hp: Text }
      >();
      enemy.subsystems.forEach((sub, subIndex) => {
        const chip = new Container();
        chip.position.set(size / 2 + 22, -size / 4 + subIndex * 32);
        const circle = new Graphics()
          .circle(0, 0, 14)
          .fill(ENEMY_FILL)
          .stroke({ color: tokens.amber, width: 1.5 });
        circle.eventMode = "none";
        const subId = sub.id;
        chip.eventMode = "static";
        chip.cursor = "pointer";
        chip.hitArea = new Circle(0, 0, 20);
        chip.on("pointertap", () => {
          if (useBattleStore.getState().phase === "placement") {
            useBattleStore.getState().setTarget(subId);
          }
        });
        const ring = new Graphics()
          .circle(0, 0, 18)
          .stroke({ color: tokens.accent, width: 2 });
        ring.visible = false;
        ring.eventMode = "none";
        const hp = new Text({
          text: String(sub.hp),
          style: {
            fontFamily: PIXI_FONT_FAMILY,
            fontSize: 11,
            fontWeight: "700",
            fill: tokens.text,
          },
        });
        hp.anchor.set(0.5);
        chip.addChild(circle, ring, hp);
        root.addChild(chip);
        subsystemViews.set(sub.id, { chip, ring, hp });
      });

      this.enemiesLayer.addChild(root);
      this.enemyViews.set(enemy.id, {
        root,
        body,
        flash,
        targetRing,
        statusTexts,
        subsystemViews,
      });
    });
  }

  private syncEnemies(state: BattleState): void {
    for (const enemy of state.enemies) {
      const view = this.enemyViews.get(enemy.id);
      if (view === undefined) continue;
      const alive = enemy.hp > 0;
      view.root.alpha = alive ? 1 : 0.25;
      view.root.eventMode = alive ? "static" : "none";
      view.root.cursor = alive ? "pointer" : "default";
      view.targetRing.visible = alive && state.targetId === enemy.id;

      const size = this.layout.enemySize;
      let statusX = 0;
      const active = (["burn", "mark", "jam", "charge"] as const).filter(
        (key) => enemy.statuses[key] !== undefined,
      );
      const totalWidth = active.length * 16;
      for (const key of ["burn", "mark", "jam", "charge"] as const) {
        const text = view.statusTexts.get(key);
        if (text === undefined) continue;
        const value = enemy.statuses[key];
        if (value === undefined || !alive) {
          text.visible = false;
          continue;
        }
        text.text =
          key === "burn"
            ? `${this.labels.statusGlyph(key)}${String(value)}`
            : this.labels.statusGlyph(key);
        text.position.set(-totalWidth / 2 + statusX + 8, size / 2 + 6);
        text.visible = true;
        statusX += 16;
      }

      for (const sub of enemy.subsystems) {
        const subView = view.subsystemViews.get(sub.id);
        if (subView === undefined) continue;
        subView.chip.alpha = sub.hp > 0 ? 1 : 0.25;
        subView.hp.text = String(sub.hp);
        subView.ring.visible = sub.hp > 0 && state.targetId === sub.id;
      }
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

  private reserveAnchor(): { x: number; y: number } {
    const rect = this.layout.reserve;
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
    const base = this.layout.tray[index] ?? {
      x: this.app.screen.width / 2,
      y: this.layout.tray[0]?.y ?? 0,
    };
    const lifted =
      state.rerollMode && state.rerollSelection.includes(uid)
        ? REROLL_LIFT
        : 0;
    return { x: base.x, y: base.y - lifted };
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

  private syncSelectionRing(uid: string, x: number, y: number, size: number): void {
    let ring = this.selectionRings.get(uid);
    if (ring === undefined) {
      ring = new Graphics();
      this.overlayLayer.addChild(ring);
      this.selectionRings.set(uid, ring);
    }
    ring.clear();
    ring
      .roundRect(x - size / 2 - 3, y - size / 2 - 3, size + 6, size + 6, size * 0.26)
      .stroke({ color: tokens.accent, width: 2 });
    ring.visible = true;
  }

  private syncLockOverlay(uid: string, x: number, y: number, size: number): void {
    let overlay = this.lockOverlays.get(uid);
    if (overlay === undefined) {
      overlay = new Graphics();
      this.overlayLayer.addChild(overlay);
      this.lockOverlays.set(uid, overlay);
    }
    overlay.clear();
    overlay
      .roundRect(x - size / 2, y - size / 2, size, size, size * 0.23)
      .fill({ color: "#000000", alpha: 0.5 });
    const badge = size * 0.34;
    const bx = x + size / 2 - badge / 2 - 3;
    const by = y - size / 2 + badge / 2 + 3;
    const shackleR = badge * 0.2;
    const shackleY = by - badge * 0.08;
    overlay.circle(bx, by, badge * 0.5).fill(EMPTY_SLOT_FILL);
    overlay
      .moveTo(bx - shackleR, shackleY)
      .arc(bx, shackleY, shackleR, Math.PI, 0)
      .stroke({ color: tokens.text, width: 2 });
    overlay
      .roundRect(bx - badge * 0.26, shackleY, badge * 0.52, badge * 0.4, 2)
      .fill(tokens.text);
    overlay.visible = true;
  }

  private syncBoard(state: BattleState): void {
    const seen = new Set<string>();
    const visibleRings = new Set<string>();
    const visibleLocks = new Set<string>();
    for (const die of state.dice) {
      seen.add(die.uid);
      const sprite = this.ensureDieSprite(die);
      if (this.drag?.uid === die.uid || this.animating.has(die.uid)) continue;
      const locked = die.state === "locked" || isDieLockedNow(state, die.uid);
      if (die.state === "placed" && die.slot !== undefined) {
        const anchor = this.slotDieAnchor(die.slot);
        if (anchor === undefined) continue;
        sprite.texture = this.dieTextureFor(die, MINI_DIE_SIZE);
        sprite.position.set(anchor.x, anchor.y);
        sprite.scale.set(1);
        sprite.alpha = 1;
        sprite.visible = true;
        if (state.selectedDieUid === die.uid) {
          this.syncSelectionRing(die.uid, anchor.x, anchor.y, MINI_DIE_SIZE);
          visibleRings.add(die.uid);
        }
      } else if (die.state === "reserved") {
        const anchor = this.reserveAnchor();
        sprite.texture = this.dieTextureFor(die, MINI_DIE_SIZE);
        sprite.position.set(anchor.x, anchor.y);
        sprite.scale.set(1);
        sprite.alpha = 1;
        sprite.visible = true;
      } else if (die.state === "tray" || die.state === "locked") {
        const anchor = this.trayAnchor(die.uid, state);
        sprite.texture = this.dieTextureFor(die, this.layout.dieSize);
        sprite.position.set(anchor.x, anchor.y);
        sprite.scale.set(1);
        sprite.alpha = locked ? 0.55 : 1;
        sprite.visible = true;
        if (locked) {
          this.syncLockOverlay(die.uid, anchor.x, anchor.y, this.layout.dieSize);
          visibleLocks.add(die.uid);
        }
        const ringSelected =
          state.selectedDieUid === die.uid ||
          (state.rerollMode && state.rerollSelection.includes(die.uid));
        if (ringSelected) {
          this.syncSelectionRing(die.uid, anchor.x, anchor.y, this.layout.dieSize);
          visibleRings.add(die.uid);
        }
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
    for (const [uid, ring] of this.selectionRings) {
      if (!visibleRings.has(uid)) ring.visible = false;
      if (!seen.has(uid)) {
        ring.destroy();
        this.selectionRings.delete(uid);
      }
    }
    for (const [uid, overlay] of this.lockOverlays) {
      if (!visibleLocks.has(uid)) overlay.visible = false;
      if (!seen.has(uid)) {
        overlay.destroy();
        this.lockOverlays.delete(uid);
      }
    }
    for (const slotId of activeSlotIds(state)) {
      const occupied = state.slots[slotId]?.dieUid !== undefined;
      const blocked = isSlotBlockedNow(state, slotId);
      const view = this.slotViews.get(slotId);
      if (
        view !== undefined &&
        (view.occupied !== occupied || view.blocked !== blocked)
      ) {
        this.drawSlotBox(slotId, occupied, blocked);
      }
    }
    this.drawChargePips(state);
  }

  private readonly onStoreChange = (
    state: BattleState,
    prev: BattleState,
  ): void => {
    if (
      state.turn !== prev.turn ||
      state.enemies.length !== prev.enemies.length ||
      Object.keys(state.slots).length !== Object.keys(prev.slots).length
    ) {
      this.cancelDrag(state);
      this.rebuild(state);
    } else {
      if (
        state.dice !== prev.dice ||
        state.slots !== prev.slots ||
        state.rerollSelection !== prev.rerollSelection ||
        state.rerollMode !== prev.rerollMode ||
        state.selectedDieUid !== prev.selectedDieUid ||
        state.blockedSlots !== prev.blockedSlots ||
        state.lockedDice !== prev.lockedDice ||
        state.charge !== prev.charge
      ) {
        this.syncBoard(state);
      }
      if (state.enemies !== prev.enemies || state.targetId !== prev.targetId) {
        this.syncEnemies(state);
      }
    }
    if (
      state.resolution !== prev.resolution &&
      state.resolution !== null &&
      state.phase === "resolving"
    ) {
      this.startResolution(state);
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
    if (this.drag.reserveValid && this.reserveGlow !== null) {
      this.reserveGlow.alpha = alpha;
    }
  };

  private cancelDrag(state: BattleState): void {
    this.pendingPress = null;
    if (this.drag === null) return;
    const { sprite } = this.drag;
    this.clearGlow();
    this.drag = null;
    if (sprite.parent === this.dragLayer) this.trayLayer.addChild(sprite);
    this.syncBoard(state);
  }

  private clearGlow(): void {
    for (const view of this.slotViews.values()) view.glow.alpha = 0;
    if (this.reserveGlow !== null) this.reserveGlow.alpha = 0;
  }

  private onDiePointerDown(uid: string, e: FederatedPointerEvent): void {
    if (this.drag !== null || this.pendingPress !== null) return;
    const state = useBattleStore.getState();
    if (state.phase !== "placement") return;
    const die = state.dice.find((d) => d.uid === uid);
    if (die === undefined) return;
    if (die.state === "locked" || isDieLockedNow(state, uid)) return;
    if (die.state !== "tray" && die.state !== "placed" && die.state !== "reserved")
      return;
    this.pendingPress = { uid, startX: e.global.x, startY: e.global.y };
  }

  private beginDrag(e: FederatedPointerEvent): void {
    const press = this.pendingPress;
    if (press === null) return;
    this.pendingPress = null;
    const state = useBattleStore.getState();
    if (state.phase !== "placement" || state.rerollMode) return;
    const die = state.dice.find((d) => d.uid === press.uid);
    if (die === undefined) return;

    const sprite = this.dieSprites.get(press.uid);
    if (sprite === undefined) return;
    this.dieCancels.get(press.uid)?.();
    this.dieCancels.delete(press.uid);
    this.animating.delete(press.uid);
    const grab = sprite.getGlobalPosition();

    if (die.state === "placed") {
      useBattleStore.getState().unplaceDie(press.uid);
    } else if (die.state === "reserved") {
      useBattleStore.getState().unreserveDie(press.uid);
    }
    useBattleStore.getState().selectDie(null);

    this.dragLayer.addChild(sprite);
    sprite.position.set(grab.x, grab.y);
    sprite.texture = this.dieTextureFor(die, this.layout.dieSize);
    sprite.scale.set(1.06);
    sprite.alpha = 1;
    sprite.visible = true;

    const fresh = useBattleStore.getState();
    const snapshotLike = {
      dice: fresh.dice,
      slots: fresh.slots,
      blockedSlots: fresh.blockedSlots,
      lockedDice: fresh.lockedDice,
      turn: fresh.turn,
    };
    const validSlots = activeSlotIds(fresh).filter((slotId) =>
      canPlaceDie(snapshotLike, press.uid, slotId),
    );
    const reserveValid = !fresh.dice.some((d) => d.state === "reserved");

    this.glowTime = 0;
    this.drag = {
      uid: press.uid,
      sprite,
      offsetX: sprite.x - e.global.x,
      offsetY: sprite.y - e.global.y,
      validSlots,
      reserveValid,
    };
  }

  private readonly onStagePointerDown = (): void => {
    const state = useBattleStore.getState();
    if (state.phase === "resolving") {
      this.stopBeats();
      useBattleStore.getState().finishResolution();
    }
  };

  private readonly onPointerMove = (e: FederatedPointerEvent): void => {
    if (this.pendingPress !== null && this.drag === null) {
      const dx = e.global.x - this.pendingPress.startX;
      const dy = e.global.y - this.pendingPress.startY;
      if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
        this.beginDrag(e);
      }
      return;
    }
    if (this.drag === null) return;
    this.drag.sprite.position.set(
      e.global.x + this.drag.offsetX,
      e.global.y + this.drag.offsetY,
    );
  };

  private readonly onPointerUp = (e: FederatedPointerEvent): void => {
    if (this.pendingPress !== null && this.drag === null) {
      const uid = this.pendingPress.uid;
      this.pendingPress = null;
      this.onDieTap(uid);
      return;
    }
    if (this.drag === null) return;
    const { uid, sprite, validSlots, reserveValid } = this.drag;
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
    const reserveArea = reserveValid
      ? overlapArea(this.layout.reserve, sprite.x, sprite.y, this.layout.dieSize)
      : 0;
    if (best === undefined && reserveArea === 0) {
      best = validSlots.find((slotId) => {
        const rect = this.layout.slots[slotId];
        return rect !== undefined && contains(rect, px, py);
      });
    }

    if (reserveArea > bestArea) {
      this.animateReserve(uid, sprite);
    } else if (best !== undefined) {
      this.animatePlace(uid, best, sprite);
    } else {
      this.animateReturn(uid, sprite, true);
    }
  };

  private onDieTap(uid: string): void {
    const state = useBattleStore.getState();
    if (state.phase !== "placement") return;
    if (state.rerollMode) {
      useBattleStore.getState().toggleRerollDie(uid);
      return;
    }
    useBattleStore
      .getState()
      .selectDie(state.selectedDieUid === uid ? null : uid);
  }

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

  private animateReserve(uid: string, sprite: Sprite): void {
    useBattleStore.getState().reserveDie(uid);
    const state = useBattleStore.getState();
    const die = state.dice.find((d) => d.uid === uid);
    if (die?.state !== "reserved") {
      this.animateReturn(uid, sprite, true);
      return;
    }
    const anchor = this.reserveAnchor();
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

  private enemyAnchor(targetId: string): { x: number; y: number } | undefined {
    const direct = this.enemyViews.get(targetId);
    if (direct !== undefined) {
      return { x: direct.root.x, y: direct.root.y };
    }
    const parentId = targetId.split(":")[0] ?? targetId;
    const parent = this.enemyViews.get(parentId);
    if (parent === undefined) return undefined;
    const sub = parent.subsystemViews.get(targetId);
    if (sub === undefined) return { x: parent.root.x, y: parent.root.y };
    return {
      x: parent.root.x + sub.chip.x,
      y: parent.root.y + sub.chip.y,
    };
  }

  private fireProjectile(
    from: { x: number; y: number },
    to: { x: number; y: number },
  ): void {
    const line = new Graphics();
    line
      .moveTo(from.x, from.y)
      .lineTo(to.x, to.y)
      .stroke({ color: schools.red.stroke, width: 2 });
    line.alpha = 0.9;
    this.fxLayer.addChild(line);
    this.tweens.to(line, { alpha: 0 }, 200, linear, () => {
      line.destroy();
    });
    const ring = new Graphics();
    ring.circle(to.x, to.y, 6).stroke({ color: schools.red.stroke, width: 2 });
    ring.alpha = 0.9;
    this.fxLayer.addChild(ring);
    this.tweens.to(ring.scale, { x: 2.2, y: 2.2 }, 240, easeOutQuad);
    ring.pivot.set(to.x, to.y);
    ring.position.set(to.x, to.y);
    this.tweens.to(ring, { alpha: 0 }, 240, linear, () => {
      ring.destroy();
    });
  }

  private shieldShimmer(): void {
    const { playerHit } = this.layout;
    const arc = new Graphics();
    arc
      .arc(playerHit.x, playerHit.y + 10, 48, Math.PI * 1.15, Math.PI * 1.85)
      .stroke({ color: schools.blue.stroke, width: 3 });
    arc.alpha = 0.95;
    this.fxLayer.addChild(arc);
    this.tweens.to(arc, { alpha: 0 }, 320, linear, () => {
      arc.destroy();
    });
  }

  private thrusterPuff(): void {
    const rect = this.layout.slots.engines;
    const cx = rect === undefined ? this.layout.playerHit.x : rect.x + rect.w / 2;
    const cy = rect === undefined ? this.layout.playerHit.y : rect.y + rect.h / 2;
    for (let i = 0; i < 3; i += 1) {
      const puff = new Graphics();
      puff
        .circle(cx - 14 + i * 14, cy, 5)
        .fill({ color: schools.green.stroke, alpha: 0.7 });
      this.fxLayer.addChild(puff);
      this.tweens.to(puff.scale, { x: 2, y: 2 }, 260 + i * 40, easeOutQuad);
      puff.pivot.set(cx - 14 + i * 14, cy);
      puff.position.set(cx - 14 + i * 14, cy);
      this.tweens.to(puff, { alpha: 0 }, 260 + i * 40, linear, () => {
        puff.destroy();
      });
    }
  }

  private scanSweep(targetId: string): void {
    const anchor = this.enemyAnchor(targetId);
    if (anchor === undefined) return;
    const size = this.layout.enemySize;
    const sweep = new Graphics();
    sweep
      .moveTo(anchor.x - size / 2 - 4, 0)
      .lineTo(anchor.x + size / 2 + 4, 0)
      .stroke({ color: schools.prismatic.stroke, width: 2 });
    sweep.y = anchor.y - size / 2;
    sweep.alpha = 0.9;
    this.fxLayer.addChild(sweep);
    this.tweens.to(sweep, { y: anchor.y + size / 2 }, 280, linear);
    this.tweens.to(sweep, { alpha: 0 }, 320, linear, () => {
      sweep.destroy();
    });
  }

  private startResolution(state: BattleState): void {
    const bundle = state.resolution;
    if (bundle === null) return;
    this.stopBeats();
    const reduced = resolveReducedMotion(
      useSettingsStore.getState().reducedMotion,
    );
    if (reduced) {
      useBattleStore.getState().finishResolution();
      return;
    }
    const run = { cancelled: false };
    this.beatRun = run;
    void this.runBeats(bundle, run);
  }

  private sleep(ms: number, run: { cancelled: boolean }): Promise<void> {
    return new Promise((resolve) => {
      const id = window.setTimeout(() => {
        this.beatTimeouts = this.beatTimeouts.filter((t) => t !== id);
        if (!run.cancelled) resolve();
      }, ms);
      this.beatTimeouts.push(id);
    });
  }

  private async runBeats(
    bundle: ResolutionBundle,
    run: { cancelled: boolean },
  ): Promise<void> {
    for (const beat of bundle.beats) {
      if (run.cancelled) return;
      this.playBeat(beat);
      useBattleStore.getState().applyBeatSnapshot(beat.after);
      await this.sleep(BEAT_GAP_MS, run);
    }
    for (const beat of bundle.enemyBeats) {
      if (run.cancelled) return;
      this.playEnemyBeat(beat);
      useBattleStore.getState().applyBeatSnapshot(beat.after);
      await this.sleep(BEAT_GAP_MS, run);
    }
    if (run.cancelled) return;
    this.beatRun = null;
    useBattleStore.getState().finishResolution();
  }

  private slotCenter(slotId: SlotId): { x: number; y: number } {
    const rect = this.layout.slots[slotId];
    if (rect === undefined) return this.layout.playerHit;
    return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
  }

  private playBeat(beat: Beat): void {
    this.pulseSlot(beat.slot);
    const slotAnchor = this.slotDieAnchor(beat.slot) ?? this.slotCenter(beat.slot);
    if (beat.kind === "damage" && beat.targetId !== undefined) {
      const anchor = this.enemyAnchor(beat.targetId);
      if (anchor !== undefined) {
        this.fireProjectile(slotAnchor, anchor);
        const parentId = beat.targetId.split(":")[0] ?? beat.targetId;
        this.flashEnemy(parentId);
        this.spawnNumber(
          anchor.x,
          anchor.y - this.layout.enemySize / 2,
          `-${String(beat.amount)}`,
          schools.red.text,
        );
      }
      return;
    }
    if (beat.kind === "spinalJam") {
      this.spawnNumber(slotAnchor.x, slotAnchor.y - 20, this.labels.jamLabel, tokens.danger);
      return;
    }
    if (beat.kind === "sensor" && beat.targetId !== undefined) {
      this.scanSweep(beat.targetId);
      return;
    }
    if (beat.kind === "shield") {
      this.shieldShimmer();
      this.spawnNumber(
        slotAnchor.x,
        slotAnchor.y - 24,
        `+${String(beat.amount)}`,
        schools.blue.text,
      );
      return;
    }
    if (beat.kind === "engine") {
      this.thrusterPuff();
      return;
    }
    this.spawnNumber(
      slotAnchor.x,
      slotAnchor.y - 24,
      `+${String(beat.amount)}`,
      tokens.amber,
    );
    if (beat.overflowHull !== undefined) {
      this.spawnNumber(
        this.layout.playerHit.x,
        this.layout.playerHit.y,
        `-${String(beat.overflowHull)}`,
        schools.red.text,
      );
    }
  }

  private playEnemyBeat(beat: EnemyBeat): void {
    const view = this.enemyViews.get(beat.enemyId);
    const origin =
      view === undefined
        ? this.layout.playerHit
        : { x: view.root.x, y: view.root.y };
    if (beat.kind === "attack") {
      this.flashEnemy(beat.enemyId);
      this.fireProjectile(origin, this.layout.playerHit);
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
      } else {
        this.spawnNumber(playerHit.x, playerHit.y, "0", tokens.dim);
      }
      return;
    }
    if (beat.kind === "shield" || beat.kind === "shieldAll") {
      this.spawnNumber(
        origin.x,
        origin.y - this.layout.enemySize / 2,
        `+${String(beat.amount)}`,
        schools.blue.text,
      );
      return;
    }
    if (beat.kind === "charge") {
      if (view !== undefined) {
        this.tweens.to(view.root.scale, { x: 1.12, y: 1.12 }, 140, easeOutQuad, () => {
          this.tweens.to(view.root.scale, { x: 1, y: 1 }, 160, easeOutQuad);
        });
      }
      return;
    }
    if (beat.kind === "jamSlot" && beat.slot !== undefined) {
      const center = this.slotCenter(beat.slot);
      this.fireProjectile(origin, center);
      this.spawnNumber(center.x, center.y - 16, this.labels.jamLabel, tokens.danger);
      return;
    }
    if (beat.kind === "lockDie" && beat.dieUid !== undefined) {
      const state = useBattleStore.getState();
      const anchor = this.trayAnchor(beat.dieUid, state);
      this.fireProjectile(origin, anchor);
      return;
    }
    if (beat.kind === "burnTick") {
      this.flashEnemy(beat.enemyId);
      this.spawnNumber(
        origin.x,
        origin.y - this.layout.enemySize / 2,
        `-${String(beat.amount)}`,
        STATUS_TINTS.burn,
      );
      return;
    }
    if (beat.kind === "summon") {
      this.flashEnemy(beat.enemyId);
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
