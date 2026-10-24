import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { firstHit, resolveElementId, toNdc } from "./selection";

function elementGroup(id: string): THREE.Group {
  const group = new THREE.Group();
  group.userData.elementId = id;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
  mesh.position.set(1, 1, 1); // deslocado: o hit tem de subir ao grupo, não ficar na malha
  group.add(mesh);
  return group;
}

/**
 * `Raycaster` lê `matrixWorld` e não a atualiza: sem este passo os dois grupos estariam ambos na
 * origem e o teste passaria por acaso. É o género de armadilha que faz um teste de seleção mentir.
 */
function stage(...groups: THREE.Group[]): THREE.Group[] {
  const scene = new THREE.Scene();
  for (const group of groups) {
    scene.add(group);
  }
  scene.updateMatrixWorld(true);
  return groups;
}

describe("resolução de seleção", () => {
  it("sobe da malha até ao elemento do documento", () => {
    const group = elementGroup("L01.wall.01");
    const mesh = group.children[0]!;
    expect(resolveElementId(mesh)).toBe("L01.wall.01");
    expect(resolveElementId(group)).toBe("L01.wall.01");
  });

  it("não devolve um id inventado quando não há elemento", () => {
    expect(resolveElementId(new THREE.Object3D())).toBeNull();
    expect(resolveElementId(null)).toBeNull();
  });

  it("converte coordenadas de rato em NDC, incluindo o canto superior esquerdo", () => {
    const rect = { left: 100, top: 50, width: 800, height: 400 };
    expect(toNdc(rect, 500, 250)).toEqual({ x: 0, y: 0 });
    expect(toNdc(rect, 100, 50)).toEqual({ x: -1, y: 1 });
    expect(toNdc(rect, 900, 450)).toEqual({ x: 1, y: -1 });
  });

  it("sobrevive a um retângulo de largura zero", () => {
    const ndc = toNdc({ left: 0, top: 0, width: 0, height: 0 }, 3, 4);
    expect(Number.isFinite(ndc.x) && Number.isFinite(ndc.y)).toBe(true);
  });

  it("acerta no volume certo e ignora o resto da cena", () => {
    const hit = elementGroup("L01.slab.02");
    const other = elementGroup("L01.roof.99");
    other.position.set(60, 0, 0);
    stage(hit, other);

    const raycaster = new THREE.Raycaster(new THREE.Vector3(0, 1, -10), new THREE.Vector3(0, 0, 1));
    expect(firstHit(raycaster, [hit, other])).toBe("L01.slab.02");

    const miss = new THREE.Raycaster(new THREE.Vector3(-500, 1, -10), new THREE.Vector3(0, 0, 1));
    expect(firstHit(miss, [hit, other])).toBeNull();
    expect(firstHit(raycaster, [])).toBeNull();
  });

  it("um raio que passa por cima devolve o elemento mais próximo", () => {
    const near = elementGroup("near");
    const far = elementGroup("far");
    far.position.set(0, 0, -8);
    stage(near, far);
    // A malha de cada grupo está em (1, 1, 1) relativo ao grupo: é por aí que o raio passa a direito.
    // `near` fica na origem (z −1..1), `far` a 8 metros (z −9..−7).
    const raycaster = new THREE.Raycaster(new THREE.Vector3(1, 1, 20), new THREE.Vector3(0, 0, -1));
    expect(firstHit(raycaster, [far, near])).toBe("near");
    // Ordem da lista não decide: decide a distância ao longo do raio.
    expect(firstHit(raycaster, [near, far])).toBe("near");
  });
});
