import * as THREE from "three";
import type { ElementPlan, RenderPlan } from "../render-plan";
import { createMaterialRegistry, type MaterialRegistry } from "./materials";
import { degToRad, mm } from "../units";

/**
 * `SceneManager`: dono do contexto. Cria cena, câmera, renderer e o grupo raiz; converte o
 * `RenderPlan` em `Object3D` e **liberta tudo** no `dispose()`.
 *
 * A atualização é incremental por desenho: arrastar um elemento muda transformações, não
 * geometria. Reconstruir a cena a cada frame seria o erro clássico de um editor em three.js —
 * 400 `BoxGeometry` por frame é uma forma rápida de perder o browser.
 */

export interface RendererLike {
  readonly domElement: HTMLCanvasElement;
  readonly shadowMap: { enabled: boolean; type: THREE.ShadowMapType; needsUpdate: boolean };
  readonly info: {
    render: { calls: number; triangles: number; frame: number };
    memory: { geometries: number; textures: number };
  };
  setPixelRatio(value: number): void;
  setSize(width: number, height: number, updateStyle?: boolean): void;
  setClearColor(color: THREE.Color, alpha?: number): void;
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  dispose(): void;
  forceContextLoss?(): void;
}

export interface SceneManagerOptions {
  readonly canvas: HTMLCanvasElement;
  readonly container: HTMLElement;
  readonly readToken: (name: string) => string | null;
  readonly shadows: boolean;
  readonly maxPixelRatio: number;
  readonly antialias: boolean;
  /** Injetável: é assim que o ciclo de vida se testa em Node, sem GPU nem canvas real. */
  readonly createRenderer?: ((canvas: HTMLCanvasElement) => RendererLike) | undefined;
  readonly onContextLost?: ((event: Event) => void) | undefined;
}

export interface SceneHandle {
  readonly group: THREE.Group;
  /** Chave estrutural do plano que originou este grupo — evita trabalho repetido em `sync`. */
  signature: string;
  /** Última transformação aplicada, para o arrasto não reescrever o que não mudou. */
  transformSignature: string;
}

export interface SceneManager {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: RendererLike;
  readonly root: THREE.Group;
  readonly registry: MaterialRegistry;
  sync(plan: RenderPlan): void;
  objectFor(elementId: string): THREE.Object3D | undefined;
  selectableObjects(): THREE.Object3D[];
  resize(): void;
  /** Redução de qualidade em runtime: o teto de resolução muda, o resto do pipeline não. */
  setPixelRatio(value: number): void;
  render(): void;
  refreshTheme(): void;
  setShadows(enabled: boolean): void;
  stats(): { calls: number; triangles: number; geometries: number; textures: number; meshes: number };
  dispose(): void;
}

const DEFAULT_CREATE_RENDERER = (canvas: HTMLCanvasElement): RendererLike =>
  new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: false,
  });

/** Assinatura **estrutural**: material + número e dimensões de primitivas. É o que obriga a
 * reconstruir geometria. Transformações (posição/rotação/escala) não entram: são baratas. */
function signatureOf(plan: ElementPlan): string {
  return [
    plan.materialId,
    String(plan.primitives.length),
    ...plan.primitives.flatMap((primitive) => [
      primitive.key,
      primitive.size[0],
      primitive.size[1],
      primitive.size[2],
    ]),
  ].join("|");
}

/** Assinatura de transformação: é o que muda 60 vezes por segundo durante um arrasto. */
function transformSignatureOf(plan: ElementPlan): string {
  const { position, rotationYDeg, scale } = plan.transform;
  return [...position, rotationYDeg, ...scale].join("|");
}

export function createSceneManager(options: SceneManagerOptions): SceneManager {
  const scene = new THREE.Scene();
  const root = new THREE.Group();
  root.name = "velora.root";
  scene.add(root);

  const registry = createMaterialRegistry({ readToken: options.readToken });
  const background = new THREE.Color(options.readToken("--canvas") ?? "#f6f4f0");
  scene.background = background;

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 4000);
  camera.position.set(40, 26, 40);

  const renderer = (options.createRenderer ?? DEFAULT_CREATE_RENDERER)(options.canvas);
  renderer.setClearColor(background, 1);
  renderer.shadowMap.enabled = options.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const handles = new Map<string, SceneHandle>();
  /** Último plano por elemento: é o que diz se um objeto pode ser selecionado. */
  const currentPlans = new Map<string, ElementPlan>();
  const gridLines: THREE.LineSegments[] = [];
  let disposed = false;

  function groupNeedsRebuild(group: THREE.Group, plan: ElementPlan, materials: MaterialRegistry): boolean {
    const firstMesh = group.children[0] as THREE.Mesh | undefined;
    if (firstMesh === undefined || group.children.length !== plan.primitives.length) {
      return true;
    }
    return firstMesh.material !== materials.acquire(plan.materialId);
  }

  function addGroundGrid(radius: number): void {
    for (const line of gridLines.splice(0)) {
      root.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    const size = mm(radius * 2.4);
    const divisions = Math.max(8, Math.round(size / 4));
    const grid = new THREE.GridHelper(
      size,
      divisions,
      new THREE.Color(options.readToken("--line-strong") ?? "#b9b4aa"),
      new THREE.Color(options.readToken("--line") ?? "#dcd8d0"),
    );
    grid.position.y = 0.005;
    const material = grid.material as THREE.LineBasicMaterial;
    if (Array.isArray(material)) {
      material[0]!.transparent = true;
      material[0]!.opacity = 0.5;
    } else {
      material.transparent = true;
      material.opacity = 0.5;
    }
    grid.name = "velora.grid";
    root.add(grid);
    gridLines.push(grid);
  }

  function buildGroup(plan: ElementPlan): THREE.Group {
    const group = new THREE.Group();
    group.name = `velora.element.${plan.elementId}`;
    group.userData.elementId = plan.elementId;
    const material = registry.acquire(plan.materialId);
    for (const primitive of plan.primitives) {
      const geometry = new THREE.BoxGeometry(primitive.size[0], primitive.size[1], primitive.size[2]);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(primitive.offset[0], primitive.offset[1], primitive.offset[2]);
      mesh.castShadow = options.shadows;
      mesh.receiveShadow = options.shadows;
      mesh.name = `${plan.elementId}${primitive.key}`;
      mesh.userData.elementId = plan.elementId;
      group.add(mesh);
    }
    applyTransform(group, plan);
    return group;
  }

  /**
   * A transformação do elemento vive no grupo (e não nos meshes): é o que faz o gizmo poder
   * escrever `group.position` e o documento receber exatamente o mesmo número. A escala também
   * aqui — a geometria guarda a dimensão **nominal**, por isso o painel de propriedades e o ecrã
   * nunca divergem.
   */
  function applyTransform(group: THREE.Group, plan: ElementPlan): void {
    const { position, rotationYDeg, scale } = plan.transform;
    group.position.set(position[0], position[1], position[2]);
    group.rotation.y = degToRad(rotationYDeg);
    group.scale.set(scale[0], scale[1], scale[2]);
  }

  function updateGroup(group: THREE.Group, plan: ElementPlan): void {
    applyTransform(group, plan);
  }

  function disposeGroup(group: THREE.Group): void {
    for (const child of group.children) {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry.dispose();
      }
      for (const grandchild of child.children) {
        const extra = grandchild as THREE.Mesh;
        if (extra.isMesh) {
          extra.geometry.dispose();
        }
      }
    }
    root.remove(group);
  }

  let maxPixelRatio = options.maxPixelRatio;

  function sizeRenderer(): void {
    const rect = options.container.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    // O teto existe porque um ecrã 3× com um viewport de 1400 px são 12 M de pixels por frame.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  sizeRenderer();

  const onLost = (event: Event): void => {
    event.preventDefault();
    options.onContextLost?.(event);
  };
  options.canvas.addEventListener("webglcontextlost", onLost, false);
  const onRestored = (): void => {
    // O contexto é recriado pelo browser; as buffers não. Reconstruir é o único caminho honesto.
    for (const [, handle] of handles) {
      disposeGroup(handle.group);
    }
    handles.clear();
    registry.refresh();
  };
  options.canvas.addEventListener("webglcontextrestored", onRestored, false);

  return {
    scene,
    camera,
    renderer,
    root,
    registry,
    sync(plan) {
      if (disposed) {
        return;
      }
      const seen = new Set<string>();
      let structural = 0;
      for (const elementPlan of plan.elements) {
        seen.add(elementPlan.elementId);
        const signature = signatureOf(elementPlan);
        const existing = handles.get(elementPlan.elementId);
        currentPlans.set(elementPlan.elementId, elementPlan);
        const transformSignature = transformSignatureOf(elementPlan);
        if (existing === undefined) {
          const group = buildGroup(elementPlan);
          root.add(group);
          handles.set(elementPlan.elementId, { group, signature, transformSignature });
          structural += 1;
        } else if (
          existing.signature !== signature ||
          groupNeedsRebuild(existing.group, elementPlan, registry)
        ) {
          // Material ou geometria diferente ⇒ recria o grupo.
          disposeGroup(existing.group);
          const group = buildGroup(elementPlan);
          root.add(group);
          handles.set(elementPlan.elementId, { group, signature, transformSignature });
          structural += 1;
        } else if (existing.transformSignature !== transformSignature) {
          updateGroup(existing.group, elementPlan);
          existing.transformSignature = transformSignature;
        }
      }
      for (const [elementId, handle] of [...handles]) {
        if (!seen.has(elementId)) {
          disposeGroup(handle.group);
          handles.delete(elementId);
          currentPlans.delete(elementId);
          structural += 1;
        }
      }
      if (structural > 0) {
        addGroundGrid(plan.bounds.radius);
        const radius = plan.bounds.radius;
        scene.fog = new THREE.Fog(background.getHex(), radius * 4.5, radius * 14);
      }
    },
    objectFor(elementId) {
      return handles.get(elementId)?.group;
    },
    selectableObjects() {
      const out: THREE.Object3D[] = [];
      for (const [elementId, handle] of handles) {
        const plan = currentPlans.get(elementId);
        if (plan !== undefined && plan.selectable) {
          out.push(handle.group);
        }
      }
      return out;
    },
    resize: sizeRenderer,
    setPixelRatio(value) {
      maxPixelRatio = value;
      sizeRenderer();
    },
    render() {
      if (disposed) {
        return;
      }
      renderer.render(scene, camera);
    },
    refreshTheme() {
      registry.refresh();
      const next = new THREE.Color(options.readToken("--canvas") ?? "#f6f4f0");
      background.copy(next);
      scene.background = next;
      renderer.setClearColor(next, 1);
    },
    setShadows(enabled) {
      renderer.shadowMap.enabled = enabled;
      renderer.shadowMap.needsUpdate = true;
      root.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.castShadow = enabled;
          mesh.receiveShadow = enabled;
        }
      });
    },
    stats() {
      let meshes = 0;
      root.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          meshes += 1;
        }
      });
      return {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        meshes,
      };
    },
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      options.canvas.removeEventListener("webglcontextlost", onLost, false);
      options.canvas.removeEventListener("webglcontextrestored", onRestored, false);
      for (const [, handle] of handles) {
        disposeGroup(handle.group);
      }
      handles.clear();
      for (const line of gridLines.splice(0)) {
        root.remove(line);
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      }
      registry.dispose();
      renderer.dispose();
      renderer.forceContextLoss?.();
    },
  };
}
