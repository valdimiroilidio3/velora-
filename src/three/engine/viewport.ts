import type * as THREE from "three";
import { ruleFor, thicknessAxisFor } from "../edit-rules";
import type { TransformPatch } from "../model";
import { planCenter, type ElementPlan, type RenderPlan } from "../render-plan";
import { createCameraController, PITCH_STEP, YAW_STEP, type ViewPreset } from "./camera-controller";
import { createLighting } from "./lighting";
import { createPerformanceMonitor, type PerformanceSample } from "./performance-monitor";
import type { RendererLike } from "./scene-manager";
import { createSceneManager } from "./scene-manager";
import { createSelectionManager } from "./selection";
import { createTransformGizmo, type GizmoMode } from "./transform-gizmo";

/**
 * `Viewport3D`: a composição — a única peça que o React conhece.
 *
 * É aqui que a decisão "desenhar só quando é preciso" acontece de facto: um `requestAnimationFrame`
 * corre enquanto o palco está no ecrã, mas só chama `render()` quando (a) o documento mudou ou
 * (b) o amortecimento da câmara ainda tem inércia. Fora do ecrã (aba em background, viewport
 * *scrolled* para fora) não se desenha mesmo que haja mudanças.
 *
 * E é aqui que tudo é desmontado, na ordem inversa da criação: gizmo → seleção → controlo de
 * câmara → luzes → cena/materiais → renderer. Um `dispose()` fora de ordem deixa *listeners* a
 * chamar módulos já libertados.
 */

export type QualityTier = "leve" | "equilibrada" | "alta";

export const QUALITY_TIERS: Readonly<
  Record<QualityTier, { shadows: boolean; maxPixelRatio: number; shadowMapSize: number; antialias: boolean }>
> = {
  // "leve" é a escolha para DPI altos com GPU fraca: sem sombras, resolução ao 1×.
  leve: { shadows: false, maxPixelRatio: 1, shadowMapSize: 1024, antialias: false },
  equilibrada: { shadows: true, maxPixelRatio: 1.5, shadowMapSize: 1024, antialias: true },
  alta: { shadows: true, maxPixelRatio: 2, shadowMapSize: 2048, antialias: true },
};

export interface EditorViewportOptions {
  readonly canvas: HTMLCanvasElement;
  readonly container: HTMLElement;
  readonly readToken: (name: string) => string | null;
  readonly plan: RenderPlan;
  readonly quality: QualityTier;
  readonly reducedMotion: boolean;
  /** Injetável: em Node não há WebGL, e é assim que o ciclo de vida é testável. */
  readonly createRenderer?: ((canvas: HTMLCanvasElement) => RendererLike) | undefined;
  onPick: (elementId: string | null, additive: boolean) => void;
  onCommit: (elementId: string, patch: TransformPatch) => void;
  onStats: ((sample: PerformanceSample) => void) | undefined;
  onContextLost: (() => void) | undefined;
}

export interface EditorViewport {
  setPlan(plan: RenderPlan): void;
  setSelection(ids: readonly string[]): void;
  setTool(mode: GizmoMode | null): void;
  setEditable(editable: boolean): void;
  setView(preset: ViewPreset): void;
  frameAll(): void;
  focusSelection(): void;
  orbit(direction: "left" | "right" | "up" | "down"): void;
  zoom(direction: "in" | "out"): void;
  setQuality(tier: QualityTier): void;
  applyTheme(): void;
  invalidate(): void;
  stats(): { calls: number; triangles: number; geometries: number; textures: number; meshes: number };
  readSample(): PerformanceSample;
  dispose(): void;
}

const STATS_EVERY_FRAMES = 24;

export function createEditorViewport(options: EditorViewportOptions): EditorViewport {
  const tier = QUALITY_TIERS[options.quality];
  const manager = createSceneManager({
    canvas: options.canvas,
    container: options.container,
    readToken: options.readToken,
    shadows: tier.shadows,
    maxPixelRatio: tier.maxPixelRatio,
    antialias: tier.antialias,
    createRenderer: options.createRenderer,
    onContextLost: () => options.onContextLost?.(),
  });
  const { scene, camera, registry } = manager;
  const lighting = createLighting(scene, {
    shadows: tier.shadows,
    readToken: options.readToken,
    shadowMapSize: tier.shadowMapSize,
  });

  let plan = options.plan;
  let hovered: string | null = null;
  let selected: readonly string[] = [];
  let tool: GizmoMode | null = null;
  let editable = true;
  let disposed = false;
  let onScreen = true;
  let raf = 0;
  let needsRender = true;
  let lastTime = 0;
  let lastDelta = 1 / 60;
  let statsCountdown = 0;
  let translationLimit = Math.max(6, plan.bounds.radius * 1.5);

  const cameraController = createCameraController({
    camera,
    domElement: options.canvas,
    reducedMotion: options.reducedMotion,
    onInteract: () => invalidate(),
  });

  const selection = createSelectionManager({
    camera,
    domElement: options.canvas,
    getTargets: () => manager.selectableObjects(),
    onSelect: (elementId, additive) => options.onPick(elementId, additive),
    onHover: (elementId) => {
      hovered = elementId;
      applyHighlight();
      invalidate();
    },
    isInteractive: () => !disposed,
  });

  const gizmo = createTransformGizmo({
    camera,
    domElement: options.canvas,
    scene,
    getTranslationLimit: () => translationLimit,
    onDragStart: () => {
      // O arrasto do gizmo e a órbita não podem os dois: quem agarra uma alça não roda a cena.
      cameraController.setInteractive(false);
      selection.setEnabled(false);
    },
    onDragEnd: () => {
      cameraController.setInteractive(true);
      selection.setEnabled(true);
      invalidate();
    },
    onLiveChange: () => invalidate(),
    onCommit: (elementId, patch) => options.onCommit(elementId, patch),
    thicknessAxis: (elementId) => {
      const element = findPlan(elementId);
      return element === undefined ? "z" : thicknessAxisFor(element.category);
    },
  });

  const performance = createPerformanceMonitor();

  function findPlan(elementId: string): ElementPlan | undefined {
    return plan.elements.find((element) => element.elementId === elementId);
  }

  function invalidate(): void {
    needsRender = true;
  }

  /** Uma única chamada por mudança de estado: ver `MaterialRegistry.setHighlights`. */
  function applyHighlight(): void {
    const entries: { object: THREE.Object3D; mode: "selected" | "hover" }[] = [];
    for (const elementId of selected) {
      const object = manager.objectFor(elementId);
      if (object !== undefined) {
        entries.push({ object, mode: "selected" });
      }
    }
    if (hovered !== null && !selected.includes(hovered)) {
      const object = manager.objectFor(hovered);
      if (object !== undefined) {
        entries.push({ object, mode: "hover" });
      }
    }
    registry.setHighlights(entries);
  }

  function attachGizmo(): void {
    const elementId = selected.length === 1 ? (selected[0] ?? null) : null;
    const element = elementId === null ? undefined : findPlan(elementId);
    const object = elementId === null ? undefined : manager.objectFor(elementId);
    if (elementId === null || element === undefined || object === undefined || !editable || tool === null) {
      gizmo.attach(null, null, null);
      return;
    }
    gizmo.attach(elementId, object, ruleFor(element.category));
    gizmo.setMode(tool);
  }

  function applyTheme(): void {
    manager.refreshTheme();
    applyHighlight();
    invalidate();
  }

  function renderFrame(kind: "demand" | "damping"): void {
    manager.render();
    const stats = manager.stats();
    performance.sample(
      lastDelta,
      {
        calls: stats.calls,
        triangles: stats.triangles,
        geometries: stats.geometries,
        textures: stats.textures,
        meshes: stats.meshes,
      },
      kind,
    );
    if (options.onStats !== undefined) {
      statsCountdown -= 1;
      if (statsCountdown <= 0) {
        statsCountdown = STATS_EVERY_FRAMES;
        options.onStats(performance.read());
      }
    }
  }

  function loop(now: number): void {
    if (disposed) {
      return;
    }
    raf = requestAnimationFrame(loop);
    lastDelta = lastTime === 0 ? 1 / 60 : Math.min(0.25, Math.max(0.0001, (now - lastTime) / 1000));
    lastTime = now;
    const damping = cameraController.update(lastDelta);
    if (!onScreen) {
      // Guardamos o pedido, mas não desenhamos para ninguém ver.
      return;
    }
    if (!needsRender && !damping) {
      return;
    }
    renderFrame(needsRender ? "demand" : "damping");
    needsRender = false;
  }

  const resizeObserver = new ResizeObserver(() => {
    manager.resize();
    invalidate();
  });
  resizeObserver.observe(options.container);

  const onVisibility = (): void => {
    const visible = document.visibilityState !== "hidden";
    if (visible && !onScreen) {
      invalidate();
    }
    onScreen = visible;
  };
  document.addEventListener("visibilitychange", onVisibility);

  const screenObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      const visible = entry === undefined ? true : entry.isIntersecting;
      if (visible && !onScreen) {
        invalidate();
      }
      onScreen = visible;
    },
    { threshold: 0.01 },
  );
  screenObserver.observe(options.canvas);

  // Arranque: cena, enquadramento, tema, primeira moldura.
  manager.sync(plan);
  lighting.update(plan.bounds);
  cameraController.applyBounds(plan.bounds);
  cameraController.frame(plan.bounds, "perspetiva");
  applyTheme();
  raf = requestAnimationFrame(loop);

  return {
    setPlan(next) {
      const radiusChanged = Math.abs(next.bounds.radius - plan.bounds.radius) > 0.05;
      plan = next;
      manager.sync(plan);
      lighting.update(plan.bounds);
      if (radiusChanged) {
        cameraController.applyBounds(plan.bounds);
        translationLimit = Math.max(6, plan.bounds.radius * 1.5);
      }
      selection.invalidate();
      applyHighlight();
      attachGizmo();
      invalidate();
    },
    setSelection(ids) {
      selected = ids;
      applyHighlight();
      attachGizmo();
      invalidate();
    },
    setTool(next) {
      tool = next;
      gizmo.setEnabled(next !== null && editable && selected.length === 1);
      attachGizmo();
      invalidate();
    },
    setEditable(next) {
      editable = next;
      gizmo.setEnabled(tool !== null && next && selected.length === 1);
      invalidate();
    },
    setView(preset) {
      cameraController.setView(preset);
      invalidate();
    },
    frameAll() {
      cameraController.frame(plan.bounds, "perspetiva");
      invalidate();
    },
    focusSelection() {
      const elementId = selected[0];
      const element = elementId === undefined ? undefined : findPlan(elementId);
      if (element === undefined) {
        cameraController.frame(plan.bounds, "perspetiva");
      } else {
        cameraController.focus(planCenter(element));
      }
      invalidate();
    },
    orbit(direction) {
      const sign = direction === "left" || direction === "up" ? 1 : -1;
      const horizontal = direction === "left" || direction === "right";
      cameraController.nudge(horizontal ? YAW_STEP * sign : 0, horizontal ? 0 : PITCH_STEP * sign);
      invalidate();
    },
    zoom(direction) {
      cameraController.dolly(direction === "in" ? 1.18 : 1 / 1.18);
      invalidate();
    },
    setQuality(next) {
      const nextTier = QUALITY_TIERS[next];
      manager.setPixelRatio(nextTier.maxPixelRatio);
      manager.setShadows(nextTier.shadows);
      lighting.setShadows(nextTier.shadows);
      invalidate();
    },
    applyTheme,
    invalidate,
    stats() {
      return manager.stats();
    },
    readSample() {
      return performance.read();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      resizeObserver.disconnect();
      screenObserver.disconnect();
      gizmo.dispose();
      selection.dispose();
      cameraController.dispose();
      lighting.dispose();
      // O `manager.dispose()` é dono de geometrias, materiais, grades, `registry` e renderer
      // (incluindo `forceContextLoss`): chamar qualquer uma destas duas vezes é um double free.
      manager.dispose();
    },
  };
}

/** Type-only conveniência para o componente: evita importar `three` no *client component*. */
export type ViewportTool = GizmoMode;
export type { ViewPreset };
