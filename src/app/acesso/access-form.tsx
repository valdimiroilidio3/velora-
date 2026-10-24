"use client";

import Link from "next/link";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, controlClass } from "@/components/ui/field";
import {
  accessFormInitialValues,
  MIN_PASSWORD_LENGTH,
  validateAccessForm,
  type AccessFormErrors,
  type AccessFormValues,
} from "@/lib/access-validation";
import { ui } from "@/i18n/pt";

const FIELD_ORDER = ["email", "password"] as const;

/**
 * Formulário de acesso de demonstração.
 *
 * Valida no cliente, mostra erros por campo e resume-os numa região anunciada. Não envia
 * nada a lado nenhum: não existe endpoint, sessão, cookie ou token. O estado depois do
 * submit é a explicação disso mesmo — não um login fingido.
 */
export function AccessForm(): ReactNode {
  const [values, setValues] = useState<AccessFormValues>(accessFormInitialValues);
  const [errors, setErrors] = useState<AccessFormErrors>({});
  const [touched, setTouched] = useState(false);
  const [reveal, setReveal] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const errorCount = Object.keys(errors).length;

  function update<K extends keyof AccessFormValues>(key: K, value: AccessFormValues[K]): void {
    const next = { ...values, [key]: value };
    setValues(next);
    // Depois do primeiro envio, revalidamos a cada tecla: o utilizador corrige e vê o erro sumir.
    if (touched) {
      setErrors(validateAccessForm(next));
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const nextErrors = validateAccessForm(values);
    setErrors(nextErrors);
    setTouched(true);
    if (Object.keys(nextErrors).length > 0) {
      const first = FIELD_ORDER.find((key) => nextErrors[key] !== undefined);
      if (first !== undefined) {
        formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      }
      return;
    }
    formRef.current?.querySelector<HTMLElement>("[data-valid-state]")?.focus();
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="grid gap-5">
      <div className="surface-card grid gap-5 p-5 sm:p-6">
        <Field
          id="access-email"
          label="E-mail"
          hint="Nunca sai do navegador: não há pedido de rede nem conta criada."
          error={errors.email}
        >
          {(attributes) => (
            <input
              {...attributes}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              value={values.email}
              onChange={(event) => update("email", event.target.value)}
              placeholder="nome@promotora.pt"
              className={controlClass}
            />
          )}
        </Field>

        <Field
          id="access-password"
          label="Palavra-passe"
          hint={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres. Nenhum valor é guardado.`}
          error={errors.password}
        >
          {(attributes) => (
            <div className="relative">
              <input
                {...attributes}
                name="password"
                type={reveal ? "text" : "password"}
                autoComplete="current-password"
                value={values.password}
                onChange={(event) => update("password", event.target.value)}
                placeholder="••••••••"
                className={`${controlClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setReveal((current) => !current)}
                aria-pressed={reveal}
                aria-label={reveal ? "Esconder a palavra-passe" : "Mostrar a palavra-passe"}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-ink-muted transition-colors duration-150 hover:bg-canvas-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
              >
                {reveal ? (
                  <EyeOff aria-hidden="true" className="size-4" />
                ) : (
                  <Eye aria-hidden="true" className="size-4" />
                )}
              </button>
            </div>
          )}
        </Field>

        {touched && errorCount > 0 ? (
          <Alert tone="danger" title={ui.forms.errorSummary(errorCount)}>
            <Link
              href="#access-email"
              onClick={(event) => {
                event.preventDefault();
                const first = FIELD_ORDER.find((key) => errors[key] !== undefined);
                if (first !== undefined) {
                  formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
                }
              }}
              className="rounded-sm text-ink underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Corrigir o primeiro campo
            </Link>
          </Alert>
        ) : null}

        <Button type="submit" size="lg" fullWidth leadingIcon={<LockKeyhole />}>
          {ui.actions.submit}
        </Button>
      </div>

      {touched && errorCount === 0 ? (
        <div
          data-valid-state
          tabIndex={-1}
          className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <Alert tone="info" title="Validado — e parado aqui de propósito">
            <div className="grid gap-3">
              <p>
                As credenciais têm um formato aceitável, mas <strong>não existe autenticação</strong>: sem
                endpoint, sem sessão, sem cookie. Ligar este formulário a um provider real é trabalho da Fase
                1 (ver <code className="font-mono text-2xs">docs/SECURITY.md</code> §Autenticação).
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/app" className={buttonClass("primary", "sm")}>
                  Abrir a aplicação sem sessão
                </Link>
                <Link href="/app/preferencias" className={buttonClass("secondary", "sm")}>
                  Ajustar preferências visuais
                </Link>
              </div>
            </div>
          </Alert>
        </div>
      ) : null}
    </form>
  );
}
