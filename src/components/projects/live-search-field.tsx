"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { controlClass } from "@/components/ui/field";
import { SEARCH_CLEAR_EVENT } from "./search-events";
import { cn } from "@/lib/cn";
import { ui } from "@/i18n/pt";

const DEBOUNCE_MS = 180;

/**
 * Campo de pesquisa que escreve no URL (a fonte de verdade partilhada com o servidor).
 *
 * O `<input>` não é controlado por estado React: tem `name="q"` dentro do `form method="get"`,
 * por isso funciona sem JavaScript e o valor visível é sempre o do DOM — o que elimina o
 * espelhamento "URL → estado → input" (fonte dupla e render em cascata). A sincronização só
 * acontece nos dois casos em que o URL muda sem digitação: navegação por histórico (`popstate`)
 * e pedido explícito de limpeza, ouvido como evento do documento.
 */
export function LiveSearchField({
  label,
  placeholder,
}: {
  readonly label: string;
  readonly placeholder: string;
}): ReactNode {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hasValue, setHasValue] = useState((searchParams.get("q") ?? "").length > 0);

  const commit = useCallback(
    (nextValue: string): void => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextValue.trim().length === 0) {
        params.delete("q");
      } else {
        params.set("q", nextValue);
      }
      const query = params.toString();
      router.replace(query.length > 0 ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  function onInput(nextValue: string): void {
    setHasValue(nextValue.length > 0);
    if (timer.current) {
      clearTimeout(timer.current);
    }
    // Debounce: uma tecla não pode disparar um render de servidor por vez.
    timer.current = setTimeout(() => commit(nextValue), DEBOUNCE_MS);
  }

  useEffect(() => {
    const readFromLocation = () => {
      const value = new URLSearchParams(window.location.search).get("q") ?? "";
      if (inputRef.current !== null) {
        inputRef.current.value = value;
      }
      setHasValue(value.length > 0);
    };
    const clearField = () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      if (inputRef.current !== null) {
        inputRef.current.value = "";
      }
      setHasValue(false);
    };

    window.addEventListener("popstate", readFromLocation);
    document.addEventListener(SEARCH_CLEAR_EVENT, clearField);
    const pending = timer;
    return () => {
      window.removeEventListener("popstate", readFromLocation);
      document.removeEventListener(SEARCH_CLEAR_EVENT, clearField);
      if (pending.current) {
        clearTimeout(pending.current);
      }
    };
  }, []);

  return (
    <div className="relative grid flex-1 gap-1.5">
      <label htmlFor="project-search" className="text-xs font-medium text-ink-secondary">
        {label}
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
        />
        <input
          ref={inputRef}
          id="project-search"
          name="q"
          type="search"
          defaultValue={searchParams.get("q") ?? ""}
          onInput={(event) => onInput(event.currentTarget.value)}
          onKeyDown={(event) => {
            // Esc limpa e escreve o URL de imediato: o campo e o resultado voltam a coincidir.
            if (event.key === "Escape") {
              event.preventDefault();
              if (timer.current) {
                clearTimeout(timer.current);
              }
              event.currentTarget.value = "";
              setHasValue(false);
              commit("");
              inputRef.current?.focus();
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          aria-describedby="project-search-help"
          className={cn(controlClass, "pl-8", hasValue && "pr-8")}
        />
        {hasValue ? (
          <button
            type="button"
            onClick={() => {
              if (inputRef.current !== null) {
                inputRef.current.value = "";
              }
              setHasValue(false);
              commit("");
              inputRef.current?.focus();
            }}
            aria-label={ui.actions.clearSearch}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-sm p-1 text-ink-muted transition-colors duration-150 hover:bg-canvas-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        ) : null}
      </div>
      <p id="project-search-help" className="text-2xs text-ink-muted">
        Procura sem distinção de maiúsculas e sem acentos; cada termo tem de aparecer nalgum campo do projeto.
      </p>
    </div>
  );
}
