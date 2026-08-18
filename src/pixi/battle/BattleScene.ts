import { Container, Graphics, Sprite, Text } from "pixi.js";
import type { Application, Ticker } from "pixi.js";
import { subscribeBodyRect } from "@/app/bands";
import { mixHex } from "@/app/color";
import { onThemeChange, tokens } from "@/app/theme";
import { DIE_BY_ID } from "@/data/dice";
import { FATE_DIE_ID } from "@/data/fate";
import { ENEMY_BY_ID } from "@/data/enemies";
import { engravingsForDie } from "@/data/engravings";
import { schools } from "@/data/schools";
import { shipGlyphFor, type GlyphPoint } from "@/data/shipGlyphs";
import { RESONANCE_THRESHOLDS, SCHOOL_ORDER } from "@/game/battle/resonance";
import { boardSlotIds, legalTargets } from "@/game/battle/view";
import type { StatusKey } from "@/game/battle/statuses";
import { duckMusic, playSfx } from "@/services/audio";
import { haptic } from "@/services/tma";
import {
  clearDieTextureCache,
  dieTexture,
  PIXI_FONT_FAMILY,
  releaseDieTextures,
} from "@/pixi/textures";
import { clearPool, reportPool } from "@/pixi/perf";
import { setDraggedDie } from "@/pixi/battle/dragState";
import { focusEnemy } from "@/pixi/battle/enemyFocus";
import {
  boardRegion,
  publishBattleAnchors,
  publishSelectionAnchor,
  reserveAnchor,
  reserveWellAt,
  slotAnchor,
  subscribeAnchors,
  type AnchorRect,
} from "@/pixi/battle/anchors";
import {
  computeBattleLayout,
  type BattleLayout,
  type Rect,
} from "@/pixi/battle/layout";
import { easeOutQuad, linear, Tweens } from "@/pixi/tween";
import { Tumble, type TumbleDie } from "@/pixi/battle/tumble";
import {
  resolveReducedMotion,
  useSettingsStore,
} from "@/stores/settingsStore";
import { useBattleStore } from "@/stores/battleStore";
import type { BattleState } from "@/stores/battleStore";
import type {
  Beat,
  EnemyBeat,
  EnemyBeatKind,
  EnemyState,
  ResolutionBundle,
  RolledDie,
  SlotId,
} from "@/types/battle";
import type { Intent, School } from "@/types/content";

export interface BattleSceneLabels {
  statusGlyph: (key: StatusKey) => string;
  jamLabel: string;
  pierceLabel: (n: number) => string;
  beatGlyph: (kind: EnemyBeatKind) => string;
}

export type DropTarget = SlotId | "reserve";

const MINI_DIE_SIZE = 40;
const BEAT_GAP_NORMAL_MS = 180;
const BEAT_GAP_FAST_MS = 90;
const DAMAGE_POOL_SIZE = 12;
const PARTICLE_POOL_SIZE = 40;
const GLOW_POOL_SIZE = 3;
const DRAG_THRESHOLD = 6;
const REROLL_LIFT = 4;
const SHAKE_AMPLITUDE = 6;
const SHAKE_MS = 180;
const BIG_HIT_DAMAGE = 10;
const HIT_STOP_MS = 70;
const HEAVY_HIT_STOP_MS = 90;
const PROJECTILE_MS = 120;
const DEATH_MS = 560;
const NUMBER_STACK_OFFSET = 22;
const NUMBER_STACK_WINDOW_MS = 420;
const DIE_HIT_PAD = 4;
const CARD_PULSE_MS = 340;
const PRISM_HZ = 0.28;
const FALLBACK_BAND: AnchorRect = { x: 0, y: 0, w: 0, h: 0 };

const beatGapMs = (): number =>
  useSettingsStore.getState().battleSpeed === "fast"
    ? BEAT_GAP_FAST_MS
    : BEAT_GAP_NORMAL_MS;

const emptySlotFill = (): string => mixHex(tokens.surface1, tokens.bg, 0.45);
const enemyFill = (): string => tokens.surface2;

const WARD_RATE: Record<School, number> = {
  red: 0.82,
  blue: 1.24,
  green: 1.06,
  black: 0.7,
  yellow: 1.14,
  grey: 0.94,
  prismatic: 1.42,
};

const INTENT_GLYPH: Record<Intent["t"], string> = {
  attack: "⚔",
  multi: "⚔",
  mirrorHalf: "⚔",
  mirrorSchool: "⚔",
  enrage: "⚔",
  echoTotal: "⚔",
  bargain: "◈",
  stealScrap: "◈",
  shield: "⛨",
  shieldAll: "⛨",
  shieldGate: "▣",
  siphonShield: "⇣",
  healAllies: "✚",
  charge: "⚡",
  drainCharge: "⚡",
  jamSlot: "⊘",
  lockDie: "⛓",
  summon: "✦",
  capShrink: "▽",
  twistDie: "↯",
  swapValues: "⇄",
  storm: "↯",
  curseDie: "☠",
  hijack: "↱",
  foldOrder: "∞",
  devourDie: "◉",
};

const ATTACK_INTENTS: ReadonlySet<Intent["t"]> = new Set([
  "attack",
  "multi",
  "mirrorHalf",
  "mirrorSchool",
  "enrage",
  "echoTotal",
]);

const intentAmount = (intent: Intent): string => {
  if (intent.t === "multi") return `${String(intent.n)}×${String(intent.k)}`;
  if ("n" in intent) return String(intent.n);
  if (intent.t === "echoTotal") return String(intent.cap);
  return "";
};

const intentLabelFor = (intent: Intent): string => {
  const amount = intentAmount(intent);
  return amount === "" ? INTENT_GLYPH[intent.t] : `${INTENT_GLYPH[intent.t]}${amount}`;
};

const intentTint = (intent: Intent): string =>
  ATTACK_INTENTS.has(intent.t) ? schools.red.text : tokens.dim;

const statusTint = (key: StatusKey): string => {
  switch (key) {
    case "burn":
      return mixHex(tokens.amber, tokens.danger, 0.45);
    case "mark":
      return tokens.amber;
    case "jam":
      return schools.blue.stroke;
    case "charge":
      return schools.black.stroke;
  }
};

interface EnemyView {
  root: Container;
  body: Graphics;
  flash: Graphics;
  targetRing: Graphics;
  hpRing: Graphics;
  intent: Text;
  statusTexts: Map<StatusKey, Text>;
  subsystemViews: Map<string, { chip: Container; ring: Graphics; hp: Text }>;
  cancelFlash?: () => void;
}

interface PendingPress {
  uid: string;
  startX: number;
  startY: number;
  pointerId: number;
}

interface DragState {
  uid: string;
  pointerId: number;
  sprite: Sprite;
  offsetX: number;
  offsetY: number;
  targets: DropTarget[];
  over: DropTarget | null;
}

interface PooledNumber {
  text: Text;
  cancels: (() => void)[];
  x: number;
  y: number;
  at: number;
}

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

const contains = (rect: Rect, x: number, y: number): boolean =>
  x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;

const activeSlotIds = (state: BattleState): SlotId[] =>
  Object.keys(state.slots) as SlotId[];

const isDieLockedNow = (state: BattleState, uid: string): boolean =>
  state.lockedDice.some((l) => l.uid === uid && l.untilTurn >= state.turn);

const sameShipRect = (a: Rect | null, b: Rect | null): boolean =>
  a !== null &&
  b !== null &&
  a.x === b.x &&
  a.y === b.y &&
  a.w === b.w &&
  a.h === b.h;

const cardElement = (target: DropTarget): HTMLElement | null =>
  document.querySelector<HTMLElement>(
    target === "reserve" ? "[data-reserve]" : `[data-slot="${target}"]`,
  );

export class BattleScene {
  private readonly app: Application;
  private readonly labels: BattleSceneLabels;
  private readonly tweens: Tweens;

  private readonly bg = new Container();
  private readonly enemiesLayer = new Container();
  private readonly trayLayer = new Container();
  private readonly overlayLayer = new Container();
  private readonly dragLayer = new Container();
  private readonly fxLayer = new Container();

  private layout: BattleLayout;
  private origin = { left: 0, top: 0 };
  private readonly enemyViews = new Map<string, EnemyView>();
  private readonly dieSprites = new Map<string, Sprite>();
  private readonly lockOverlays = new Map<string, Graphics>();
  private readonly selectionRings = new Map<string, Graphics>();
  private readonly prismRims = new Map<string, Graphics>();
  private prismPhase = 0;
  private readonly dieCancels = new Map<string, () => void>();
  private readonly animating = new Set<string>();
  private readonly numberPool: PooledNumber[] = [];
  private readonly flaggedCards = new Set<DropTarget>();
  private shipView: Container | null = null;
  private shipFlash: Graphics | null = null;
  private shipFlashCancel: (() => void) | null = null;
  private tumbleFx: Tumble | null = null;
  private readonly tumblingUids = new Set<string>();
  private beatTimeouts: number[] = [];
  private beatRun: { cancelled: boolean } | null = null;
  private pendingPress: PendingPress | null = null;
  private drag: DragState | null = null;
  private shakeMs = 0;
  private hitStopMs = 0;
  private elapsedMs = 0;
  private readonly particlePool: Graphics[] = [];
  private readonly glowPool: Graphics[] = [];
  private readonly particleCancels = new Set<() => void>();
  private readonly dyingEnemies = new Set<string>();
  private readonly mirrorIntents = new Set<string>();
  private readonly unsubscribe: () => void;
  private readonly unsubscribeTheme: () => void;
  private readonly unsubscribeBands: () => void;
  private readonly unsubscribeAnchors: () => void;
  private readonly unsubscribeSettings: () => void;
  private readonly motionQuery: MediaQueryList;
  private motionReduced = false;

  constructor(app: Application, labels: BattleSceneLabels) {
    this.app = app;
    this.labels = labels;
    this.tweens = new Tweens(app.ticker);
    this.motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.motionReduced = resolveReducedMotion(
      useSettingsStore.getState().reducedMotion,
    );
    this.readOrigin();
    this.layout = this.computeLayout();

    app.stage.addChild(
      this.bg,
      this.enemiesLayer,
      this.trayLayer,
      this.overlayLayer,
      this.dragLayer,
      this.fxLayer,
    );
    app.stage.eventMode = "none";

    window.addEventListener("pointerdown", this.onPointerDown, true);
    window.addEventListener("pointermove", this.onPointerMove, true);
    window.addEventListener("pointerup", this.onPointerUp, true);
    window.addEventListener("pointercancel", this.onPointerCancel, true);

    this.buildNumberPool();
    this.buildParticlePool();
    const initial = useBattleStore.getState();
    this.rebuild(initial);
    this.maybeTumble(initial);
    if (initial.phase === "placement") playSfx("rollTumble");
    this.announceElites(initial);
    this.unsubscribe = useBattleStore.subscribe(this.onStoreChange);
    this.unsubscribeTheme = onThemeChange(this.onThemeSwitch);
    this.unsubscribeBands = subscribeBodyRect(this.onResize);
    this.unsubscribeAnchors = subscribeAnchors(this.onAnchorsChange);
    this.unsubscribeSettings = useSettingsStore.subscribe(this.onMotionChange);
    this.motionQuery.addEventListener("change", this.onMotionChange);
    this.app.renderer.on("resize", this.onResize);
    this.app.ticker.add(this.tick);
    if (useBattleStore.getState().phase === "resolving") {
      this.startResolution(useBattleStore.getState());
    }
  }

  destroy(): void {
    this.stopBeats();
    this.shipFlashCancel?.();
    this.shipFlashCancel = null;
    this.shipView?.destroy({ children: true });
    this.shipView = null;
    this.shipFlash = null;
    this.tumbleFx?.destroy();
    this.tumbleFx = null;
    if (useBattleStore.getState().phase === "resolving") {
      useBattleStore.getState().finishResolution();
    }
    this.clearCardFlags();
    this.unsubscribe();
    this.unsubscribeTheme();
    this.unsubscribeBands();
    this.unsubscribeAnchors();
    this.unsubscribeSettings();
    this.motionQuery.removeEventListener("change", this.onMotionChange);
    this.app.stage.position.set(0, 0);
    this.app.renderer.off("resize", this.onResize);
    this.app.ticker.remove(this.tick);
    window.removeEventListener("pointerdown", this.onPointerDown, true);
    window.removeEventListener("pointermove", this.onPointerMove, true);
    window.removeEventListener("pointerup", this.onPointerUp, true);
    window.removeEventListener("pointercancel", this.onPointerCancel, true);
    this.tweens.destroy();
    this.app.stage.removeChildren();
    for (const layer of [
      this.bg,
      this.enemiesLayer,
      this.trayLayer,
      this.overlayLayer,
      this.dragLayer,
      this.fxLayer,
    ]) {
      layer.destroy({ children: true });
    }
    publishBattleAnchors(null);
    publishSelectionAnchor(null);
    clearPool("battleFx");
    releaseDieTextures(this.app);
  }

  private stopBeats(): void {
    if (this.beatRun !== null) this.beatRun.cancelled = true;
    this.beatRun = null;
    for (const id of this.beatTimeouts) window.clearTimeout(id);
    this.beatTimeouts = [];
  }

  private readOrigin(): void {
    const rect = this.app.canvas.getBoundingClientRect();
    this.origin = { left: rect.left, top: rect.top };
  }

  private toStageRect(rect: AnchorRect): Rect {
    return {
      x: rect.x - this.origin.left,
      y: rect.y - this.origin.top,
      w: rect.w,
      h: rect.h,
    };
  }

  private shipBand(): Rect | null {
    const rect = boardRegion("ship");
    return rect === undefined ? null : this.toStageRect(rect);
  }

  private band(name: "enemies" | "tray" | "dock"): Rect {
    const rect = boardRegion(name);
    if (rect === undefined) {
      const width = this.app.screen.width;
      const height = this.app.screen.height;
      const slice = height / 3;
      const index = name === "enemies" ? 0 : name === "tray" ? 1 : 2;
      return width > 0
        ? { x: 0, y: slice * index, w: width, h: slice }
        : FALLBACK_BAND;
    }
    return this.toStageRect(rect);
  }

  private slotRect(slotId: SlotId): Rect | undefined {
    const anchor = slotAnchor(slotId);
    return anchor === undefined ? undefined : this.toStageRect(anchor.rect);
  }

  private slotWell(slotId: SlotId): Rect | undefined {
    const anchor = slotAnchor(slotId);
    return anchor === undefined ? undefined : this.toStageRect(anchor.well);
  }

  private reserveRect(): Rect | undefined {
    const anchor = reserveAnchor();
    return anchor === null ? undefined : this.toStageRect(anchor.rect);
  }

  private reserveWell(index: number): Rect | undefined {
    const well = reserveWellAt(index);
    return well === undefined ? undefined : this.toStageRect(well);
  }

  private dropRect(target: DropTarget): Rect | undefined {
    return target === "reserve" ? this.reserveRect() : this.slotRect(target);
  }

  private computeLayout(): BattleLayout {
    const state = useBattleStore.getState();
    return computeBattleLayout({
      enemyBand: this.band("enemies"),
      trayBand: this.band("tray"),
      dockBand: this.band("dock"),
      shipBand: this.shipBand(),
      diceCount: state.dice.length,
      enemyCount: state.enemies.length,
      maxSubsystems: state.enemies.reduce(
        (most, enemy) => Math.max(most, enemy.subsystems.length),
        0,
      ),
    });
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
      this.numberPool.push({ text, cancels: [], x: 0, y: 0, at: -Infinity });
    }
  }

  private buildParticlePool(): void {
    for (let i = 0; i < PARTICLE_POOL_SIZE; i += 1) {
      const dot = new Graphics();
      dot.visible = false;
      dot.eventMode = "none";
      this.fxLayer.addChild(dot);
      this.particlePool.push(dot);
    }
    for (let i = 0; i < GLOW_POOL_SIZE; i += 1) {
      const glow = new Graphics();
      glow.visible = false;
      glow.eventMode = "none";
      this.fxLayer.addChild(glow);
      this.glowPool.push(glow);
    }
  }

  private readonly onMotionChange = (): void => {
    this.motionReduced = resolveReducedMotion(
      useSettingsStore.getState().reducedMotion,
    );
  };

  private reduced(): boolean {
    return this.motionReduced;
  }

  private readonly onThemeSwitch = (): void => {
    const state = useBattleStore.getState();
    this.cancelTumble();
    this.cancelDrag(state);
    for (const cancel of this.dieCancels.values()) cancel();
    this.dieCancels.clear();
    this.animating.clear();
    for (const cancel of this.particleCancels) cancel();
    this.particleCancels.clear();
    for (const dot of this.particlePool) {
      dot.clear();
      dot.visible = false;
    }
    clearDieTextureCache(this.app);
    this.rebuild(useBattleStore.getState());
  };

  private setCardFlag(target: DropTarget, name: string, on: boolean): void {
    const el = cardElement(target);
    if (el === null) return;
    if (on) {
      el.setAttribute(name, "1");
      this.flaggedCards.add(target);
    } else {
      el.removeAttribute(name);
    }
  }

  private clearCardFlags(): void {
    for (const target of this.flaggedCards) {
      cardElement(target)?.removeAttribute("data-over");
    }
    this.flaggedCards.clear();
    setDraggedDie(null);
  }

  private pulseCard(target: DropTarget): void {
    const el = cardElement(target);
    if (el === null) return;
    el.removeAttribute("data-pulse");
    void el.offsetWidth;
    el.setAttribute("data-pulse", "1");
    window.setTimeout(() => {
      el.removeAttribute("data-pulse");
    }, CARD_PULSE_MS);
  }

  private takeParticle(): Graphics | undefined {
    const free = this.particlePool.find((dot) => !dot.visible);
    if (free === undefined) return undefined;
    free.clear();
    free.alpha = 1;
    free.scale.set(1);
    free.visible = true;
    return free;
  }

  private trackParticle(cancel: () => void): void {
    this.particleCancels.add(cancel);
  }

  private resonanceBurst(school: School): void {
    const colors = schools[school];
    playSfx("setComplete");
    haptic("setComplete");
    duckMusic(900);
    if (this.reduced()) {
      this.sceneGlowPulse(colors.stroke, 0.18, 220);
      return;
    }
    const rect = this.slotRect("reactor") ?? this.band("dock");
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    for (let i = 0; i < 12; i += 1) {
      const dot = this.takeParticle();
      if (dot === undefined) break;
      const angle = (i / 12) * Math.PI * 2;
      dot.circle(0, 0, 3.5).fill(colors.stroke);
      dot.position.set(cx, cy);
      const cancelMove = this.tweens.to(
        dot,
        {
          x: cx + Math.cos(angle) * 78,
          y: cy + Math.sin(angle) * 78,
        },
        520,
        easeOutQuad,
      );
      const cancelFade = this.tweens.to(dot, { alpha: 0 }, 520, linear, () => {
        dot.visible = false;
      });
      this.trackParticle(cancelMove);
      this.trackParticle(cancelFade);
    }
    this.sceneGlowPulse(colors.stroke, 0.22, 420);
  }

  private sceneGlowPulse(color: string, alpha: number, ms: number): void {
    const glow = this.glowPool.find((g) => !g.visible);
    if (glow === undefined) return;
    glow.clear();
    glow
      .rect(0, 0, this.app.screen.width, this.app.screen.height)
      .fill({ color, alpha: 1 });
    glow.alpha = alpha;
    glow.visible = true;
    this.trackParticle(
      this.tweens.to(glow, { alpha: 0 }, ms, easeOutQuad, () => {
        glow.visible = false;
      }),
    );
  }

  private announceElites(state: BattleState): void {
    const elite = state.enemies.some(
      (enemy) => ENEMY_BY_ID.get(enemy.defId)?.elite === true,
    );
    if (!elite || state.introPending) return;
    playSfx("eliteIntro");
    this.sceneGlowPulse(tokens.amber, 0.14, 320);
  }

  private bossShockwave(): void {
    playSfx("bossIntro");
    duckMusic(1500);
    const anchor = this.layout.enemies[0] ?? this.layout.playerHit;
    if (this.reduced()) {
      this.sceneGlowPulse(tokens.danger, 0.2, 240);
      return;
    }
    const ring = this.takeParticle();
    if (ring !== undefined) {
      ring.circle(0, 0, 28).stroke({ color: tokens.danger, width: 3 });
      ring.position.set(anchor.x, anchor.y);
      this.trackParticle(this.tweens.to(ring.scale, { x: 7, y: 7 }, 620, easeOutQuad));
      this.trackParticle(
        this.tweens.to(ring, { alpha: 0 }, 620, linear, () => {
          ring.visible = false;
        }),
      );
    }
    this.shake();
  }

  private mirrorShimmer(enemyId: string): void {
    const view = this.enemyViews.get(enemyId);
    if (view === undefined || this.reduced()) return;
    const size = this.layout.enemySize;
    const sheen = this.takeParticle();
    if (sheen === undefined) return;
    sheen
      .moveTo(-size * 0.1, -size / 2)
      .lineTo(size * 0.16, -size / 2)
      .lineTo(-size * 0.02, size / 2)
      .lineTo(-size * 0.28, size / 2)
      .closePath()
      .fill({ color: "#FFFFFF", alpha: 0.5 });
    sheen.position.set(view.root.x - size * 0.7, view.root.y);
    this.trackParticle(
      this.tweens.to(sheen, { x: view.root.x + size * 0.9 }, 560, easeOutQuad),
    );
    this.trackParticle(
      this.tweens.to(sheen, { alpha: 0 }, 560, linear, () => {
        sheen.visible = false;
      }),
    );
  }

  private corePulse(enemyId: string): void {
    const view = this.enemyViews.get(enemyId);
    const anchor =
      view === undefined
        ? this.layout.enemies[0] ?? this.layout.playerHit
        : { x: view.root.x, y: view.root.y };
    playSfx("bossPhase");
    if (this.reduced()) {
      this.sceneGlowPulse(tokens.danger, 0.24, 260);
      return;
    }
    for (let i = 0; i < 2; i += 1) {
      const ring = this.takeParticle();
      if (ring === undefined) break;
      ring.circle(0, 0, 20).stroke({ color: tokens.danger, width: 4 - i });
      ring.position.set(anchor.x, anchor.y);
      this.trackParticle(
        this.tweens.to(ring.scale, { x: 5 + i, y: 5 + i }, 520 + i * 160, easeOutQuad),
      );
      this.trackParticle(
        this.tweens.to(ring, { alpha: 0 }, 520 + i * 160, linear, () => {
          ring.visible = false;
        }),
      );
    }
    this.shake();
  }

  private deathFall(enemyId: string): void {
    const view = this.enemyViews.get(enemyId);
    if (view === undefined || this.reduced()) return;
    const { root } = view;
    const restY = root.y;
    this.dyingEnemies.add(enemyId);
    this.tweens.to(root, { rotation: 0.42, y: restY + 26 }, DEATH_MS, easeOutQuad);
    this.tweens.to(root.scale, { x: 0.86, y: 0.86 }, DEATH_MS, easeOutQuad);
    this.tweens.to(root, { alpha: 0.25 }, DEATH_MS, linear, () => {
      root.rotation = 0;
      root.y = restY;
      root.scale.set(1);
      this.dyingEnemies.delete(enemyId);
    });
    for (let i = 0; i < 6; i += 1) {
      const shard = this.takeParticle();
      if (shard === undefined) break;
      const size = this.layout.enemySize;
      shard
        .rect(-3, -3, 6, 6)
        .fill({ color: enemyFill(), alpha: 0.9 })
        .stroke({ color: tokens.line, width: 1 });
      shard.position.set(root.x, root.y);
      const angle = (i / 6) * Math.PI + Math.PI * 0.15;
      this.trackParticle(
        this.tweens.to(
          shard,
          {
            x: root.x + Math.cos(angle) * size * 0.7,
            y: root.y + Math.abs(Math.sin(angle)) * size * 0.6 + 20,
          },
          DEATH_MS,
          easeOutQuad,
        ),
      );
      this.trackParticle(
        this.tweens.to(shard, { alpha: 0 }, DEATH_MS, linear, () => {
          shard.visible = false;
        }),
      );
    }
  }

  private killBurst(enemyId: string, scrap: number): void {
    const view = this.enemyViews.get(enemyId);
    if (view === undefined) return;
    const at = { x: view.root.x, y: view.root.y };
    if (this.reduced()) {
      if (scrap > 0) this.spawnNumber(at.x, at.y, `+${String(scrap)}`, tokens.amber);
      return;
    }
    for (let i = 0; i < 8; i += 1) {
      const dot = this.takeParticle();
      if (dot === undefined) break;
      const angle = (i / 8) * Math.PI * 2 + 0.4;
      dot.rect(-2.5, -2.5, 5, 5).fill(tokens.danger);
      dot.position.set(at.x, at.y);
      this.trackParticle(
        this.tweens.to(
          dot,
          { x: at.x + Math.cos(angle) * 54, y: at.y + Math.sin(angle) * 54 },
          420,
          easeOutQuad,
        ),
      );
      this.trackParticle(
        this.tweens.to(dot, { alpha: 0 }, 420, linear, () => {
          dot.visible = false;
        }),
      );
    }
    if (scrap <= 0) return;
    const coin = this.takeParticle();
    if (coin === undefined) return;
    coin.circle(0, 0, 4).fill(tokens.amber);
    coin.position.set(at.x, at.y);
    const counter = { x: this.app.screen.width - 44, y: 46 };
    this.trackParticle(
      this.tweens.to(coin, { x: counter.x, y: counter.y }, 520, easeOutQuad, () => {
        coin.visible = false;
      }),
    );
  }

  private shake(): void {
    if (this.reduced()) return;
    if (!useSettingsStore.getState().screenShake) return;
    this.shakeMs = SHAKE_MS;
  }

  private publishAnchors(state: BattleState): void {
    if (import.meta.env.VITE_E2E !== "1") return;
    const band = this.layout.trayBand;
    const reserve = reserveAnchor();
    publishBattleAnchors({
      dice: state.dice.flatMap((die) => {
        const sprite = this.dieSprites.get(die.uid);
        if (sprite === undefined || !sprite.visible) return [];
        return [
          {
            uid: die.uid,
            x: this.origin.left + sprite.x,
            y: this.origin.top + sprite.y,
            size: Math.max(sprite.width, sprite.height),
          },
        ];
      }),
      slots: activeSlotIds(state).flatMap((id) => {
        const anchor = slotAnchor(id);
        return anchor === undefined ? [] : [{ id, ...anchor.rect }];
      }),
      reserve: reserve?.rect ?? { x: 0, y: 0, w: 0, h: 0 },
      tray: {
        x: this.origin.left + band.x,
        y: this.origin.top + band.y,
        w: band.w,
        h: band.h,
      },
    });
  }

  private rebuild(state: BattleState): void {
    this.readOrigin();
    this.layout = this.computeLayout();
    this.syncShip(state);
    this.buildEnemies(state);
    this.syncBoard(state);
    this.syncEnemies(state);
  }

  private syncShip(state: BattleState): void {
    this.shipFlashCancel?.();
    this.shipFlashCancel = null;
    this.shipView?.destroy({ children: true });
    this.shipView = null;
    this.shipFlash = null;
    const rect = this.layout.ship;
    if (rect === null) return;
    const glyph = shipGlyphFor(state.shipId);
    const size = Math.min(rect.w, rect.h);
    const poly = (points: readonly GlyphPoint[]): number[] =>
      points.flatMap(([x, y]) => [x * size, y * size]);
    const root = new Container();
    root.position.set(rect.x + rect.w / 2, rect.y + rect.h / 2);
    const body = new Graphics()
      .poly(poly(glyph.hull))
      .fill(mixHex(tokens.surface2, tokens.accent, 0.2))
      .stroke({ color: tokens.accent, width: 1.5 });
    for (const fin of glyph.fins) {
      body
        .poly(poly(fin))
        .fill(emptySlotFill())
        .stroke({ color: tokens.line, width: 1 });
    }
    const cockpit = new Graphics()
      .circle(
        glyph.cockpit.x * size,
        glyph.cockpit.y * size,
        glyph.cockpit.r * size,
      )
      .fill(tokens.accent);
    const flash = new Graphics().poly(poly(glyph.hull)).fill("#FFFFFF");
    flash.alpha = 0;
    root.addChild(body, cockpit, flash);
    this.bg.addChild(root);
    this.shipView = root;
    this.shipFlash = flash;
  }

  private flashShip(color: string): void {
    const flash = this.shipFlash;
    if (flash === null) return;
    this.shipFlashCancel?.();
    flash.tint = color;
    flash.alpha = this.reduced() ? 0.4 : 0.72;
    this.shipFlashCancel = this.tweens.to(
      flash,
      { alpha: 0 },
      this.reduced() ? 160 : 280,
      linear,
      () => {
        this.shipFlashCancel = null;
      },
    );
  }

  private publishSelection(state: BattleState): void {
    const uid = state.selectedDieUid;
    const sprite = uid === null ? undefined : this.dieSprites.get(uid);
    if (uid === null || sprite === undefined || !sprite.visible) {
      publishSelectionAnchor(null);
      return;
    }
    publishSelectionAnchor({
      x: this.origin.left + sprite.x,
      y: this.origin.top + sprite.y,
      size: Math.max(sprite.width, sprite.height),
    });
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
        .fill(enemyFill())
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
      const targetRing = new Graphics()
        .roundRect(-size / 2 - 5, -size / 2 - 5, size + 10, size + 10, 14)
        .stroke({ color: tokens.accent, width: 2.5 });
      targetRing.visible = false;
      const hpRing = new Graphics();
      const intent = new Text({
        text: "",
        style: {
          fontFamily: PIXI_FONT_FAMILY,
          fontSize: 12,
          fontWeight: "700",
          fill: tokens.dim,
        },
      });
      intent.anchor.set(0.5, 1);
      root.addChild(hpRing, body, targetRing, flash, intent);

      const statusTexts = new Map<StatusKey, Text>();
      (["burn", "mark", "jam", "charge"] as const).forEach((key) => {
        const text = new Text({
          text: this.labels.statusGlyph(key),
          style: {
            fontFamily: PIXI_FONT_FAMILY,
            fontSize: 12,
            fontWeight: "700",
            fill: statusTint(key),
          },
        });
        text.anchor.set(0.5, 0);
        text.visible = false;
        root.addChild(text);
        statusTexts.set(key, text);
      });

      const subsystemViews = new Map<
        string,
        { chip: Container; ring: Graphics; hp: Text }
      >();
      const chips = this.layout.subsystems;
      enemy.subsystems.forEach((sub, subIndex) => {
        const chip = new Container();
        chip.position.set(chips.x, chips.y0 + subIndex * chips.pitch);
        const circle = new Graphics()
          .circle(0, 0, chips.radius * 0.78)
          .fill(enemyFill())
          .stroke({ color: tokens.amber, width: 1.5 });
        const ring = new Graphics()
          .circle(0, 0, chips.radius)
          .stroke({ color: tokens.accent, width: 2 });
        ring.visible = false;
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
        hpRing,
        intent,
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
      if (alive || !this.dyingEnemies.has(enemy.id)) {
        view.root.alpha = alive ? 1 : 0.25;
      }
      view.targetRing.visible =
        alive &&
        (state.targetId === enemy.id ||
          enemy.subsystems.some((sub) => sub.id === state.targetId));

      const size = this.layout.enemySize;
      this.drawHpRing(view, enemy, size);
      if (alive) {
        view.intent.text = intentLabelFor(enemy.nextIntent);
        view.intent.style.fill = intentTint(enemy.nextIntent);
        view.intent.position.set(0, -size * 0.72 - 8);
        view.intent.visible = true;
      } else {
        view.intent.visible = false;
      }
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
          key === "burn" || key === "mark"
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

  private drawHpRing(view: EnemyView, enemy: EnemyState, size: number): void {
    const radius = size * 0.72;
    const ratio =
      enemy.hpMax > 0 ? Math.max(0, Math.min(1, enemy.hp / enemy.hpMax)) : 0;
    const g = view.hpRing;
    g.clear();
    g.circle(0, 0, radius).stroke({ color: tokens.line, width: 3.5 });
    if (ratio > 0) {
      g.arc(
        0,
        0,
        radius,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * ratio,
      ).stroke({
        color: ratio > 0.35 ? tokens.danger : tokens.amber,
        width: 3,
      });
    }
    if (enemy.shield > 0) {
      g.circle(0, 0, radius + 4).stroke({
        color: schools.blue.stroke,
        width: 1.5,
      });
    }
  }

  private slotDieAnchor(
    slotId: SlotId,
  ): { x: number; y: number; size: number } | undefined {
    const well = this.slotWell(slotId);
    if (well === undefined) return undefined;
    return {
      x: well.x + well.w / 2,
      y: well.y + well.h / 2,
      size: Math.min(well.w, well.h),
    };
  }

  private reserveDieAnchor(
    index: number,
  ): { x: number; y: number; size: number } | undefined {
    const well = this.reserveWell(index);
    if (well === undefined) return undefined;
    return {
      x: well.x + well.w / 2,
      y: well.y + well.h / 2,
      size: Math.min(well.w, well.h),
    };
  }

  private trayAnchor(
    uid: string,
    state: BattleState,
  ): { x: number; y: number } {
    const index = state.dice.findIndex((d) => d.uid === uid);
    const base = this.layout.tray[index] ?? {
      x: this.layout.trayBand.x + this.layout.trayBand.w / 2,
      y: this.layout.trayBand.y + this.layout.trayBand.h / 2,
    };
    const lifted =
      state.rerollMode && state.rerollSelection.includes(uid) ? REROLL_LIFT : 0;
    return { x: base.x, y: base.y - lifted };
  }

  private dieTextureFor(die: RolledDie, size: number) {
    const def = DIE_BY_ID.get(die.defId);
    return dieTexture(this.app, {
      school: die.school,
      tier: die.tier,
      value: die.value,
      size,
      defId: die.defId,
      growth: die.growth ?? 0,
      hasActive: def?.active !== undefined,
      customFaces: def?.faces !== undefined && def.faces.length > 0,
      fate: die.defId === FATE_DIE_ID,
      engraved:
        engravingsForDie(useBattleStore.getState().engravings, die.defId)
          .length > 0,
    });
  }

  private syncPrismRim(uid: string, x: number, y: number, size: number): void {
    let rim = this.prismRims.get(uid);
    if (rim === undefined) {
      rim = new Graphics();
      this.overlayLayer.addChild(rim);
      this.prismRims.set(uid, rim);
    }
    rim.clear();
    const half = size / 2 + 3;
    const radius = size * 0.26;
    rim
      .roundRect(-half, -half, half * 2, half * 2, radius)
      .stroke({ color: schools.prismatic.stroke, width: 2 });
    rim.position.set(x, y);
    rim.alpha = this.reduced() ? 0.6 : 0.35 + 0.35 * this.prismPhase;
    rim.visible = true;
  }

  private ensureDieSprite(die: RolledDie): Sprite {
    let sprite = this.dieSprites.get(die.uid);
    if (sprite === undefined) {
      sprite = new Sprite();
      sprite.anchor.set(0.5);
      sprite.eventMode = "none";
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
    overlay.circle(bx, by, badge * 0.5).fill(emptySlotFill());
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
    const visibleRims = new Set<string>();
    let reserveIndex = 0;
    for (const die of state.dice) {
      seen.add(die.uid);
      const sprite = this.ensureDieSprite(die);
      if (die.state === "reserved") reserveIndex += 1;
      if (this.drag?.uid === die.uid || this.animating.has(die.uid)) continue;
      const locked = die.state === "locked" || isDieLockedNow(state, die.uid);
      if (die.state === "placed" && die.slot !== undefined) {
        const anchor = this.slotDieAnchor(die.slot);
        if (anchor === undefined) {
          sprite.visible = false;
          continue;
        }
        sprite.texture = this.dieTextureFor(die, MINI_DIE_SIZE);
        sprite.position.set(anchor.x, anchor.y);
        sprite.scale.set(anchor.size / MINI_DIE_SIZE);
        sprite.alpha = 1;
        sprite.visible = true;
        if (die.school === "prismatic") {
          this.syncPrismRim(die.uid, anchor.x, anchor.y, anchor.size);
          visibleRims.add(die.uid);
        }
        if (die.pinned === true) {
          this.syncLockOverlay(die.uid, anchor.x, anchor.y, anchor.size);
          visibleLocks.add(die.uid);
        }
        if (state.selectedDieUid === die.uid) {
          this.syncSelectionRing(die.uid, anchor.x, anchor.y, anchor.size);
          visibleRings.add(die.uid);
        }
      } else if (die.state === "reserved") {
        const anchor = this.reserveDieAnchor(reserveIndex - 1);
        if (anchor === undefined) {
          sprite.visible = false;
          continue;
        }
        sprite.texture = this.dieTextureFor(die, MINI_DIE_SIZE);
        sprite.position.set(anchor.x, anchor.y);
        sprite.scale.set(anchor.size / MINI_DIE_SIZE);
        sprite.alpha = 1;
        sprite.visible = true;
      } else if (die.state === "tray" || die.state === "locked") {
        if (this.tumblingUids.has(die.uid)) {
          sprite.visible = false;
          continue;
        }
        const anchor = this.trayAnchor(die.uid, state);
        sprite.texture = this.dieTextureFor(die, this.layout.dieSize);
        sprite.position.set(anchor.x, anchor.y);
        sprite.scale.set(1);
        sprite.alpha = locked ? 0.55 : 1;
        sprite.visible = true;
        if (die.school === "prismatic") {
          this.syncPrismRim(die.uid, anchor.x, anchor.y, this.layout.dieSize);
          visibleRims.add(die.uid);
        }
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
    for (const [uid, rim] of this.prismRims) {
      if (!visibleRims.has(uid)) rim.visible = false;
      if (!seen.has(uid)) {
        rim.destroy();
        this.prismRims.delete(uid);
      }
    }
    this.publishSelection(state);
    this.publishAnchors(state);
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
      if (state.turn !== prev.turn) this.clearDieAnimations();
      this.cancelDrag(state);
      this.rebuild(state);
      if (state.turn !== prev.turn) {
        this.maybeTumble(state);
        if (state.phase === "placement") playSfx("rollTumble");
      }
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
    if (state.resonance !== prev.resonance) {
      this.checkResonanceMilestones(state, prev);
    }
    if (state.enemies !== prev.enemies) {
      this.checkKills(state, prev);
    }
    if (prev.introPending && !state.introPending) this.bossShockwave();
    if (state.enemies !== prev.enemies) this.checkMirrorIntents(state);
    if (state.charge > prev.charge) playSfx("charge");
    if (state.outcome !== prev.outcome && state.outcome !== undefined) {
      playSfx(state.outcome === "victory" ? "win" : "lose");
      duckMusic(1800);
      if (state.outcome === "defeat") this.shake();
    }
  };

  private checkResonanceMilestones(
    state: BattleState,
    prev: BattleState,
  ): void {
    for (const school of SCHOOL_ORDER) {
      const before = prev.resonance.counts[school];
      const after = state.resonance.counts[school];
      if (after <= before) continue;
      const crossed = RESONANCE_THRESHOLDS.some(
        (th) => before < th && after >= th,
      );
      if (crossed) {
        this.resonanceBurst(school);
        return;
      }
    }
  }

  private checkKills(state: BattleState, prev: BattleState): void {
    for (const enemy of state.enemies) {
      if (enemy.hp > 0) continue;
      const before = prev.enemies.find((e) => e.id === enemy.id);
      if (before === undefined || before.hp <= 0) continue;
      const def = ENEMY_BY_ID.get(enemy.defId);
      const headline = def?.boss === true || def?.miniboss === true;
      this.deathFall(enemy.id);
      this.killBurst(enemy.id, Math.max(0, state.scrap - prev.scrap));
      if (headline) {
        playSfx("bossDown");
        duckMusic(2200);
        haptic("bossDefeat");
        this.hitStop(HEAVY_HIT_STOP_MS);
        this.shake();
      } else {
        haptic("kill");
      }
    }
  }

  private checkMirrorIntents(state: BattleState): void {
    for (const enemy of state.enemies) {
      const mirroring = enemy.hp > 0 && enemy.nextIntent.t === "mirrorHalf";
      if (mirroring && !this.mirrorIntents.has(enemy.id)) {
        this.mirrorIntents.add(enemy.id);
        this.mirrorShimmer(enemy.id);
      } else if (!mirroring) {
        this.mirrorIntents.delete(enemy.id);
      }
    }
  }

  private readonly onResize = (): void => {
    this.cancelDrag(useBattleStore.getState());
    this.rebuild(useBattleStore.getState());
  };

  private readonly onAnchorsChange = (): void => {
    this.readOrigin();
    const before = this.layout.ship;
    this.layout = this.computeLayout();
    const after = this.layout.ship;
    if (before === null || after === null || !sameShipRect(before, after)) {
      this.syncShip(useBattleStore.getState());
    }
    this.repositionEnemies();
    this.syncBoard(useBattleStore.getState());
  };

  private repositionEnemies(): void {
    const state = useBattleStore.getState();
    state.enemies.forEach((enemy, index) => {
      const anchor = this.layout.enemies[index];
      const view = this.enemyViews.get(enemy.id);
      if (anchor === undefined || view === undefined) return;
      if (this.dyingEnemies.has(enemy.id)) return;
      view.root.position.set(anchor.x, anchor.y);
    });
  }

  private hitStop(ms: number): void {
    if (this.reduced()) return;
    this.hitStopMs = Math.max(this.hitStopMs, ms);
    this.tweens.timeScale = 0;
  }

  private readonly tick = (ticker: Ticker): void => {
    this.elapsedMs += ticker.deltaMS;
    if (this.prismRims.size > 0 && !this.reduced()) {
      this.prismPhase =
        0.5 + 0.5 * Math.sin((this.elapsedMs / 1000) * PRISM_HZ * Math.PI * 2);
      for (const rim of this.prismRims.values()) {
        if (rim.visible) rim.alpha = 0.35 + 0.35 * this.prismPhase;
      }
    }
    reportPool(
      "battleFx",
      this.numberPool.filter((p) => p.text.visible).length +
        this.particlePool.filter((p) => p.visible).length +
        this.glowPool.filter((p) => p.visible).length,
      this.numberPool.length + this.particlePool.length + this.glowPool.length,
    );
    if (this.hitStopMs > 0) {
      this.hitStopMs = Math.max(0, this.hitStopMs - ticker.deltaMS);
      if (this.hitStopMs === 0) this.tweens.timeScale = 1;
    }
    if (this.shakeMs > 0) {
      this.shakeMs = Math.max(0, this.shakeMs - ticker.deltaMS);
      const decay = this.shakeMs / SHAKE_MS;
      const amp = SHAKE_AMPLITUDE * decay;
      const phase = (SHAKE_MS - this.shakeMs) / 22;
      this.app.stage.position.set(
        Math.sin(phase) * amp,
        Math.cos(phase * 1.4) * amp * 0.6,
      );
      if (this.shakeMs === 0) this.app.stage.position.set(0, 0);
    }
  };

  private maybeTumble(state: BattleState): void {
    if (state.phase !== "placement") return;
    if (this.reduced()) return;
    const vfx = useBattleStore.getState().streams?.vfx;
    if (vfx === undefined) return;
    const trayDice = state.dice.filter(
      (d) => d.state === "tray" && !isDieLockedNow(state, d.uid),
    );
    if (trayDice.length === 0) return;
    if (this.tumbleFx === null) {
      this.tumbleFx = new Tumble(this.app, this.trayLayer, this.tweens, vfx);
    } else {
      this.tumbleFx.cancel();
    }
    this.tumblingUids.clear();
    const dice: TumbleDie[] = trayDice.map((d) => {
      this.tumblingUids.add(d.uid);
      return {
        uid: d.uid,
        texture: this.dieTextureFor(d, this.layout.dieSize),
        grid: this.trayAnchor(d.uid, state),
      };
    });
    this.syncBoard(state);
    this.tumbleFx.run(dice, this.layout.tumble, this.layout.dieSize, () => {
      this.tumblingUids.clear();
      this.syncBoard(useBattleStore.getState());
    });
  }

  private cancelTumble(): void {
    this.tumbleFx?.cancel();
    if (this.tumblingUids.size > 0) {
      this.tumblingUids.clear();
      this.syncBoard(useBattleStore.getState());
    }
  }

  private cancelDrag(state: BattleState): void {
    this.pendingPress = null;
    if (this.drag === null) return;
    const { sprite } = this.drag;
    this.clearCardFlags();
    this.drag = null;
    if (sprite.parent === this.dragLayer) this.trayLayer.addChild(sprite);
    this.syncBoard(state);
  }

  private toStagePoint(clientX: number, clientY: number): { x: number; y: number } {
    return { x: clientX - this.origin.left, y: clientY - this.origin.top };
  }

  private dieAt(x: number, y: number): string | null {
    let best: string | null = null;
    let bestDistance = Infinity;
    for (const [uid, sprite] of this.dieSprites) {
      if (!sprite.visible) continue;
      const halfW = sprite.width / 2 + DIE_HIT_PAD;
      const halfH = sprite.height / 2 + DIE_HIT_PAD;
      const dx = Math.abs(x - sprite.x);
      const dy = Math.abs(y - sprite.y);
      if (dx > halfW || dy > halfH) continue;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = uid;
      }
    }
    return best;
  }

  private enemyAt(x: number, y: number): string | null {
    const state = useBattleStore.getState();
    const chips = this.layout.subsystems;
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0) continue;
      const view = this.enemyViews.get(enemy.id);
      if (view === undefined) continue;
      for (const sub of enemy.subsystems) {
        if (sub.hp <= 0) continue;
        const chip = view.subsystemViews.get(sub.id);
        if (chip === undefined) continue;
        const cx = view.root.x + chip.chip.x;
        const cy = view.root.y + chip.chip.y;
        if (Math.hypot(x - cx, y - cy) <= chips.radius) return sub.id;
      }
      const hit = this.layout.enemyHit;
      if (
        contains(
          {
            x: view.root.x + hit.x,
            y: view.root.y + hit.y,
            w: hit.w,
            h: hit.h,
          },
          x,
          y,
        )
      ) {
        return enemy.id;
      }
    }
    return null;
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    const state = useBattleStore.getState();
    if (state.phase === "resolving") {
      this.stopBeats();
      useBattleStore.getState().finishResolution();
      return;
    }
    if (state.phase !== "placement") return;
    if (this.drag !== null || this.pendingPress !== null) return;
    const point = this.toStagePoint(event.clientX, event.clientY);
    const uid = this.dieAt(point.x, point.y);
    if (uid !== null) {
      const die = state.dice.find((d) => d.uid === uid);
      if (die === undefined) return;
      if (die.state === "locked" || isDieLockedNow(state, uid)) return;
      if (
        die.state !== "tray" &&
        die.state !== "placed" &&
        die.state !== "reserved"
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      this.pendingPress = {
        uid,
        startX: point.x,
        startY: point.y,
        pointerId: event.pointerId,
      };
      return;
    }
    const target = this.enemyAt(point.x, point.y);
    if (target !== null) {
      event.preventDefault();
      event.stopPropagation();
      useBattleStore.getState().setTarget(target);
      if (!target.includes(":")) focusEnemy(target);
    }
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const point = this.toStagePoint(event.clientX, event.clientY);
    if (this.pendingPress !== null && this.drag === null) {
      if (event.pointerId !== this.pendingPress.pointerId) return;
      const dx = point.x - this.pendingPress.startX;
      const dy = point.y - this.pendingPress.startY;
      if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) this.beginDrag(point);
      return;
    }
    if (this.drag === null) return;
    if (event.pointerId !== this.drag.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.drag.sprite.position.set(
      point.x + this.drag.offsetX,
      point.y + this.drag.offsetY,
    );
    this.updateDropTarget();
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (this.pendingPress !== null && this.drag === null) {
      if (event.pointerId !== this.pendingPress.pointerId) return;
      const { uid } = this.pendingPress;
      this.pendingPress = null;
      event.stopPropagation();
      this.onDieTap(uid);
      return;
    }
    if (this.drag === null) return;
    if (event.pointerId !== this.drag.pointerId) return;
    event.stopPropagation();
    this.dropDrag();
  };

  private readonly onPointerCancel = (): void => {
    this.pendingPress = null;
    if (this.drag !== null) this.cancelDrag(useBattleStore.getState());
  };

  private beginDrag(point: { x: number; y: number }): void {
    const press = this.pendingPress;
    if (press === null) return;
    this.pendingPress = null;
    this.cancelTumble();
    if (useBattleStore.getState().rerollMode) {
      useBattleStore.getState().toggleRerollMode();
    }
    const state = useBattleStore.getState();
    if (state.phase !== "placement") return;
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
    const legal = legalTargets(fresh, press.uid);
    const targets: DropTarget[] =
      fresh.checkSteps === null ? [...legal.slots] : boardSlotIds(fresh);
    if (legal.reserve) targets.push("reserve");

    this.drag = {
      uid: press.uid,
      pointerId: press.pointerId,
      sprite,
      offsetX: sprite.x - point.x,
      offsetY: sprite.y - point.y,
      targets,
      over: null,
    };
    setDraggedDie(press.uid);
    this.updateDropTarget();
  }

  private bestDropTarget(): DropTarget | null {
    if (this.drag === null) return null;
    const { sprite, targets } = this.drag;
    let best: DropTarget | null = null;
    let bestArea = 0;
    for (const target of targets) {
      const rect = this.dropRect(target);
      if (rect === undefined) continue;
      const area = overlapArea(rect, sprite.x, sprite.y, this.layout.dieSize);
      if (area > bestArea) {
        bestArea = area;
        best = target;
      }
    }
    if (best !== null) return best;
    return (
      targets.find((target) => {
        const rect = this.dropRect(target);
        return rect !== undefined && contains(rect, sprite.x, sprite.y);
      }) ?? null
    );
  }

  private updateDropTarget(): void {
    if (this.drag === null) return;
    const next = this.bestDropTarget();
    if (next === this.drag.over) return;
    if (this.drag.over !== null) {
      this.setCardFlag(this.drag.over, "data-over", false);
    }
    this.drag.over = next;
    if (next !== null) this.setCardFlag(next, "data-over", true);
  }

  private dropDrag(): void {
    if (this.drag === null) return;
    const { uid, sprite } = this.drag;
    const target = this.bestDropTarget();
    this.drag = null;
    this.clearCardFlags();
    if (target === "reserve") {
      this.animateReserve(uid, sprite);
    } else if (target !== null) {
      this.animatePlace(uid, target, sprite);
    } else {
      this.animateReturn(uid, sprite, true);
    }
  }

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
    playSfx("place");
    haptic("place");
    sprite.texture = this.dieTextureFor(die, MINI_DIE_SIZE);
    sprite.scale.set(this.layout.dieSize / MINI_DIE_SIZE);
    const scale = anchor.size / MINI_DIE_SIZE;
    const cancelScale = this.tweens.to(
      sprite.scale,
      { x: scale, y: scale },
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
        this.pulseCard(slotId);
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
    const index = state.dice
      .filter((d) => d.state === "reserved")
      .findIndex((d) => d.uid === uid);
    const anchor = this.reserveDieAnchor(Math.max(0, index));
    if (anchor === undefined) {
      this.finishDieAnimation(uid);
      return;
    }
    this.animating.add(uid);
    sprite.texture = this.dieTextureFor(die, MINI_DIE_SIZE);
    sprite.scale.set(this.layout.dieSize / MINI_DIE_SIZE);
    const scale = anchor.size / MINI_DIE_SIZE;
    const cancelScale = this.tweens.to(
      sprite.scale,
      { x: scale, y: scale },
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
        this.pulseCard("reserve");
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
    playSfx("invalid");
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

  private clearDieAnimations(): void {
    for (const cancel of this.dieCancels.values()) cancel();
    this.dieCancels.clear();
    this.animating.clear();
    for (const sprite of this.dieSprites.values()) {
      if (sprite.parent === this.dragLayer) this.trayLayer.addChild(sprite);
    }
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

  private stackOffset(x: number, y: number): number {
    const now = this.elapsedMs;
    let step = 0;
    for (const slot of this.numberPool) {
      if (!slot.text.visible) continue;
      if (now - slot.at > NUMBER_STACK_WINDOW_MS) continue;
      if (Math.abs(slot.x - x) > 26 || Math.abs(slot.y - y) > 48) continue;
      step += 1;
    }
    return step * NUMBER_STACK_OFFSET;
  }

  private spawnNumber(x: number, y: number, value: string, fill: string): void {
    const slot =
      this.numberPool.find((p) => !p.text.visible) ?? this.numberPool[0];
    if (slot === undefined) return;
    for (const cancel of slot.cancels) cancel();
    slot.cancels = [];
    const top = y - this.stackOffset(x, y);
    const { text } = slot;
    text.text = value;
    text.style.fill = fill;
    text.position.set(x, top);
    text.alpha = 1;
    text.scale.set(1);
    text.visible = true;
    slot.x = x;
    slot.y = y;
    slot.at = this.elapsedMs;
    slot.cancels.push(
      this.tweens.to(text, { y: top - 28 }, 350, easeOutQuad),
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

  private dieFlash(at: { x: number; y: number }, color: string): void {
    const flash = this.takeParticle();
    if (flash === undefined) return;
    const size = MINI_DIE_SIZE;
    flash
      .roundRect(-size / 2 - 3, -size / 2 - 3, size + 6, size + 6, size * 0.26)
      .stroke({ color, width: 3 });
    flash.position.set(at.x, at.y);
    this.trackParticle(
      this.tweens.to(flash.scale, { x: 1.3, y: 1.3 }, 280, easeOutQuad),
    );
    this.trackParticle(
      this.tweens.to(flash, { alpha: 0 }, 280, linear, () => {
        flash.visible = false;
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
    color = schools.red.stroke,
  ): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    const impactRing = (): void => {
      const ring = this.takeParticle();
      if (ring === undefined) return;
      ring.circle(0, 0, 6).stroke({ color, width: 2 });
      ring.position.set(to.x, to.y);
      this.trackParticle(
        this.tweens.to(ring.scale, { x: 2.2, y: 2.2 }, 240, easeOutQuad),
      );
      this.trackParticle(
        this.tweens.to(ring, { alpha: 0 }, 240, linear, () => {
          ring.visible = false;
        }),
      );
    };
    const bolt = this.takeParticle();
    if (bolt === undefined || length < 1 || this.reduced()) {
      impactRing();
      return;
    }
    const trail = Math.min(length, 34);
    const ux = dx / length;
    const uy = dy / length;
    bolt
      .moveTo(0, 0)
      .lineTo(-ux * trail, -uy * trail)
      .stroke({ color, width: 2 });
    bolt.position.set(from.x, from.y);
    this.trackParticle(
      this.tweens.to(bolt, { x: to.x, y: to.y }, PROJECTILE_MS, linear, () => {
        bolt.visible = false;
        impactRing();
      }),
    );
  }

  private shieldShimmer(): void {
    const { playerHit } = this.layout;
    const arc = this.takeParticle();
    if (arc === undefined) return;
    arc
      .arc(0, 0, 48, Math.PI * 1.15, Math.PI * 1.85)
      .stroke({ color: schools.blue.stroke, width: 3 });
    arc.position.set(playerHit.x, playerHit.y + 10);
    arc.alpha = 0.95;
    this.trackParticle(
      this.tweens.to(arc, { alpha: 0 }, 320, linear, () => {
        arc.visible = false;
      }),
    );
  }

  private thrusterPuff(): void {
    const rect = this.slotRect("engines");
    const cx = rect === undefined ? this.layout.playerHit.x : rect.x + rect.w / 2;
    const cy = rect === undefined ? this.layout.playerHit.y : rect.y + rect.h / 2;
    for (let i = 0; i < 3; i += 1) {
      const puff = this.takeParticle();
      if (puff === undefined) return;
      puff.circle(0, 0, 5).fill({ color: schools.green.stroke, alpha: 0.7 });
      puff.position.set(cx - 14 + i * 14, cy);
      this.trackParticle(
        this.tweens.to(puff.scale, { x: 2, y: 2 }, 260 + i * 40, easeOutQuad),
      );
      this.trackParticle(
        this.tweens.to(puff, { alpha: 0 }, 260 + i * 40, linear, () => {
          puff.visible = false;
        }),
      );
    }
  }

  private scanSweep(targetId: string): void {
    const anchor = this.enemyAnchor(targetId);
    if (anchor === undefined) return;
    const size = this.layout.enemySize;
    const sweep = this.takeParticle();
    if (sweep === undefined) return;
    sweep
      .moveTo(-size / 2 - 4, 0)
      .lineTo(size / 2 + 4, 0)
      .stroke({ color: schools.prismatic.stroke, width: 2 });
    sweep.position.set(anchor.x, anchor.y - size / 2);
    sweep.alpha = 0.9;
    this.trackParticle(
      this.tweens.to(sweep, { y: anchor.y + size / 2 }, 280, linear),
    );
    this.trackParticle(
      this.tweens.to(sweep, { alpha: 0 }, 320, linear, () => {
        sweep.visible = false;
      }),
    );
  }

  private startResolution(state: BattleState): void {
    const bundle = state.resolution;
    if (bundle === null) return;
    this.cancelTumble();
    this.stopBeats();
    if (this.reduced()) {
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
      haptic("resolveTick");
      useBattleStore.getState().applyBeatSnapshot(beat.after);
      const heavy = beat.kind === "damage" && beat.amount >= BIG_HIT_DAMAGE;
      if (heavy) this.hitStop(HEAVY_HIT_STOP_MS);
      await this.sleep(beatGapMs() + (heavy ? HIT_STOP_MS : 0), run);
    }
    for (const beat of bundle.enemyBeats) {
      if (run.cancelled) return;
      this.playEnemyBeat(beat);
      if (beat.hullDamage > 0) haptic("hitTaken");
      useBattleStore.getState().applyBeatSnapshot(beat.after);
      await this.sleep(beatGapMs(), run);
    }
    if (run.cancelled) return;
    this.beatRun = null;
    useBattleStore.getState().finishResolution();
  }

  private slotCenter(slotId: SlotId): { x: number; y: number } {
    const rect = this.slotRect(slotId);
    if (rect === undefined) return this.layout.playerHit;
    return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
  }

  private playBeat(beat: Beat): void {
    this.pulseCard(beat.slot);
    const anchor = this.slotDieAnchor(beat.slot);
    const slotAnchorPoint = anchor ?? this.slotCenter(beat.slot);
    if (beat.kind === "damage" && beat.targetId !== undefined) {
      const target = this.enemyAnchor(beat.targetId);
      if (target !== undefined) {
        playSfx(beat.slot === "spinal" ? "spinalFire" : "weapons");
        if (beat.slot === "spinal" && beat.amount >= 15) this.shake();
        this.fireProjectile(slotAnchorPoint, target);
        const parentId = beat.targetId.split(":")[0] ?? beat.targetId;
        this.flashEnemy(parentId);
        this.spawnNumber(
          target.x,
          target.y - this.layout.enemySize / 2,
          `-${String(beat.amount)}`,
          schools.red.text,
        );
      }
      return;
    }
    if (beat.kind === "spinalJam") {
      playSfx("spinalJam");
      this.spawnNumber(
        slotAnchorPoint.x,
        slotAnchorPoint.y - 20,
        this.labels.jamLabel,
        tokens.danger,
      );
      return;
    }
    if (beat.kind === "sensor" && beat.targetId !== undefined) {
      playSfx("sensors");
      this.scanSweep(beat.targetId);
      const pierce = beat.sensor?.pierce ?? 0;
      if (pierce > 0) {
        const target = this.enemyAnchor(beat.targetId);
        if (target !== undefined) {
          playSfx("shields");
          this.flashEnemy(beat.targetId);
          this.spawnNumber(
            target.x,
            target.y - this.layout.enemySize / 2,
            this.labels.pierceLabel(pierce),
            schools.blue.text,
          );
        }
      }
      return;
    }
    if (beat.kind === "shield") {
      playSfx("shields");
      this.shieldShimmer();
      this.spawnNumber(
        slotAnchorPoint.x,
        slotAnchorPoint.y - 24,
        `+${String(beat.amount)}`,
        schools.blue.text,
      );
      return;
    }
    if (beat.kind === "engine") {
      playSfx("engines");
      this.thrusterPuff();
      return;
    }
    if (beat.kind === "storm") {
      playSfx("stormBeat");
      this.dieFlash(slotAnchorPoint, schools.prismatic.stroke);
      this.shake();
      this.spawnNumber(
        slotAnchorPoint.x,
        slotAnchorPoint.y - 24,
        `~${String(beat.amount)}`,
        schools.prismatic.text,
      );
      return;
    }
    playSfx(beat.kind === "repair" ? "repair" : "reactor");
    this.spawnNumber(
      slotAnchorPoint.x,
      slotAnchorPoint.y - 24,
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
        playSfx("hullHit");
        this.flashShip(schools.red.stroke);
        const state = useBattleStore.getState();
        if (beat.hullDamage >= state.hull) this.shake();
        this.spawnNumber(
          playerHit.x,
          playerHit.y,
          `-${String(beat.hullDamage)}`,
          schools.red.text,
        );
      } else if (beat.shieldDamage > 0) {
        playSfx(
          beat.after.shield <= 0 && beat.shieldDamage > 0
            ? "shieldBreak"
            : "shieldHit",
        );
        this.flashShip(schools.blue.stroke);
        this.spawnNumber(
          playerHit.x,
          playerHit.y,
          `-${String(beat.shieldDamage)}`,
          schools.blue.text,
        );
      } else {
        playSfx("dodge");
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
      playSfx("invalid");
      this.fireProjectile(origin, center);
      this.spawnNumber(center.x, center.y - 16, this.labels.jamLabel, tokens.danger);
      return;
    }
    if (beat.kind === "lockDie" && beat.dieUid !== undefined) {
      const state = useBattleStore.getState();
      const anchor = this.trayAnchor(beat.dieUid, state);
      playSfx("invalid");
      this.fireProjectile(origin, anchor);
      return;
    }
    if (beat.kind === "burnTick") {
      playSfx("burnTick");
      this.flashEnemy(beat.enemyId);
      this.spawnNumber(
        origin.x,
        origin.y - this.layout.enemySize / 2,
        `-${String(beat.amount)}`,
        statusTint("burn"),
      );
      return;
    }
    if (beat.kind === "phase") {
      const after = beat.after.enemies.find((e) => e.id === beat.enemyId);
      if ((after?.phase ?? 1) >= 3) this.corePulse(beat.enemyId);
      else this.sceneGlowPulse(tokens.danger, 0.16, 260);
      return;
    }
    if (beat.kind === "summon") {
      playSfx("summon");
      this.flashEnemy(beat.enemyId);
      return;
    }
    if (beat.kind === "curse" && beat.dieUid !== undefined) {
      const anchor = this.trayAnchor(beat.dieUid, useBattleStore.getState());
      playSfx("curseTick");
      this.fireProjectile(origin, anchor, statusTint("burn"));
      this.spawnNumber(
        anchor.x,
        anchor.y - 16,
        `-${String(beat.amount)}`,
        statusTint("burn"),
      );
      return;
    }
    if (beat.kind === "gate") {
      playSfx(beat.amount > 0 ? "gateRaise" : "gateBreak");
      this.spawnNumber(
        origin.x,
        origin.y - this.layout.enemySize / 2,
        this.labels.beatGlyph(beat.kind),
        schools.blue.text,
      );
      return;
    }
    if (beat.kind === "siphon" || beat.kind === "drain") {
      playSfx("siphonPull", { rate: beat.kind === "drain" ? 0.88 : 1 });
      this.fireProjectile(
        this.layout.playerHit,
        origin,
        beat.kind === "siphon" ? schools.blue.stroke : tokens.amber,
      );
      this.spawnNumber(
        this.layout.playerHit.x,
        this.layout.playerHit.y,
        `-${String(beat.amount)}`,
        beat.kind === "siphon" ? schools.blue.text : tokens.amber,
      );
      return;
    }
    if (beat.kind === "bargain") {
      playSfx("bargainCoin");
      this.flashEnemy(beat.enemyId);
      this.spawnNumber(
        origin.x,
        origin.y - this.layout.enemySize / 2,
        `+${String(beat.amount)}`,
        schools.green.text,
      );
      return;
    }
    if (beat.kind === "enrage") {
      playSfx("enrageStep", { rate: 0.92 + Math.min(6, beat.amount) * 0.06 });
      this.flashEnemy(beat.enemyId);
      this.spawnNumber(
        origin.x,
        origin.y - this.layout.enemySize / 2,
        `${this.labels.beatGlyph(beat.kind)}${String(beat.amount)}`,
        schools.red.text,
      );
      return;
    }
    if (beat.kind === "hijack") {
      playSfx("hijackDrag");
      this.fireProjectile(origin, this.layout.playerHit, tokens.amber);
      return;
    }
    if (beat.kind === "ward") {
      const school = beat.after.enemies.find((e) => e.id === beat.enemyId)?.ward;
      playSfx("wardShift", { rate: school === undefined ? 1 : WARD_RATE[school] });
      this.flashEnemy(beat.enemyId);
      return;
    }
    if (beat.kind === "fold") {
      playSfx("foldBeat");
      this.sceneGlowPulse(schools.prismatic.stroke, 0.18, 320);
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
