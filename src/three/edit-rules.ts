import type { ElementCategory, SceneElement, Transform } from "./model";
import { mm } from "./units";

/**
 * Regras de edição por categoria — a resposta curta a "o que é que este seletor pode fazer".
 *
 * Estão separadas do renderer de propósito: o viewport usa-as para mostrar/ocultar ferramentas,
 * o documento usa-as para **validar** qualquer escrita (mesmo uma chamada de teste), e a revisão
 * consegue ler as restrições num único ficheiro. A regra mais importante é a das paredes de
 * fachada estruturais: podem mover-se e rodar, mas **não podem ser escaladas** — esticar um
 * elemento estrutural sem regra construtiva é exatamente o tipo de edições que um modelo
 * volumétrico não deve permitir.
 */

export type MoveMode = "none" | "planar" | "vertical" | "free";
export type ScaleMode = "none" | "uniform" | "thickness";

export interface EditRule {
  readonly move: MoveMode;
  readonly rotate: boolean;
  readonly scale: ScaleMode;
  /** Passo de arrasto, em metros (0 = contínuo). Snap em 10 cm para elementos correntes. */
  readonly snapM: number;
  /** Passo de rotação em graus. */
  readonly snapDeg: number;
  readonly reason: string;
}

const RULES: Readonly<Record<ElementCategory, EditRule>> = {
  terrain: {
    move: "none",
    rotate: false,
    scale: "none",
    snapM: 0,
    snapDeg: 0,
    reason: "O plano de referência é fixo: é dele que partem todas as cotas.",
  },
  platform: {
    move: "none",
    rotate: false,
    scale: "none",
    snapM: 0,
    snapDeg: 0,
    reason: "A implantação pertence ao desenho do lote, não ao editor de maquete.",
  },
  slab: {
    move: "vertical",
    rotate: false,
    scale: "thickness",
    snapM: 0.05,
    snapDeg: 0,
    reason:
      "Lajes deslocam-se no eixo vertical e alteram a sua espessura; a geometria em planta vem do projeto.",
  },
  wall: {
    move: "planar",
    rotate: true,
    scale: "none",
    snapM: 0.1,
    snapDeg: 5,
    reason:
      "Parede de fachada: move-se em planta e roda, mas nunca é escalada sem regra estrutural explícita.",
  },
  partition: {
    move: "planar",
    rotate: true,
    scale: "thickness",
    snapM: 0.05,
    snapDeg: 5,
    reason: "Divisória é separação interior: admite ajustar a espessura.",
  },
  door: {
    move: "planar",
    rotate: false,
    scale: "none",
    snapM: 0.05,
    snapDeg: 0,
    reason: "Um vão segue a parede que o contém; rodá-lo ou escalá-lo separava-o do fecho.",
  },
  window: {
    move: "vertical",
    rotate: false,
    scale: "none",
    snapM: 0.05,
    snapDeg: 0,
    reason: "A janela ajusta a soleira (cota), não a largura do vão.",
  },
  roof: {
    move: "vertical",
    rotate: false,
    scale: "thickness",
    snapM: 0.05,
    snapDeg: 0,
    reason: "A cobertura acompanha a cota do último piso; a projeção pertence à volumetria.",
  },
  circulation: {
    move: "planar",
    rotate: true,
    scale: "none",
    snapM: 0.1,
    snapDeg: 15,
    reason: "O núcleo pode reposicionar-se e rodar; a altura dos degraus é derivada do piso.",
  },
  interior: {
    move: "free",
    rotate: true,
    scale: "uniform",
    snapM: 0.05,
    snapDeg: 15,
    reason: "Mobiliário de ensaio: é o único grupo com liberdade total (e escala uniforme).",
  },
};

export function ruleFor(category: ElementCategory): EditRule {
  return RULES[category];
}

export interface EditPermission {
  readonly allowed: boolean;
  readonly reason?: string | undefined;
}

export function canMove(element: SceneElement): EditPermission {
  const rule = RULES[element.category];
  if (element.locked || rule.move === "none") {
    return { allowed: false, reason: rule.reason };
  }
  return { allowed: true };
}

export function canRotate(element: SceneElement): EditPermission {
  const rule = RULES[element.category];
  if (element.locked || !rule.rotate) {
    return { allowed: false, reason: rule.reason };
  }
  return { allowed: true };
}

export function canScale(element: SceneElement): EditPermission {
  const rule = RULES[element.category];
  if (element.locked || rule.scale === "none") {
    return { allowed: false, reason: rule.reason };
  }
  // Nota: `structural` não é uma proibição genérica — é o que distingue a regra das paredes
  // (escala nenhuma) da regra das lajes (espessura ajustável). Escala *arbitrária* de elemento
  // estrutural continua fora de âmbito: não há `scale: "uniform"` para parede, laje ou cobertura.
  return { allowed: true };
}

/** Ferramentas realmente disponíveis para este elemento (o toolbar só mostra estas). */
export function toolsFor(
  element: SceneElement | undefined,
): readonly ("select" | "move" | "rotate" | "scale")[] {
  if (element === undefined) {
    return ["select"];
  }
  const tools: ("select" | "move" | "rotate" | "scale")[] = ["select"];
  if (canMove(element).allowed) {
    tools.push("move");
  }
  if (canRotate(element).allowed) {
    tools.push("rotate");
  }
  if (canScale(element).allowed) {
    tools.push("scale");
  }
  return tools;
}

function snap(value: number, step: number): number {
  return step > 0 ? mm(Math.round(value / step) * step) : mm(value);
}

export interface TransformRequest {
  readonly position?: Partial<Vec3Like> | undefined;
  readonly rotationYDeg?: number | undefined;
  readonly scale?: Vec3Like | undefined;
}

type Vec3Like = readonly [number?, number?, number?];

function clampAxis(current: number, requested: number | undefined, mode: "allow" | "deny"): number {
  return requested === undefined || mode === "deny" ? current : requested;
}

/**
 * Única porta de escrita para transformações. Devolve o transform já validado pelas regras e
 * diz o que foi recusado, para a interface o poder mostrar em vez de fingir que aplicou.
 */
export function resolveTransform(
  element: SceneElement,
  request: TransformRequest,
): { readonly transform: Transform; readonly rejected: readonly string[] } {
  const rule = RULES[element.category];
  const rejected: string[] = [];
  const current = element.transform;
  const move = element.locked ? "none" : rule.move;
  const next = { ...current };

  if (request.position !== undefined) {
    // O pedido traz posição **absoluta** (é o que o gizmo escreve e o que o painel mostra). O
    // `snap` é portanto à grelha do documento, não ao deslocamento: -15,707 m com passo de 0,1 m
    // torna-se -15,7 m, seja qual for o ponto de partida.
    const [requestedX, requestedY, requestedZ] = [
      request.position[0],
      request.position[1],
      request.position[2],
    ];
    const allowXZ = move === "planar" || move === "free";
    const allowY = move === "vertical" || move === "free";
    if (requestedX !== undefined && !allowXZ) {
      rejected.push("X");
    }
    if (requestedZ !== undefined && !allowXZ) {
      rejected.push("Z");
    }
    if (requestedY !== undefined && !allowY) {
      rejected.push("Y");
    }
    const position: [number, number, number] = [
      clampAxis(
        current.position[0],
        requestedX === undefined ? undefined : snap(requestedX, rule.snapM),
        allowXZ ? "allow" : "deny",
      ),
      clampAxis(
        current.position[1],
        requestedY === undefined ? undefined : snap(requestedY, rule.snapM),
        allowY ? "allow" : "deny",
      ),
      clampAxis(
        current.position[2],
        requestedZ === undefined ? undefined : snap(requestedZ, rule.snapM),
        allowXZ ? "allow" : "deny",
      ),
    ];
    next.position = position;
  }

  if (request.rotationYDeg !== undefined) {
    if (!canRotate(element).allowed) {
      rejected.push("rotação");
    } else {
      next.rotationYDeg = snap(request.rotationYDeg, rule.snapDeg);
    }
  }

  if (request.scale !== undefined) {
    const permission = canScale(element);
    if (!permission.allowed) {
      rejected.push("escala");
    } else if (rule.scale === "thickness") {
      // Espessura: só o eixo vertical de uma laje/cobertura, ou o Z de uma parede.
      const isSlab = element.category === "slab" || element.category === "roof";
      next.scale = isSlab
        ? [current.scale[0], request.scale[1] ?? current.scale[1], current.scale[2]]
        : [current.scale[0], current.scale[1], request.scale[2] ?? current.scale[2]];
    } else {
      next.scale = [
        request.scale[0] ?? current.scale[0],
        request.scale[1] ?? current.scale[1],
        request.scale[2] ?? current.scale[2],
      ];
    }
  }

  return { transform: next, rejected };
}

/** Escala admissível no painel de propriedades (para não oferecer um campo que vai ser recusado). */
/**
 * Eixo em que a *espessura* de um elemento se mede. Lajes e coberturas são horizontais (Y);
 * paredes, divisórias e fachadas são verticais (Z, o eixo normal do pano). É a única fonte deste
 * conhecimento: o gizmo pergunta aqui em vez de voltar a listar categorias.
 */
export function thicknessAxisFor(category: ElementCategory): "y" | "z" {
  return category === "slab" || category === "roof" || category === "platform" ? "y" : "z";
}

export function scaleAxes(element: SceneElement): readonly ("x" | "y" | "z")[] {
  const rule = RULES[element.category];
  if (!canScale(element).allowed) {
    return [];
  }
  if (rule.scale === "thickness") {
    return [thicknessAxisFor(element.category)];
  }
  return ["x", "y", "z"];
}
