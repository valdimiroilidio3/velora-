import { PlanDrawing } from "@/components/projects/plan-drawing";
import { ui } from "@/i18n/pt";
import type { Massing } from "@/demo/massing";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export interface SceneFallbackProps {
  readonly massing: Massing;
  readonly projectName: string;
  readonly className?: string;
  /** Motivo técnico mostrado ao utilizador (WebGL indisponível, contexto perdido…). */
  readonly reason?: string;
}

const kindLabel: Record<Massing["levels"][number]["kind"], string> = {
  podium: "Pódio",
  typical: "Piso típico",
  setback: "Recuado",
};

/**
 * Alternativa não WebGL à cena 3D: a mesma informação, sem GPU.
 *
 * Planta desenhada a partir da projeção partilhada + tabela de pisos. Existe porque o
 * critério de aceitação pede alternativa visual e não-visual — não é um estado de erro,
 * é uma vista legítima (e é o que aparece em impressão e leitores de ecrã).
 */
export function SceneFallback({ massing, projectName, className, reason }: SceneFallbackProps): ReactNode {
  const rows = massing.levels.map((level) => ({
    index: level.index,
    kind: level.kind,
    elevation: level.elevationM,
    height: level.heightM,
    volumes: level.boxes.length,
    footprint: level.boxes.reduce((total, box) => total + box.widthM * box.depthM, 0),
  }));
  const collapsed: {
    kind: Massing["levels"][number]["kind"];
    floors: number[];
    heightM: number;
    volumes: number;
    maxFootprint: number;
  }[] = [];
  for (const row of rows) {
    const last = collapsed.at(-1);
    if (last !== undefined && last.kind === row.kind) {
      last.floors.push(row.index + 1);
      last.heightM += row.height;
      last.maxFootprint = Math.max(last.maxFootprint, row.footprint);
      continue;
    }
    collapsed.push({
      kind: row.kind,
      floors: [row.index + 1],
      heightM: row.height,
      volumes: row.volumes,
      maxFootprint: row.footprint,
    });
  }

  return (
    <div className={cn("grid gap-4", className)}>
      {reason ? (
        <p className="rounded-md border border-line bg-canvas-sunken/70 px-3 py-2 text-xs text-ink-muted">
          {reason}
        </p>
      ) : null}

      <div className="grid gap-2">
        <figure className="aspect-[4/3] w-full rounded-md border border-line bg-canvas-sunken p-1 sm:aspect-[16/10]">
          <PlanDrawing
            massing={massing}
            role="figure"
            label={`Planta esquemática do piso ${collapsed.at(-1)?.floors.at(-1) ?? 1} de ${projectName}`}
            className="rounded-[3px] bg-surface"
          />
        </figure>
        <figcaption className="text-2xs text-ink-muted">
          Planta esquemática gerada a partir dos dados de demonstração — não é uma planta de execução.
        </figcaption>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-3 py-2">
          <h3 className="text-sm font-semibold">{ui.scene.levelsHeading}</h3>
          <p className="tabular text-2xs text-ink-muted">
            {rows.length} pisos · {massing.totalHeightM.toFixed(1)} m de altura
          </p>
        </div>
        <table className="w-full text-left text-xs">
          <caption className="px-3 pt-2 text-left text-2xs text-ink-muted">
            Composição vertical do volume por grupo de pisos.
          </caption>
          <thead className="text-2xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th scope="col" className="px-3 py-1.5 font-medium">
                Pisos
              </th>
              <th scope="col" className="px-3 py-1.5 font-medium">
                Tipo
              </th>
              <th scope="col" className="px-3 py-1.5 text-right font-medium">
                Pé-direito
              </th>
              <th scope="col" className="px-3 py-1.5 text-right font-medium">
                Área bruta
              </th>
            </tr>
          </thead>
          <tbody>
            {collapsed.map((group) => (
              <tr key={`${group.kind}-${group.floors[0]}`} className="border-t border-line/70">
                <th scope="row" className="px-3 py-1.5 text-left font-normal tabular">
                  {group.floors.length === 1
                    ? `Piso ${group.floors[0]}`
                    : `Pisos ${group.floors[0]}–${group.floors.at(-1)}`}
                </th>
                <td className="px-3 py-1.5 text-ink-secondary">{kindLabel[group.kind]}</td>
                <td className="px-3 py-1.5 text-right tabular">{group.heightM.toFixed(1)} m</td>
                <td className="px-3 py-1.5 text-right tabular">{group.maxFootprint.toFixed(0)} m²</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
