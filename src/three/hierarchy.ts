import {
  categoryLabels,
  ELEMENT_CATEGORIES,
  type ElementCategory,
  type SceneDocument,
  type SceneElement,
} from "./model";

/**
 * Árvore de navegação da cena: Projeto → Edifício → Pisos → Categorias → Elementos.
 *
 * É derivada do documento em cada alteração (nunca um estado paralelo): é isso que permite que a
 * seleção da árvore e a do viewport sejam **a mesma coisa** — ambas operam sobre `selectedId`.
 */

export type TreeNodeKind = "project" | "building" | "level" | "category" | "element";

export interface TreeNode {
  readonly id: string;
  readonly label: string;
  readonly kind: TreeNodeKind;
  /** Presente em `level` e `category`: permite "só este piso" e alternar categorias. */
  readonly levelId?: string | undefined;
  readonly category?: ElementCategory | undefined;
  readonly elementId?: string | undefined;
  readonly count: number;
  readonly visibleCount: number;
  readonly children: readonly TreeNode[];
}

function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const bucket = map.get(key(item));
    if (bucket === undefined) {
      map.set(key(item), [item]);
    } else {
      bucket.push(item);
    }
  }
  return map;
}

function elementNode(element: SceneElement): TreeNode {
  return {
    id: `el:${element.id}`,
    label: element.name,
    kind: "element",
    elementId: element.id,
    count: 1,
    visibleCount: element.visible ? 1 : 0,
    children: [],
  };
}

function categoryNode(
  key: string,
  label: string,
  category: ElementCategory,
  elements: readonly SceneElement[],
  levelId?: string,
): TreeNode {
  return {
    id: `${key}:cat:${category}`,
    label,
    kind: "category",
    category,
    levelId,
    count: elements.length,
    visibleCount: elements.filter((element) => element.visible).length,
    children: elements.map(elementNode),
  };
}

export function buildHierarchy(document: SceneDocument): TreeNode {
  const byLevel = groupBy(document.elements, (element) => element.levelId);

  const levelNodes: TreeNode[] = document.levels.map((level) => {
    const elements = byLevel.get(level.id) ?? [];
    const byCategory = groupBy(elements, (element) => element.category);
    const children: TreeNode[] = [];
    for (const category of ELEMENT_CATEGORIES) {
      const items = byCategory.get(category);
      if (items === undefined || items.length === 0) {
        continue;
      }
      children.push(categoryNode(`level:${level.id}`, categoryLabels[category], category, items, level.id));
    }
    return {
      id: `level:${level.id}`,
      label: level.label,
      kind: "level" as const,
      levelId: level.id,
      count: elements.length,
      visibleCount: elements.filter((element) => element.visible).length,
      children,
    };
  });

  const building: TreeNode = {
    id: `building:${document.id}`,
    label: document.name,
    kind: "building",
    count: document.elements.length,
    visibleCount: document.elements.filter((element) => element.visible).length,
    children: levelNodes,
  };

  return {
    id: `project:${document.id}`,
    label: "Projeto de demonstração",
    kind: "project",
    count: document.elements.length,
    visibleCount: building.visibleCount,
    children: [building],
  };
}

export function flattenTree(node: TreeNode, depth = 0): readonly { node: TreeNode; depth: number }[] {
  const out: { node: TreeNode; depth: number }[] = [{ node, depth }];
  for (const child of node.children) {
    out.push(...flattenTree(child, depth + 1));
  }
  return out;
}

export function findNodeById(node: TreeNode, id: string): TreeNode | undefined {
  if (node.id === id) {
    return node;
  }
  for (const child of node.children) {
    const found = findNodeById(child, id);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
}

/** Nó do elemento selecionado, para a árvore saber o que expandir/realçar. */
export function nodeForElement(node: TreeNode, elementId: string | null): TreeNode | undefined {
  if (elementId === null) {
    return undefined;
  }
  return findNodeById(node, `el:${elementId}`);
}

/** Caminhos (ids de nós) a manter expandidos para que a seleção seja visível na árvore. */
export function ancestorsOf(node: TreeNode, elementId: string | null): string[] {
  if (elementId === null) {
    return [];
  }
  const path: string[] = [];
  function walk(current: TreeNode, trail: string[]): boolean {
    if (current.id === `el:${elementId}`) {
      path.push(...trail);
      return true;
    }
    for (const child of current.children) {
      if (walk(child, [...trail, current.id])) {
        return true;
      }
    }
    return false;
  }
  walk(node, []);
  return path;
}
