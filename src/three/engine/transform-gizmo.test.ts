import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { ruleFor } from "../edit-rules";
import { EDIT_LIMITS } from "../materials";
import { degToRad } from "../units";
import { computePatch, type BaseTransform } from "./transform-gizmo";

function objectAt(base: BaseTransform, overrides: Partial<BaseTransform> = {}): THREE.Object3D {
  const object = new THREE.Object3D();
  const next = { ...base, ...overrides };
  object.position.set(next.position[0], next.position[1], next.position[2]);
  object.rotation.y = degToRad(next.rotationYDeg);
  object.scale.set(next.scale[0], next.scale[1], next.scale[2]);
  return object;
}

const base: BaseTransform = { position: [4, 3, -2], rotationYDeg: 15, scale: [1, 1, 1] };

describe("compromisso do gizmo (Object3D → patch)", () => {
  it("parede arrastada em planta ignora o eixo vertical", () => {
    const patch = computePatch(objectAt(base, { position: [6, 9, -2] }), base, ruleFor("wall"), 40, false);
    expect(patch.position).toEqual([6, 3, -2]);
  });

  it("janela só pode mudar de cota", () => {
    const patch = computePatch(
      objectAt(base, { position: [12, 4.5, -2] }),
      base,
      ruleFor("window"),
      40,
      false,
    );
    expect(patch.position).toEqual([4, 4.5, -2]);
  });

  it("mobiliário é livre, mas dentro do limite do lote", () => {
    const patch = computePatch(
      objectAt(base, { position: [500, 3, -2] }),
      base,
      ruleFor("interior"),
      12,
      false,
    );
    expect(patch.position?.[0]).toBe(16);
    expect(patch.position?.[1]).toBe(3);
  });

  it("a rotação segue a regra da categoria", () => {
    const rotated = objectAt(base, { rotationYDeg: 45 });
    expect(computePatch(rotated, base, ruleFor("wall"), 40, false).rotationYDeg).toBe(45);
    // O vão não roda: voltar à base é o que impede a janela de se separar do fecho.
    expect(computePatch(rotated, base, ruleFor("window"), 40, false).rotationYDeg).toBe(15);
  });

  it("parede estrutural não escala, por muito que o rato insista", () => {
    const patch = computePatch(objectAt(base, { scale: [3, 3, 3] }), base, ruleFor("wall"), 40, false);
    expect(patch.scale).toEqual([1, 1, 1]);
  });

  it("espessura de divisória escreve só no eixo normal", () => {
    const patch = computePatch(objectAt(base, { scale: [2, 2, 1.4] }), base, ruleFor("partition"), 40, false);
    expect(patch.scale).toEqual([1, 1, 1.4]);
  });

  it("espessura de laje escreve só em Y", () => {
    const patch = computePatch(objectAt(base, { scale: [2, 1.6, 2] }), base, ruleFor("slab"), 40, true);
    expect(patch.scale).toEqual([1, 1.6, 1]);
  });

  it("escala uniforme de mobiliário é limitada pela biblioteca", () => {
    const patch = computePatch(objectAt(base, { scale: [9, 0.1, 1] }), base, ruleFor("interior"), 40, false);
    expect(patch.scale).toEqual([EDIT_LIMITS.maxScale, EDIT_LIMITS.minScale, 1]);
  });

  it("não *snappa* nem escreve fora da porta única de edição", () => {
    // O passo (0,1 m / 5°) é do `resolveTransform`; o gizmo devolve o número real, arredondado ao mm.
    const patch = computePatch(objectAt(base, { position: [4.37, 3, -2] }), base, ruleFor("wall"), 40, false);
    expect(patch.position?.[0]).toBe(4.37);
    expect(patch.position?.[0]).not.toBe(4.4);
  });

  it("regras de terreno e plataforma não produzem movimento nenhum", () => {
    for (const category of ["terrain", "platform"] as const) {
      const patch = computePatch(
        objectAt(base, { position: [99, 99, 99], rotationYDeg: 90, scale: [2, 2, 2] }),
        base,
        ruleFor(category),
        40,
        false,
      );
      expect(patch.position, category).toEqual(base.position);
      expect(patch.rotationYDeg, category).toBe(base.rotationYDeg);
      expect(patch.scale, category).toEqual([1, 1, 1]);
    }
  });
});
