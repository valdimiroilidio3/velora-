import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { LIGHTING_PRESETS } from "@/three/lighting-presets";
import { createLighting } from "./lighting";
import { createMaterialRegistry, envMapIntensityFor } from "./materials";

const readToken = (): string | null => null; // cai nos `fallbackColor` declarados — sem CSS aqui.

describe("luz com preset", () => {
  it("o preset muda direção, cor e intensidade das três luzes", () => {
    const scene = new THREE.Scene();
    const lighting = createLighting(scene, {
      shadows: true,
      readToken,
      shadowMapSize: 1024,
      preset: "meio-dia",
    });
    const noon = { ...lighting.key.position };
    const noonHemi = lighting.hemisphere.intensity;

    expect(lighting.applyPreset("fim-de-tarde")).toBe(true);
    expect(lighting.key.position.distanceTo(new THREE.Vector3(noon.x, noon.y, noon.z))).toBeGreaterThan(1);
    expect(lighting.key.color.getHex()).toBe(
      new THREE.Color(LIGHTING_PRESETS["fim-de-tarde"].sunColor).getHex(),
    );
    expect(lighting.hemisphere.intensity).toBeLessThan(noonHemi);
    expect(lighting.preset).toBe("fim-de-tarde");
    lighting.dispose();
  });

  it("aplicar o mesmo preset não move nada nem duplica trabalho", () => {
    const scene = new THREE.Scene();
    const lighting = createLighting(scene, { shadows: true, readToken, shadowMapSize: 1024 });
    const before = lighting.key.position.clone();
    expect(lighting.applyPreset(lighting.preset)).toBe(lighting.key.castShadow);
    expect(lighting.key.position.distanceTo(before)).toBe(0);
    lighting.dispose();
  });

  it("à noite não há sol nem sombras projetadas", () => {
    const scene = new THREE.Scene();
    const lighting = createLighting(scene, { shadows: true, readToken, shadowMapSize: 1024 });
    expect(lighting.applyPreset("noite")).toBe(false);
    expect(lighting.key.intensity).toBe(0);
    lighting.setShadows(true);
    // `setShadows` respeita o preset: ligar as sombras do renderer à noite não acende uma luz morta.
    expect(lighting.key.castShadow).toBe(false);
    lighting.dispose();
  });

  it("o `dispose` tira as três luzes da cena", () => {
    const scene = new THREE.Scene();
    const lighting = createLighting(scene, { shadows: true, readToken, shadowMapSize: 1024 });
    expect(scene.children.length).toBe(3);
    lighting.dispose();
    expect(scene.children.length).toBe(0);
  });
});

describe("materiais com superfície e noite", () => {
  it("a força do ambiente segue a rugosidade: vidro reflete, relva quase não", () => {
    expect(envMapIntensityFor(0.15)).toBeGreaterThan(0.8);
    expect(envMapIntensityFor(0.98)).toBeLessThan(0.25);
    expect(envMapIntensityFor(0.15)).toBeGreaterThan(envMapIntensityFor(0.9));
  });

  it("sem biblioteca de mapas o material fica liso, mas com a curva de ambiente", () => {
    const registry = createMaterialRegistry({ readToken });
    const wall = registry.acquire("wall");
    expect(wall.map).toBeNull();
    expect(wall.normalMap).toBeNull();
    expect(wall.envMapIntensity).toBe(envMapIntensityFor(0.88));
    registry.dispose();
    expect(registry.size()).toBe(0);
  });

  it("o brilho noturno só acende os materiais que o declaram", () => {
    const registry = createMaterialRegistry({ readToken });
    registry.acquire("glazing");
    registry.acquire("wall");
    registry.setNight(true);
    const glazing = registry.acquire("glazing");
    const wall = registry.acquire("wall");
    expect(glazing.emissiveIntensity).toBeGreaterThan(0);
    expect(glazing.emissive.getHex()).not.toBe(0);
    // Fachada sem brilho declarado: `emissive` preto, seja qual for a intensidade.
    expect(wall.emissive.getHex()).toBe(0);
    registry.setNight(false);
    expect(glazing.emissiveIntensity).toBe(0);
    registry.dispose();
  });

  it("o `refresh` do tema não apaga o estado noturno", () => {
    const registry = createMaterialRegistry({ readToken });
    registry.acquire("furniture");
    registry.setNight(true);
    registry.refresh();
    expect(registry.acquire("furniture").emissiveIntensity).toBeGreaterThan(0);
    registry.dispose();
  });
});
