import { describe, expect, it } from "vitest";
import { demoProjects } from "@/demo/projects";
import { buildDemoDocument } from "./demo-building";
import { withVisibility } from "./model";
import { buildRenderPlan, planCenter, planDimensions, planHeight } from "./render-plan";

const document = buildDemoDocument(demoProjects[0]!);
const plan = buildRenderPlan(document);

describe("plano de renderização", () => {
  it("cobre todos os elementos visíveis e nenhum escondido", () => {
    expect(plan.elements).toHaveLength(document.elements.length);
    const hidden = withVisibility(document, document.elements[0]!.id, false);
    const next = buildRenderPlan(hidden);
    expect(next.elements).toHaveLength(document.elements.length - 1);
    expect(next.elements.some((element) => element.elementId === hidden.elements[0]!.id)).toBe(false);
  });

  it("transporta a transformação do documento sem a aplicar duas vezes", () => {
    for (const elementPlan of plan.elements) {
      const element = document.elements.find((item) => item.id === elementPlan.elementId)!;
      expect(elementPlan.transform.position).toEqual(element.transform.position);
      expect(elementPlan.transform.rotationYDeg).toBe(element.transform.rotationYDeg);
      expect(elementPlan.transform.scale).toEqual(element.transform.scale);
    }
  });

  it("guarda a dimensão nominal na geometria e a escala no objeto", () => {
    const scaled = {
      ...document,
      elements: document.elements.map((element) =>
        element.category === "partition"
          ? { ...element, transform: { ...element.transform, scale: [1.4, 1, 1] as const } }
          : element,
      ),
    };
    const partition = plan.elements.find((element) => element.category === "partition")!;
    const scaledPlan = buildRenderPlan(scaled).elements.find((element) => element.category === "partition")!;
    // Geometria igual, escala diferente: é isto que evita reconstruir `BoxGeometry` a cada arrasto.
    expect(scaledPlan.primitives[0]!.size).toEqual(partition.primitives[0]!.size);
    expect(scaledPlan.transform.scale[0]).toBe(1.4);
    const nominal = planDimensions(document.elements.find((element) => element.id === partition.elementId)!);
    const effective = planDimensions(scaled.elements.find((element) => element.id === partition.elementId)!);
    expect(effective[0]).toBeCloseTo(nominal[0] * 1.4, 3);
  });

  it("dá offsets locais aos degraus e origem 0 ao corpo simples", () => {
    const stairs = plan.elements.find((element) => element.category === "circulation")!;
    expect(stairs.primitives.length).toBeGreaterThan(2);
    expect(stairs.primitives[0]!.offset).not.toEqual([0, 0, 0]);
    const wall = plan.elements.find((element) => element.category === "wall")!;
    expect(wall.primitives).toHaveLength(1);
    expect(wall.primitives[0]!.offset).toEqual([0, 0, 0]);
    expect(plan.primitiveCount).toBe(plan.elements.reduce((sum, item) => sum + item.primitives.length, 0));
  });

  it("não roda o plano em relação ao documento", () => {
    expect(plan.orientationDeg).toBe(document.orientationDeg);
    expect(plan.bounds.radius).toBeGreaterThan(0);
    expect(plan.bounds.center[1]).toBeGreaterThan(0);
  });

  it("centro e altura de um elemento são coerentes com as suas primitivas", () => {
    for (const elementPlan of plan.elements.slice(0, 40)) {
      const center = planCenter(elementPlan);
      expect(Number.isFinite(center[0]) && Number.isFinite(center[1])).toBe(true);
      expect(planHeight(elementPlan)).toBeGreaterThan(0);
      expect(center[1]).toBeCloseTo(elementPlan.transform.position[1], 1);
    }
  });

  it("produz um plano para cada um dos seis projetos de demonstração", () => {
    for (const project of demoProjects) {
      const built = buildRenderPlan(buildDemoDocument(project));
      expect(built.elements.length).toBeGreaterThan(60);
      expect(built.primitiveCount).toBeGreaterThanOrEqual(built.elements.length);
      expect(built.bounds.min[1]).toBeLessThanOrEqual(0);
    }
  });
});
