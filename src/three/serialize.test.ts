import { describe, expect, it } from "vitest";
import { demoProjects } from "@/demo/projects";
import { buildDemoDocument } from "./demo-building";
import { ModelLoadError, parseSceneDocument, serializeSceneDocument } from "./serialize";
import { describeDemoModel, loadModel, UNSUPPORTED_FORMAT_MESSAGE } from "./model-loader";
import { withTransform } from "./model";

const project = demoProjects[1]!;
const base = buildDemoDocument(project);

function parse(text: string) {
  return JSON.parse(text) as Record<string, unknown>;
}

describe("serialização", () => {
  it("o envelope declara formato, versão e momento de exportação", () => {
    const payload = parse(serializeSceneDocument(base, "2026-10-24T12:00:00.000Z"));
    expect(payload.format).toBe("velora.scene-document");
    expect(payload.version).toBe(1);
    expect(payload.exportedAt).toBe("2026-10-24T12:00:00.000Z");
    expect(parse(serializeSceneDocument(base)).document).toBeTruthy();
  });

  it("ida e volta preservam o documento byte a byte", () => {
    const text = serializeSceneDocument(base, "2026-10-24T12:00:00.000Z");
    const restored = parseSceneDocument(text);
    expect(restored).toEqual(base);
    expect(serializeSceneDocument(restored, "2026-10-24T12:00:00.000Z")).toBe(text);
  });

  it("as edições locais sobrevivem ao ciclo (é isto que a Fase 4 vai persistir)", () => {
    const moved = withTransform(base, base.elements[5]!.id, { position: [1.5, 0, 2.25] });
    const restored = parseSceneDocument(serializeSceneDocument(moved.document));
    expect(restored.elements[5]!.transform.position).toEqual(moved.document.elements[5]!.transform.position);
  });

  it("recusa JSON partido com erro tipado", () => {
    try {
      parseSceneDocument("{ isto não é json");
      throw new Error("devia ter falhado");
    } catch (error) {
      expect(error).toBeInstanceOf(ModelLoadError);
      expect((error as ModelLoadError).code).toBe("malformed_json");
    }
  });

  it("recusa ficheiro de outra origem sem adivinhar", () => {
    const foreign = JSON.stringify({ format: "other", version: 9, document: {} });
    expect(() => parseSceneDocument(foreign)).toThrow(ModelLoadError);
    try {
      parseSceneDocument(foreign);
    } catch (error) {
      expect((error as ModelLoadError).code).toBe("unsupported_format");
      expect((error as ModelLoadError).details).toContain("format=other");
    }
  });

  it("recusa geometria impossível, categoria desconhecida e escala zero", () => {
    const payload = parse(serializeSceneDocument(base));
    const document = payload.document as { elements: Record<string, unknown>[] };

    for (const [patch, expected] of [
      [{ kind: "wall", lengthM: -4, heightM: 2.7, thicknessM: 0.25 }, "geometry"],
      [{ kind: "desconhecida" }, "geometry"],
    ] as const) {
      const broken = structuredClone(document);
      broken.elements[0]!.geometry = patch;
      try {
        parseSceneDocument(JSON.stringify({ ...payload, document: broken }));
        throw new Error(`devia ter rejeitado ${expected}`);
      } catch (error) {
        expect((error as ModelLoadError).code).toBe("schema_invalid");
      }
    }

    const zeroScale = structuredClone(document);
    zeroScale.elements[0]!.transform = { position: [0, 0, 0], rotationYDeg: 0, scale: [0, 1, 1] };
    expect(() => parseSceneDocument(JSON.stringify({ ...payload, document: zeroScale }))).toThrow(
      ModelLoadError,
    );
  });

  it("recusa identificadores repetidos e elementos órfãos de piso", () => {
    const payload = parse(serializeSceneDocument(base));
    const document = payload.document as { elements: Record<string, unknown>[]; levels: unknown[] };

    const duplicated = structuredClone(document);
    duplicated.elements[1] = { ...duplicated.elements[0]! };
    expect(() => parseSceneDocument(JSON.stringify({ ...payload, document: duplicated }))).toThrow(
      ModelLoadError,
    );

    const orphan = structuredClone(document);
    orphan.elements[0]!.levelId = "L99";
    try {
      parseSceneDocument(JSON.stringify({ ...payload, document: orphan }));
      throw new Error("devia ter falhado");
    } catch (error) {
      expect((error as ModelLoadError).code).toBe("schema_invalid");
      expect((error as ModelLoadError).details.length).toBeGreaterThan(0);
    }
  });

  it("recusa uma convenção de unidades diferente", () => {
    const payload = parse(serializeSceneDocument(base));
    const document = payload.document as Record<string, unknown>;
    document.convention = "velora.centimeters.y-up.v1";
    try {
      parseSceneDocument(JSON.stringify({ ...payload, document }));
      throw new Error("devia ter falhado");
    } catch (error) {
      // O schema trava antes: a convenção é literal no contrato.
      expect((error as ModelLoadError).code).toBe("schema_invalid");
    }
  });
});

describe("fronteira de carregamento", () => {
  it("carrega o edifício de demonstração de cada projeto", () => {
    for (const item of demoProjects) {
      const loaded = loadModel({ kind: "demo", projectSlug: item.slug });
      expect(loaded.source).toBe("demo");
      expect(loaded.document.elements.length).toBeGreaterThan(80);
      expect(loaded.project?.slug).toBe(item.slug);
    }
  });

  it("respeita o nível de detalhe pedido", () => {
    const full = loadModel({ kind: "demo", projectSlug: project.slug, detail: "full" });
    const compact = loadModel({ kind: "demo", projectSlug: project.slug, detail: "compact" });
    expect(compact.document.elements.length).toBeLessThan(full.document.elements.length);
  });

  it("não inventa um projeto que não existe", () => {
    try {
      loadModel({ kind: "demo", projectSlug: "nao-existe" });
      throw new Error("devia ter falhado");
    } catch (error) {
      expect((error as ModelLoadError).code).toBe("unknown_project");
    }
  });

  it("relê um documento exportado e avisa o que é ambíguo", () => {
    const edited = withTransform(base, base.elements[0]!.id, { position: [1, 2, 3] });
    const loaded = loadModel({ kind: "document", json: serializeSceneDocument(edited.document) });
    expect(loaded.source).toBe("document");
    // Orientação != 0 → aviso de leitura, não erro.
    expect(loaded.warnings.join(" ")).toMatch(/orientad/i);
  });

  it("formats externos estão declarados como não suportados — sem parser fingido", () => {
    for (const kind of ["ifc", "glb", "plan-image"] as const) {
      try {
        loadModel({ kind, label: `exemplo.${kind}` });
        throw new Error(`devia ter recusado ${kind}`);
      } catch (error) {
        expect((error as ModelLoadError).code).toBe("unsupported_format");
        expect((error as Error).message).toBe(UNSUPPORTED_FORMAT_MESSAGE);
      }
    }
  });

  it("a descrição de reserva não é confundível com um modelo carregado", () => {
    expect(describeDemoModel(project.slug)).toMatch(/pisos/);
    expect(describeDemoModel("ninguém")).toBe("sem projeto");
  });
});
