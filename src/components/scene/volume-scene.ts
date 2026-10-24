import * as THREE from "three";
import type { Massing } from "@/demo/massing";

/**
 * Cena de volumes — não é BIM.
 *
 * Lê exclusivamente a projeção determinística de `src/demo/massing.ts`, a mesma que alimenta
 * a alternativa SVG/tabela. Câmara com órbita e zoom limitados, luz hemisférica + duas
 * direccionais, arestas finas para leitura arquitetónica. Sem sombras, sem materiais
 * avançados, sem modelos externos.
 *
 * Os ciclos de vida são explícitos: `createVolumeScene` devolve `dispose()`, e o
 * `ResizeObserver`, os listeners e o ciclo de animação pertencem ao fecho que os criou.
 * A remoção do componente liberta GPU, geometrias, materiais e timers.
 */

export type SceneViewPreset = "nordeste" | "sul" | "planta" | "facha";

export interface SceneStats {
  readonly fps: number;
  readonly triangles: number;
  readonly calls: number;
}

export interface VolumeScene {
  orbit(yawDelta: number, pitchDelta: number): void;
  dolly(factor: number): void;
  setView(preset: SceneViewPreset): void;
  setAutoRotate(active: boolean): void;
  setReducedMotion(reduced: boolean): void;
  syncTheme(): void;
  resize(): void;
  getStats(): SceneStats;
  dispose(): void;
}

export interface VolumeSceneOptions {
  readonly reducedMotion: boolean;
  readonly highPerformance: boolean;
  readonly onContextLost?: (() => void) | undefined;
  readonly onStats?: ((stats: SceneStats) => void) | undefined;
}

const PITCH_MIN = 0.08;
const PITCH_MAX = 1.32;
export const SCENE_YAW_STEP = Math.PI / 12;
export const SCENE_PITCH_STEP = Math.PI / 24;
export const SCENE_DOLLY_STEP = 1.18;

export const SCENE_VIEW_PRESETS: readonly { value: SceneViewPreset; label: string }[] = [
  { value: "nordeste", label: "Norte / nascente" },
  { value: "sul", label: "Alçado sul" },
  { value: "facha", label: "Facha poente" },
  { value: "planta", label: "Vista de planta" },
];

function readColor(element: HTMLElement, token: string, fallback: string): THREE.Color {
  const raw = getComputedStyle(element).getPropertyValue(token).trim();
  return new THREE.Color(raw.length > 0 ? raw : fallback);
}

export function createVolumeScene(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  massing: Massing,
  options: VolumeSceneOptions,
): VolumeScene | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: options.highPerformance,
      alpha: false,
      powerPreference: options.highPerformance ? "high-performance" : "default",
    });
  } catch {
    return null;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, options.highPerformance ? 2 : 1.25));
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 4000);
  const root = new THREE.Group();
  scene.add(root);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const massMaterial = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0.02 });
  const podiumMaterial = new THREE.MeshStandardMaterial({ roughness: 0.68, metalness: 0.04 });
  const setbackMaterial = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
  const glazingMaterial = new THREE.MeshStandardMaterial({ roughness: 0.24, metalness: 0.32 });
  const lineMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.5 });
  const gridMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.22 });
  const groundMaterial = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  materials.push(
    massMaterial,
    podiumMaterial,
    setbackMaterial,
    glazingMaterial,
    lineMaterial,
    gridMaterial,
    groundMaterial,
  );

  // Uma única geometria de caixa partilhada por todos os pisos: é a escala que muda.
  const sharedBox = new THREE.BoxGeometry(1, 1, 1);
  geometries.push(sharedBox);

  for (const level of massing.levels) {
    const material =
      level.kind === "podium" ? podiumMaterial : level.kind === "setback" ? setbackMaterial : massMaterial;
    for (const box of level.boxes) {
      const mesh = new THREE.Mesh(sharedBox, material);
      mesh.scale.set(box.widthM, level.heightM, box.depthM);
      mesh.position.set(box.cx, level.elevationM + level.heightM / 2, box.cz);
      root.add(mesh);

      const edges = new THREE.EdgesGeometry(sharedBox);
      geometries.push(edges);
      const outline = new THREE.LineSegments(edges, lineMaterial);
      outline.scale.copy(mesh.scale);
      outline.position.copy(mesh.position);
      root.add(outline);
    }

    // Fachada ventilada sugerida: uma lâmina fina por piso nos corpos com modularidade ≥ 3.
    for (const box of level.boxes) {
      if (box.bays < 3) {
        continue;
      }
      const band = new THREE.Mesh(sharedBox, glazingMaterial);
      band.scale.set(box.widthM * 0.92, Math.min(1.05, level.heightM * 0.3), box.depthM * 1.012);
      band.position.set(box.cx, level.elevationM + level.heightM * 0.55, box.cz);
      root.add(band);
    }
  }

  root.rotation.y = THREE.MathUtils.degToRad(massing.orientationDeg);

  const radius = Math.max(12, massing.siteRadiusM);

  const groundGeometry = new THREE.CircleGeometry(radius * 1.3, 72);
  geometries.push(groundGeometry);
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  scene.add(ground);

  const grid = new THREE.GridHelper(radius * 2.4, 24, 0xffffff, 0xffffff);
  grid.material = gridMaterial;
  geometries.push(grid.geometry as THREE.BufferGeometry);
  scene.add(grid);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x9a9a9a, 1.1);
  scene.add(hemiLight);
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
  keyLight.position.set(radius, massing.totalHeightM + radius * 0.8, radius * 0.6);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.45);
  fillLight.position.set(-radius * 0.8, massing.totalHeightM * 0.6, -radius);
  scene.add(fillLight);

  function syncTheme(): void {
    const background = readColor(container, "--scene-bg", "#e9e6df");
    scene.background = background;
    scene.fog = new THREE.Fog(background.getHex(), radius * 3.6, radius * 11);
    renderer.setClearColor(background, 1);
    massMaterial.color = readColor(container, "--scene-mass", "#cfcabf");
    podiumMaterial.color = readColor(container, "--scene-podium", "#cfcabf");
    setbackMaterial.color = readColor(container, "--scene-mass-lit", "#e2ded6");
    glazingMaterial.color = readColor(container, "--scene-glazing", "#6f7f80");
    groundMaterial.color = readColor(container, "--scene-ground", "#d8d4cb");
    const line = readColor(container, "--scene-line", "#4c4a45");
    lineMaterial.color = line;
    gridMaterial.color = line;
    requestRender();
  }

  // ---- câmara controlada --------------------------------------------------------
  let distance = radius * 3.6;
  let yaw = Math.PI * 0.22;
  let pitch = 0.5;
  let reducedMotion = options.reducedMotion;
  const focus = new THREE.Vector3(0, massing.totalHeightM * 0.42, 0);

  function applyCamera(): void {
    distance = Math.min(radius * 8, Math.max(radius * 1.7, distance));
    pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch));
    camera.position.set(
      Math.sin(yaw) * Math.cos(pitch) * distance,
      Math.sin(pitch) * distance,
      Math.cos(yaw) * Math.cos(pitch) * distance,
    );
    camera.lookAt(focus);
    camera.updateProjectionMatrix();
  }

  // ---- ciclo de animação: renderiza só quando há o quê renderizar ----------------
  let frame = 0;
  let dirty = true;
  let velocityYaw = 0;
  let velocityPitch = 0;
  let autoRotate = false;
  let visible = true;
  let disposed = false;
  let lastTime = 0;
  let fps = 0;

  function requestRender(): void {
    dirty = true;
  }

  function loop(now: number): void {
    if (disposed) {
      return;
    }
    frame = requestAnimationFrame(loop);
    if (!visible) {
      return;
    }
    const delta = lastTime === 0 ? 16.7 : Math.max(1, now - lastTime);
    lastTime = now;
    fps = fps === 0 ? 1000 / delta : fps * 0.9 + (1000 / delta) * 0.1;

    if (!reducedMotion && (Math.abs(velocityYaw) > 0.0005 || Math.abs(velocityPitch) > 0.0005)) {
      yaw += velocityYaw;
      pitch += velocityPitch;
      velocityYaw *= 0.88;
      velocityPitch *= 0.88;
      dirty = true;
    } else {
      velocityYaw = 0;
      velocityPitch = 0;
    }

    if (autoRotate && !reducedMotion) {
      yaw += 0.0018 * (delta / 16.7);
      dirty = true;
    }

    if (!dirty) {
      return;
    }
    dirty = false;
    applyCamera();
    renderer.render(scene, camera);
    options.onStats?.({
      fps: Math.round(fps),
      triangles: renderer.info.render.triangles,
      calls: renderer.info.render.calls,
    });
  }

  syncTheme();
  applyCamera();
  frame = requestAnimationFrame(loop);

  // ---- ponteiro ------------------------------------------------------------------
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let pinchSpread = 0;

  function onPointerDown(event: PointerEvent): void {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture?.(event.pointerId);
  }
  function onPointerMove(event: PointerEvent): void {
    if (!dragging) {
      return;
    }
    yaw -= (event.clientX - lastX) * 0.006;
    pitch += (event.clientY - lastY) * 0.004;
    lastX = event.clientX;
    lastY = event.clientY;
    requestRender();
  }
  function onPointerUp(event: PointerEvent): void {
    dragging = false;
    canvas.releasePointerCapture?.(event.pointerId);
  }
  function onWheel(event: WheelEvent): void {
    // Só capturamos a roda com o cursor por cima da cena: a página nunca fica presa.
    if (!canvas.matches(":hover")) {
      return;
    }
    event.preventDefault();
    dolly(event.deltaY > 0 ? SCENE_DOLLY_STEP : 1 / SCENE_DOLLY_STEP);
  }
  function onPinch(event: TouchEvent): void {
    if (event.touches.length !== 2) {
      return;
    }
    const first = event.touches.item(0);
    const second = event.touches.item(1);
    if (first === null || second === null) {
      return;
    }
    const spread = Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
    if (pinchSpread > 0) {
      dolly(pinchSpread / spread);
    }
    pinchSpread = spread;
  }
  function onTouchEnd(): void {
    pinchSpread = 0;
  }
  function onDoubleClick(): void {
    setView("nordeste");
  }
  function onContextLost(event: Event): void {
    event.preventDefault();
    cancelAnimationFrame(frame);
    options.onContextLost?.();
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("touchmove", onPinch, { passive: true });
  canvas.addEventListener("touchend", onTouchEnd);
  canvas.addEventListener("dblclick", onDoubleClick);
  canvas.addEventListener("webglcontextlost", onContextLost, false);

  // ---- dimensão e visibilidade ---------------------------------------------------
  function resize(): void {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = width < height ? 46 : 38;
    camera.updateProjectionMatrix();
    requestRender();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  const intersectionObserver = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true;
    requestRender();
  });
  intersectionObserver.observe(container);

  function onVisibilityChange(): void {
    visible = document.visibilityState === "visible";
    requestRender();
  }
  document.addEventListener("visibilitychange", onVisibilityChange);

  function setView(preset: SceneViewPreset): void {
    if (preset === "planta") {
      yaw = 0;
      pitch = PITCH_MAX;
      distance = radius * 4.4;
    } else if (preset === "sul") {
      yaw = Math.PI;
      pitch = 0.26;
      distance = radius * 3.2;
    } else if (preset === "facha") {
      yaw = Math.PI * 0.5;
      pitch = 0.14;
      distance = radius * 4.8;
    } else {
      yaw = Math.PI * 0.22;
      pitch = 0.5;
      distance = radius * 3.6;
    }
    requestRender();
  }

  function orbit(yawDelta: number, pitchDelta: number): void {
    if (reducedMotion) {
      yaw += yawDelta;
      pitch += pitchDelta;
    } else {
      velocityYaw = yawDelta;
      velocityPitch = pitchDelta;
    }
    requestRender();
  }

  function dolly(factor: number): void {
    distance *= factor;
    requestRender();
  }

  return {
    orbit,
    dolly,
    setView,
    setAutoRotate(active: boolean) {
      autoRotate = active;
      requestRender();
    },
    setReducedMotion(reduced: boolean) {
      reducedMotion = reduced;
    },
    syncTheme,
    resize,
    getStats() {
      return {
        fps: Math.round(fps),
        triangles: renderer.info.render.triangles,
        calls: renderer.info.render.calls,
      };
    },
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("touchmove", onPinch);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("dblclick", onDoubleClick);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      scene.remove(ground, grid, root);
      for (const geometry of geometries) {
        geometry.dispose();
      }
      for (const material of materials) {
        material.dispose();
      }
      if (scene.fog !== null) {
        scene.fog = null;
      }
      renderer.dispose();
      try {
        renderer.forceContextLoss();
      } catch {
        // Alguns navegadores já libertaram o contexto: não é um erro do utilizador.
      }
    },
  };
}
