"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ui } from "@/i18n/pt";
import { useToast } from "@/components/ui/toast";

/**
 * Copia a referência do projeto para a área de transferência.
 *
 * Funcional de verdade (é o critério de aceitação) e não bloqueante: se o navegador recusar
 * a API, mostramos o texto para cópia manual em vez de falhar em silêncio.
 */
export function CopyReferenceButton({ reference }: { readonly reference: string }): ReactNode {
  const { notify } = useToast();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  async function copy(): Promise<void> {
    try {
      if (navigator.clipboard === undefined) {
        throw new Error("Clipboard API indisponível");
      }
      await navigator.clipboard.writeText(reference);
      setFallback(false);
      setCopied(true);
      if (timer.current) {
        clearTimeout(timer.current);
      }
      timer.current = setTimeout(() => setCopied(false), 2_000);
    } catch {
      setFallback(true);
      notify(ui.feedback.copyFailed, "warning");
    }
  }

  return (
    <span className="grid justify-items-start gap-2">
      <Button
        variant="secondary"
        size="md"
        onClick={copy}
        leadingIcon={copied ? <Check /> : <Copy />}
        aria-label={`${ui.actions.copyRef}: ${reference}`}
      >
        {copied ? ui.actions.copyRefDone : ui.actions.copyRef}
      </Button>
      {fallback ? (
        <label className="grid w-full gap-1">
          <span className="text-2xs text-ink-muted">Copia manualmente:</span>
          <input
            readOnly
            value={reference}
            onFocus={(event) => event.currentTarget.select()}
            className="tabular w-full rounded-md border border-line-control bg-canvas-sunken px-2 py-1.5 font-mono text-xs"
          />
        </label>
      ) : null}
    </span>
  );
}
