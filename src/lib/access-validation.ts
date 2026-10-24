/**
 * Validação do formulário de acesso — separada do JSX de propósito.
 *
 * A autenticação real não existe nesta fase; o que existe é a validação de cliente que a
 * Fase 1 vai reaproveitar (mesmas regras, mesmo contrato de erros por campo). Vive fora do
 * componente para ser testável sem DOM.
 */

export interface AccessFormValues {
  readonly email: string;
  readonly password: string;
}

export type AccessFormErrors = Partial<Record<"email" | "password", string>>;

export const MIN_PASSWORD_LENGTH = 8;

/** Não é um veredicto de segurança: só confirma forma. Não tentamos adivinhar servidores de e-mail. */
export function isEmailShape(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 254) {
    return false;
  }
  const [local, domain, ...rest] = trimmed.split("@");
  if (rest.length > 0 || local === undefined || domain === undefined) {
    return false;
  }
  if (local.length === 0 || local.length > 64) {
    return false;
  }
  // Domínio: rótulos separados por ponto, só [a-z0-9-], com TLD alfabético de 2+ caracteres.
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i.test(domain)) {
    return false;
  }
  return /^[^\s"@]+$/.test(local);
}

export function validateAccessForm(values: AccessFormValues): AccessFormErrors {
  const errors: AccessFormErrors = {};

  if (values.email.trim().length === 0) {
    errors.email = "Indica o e-mail da conta.";
  } else if (!isEmailShape(values.email)) {
    errors.email = "Este endereço não tem a forma esperada (nome@dominio.pt).";
  }

  if (values.password.length === 0) {
    errors.password = "A palavra-passe não pode ficar vazia.";
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Demasiado curta: usa pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  return errors;
}

export const accessFormInitialValues: AccessFormValues = { email: "", password: "" };
