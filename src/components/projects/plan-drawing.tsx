import { toPlanLevels, type Massing } from "@/demo/massing";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export interface PlanDrawingProps {
  readonly massing: Massing;
  readonly levelIndex?: number;
  /** `decorative` = sem semântica própria (acompanha texto); `figure` = tem descrição. */
  readonly role?: "decorative" | "figure";
  readonly label?: string;
  readonly className?: string;
}

/**
 * Planta esquemática desenhada a partir da mesma projeção usada pela cena 3D.
 *
 * Serve três papéis: identidade visual (sem fotografia stock), alternativa quando
 * WebGL não existe, e representação acessível do volume — a informação não vive
 * só no desenho.
 */
export function PlanDrawing({
  massing,
  levelIndex,
  role = "decorative",
  label,
  className,
}: PlanDrawingProps): ReactNode {
  const levels = toPlanLevels(massing);
  const level = levels.at(levelIndex ?? massing.levels.length - 1) ?? levels.at(0);
  if (level === undefined) {
    return null;
  }

  const extent = massing.siteRadiusM;
  const scale = 100 / extent;
  const toX = (value: number) => 100 + value * scale;
  const toY = (value: number) => 100 + value * scale;

  return (
    <svg
      viewBox="0 0 200 200"
      className={cn("h-full w-full", className)}
      role={role === "figure" ? "img" : undefined}
      aria-label={role === "figure" ? label : undefined}
      aria-hidden={role === "decorative" ? true : undefined}
      data-level={level.index}
    >
      <g transform={`rotate(${massing.orientationDeg} 100 100)`}>
        {/* malha de desenho */}
        <g stroke="var(--line)" strokeWidth="0.35" opacity="0.75">
          {Array.from({ length: 9 }, (_, index) => {
            const position = 12.5 * (index + 1) - 12.5;
            return (
              <g key={index}>
                <line x1={position} y1="0" x2={position} y2="200" />
                <line x1="0" y1={position} x2="200" y2={position} />
              </g>
            );
          })}
        </g>

        {/* limite do lote */}
        <circle
          cx="100"
          cy="100"
          r={extent * scale * 0.86}
          fill="none"
          stroke="var(--line-strong)"
          strokeWidth="0.6"
          strokeDasharray="3 2.5"
        />

        {/* pisos inferiores, esbatidos, para dar noção de empilhamento */}
        {levels
          .filter((item) => item.index < level.index)
          .map((item) => (
            <g key={`ghost-${item.index}`} opacity={0.14 + 0.05 * item.index}>
              {item.rects.map((rect) => (
                <rect
                  key={rect.key}
                  x={toX(rect.x)}
                  y={toY(rect.y)}
                  width={rect.width * scale}
                  height={rect.depth * scale}
                  fill="var(--ink-faint)"
                />
              ))}
            </g>
          ))}

        {/* piso ativo */}
        {level.rects.map((rect) => {
          const width = rect.width * scale;
          const depth = rect.depth * scale;
          const x = toX(rect.x);
          const y = toY(rect.y);
          const divisions = Math.max(1, Math.min(rect.bays, 8));
          return (
            <g key={rect.key}>
              <rect
                x={x}
                y={y}
                width={width}
                height={depth}
                fill="var(--surface)"
                stroke="var(--ink)"
                strokeWidth="0.9"
              />
              {/* modulação de vãos */}
              <g stroke="var(--ink-muted)" strokeWidth="0.45">
                {Array.from({ length: divisions - 1 }, (_, index) => {
                  const horizontal = width >= depth;
                  const offset = ((index + 1) * (horizontal ? width : depth)) / divisions;
                  return horizontal ? (
                    <line key={index} x1={x + offset} y1={y + 2} x2={x + offset} y2={y + depth - 2} />
                  ) : (
                    <line key={index} x1={x + 2} y1={y + offset} x2={x + width - 2} y2={y + offset} />
                  );
                })}
              </g>
            </g>
          );
        })}

        {/* norte */}
        <g transform="translate(188 14)">
          <line x1="0" y1="8" x2="0" y2="-4" stroke="var(--ink-secondary)" strokeWidth="0.8" />
          <path d="M0 -7 L2.4 -2.4 L-2.4 -2.4 Z" fill="var(--ink-secondary)" />
        </g>
      </g>
    </svg>
  );
}
