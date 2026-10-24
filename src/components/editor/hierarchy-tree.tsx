"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react";
import { buildHierarchy, type TreeNode } from "@/three/hierarchy";
import { categoryLabels, type SceneDocument } from "@/three/model";
import { ui } from "@/i18n/pt";
import { cn } from "@/lib/cn";
import type { EditorStore } from "./editor-store";

/**
 * Árvore do modelo: Projeto → Edifício → Pisos → Categorias → Elementos.
 *
 * Não há aqui estado de visibilidade próprio: o documento é a fonte. Alternar o olho escreve no
 * documento (`setCategoryVisibility`) e o resto — árvore, painel, palco — reage à mesma fonte.
 *
 * Limite de 40 elementos por categoria: uma lista com 300 `treeitem` é inutilizável para um leitor
 * de ecrã e custa mais do que vale. O aviso diz o que ficou de fora, em vez de calar.
 */

const ELEMENT_LIMIT = 40;

export interface HierarchyTreeProps {
  readonly document: SceneDocument;
  readonly selection: readonly string[];
  readonly store: EditorStore;
}

export function HierarchyTree({ document, selection, store }: HierarchyTreeProps): ReactNode {
  const root = buildHierarchy(document);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set<string>());
  const selected = new Set(selection);

  const toggle = (id: string): void => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  function renderNode(node: TreeNode, level: number): ReactNode {
    const open = !collapsed.has(node.id);
    const hasChildren = node.children.length > 0;
    const isElement = node.kind === "element";
    const isSelected = isElement && selected.has(node.elementId ?? "");
    const hidden = node.visibleCount === 0 && node.count > 0;

    return (
      <li
        key={node.id}
        role="treeitem"
        aria-level={level}
        aria-selected={isSelected}
        {...(hasChildren && !isElement ? { "aria-expanded": open } : {})}
        aria-label={`${node.label}${node.count > 0 ? ` — ${String(node.visibleCount)} de ${String(node.count)} visíveis` : ""}`}
      >
        <div
          className={cn(
            "flex items-center gap-1 rounded-md py-0.5 pr-1",
            "focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-focus",
            isSelected && "bg-accent-soft",
          )}
          style={{ paddingLeft: `${Math.max(0, level - 1) * 0.75}rem` }}
        >
          {hasChildren && !isElement ? (
            <button
              type="button"
              className="rounded p-0.5 text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
              aria-label={`${open ? ui.editor.tree.collapse : ui.editor.tree.expand}: ${node.label}`}
              onClick={() => toggle(node.id)}
            >
              {open ? (
                <ChevronDown aria-hidden="true" className="size-3.5" />
              ) : (
                <ChevronRight aria-hidden="true" className="size-3.5" />
              )}
            </button>
          ) : (
            <span aria-hidden="true" className="w-[1.125rem]" />
          )}

          <button
            type="button"
            className={cn(
              "flex min-w-0 flex-1 items-baseline gap-2 rounded px-1 py-0.5 text-left text-xs",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus",
              isElement ? "text-ink-secondary" : "text-ink",
              isSelected && "font-medium text-ink",
              hidden && "opacity-55",
            )}
            aria-pressed={isElement ? isSelected : undefined}
            onClick={() => {
              if (isElement) {
                store.select(node.elementId ?? null, false);
                return;
              }
              // Abrir/fechar ao clicar no rótulo: um nível fechado não deve ser um beco sem saída.
              if (hasChildren) {
                toggle(node.id);
              }
            }}
          >
            <span className="truncate">{node.label}</span>
            {node.count > 0 ? (
              <span className="shrink-0 text-2xs tabular text-ink-muted">
                {String(node.visibleCount)}/{String(node.count)}
              </span>
            ) : null}
            {node.kind === "category" ? (
              <span className="shrink-0 text-2xs text-ink-muted">
                {categoryLabels[node.category ?? "wall"]}
              </span>
            ) : null}
          </button>

          {node.category !== undefined ? (
            <button
              type="button"
              className="rounded p-1 text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
              aria-label={`${node.visibleCount > 0 ? ui.editor.tree.hide : ui.editor.tree.show}: ${node.label}`}
              onClick={() => {
                const category = node.category;
                if (category !== undefined) {
                  store.setCategoryVisibility(category, node.visibleCount === 0);
                }
              }}
            >
              {node.visibleCount > 0 ? (
                <Eye aria-hidden="true" className="size-3.5" />
              ) : (
                <EyeOff aria-hidden="true" className="size-3.5" />
              )}
            </button>
          ) : null}

          {isElement ? (
            <button
              type="button"
              className="rounded p-1 text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
              aria-label={`${isHidden(node) ? ui.editor.tree.showElement : ui.editor.tree.hideElement}: ${node.label}`}
              onClick={() => {
                const elementId = node.elementId;
                if (elementId !== undefined) {
                  store.setElementVisibility(elementId, isHidden(node));
                }
              }}
            >
              {isHidden(node) ? (
                <EyeOff aria-hidden="true" className="size-3.5" />
              ) : (
                <Eye aria-hidden="true" className="size-3.5" />
              )}
            </button>
          ) : null}
        </div>

        {hasChildren && open ? (
          <ul role="group">
            {node.children.slice(0, ELEMENT_LIMIT).map((child) => renderNode(child, level + 1))}
            {node.children.length > ELEMENT_LIMIT ? (
              <li role="presentation" className="px-2 py-1 text-2xs text-ink-muted">
                {ui.editor.tree.truncated(node.children.length - ELEMENT_LIMIT)}
              </li>
            ) : null}
          </ul>
        ) : null}
      </li>
    );
  }

  return (
    <div className="surface-card grid gap-2 p-3">
      <h2 className="text-2xs uppercase tracking-wide text-ink-muted">{ui.editor.hierarchyLabel}</h2>
      <ul
        role="tree"
        aria-label={ui.editor.hierarchyLabel}
        className="max-h-[46vh] overflow-y-auto no-scrollbar lg:max-h-[calc(100vh-19rem)]"
      >
        {renderNode(root, 1)}
      </ul>
    </div>
  );
}

/** O rótulo do nó não diz se está oculto; o `visibleCount` sim — é a única fonte. */
function isHidden(node: TreeNode): boolean {
  return node.count > 0 && node.visibleCount === 0;
}
