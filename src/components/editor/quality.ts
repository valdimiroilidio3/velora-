import type { QualityTier } from "@/three/engine/viewport";
import type { SceneQuality } from "@/lib/preferences";

/**
 * Ponte entre a preferência guardada (`sceneQuality`) e o que o motor percebe.
 *
 * Não há uma qualidade "do editor" separada da preferência da aplicação: dois controlos para a
 * mesma definição é a forma mais rápida de o estado divergir do ecrã.
 */
export function tierFor(quality: SceneQuality, constrained: boolean): QualityTier {
  if (quality === "detailed") {
    return constrained ? "equilibrada" : "alta";
  }
  if (quality === "balanced") {
    return constrained ? "leve" : "equilibrada";
  }
  return constrained ? "leve" : "equilibrada";
}

export const QUALITY_CONTROL: readonly { value: SceneQuality; label: string; description: string }[] = [
  { value: "auto", label: "Automática", description: "Resolve pelo dispositivo; sombra só quando há folga." },
  { value: "balanced", label: "Equilibrada", description: "Sombra suave, resolução limitada a 1,5×." },
  { value: "detailed", label: "Detalhada", description: "Sombras a 2048 px e 2× de resolução." },
];
