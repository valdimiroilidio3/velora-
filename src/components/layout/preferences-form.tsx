"use client";

import { RotateCcw } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/field";
import { RadioCards } from "@/components/ui/radio-cards";
import { StatusPill } from "@/components/ui/status-pill";
import { ui } from "@/i18n/pt";
import { PREFERENCES_STORAGE_KEY, type Preferences } from "@/lib/preferences";
import { usePreferences } from "@/lib/preferences-store";
import { useToast } from "@/components/ui/toast";

const GROUPS: readonly {
  key: keyof Preferences;
  legend: string;
  hint: string;
  options: readonly { value: string; label: string; description: string }[];
  columns?: 2 | 3;
}[] = [
  {
    key: "theme",
    legend: "Tema",
    hint: "Aplicado antes da primeira pintura; “Sistema” segue a definição do sistema operativo.",
    columns: 3,
    options: [
      { value: "system", label: "Sistema", description: "claro ou escuro conforme o dispositivo" },
      { value: "light", label: "Claro", description: "papel quente, tinta fria" },
      { value: "dark", label: "Escuro", description: "mesmos contrastes, superfícies invertidas" },
    ],
  },
  {
    key: "density",
    legend: "Densidade",
    hint: "Reduz o espaçamento dos blocos de conteúdo; não altera tamanho de letra nem alvos de toque.",
    columns: 2,
    options: [
      { value: "comfortable", label: "Confortável", description: "ritmo editorial, mais respiração" },
      { value: "compact", label: "Compacta", description: "mais linhas visíveis por ecrã" },
    ],
  },
  {
    key: "motion",
    legend: "Movimento",
    hint: "Transições curtas de 120–320 ms. “Reduzido” remove animação de skeleton, órbita e amortecimento.",
    columns: 2,
    options: [
      { value: "system", label: "Sistema", description: "respeita prefers-reduced-motion" },
      { value: "reduced", label: "Reduzido", description: "sem animações, estados imediatos" },
    ],
  },
  {
    key: "sceneQuality",
    legend: "Qualidade da cena 3D",
    hint: "Só afeta a área WebGL: define limite de pixel ratio e antialiasing.",
    columns: 3,
    options: [
      { value: "auto", label: "Automática", description: "reduz em telemóvel e CPUs modestas" },
      { value: "detailed", label: "Detalhada", description: "antialiasing e pixel ratio até 2×" },
      { value: "balanced", label: "Equilibrada", description: "pixel ratio limitado a 1,25×" },
    ],
  },
] as const;

/**
 * Formulário de preferências visuais. Sem submissão: cada escolha é aplicada e persistida
 * no `localStorage` no momento em que é feita (chave `velora.preferences.v1`), porque não
 * existe conta onde gravá-las.
 */
export function PreferencesForm(): ReactNode {
  const { preferences, set, reset } = usePreferences();
  const { notify } = useToast();
  const [sample, setSample] = useState("");

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        {GROUPS.map((group) => (
          <RadioCards
            key={group.key}
            name={`preferencia-${group.key}`}
            legend={group.legend}
            hint={group.hint}
            columns={group.columns ?? 3}
            value={String(preferences[group.key])}
            options={group.options.map((option) => ({
              value: option.value,
              label: option.label,
              description: option.description,
            }))}
            onChange={(value) => {
              set(group.key, value as Preferences[typeof group.key]);
              notify(ui.feedback.preferencesSaved, "success");
            }}
          />
        ))}
      </div>

      <section aria-labelledby="amostra" className="surface-card grid gap-4 p-4 sm:p-5">
        <h2 id="amostra" className="text-sm font-semibold">
          Prévia dos estados
        </h2>
        <p className="max-w-[60ch] text-xs text-ink-muted">
          O mesmo bloco aparece em toda a aplicação: é a prova de que a escolha alterou os tokens e não só a
          etiqueta selecionada.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid content-start gap-2.5 rounded-md border border-line bg-canvas-sunken/50 p-3">
            <p className="label-caps text-ink-muted">Controlos</p>
            <div className="flex flex-wrap gap-2">
              <Button size="md">Primário</Button>
              <Button variant="secondary" size="md">
                Secundário
              </Button>
              <Button variant="quiet" size="md">
                Quaternário
              </Button>
              <Button variant="danger" size="md">
                Perigo
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone="success">Publicado</StatusPill>
              <StatusPill tone="warning">Em revisão</StatusPill>
              <StatusPill tone="neutral">Rascunho</StatusPill>
              <StatusPill tone="danger">Arquivado</StatusPill>
            </div>
          </div>

          <div className="grid content-start gap-2.5 rounded-md border border-line bg-canvas-sunken/50 p-3">
            <p className="label-caps text-ink-muted">Campo de texto</p>
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-ink-secondary">Pesquisa de demonstração</span>
              <input
                value={sample}
                onChange={(event) => setSample(event.target.value)}
                placeholder="tenta escrever aqui"
                className={controlClass}
              />
            </label>
            <div className="mt-1 grid gap-1">
              <div className="skeleton h-3 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <p className="text-2xs text-ink-muted">
            Guardado apenas neste navegador em <code className="font-mono">{PREFERENCES_STORAGE_KEY}</code>.
            Sem sincronização entre dispositivos — isso depende da conta que ainda não existe.
          </p>
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<RotateCcw />}
            onClick={() => {
              reset();
              notify(ui.feedback.preferencesReset, "info");
            }}
          >
            {ui.actions.reset}
          </Button>
        </div>
      </section>
    </div>
  );
}
