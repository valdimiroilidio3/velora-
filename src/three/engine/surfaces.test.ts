import { describe, expect, it } from "vitest";
import { createSurfaceLibrary, medianPanelSize } from "./surfaces";

describe("biblioteca de mapas do palco", () => {
  it("qualidade `leve` não constrói mapas — é o orçamento, não uma omissão", () => {
    const library = createSurfaceLibrary("leve");
    expect(library.get("wall")).toBeNull();
    expect(library.size()).toBe(0);
    expect(library.bytes()).toBe(0);
  });

  it("constrói uma vez por material e volta a usar a mesma instância", () => {
    const library = createSurfaceLibrary("equilibrada");
    const first = library.get("wall");
    expect(first).not.toBeNull();
    expect(first!.map.wrapS).toBe(1000); // RepeatWrapping
    expect(first!.map.generateMipmaps).toBe(true);
    expect(library.get("wall")).toBe(first);
    expect(library.size()).toBe(1);
    library.dispose();
  });

  it("mudar de qualidade liberta os mapas antigos em vez de os acumular", () => {
    const library = createSurfaceLibrary("equilibrada");
    const small = library.get("wall")!;
    const bytesSmall = library.bytes();
    library.setQuality("alta");
    expect(library.size()).toBe(0);
    expect(library.bytes()).toBe(0);
    const large = library.get("wall")!;
    expect(large).not.toBe(small);
    expect(large.map.image.width).toBe(512);
    expect(library.bytes()).toBeGreaterThan(bytesSmall);
    library.dispose();
    expect(library.size()).toBe(0);
    expect(library.bytes()).toBe(0);
  });

  it("o `dispose` liberta os três mapas de cada material", () => {
    const library = createSurfaceLibrary("equilibrada");
    const set = library.get("ground")!;
    let disposed = 0;
    for (const map of [set.map, set.roughnessMap, set.normalMap]) {
      const original = map.dispose.bind(map);
      map.dispose = () => {
        disposed += 1;
        original();
      };
    }
    library.dispose();
    expect(disposed).toBe(3);
  });

  it("a repetição só é aplicada a quem já foi construído", () => {
    const library = createSurfaceLibrary("leve");
    expect(() => library.setRepeat("wall", 12, 3)).not.toThrow();
    library.setQuality("equilibrada");
    library.get("wall");
    library.setRepeat("wall", 12.8, 3.2);
    const set = library.get("wall")!;
    // 12,8 m / tile de 3,2 m = 4 repetições, e o mesmo valor nos três mapas (senão o relevo
    // desalinha do albedo a meio do painel).
    expect(set.map.repeat.x).toBe(4);
    expect(set.roughnessMap.repeat.x).toBe(4);
    expect(set.normalMap.repeat.x).toBe(4);
    library.dispose();
  });

  it("a escala do tiling vem da mediana dos painéis, não do primeiro que aparece", () => {
    const sizes = medianPanelSize([
      { materialId: "wall" as const, widthM: 100, heightM: 100 },
      { materialId: "wall" as const, widthM: 3, heightM: 3 },
      { materialId: "wall" as const, widthM: 4, heightM: 3 },
      { materialId: "slab" as const, widthM: 12, heightM: 0.28 },
    ]);
    expect(sizes.get("wall")).toEqual({ widthM: 4, heightM: 3 });
    expect(sizes.get("slab")).toEqual({ widthM: 12, heightM: 0.28 });
    expect(sizes.get("glazing")).toBeUndefined();
  });
});
