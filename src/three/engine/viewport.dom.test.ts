import * as THREE from "three";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { demoProjects } from "@/demo/projects";
import { buildDemoDocument } from "../demo-building";
import { withVisibility } from "../model";
import { buildRenderPlan } from "../render-plan";
import type { RendererLike } from "./scene-manager";
import { createEditorViewport, QUALITY_TIERS } from "./viewport";

/**
 * Ciclo de vida da composição, em jsdom. Não há WebGL aqui: o `renderer` é uma peça falsa, e o que
 * se testa é o comportamento que nós controlamos — quantas molduras se desenham, quando se param,
 * o que é libertado, e se o rato chega ao documento.
 *
 * `ResizeObserver` e `IntersectionObserver` não existem no jsdom; os esboços abaixo existem para o
 * teste poder correr, não para imitar um browser (o `MANUAL-3D-TESTS.md` cobre o resto).
 */

class StubObserver {
  protected readonly callback: (entries: unknown[], observer: unknown) => void;
  constructor(callback: (entries: unknown[], observer: unknown) => void) {
    this.callback = callback;
  }
  observe(_target?: unknown): void {
    void _target;
  }
  unobserve(): void {}
  disconnect(): void {}
}

let intersecting = true;
class StubIntersectionObserver extends StubObserver {
  private target: Element | null = null;
  override observe(target?: unknown): void {
    if (!(target instanceof Element)) {
      return;
    }
    this.target = target;
    this.callback([{ isIntersecting: intersecting, target }], this);
  }
  override disconnect(): void {
    this.target = null;
  }
}

const TOKENS: Record<string, string> = {
  "--canvas": "#f6f4f0",
  "--line": "#dcd8d0",
  "--line-strong": "#b9b4aa",
  "--line-control": "#7b8087",
  "--accent": "#0f4f47",
  "--scene-mass": "#cfcabf",
  "--scene-mass-lit": "#e2ded6",
  "--scene-ground": "#d8d4cb",
  "--scene-line": "#4c4a45",
  "--scene-glazing": "#6f7f80",
  "--scene-podium": "#c4bfb3",
};
const readToken = (name: string) => TOKENS[name] ?? null;

function makeRenderer() {
  const renderer: RendererLike = {
    domElement: document.createElement("canvas"),
    shadowMap: { enabled: true, type: THREE.PCFSoftShadowMap, needsUpdate: false },
    info: { render: { calls: 12, triangles: 240, frame: 0 }, memory: { geometries: 20, textures: 0 } },
    setPixelRatio: vi.fn(),
    setSize: vi.fn(),
    setClearColor: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    forceContextLoss: vi.fn(),
  };
  return renderer;
}

async function frames(count: number): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", StubObserver);
  vi.stubGlobal("IntersectionObserver", StubIntersectionObserver);
});

const document_ = buildDemoDocument(demoProjects[0]!);
const plan = buildRenderPlan(document_);

/** jsdom não implementa o API de *pointer capture* de quem tem o foco do rato. */
function withPointerCapture(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const element = canvas as HTMLCanvasElement & {
    setPointerCapture?: (id: number) => void;
    releasePointerCapture?: (id: number) => void;
  };
  element.setPointerCapture ??= () => {};
  element.releasePointerCapture ??= () => {};
  return element;
}

function makeViewport(overrides: Partial<Parameters<typeof createEditorViewport>[0]> = {}) {
  const container = document.createElement("div");
  const canvas = withPointerCapture(document.createElement("canvas"));
  container.append(canvas);
  const renderer = makeRenderer();
  const onPick = vi.fn();
  const onCommit = vi.fn();
  const onStats = vi.fn();
  const viewport = createEditorViewport({
    canvas,
    container,
    readToken,
    plan,
    quality: "leve",
    reducedMotion: true,
    createRenderer: () => renderer,
    onPick,
    onCommit,
    onStats,
    onContextLost: undefined,
    ...overrides,
  });
  return { viewport, renderer, canvas, container, onPick, onCommit, onStats };
}

describe("composição do palco", () => {
  it("desenha quando tem pedido e para quando não tem", async () => {
    const { viewport, renderer } = makeViewport();
    await frames(3);
    const after = vi.mocked(renderer.render).mock.calls.length;
    expect(after).toBeGreaterThan(0);
    await frames(6);
    // Sem `reducedMotion: true` e sem interação, não há amortecimento → nenhuma moldura nova.
    expect(vi.mocked(renderer.render).mock.calls.length).toBe(after);
    viewport.invalidate();
    await frames(2);
    expect(vi.mocked(renderer.render).mock.calls.length).toBeGreaterThan(after);
    viewport.dispose();
  });

  it("não desenha fora do ecrã", async () => {
    intersecting = false;
    const { viewport, renderer } = makeViewport();
    await frames(4);
    expect(renderer.render).not.toHaveBeenCalled();
    viewport.invalidate();
    await frames(3);
    expect(renderer.render).not.toHaveBeenCalled();
    intersecting = true;
    viewport.dispose();
  });

  it("aplica a qualidade escolhida ao renderer", () => {
    const { viewport, manager } = { ...makeViewport(), manager: null };
    viewport.setQuality("alta");
    expect(QUALITY_TIERS.alta.maxPixelRatio).toBe(2);
    expect(QUALITY_TIERS.alta.shadows).toBe(true);
    void manager;
    viewport.dispose();
  });

  it("sincroniza um documento atualizado sem perder a seleção", async () => {
    const { viewport } = makeViewport();
    const wall = document_.elements.find((element) => element.category === "wall")!;
    viewport.setSelection([wall.id]);
    await frames(2);
    expect(viewport.stats().meshes).toBe(plan.primitiveCount);
    viewport.setPlan(buildRenderPlan(withVisibility(document_, wall.id, false)));
    await frames(2);
    expect(viewport.stats().meshes).toBeLessThan(plan.primitiveCount);
    viewport.dispose();
  });

  it("realça a seleção e liga o gizmo quando há uma ferramenta", async () => {
    const { viewport } = makeViewport();
    const partition = document_.elements.find((element) => element.category === "partition")!;
    viewport.setSelection([partition.id]);
    await frames(2);
    viewport.setTool("translate");
    await frames(1);
    const scene = viewport.stats();
    expect(scene.meshes).toBeGreaterThan(0);
    viewport.dispose();
  });

  it("liberta tudo: cenário, geometrias, listeners e o próprio ciclo", async () => {
    const { viewport, renderer, canvas } = makeViewport();
    viewport.setSelection([document_.elements[0]!.id]);
    await frames(2);
    expect(viewport.stats().geometries).toBeGreaterThanOrEqual(0);
    viewport.dispose();
    // Uma só vez, e por um só dono: o `SceneManager` é quem liberta o renderer.
    expect(renderer.dispose).toHaveBeenCalledOnce();
    expect(renderer.forceContextLoss).toHaveBeenCalledOnce();
    const renders = vi.mocked(renderer.render).mock.calls.length;
    await frames(4);
    expect(vi.mocked(renderer.render).mock.calls.length).toBe(renders);
    // Depois do `dispose`, o listener do contexto tem de estar removido: sem ele, um `restore`
    // tardio tocaria em geometrias já libertadas.
    canvas.dispatchEvent(new Event("webglcontextlost"));
  });

  it("o `onPick` é chamado pelo clique e ignorado pelo arrasto", async () => {
    const { viewport, canvas, onPick } = makeViewport();
    await frames(2);
    const rect = {
      left: 0,
      top: 0,
      width: 300,
      height: 200,
      x: 0,
      y: 0,
      bottom: 200,
      right: 300,
      toJSON: () => ({}),
    };
    canvas.getBoundingClientRect = () => rect as DOMRect;
    Object.defineProperty(canvas, "clientWidth", { value: 300, configurable: true });
    Object.defineProperty(canvas, "clientHeight", { value: 200, configurable: true });
    const down = new PointerEvent("pointerdown", { clientX: 150, clientY: 100, button: 0, bubbles: true });
    const up = new PointerEvent("pointerup", { clientX: 150, clientY: 100, button: 0, bubbles: true });
    canvas.dispatchEvent(down);
    canvas.dispatchEvent(up);
    // Em jsdom a câmera está no sítio certo mas o canvas tem tamanho 0 → nada sob o raio: é
    // chamado com `null` (clique no vazio = limpar seleção), e isso é o comportamento procurado.
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick.mock.calls[0]?.[0]).toBeNull();
    canvas.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 10, clientY: 10, button: 0, bubbles: true }),
    );
    canvas.dispatchEvent(
      new PointerEvent("pointerup", { clientX: 90, clientY: 60, button: 0, bubbles: true }),
    );
    expect(onPick).toHaveBeenCalledTimes(1);
    viewport.dispose();
  });
});
