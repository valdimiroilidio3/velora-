import { describe, expect, it, vi } from "vitest";
import { createStatsHub } from "./stats-hub";

const sample = {
  fps: 58,
  frameMs: 17.2,
  calls: 9,
  triangles: 480,
  geometries: 12,
  meshes: 24,
  drawnFrames: 3,
};

describe("hub de estatísticas", () => {
  it("começa vazio, porque zero não é uma medição", () => {
    expect(createStatsHub().getSnapshot()).toBeNull();
  });

  it("partilha o mesmo objeto com todos os leitores", () => {
    const hub = createStatsHub();
    hub.push(sample);
    expect(hub.getSnapshot()).toBe(sample);
  });

  it("notifica só quando há número novo", () => {
    const hub = createStatsHub();
    const listener = vi.fn();
    const unsubscribe = hub.subscribe(listener);
    hub.clear(); // já estava vazio: não há nada para anunciar
    expect(listener).not.toHaveBeenCalled();
    hub.push(sample);
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
    hub.push({ ...sample, fps: 30 });
    expect(listener).toHaveBeenCalledOnce();
    hub.clear();
    expect(hub.getSnapshot()).toBeNull();
  });
});
