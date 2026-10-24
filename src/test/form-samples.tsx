import { controlClass, Field } from "@/components/ui/field";
import type { ReactNode } from "react";

/**
 * Amostras de teste: os primitivos de formulário vivem de composição (render-prop +
 * `controlClass`), por isso o que se testa é a composição, não o ficheiro do componente.
 * Não são exportados por nenhuma rota e ficam fora do bundle de produção.
 */

export function FieldSample({ error }: { readonly error?: string }): ReactNode {
  return (
    <Field
      id="campo-nome"
      label="Nome do empreendimento"
      hint="Como vai aparecer na apresentação pública."
      error={error}
    >
      {(attributes) => <input {...attributes} defaultValue="Marés do Casal" className="rounded-md" />}
    </Field>
  );
}

export function ControlFieldSample(): ReactNode {
  return (
    <Field id="campo-pesquisa" label="Pesquisa" optional>
      {(attributes) => (
        <input {...attributes} name="q" placeholder="tenta escrever" className={controlClass} />
      )}
    </Field>
  );
}
