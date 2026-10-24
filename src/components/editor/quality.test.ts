import { describe, expect, it } from "vitest";
import { QUALITY_CONTROL, tierFor } from "./quality";

describe("qualidade de render", () => {
  it("resolve a preferência do utilizador em termos concretos de palco", () => {
    expect(tierFor("auto", false)).toBe("equilibrada");
    expect(tierFor("auto", true)).toBe("leve");
    expect(tierFor("balanced", false)).toBe("equilibrada");
    expect(tierFor("balanced", true)).toBe("leve");
    expect(tierFor("detailed", false)).toBe("alta");
    // Um telemóvel não ganha sombras a 2048 px porque o utilizador pediu detalhe: ganha o máximo
    // que o dispositivo suporta, que é o que a preferência "detalhada" quer dizer na prática.
    expect(tierFor("detailed", true)).toBe("equilibrada");
  });

  it("a escolha é a mesma preferência da página de preferências", () => {
    expect(QUALITY_CONTROL.map((option) => option.value)).toEqual(["auto", "balanced", "detailed"]);
    for (const option of QUALITY_CONTROL) {
      expect(option.description.length).toBeGreaterThan(12);
    }
  });
});
