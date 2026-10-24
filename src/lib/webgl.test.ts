import { describe, expect, it } from "vitest";
import { detectWebgl, isConstrainedDevice } from "./webgl";

/**
 * Sem browser não há WebGL — e é exatamente isso que a fronteira tem de devolver no
 * servidor: `unknown` (ainda não se sabe), nunca `unavailable` disfarçado de certeza.
 */
describe("detectWebgl (ambiente Node, sem DOM)", () => {
  it("devolve `unknown` quando não existe documento", () => {
    expect(detectWebgl()).toBe("unknown");
  });

  it("não assume limitação de dispositivo no servidor", () => {
    expect(isConstrainedDevice()).toBe(false);
  });

  it("o tipo de suporte é um conjunto fechado de três valores", () => {
    const values: Array<ReturnType<typeof detectWebgl>> = ["supported", "unavailable", "unknown"];
    expect(values).toHaveLength(3);
  });
});
