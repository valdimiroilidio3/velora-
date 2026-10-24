"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { ui } from "@/i18n/pt";

export default function AppError({
  error,
  reset,
}: {
  readonly error: Error & { readonly digest?: string };
  readonly reset: () => void;
}): ReactNode {
  // Sem serviço de erros: a mensagem vai para a consola do browser e para o registo do
  // servidor (Next já imprime o `digest`). Ligar um Sentry/Datadog é decisão de Fase 1.
  useEffect(() => {
    console.error("[velora] fronteira de erro:", error.message, error.digest ?? "");
  }, [error]);

  const message = error.message.length > 0 ? error.message : "Falha inesperada na renderização.";

  return (
    <div className="mx-auto grid w-full max-w-prose gap-5 py-10">
      <div className="grid gap-2">
        <p className="text-2xs uppercase tracking-[0.18em] text-ink-muted">Erro de render</p>
        <h1 className="font-display text-3xl leading-tight">Esta secção não conseguiu mostrar-se.</h1>
        <p className="text-sm text-ink-muted">
          Podes tentar de novo: a ação não grava nem envia nada, porque a aplicação não tem persistência nesta
          fase.
        </p>
      </div>

      <Alert tone="danger" title="O que aconteceu">
        <p className="tabular break-words">{message}</p>
        {error.digest ? <p className="mt-1 text-2xs">Digesto do servidor: {error.digest}</p> : null}
      </Alert>

      <div className="flex flex-wrap gap-2.5">
        <button type="button" onClick={reset} className={buttonClass("primary", "md")}>
          Tentar de novo
        </button>
        <Link href="/app" className={buttonClass("secondary", "md")}>
          {ui.actions.back} à visão geral
        </Link>
      </div>
    </div>
  );
}
