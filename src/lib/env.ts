import { z } from "zod";

/**
 * Validação de configuração (Fase 0).
 *
 * Contrato:
 * - Este módulo é a única fonte de verdade para variáveis de ambiente.
 * - É de uso reservado ao servidor / testes. Componentes de cliente devem ler
 *   diretamente `process.env.NEXT_PUBLIC_*` (o Next.js substitui esses acessos
 *   em tempo de build; aceder por índice não é inlined).
 * - `parseEnv` é pura: recebe um registo e devolve configuração validada ou lança
 *   `EnvValidationError` com a lista de chaves inválidas — nunca com valores.
 * - A validação é feita em `getServerEnv()` (lazy), para que o build não dependa
 *   de segredos que só existem no ambiente de execução.
 */

/**
 * Valores de exemplo aceites no `.env.example`. Qualquer outra string numa variável
 * sensível é tratada como possível segredo real e faz o gate de configuração falhar.
 */
const placeholders = ["", "***", "changeme", "password", "example", "not-respond@example.invalid"] as const;

const isPlaceholder = (value: string): boolean =>
  placeholders.includes(value as (typeof placeholders)[number]) || value.includes("<");

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    NEXT_PUBLIC_SITE_URL: z
      .url()
      // `z.url()` aceita qualquer esquema válido segundo o parser WHATWG (incl. "localhost:3000",
      // "file:///x"). A origem pública tem de ser http(s). Verificado empiricamente na Fase 0.
      .refine((v) => /^https?:\/\/[^/]+$/.test(v.replace(/\/$/, "")), {
        message: "NEXT_PUBLIC_SITE_URL deve ser uma origem http(s) sem caminho",
      })
      .default("http://localhost:3000"),
    NEXT_PUBLIC_APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
    NEXT_PUBLIC_GIT_SHA: z
      .string()
      .regex(/^[0-9a-f]{7,40}$/)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    NEXT_PUBLIC_BUILD_TIMESTAMP: z
      .string()
      .min(1)
      .optional()
      .or(z.literal("").transform(() => undefined)),

    // Persistência: opcional na Fase 0 (a aplicação não acede a base de dados).
    DATABASE_URL: z
      .string()
      .refine((v) => /^postgresql(ql)?:\/\//.test(v), {
        message: "DATABASE_URL deve ser postgres:// ou postgresql://",
      })
      .optional()
      .or(z.literal("").transform(() => undefined)),
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(5),
    DATABASE_CONNECTION_TIMEOUT_MS: z.coerce.number().int().min(100).max(120_000).default(5_000),

    // Sessão: obrigatória em produção, opcional fora dela.
    AUTH_SECRET: z
      .string()
      .min(32, "AUTH_SECRET deve ter pelo menos 32 caracteres")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    AUTH_URL: z
      .string()
      .min(1)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    SESSION_IDLE_TTL_HOURS: z.coerce
      .number()
      .int()
      .min(1)
      .max(24 * 30)
      .default(12),

    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1_000).max(3_600_000).default(60_000),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).max(100_000).default(100),

    AI_MAX_REQUESTS_PER_MINUTE: z.coerce.number().int().min(0).max(1_000).default(10),
    AI_MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(5_000).default(25),
    AI_PROVIDER: z
      .string()
      .min(1)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    AI_MODEL: z
      .string()
      .min(1)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    AI_API_KEY: z
      .string()
      .min(1)
      .optional()
      .or(z.literal("").transform(() => undefined)),

    NEXT_TELEMETRY_DISABLED: z.enum(["0", "1"]).default("1"),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== "production") {
      return;
    }
    if (!value.AUTH_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["AUTH_SECRET"],
        message: "AUTH_SECRET é obrigatória em produção",
      });
    }
    if (!value.DATABASE_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "DATABASE_URL é obrigatória em produção",
      });
    }
    if (!value.NEXT_PUBLIC_SITE_URL.startsWith("https://")) {
      ctx.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_SITE_URL"],
        message: "NEXT_PUBLIC_SITE_URL deve usar HTTPS em produção",
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;
export const ENV_KEYS = Object.keys(EnvSchema.shape) as Array<keyof Env>;

export class EnvValidationError extends Error {
  readonly issues: ReadonlyArray<{ path: string; message: string }>;

  constructor(issues: ReadonlyArray<{ path: string; message: string }>) {
    const summary = issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ");
    super(`Configuração de ambiente inválida → ${summary}`);
    this.name = "EnvValidationError";
    this.issues = issues;
  }
}

/** Valida um registo arbitrário de variáveis de ambiente. Não regista logs nem exposure de valores. */
export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = EnvSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      path: issue.path.length > 0 ? issue.path.join(".") : "env",
      // A mensagem do Zod pode, em casos raros, conter o input inválido. Remover o texto entre aspas
      // duplas para nunca propagar valores sensíveis para logs ou respostas.
      message: issue.message.replace(/"[^"]*"/g, '"…"'),
    }));
    throw new EnvValidationError(issues);
  }
  return result.data;
}

let cached: Env | undefined;

/**
 * Acesso de servidor à configuração validada (memoizado por processo).
 * Lança EnvValidationError em caso de configuração inválida — o chamador não deve
 * traduzir esse erro em resposta ao cliente (ver docs/SECURITY.md, Erros).
 */
export function getServerEnv(): Env {
  if (cached === undefined) {
    cached = parseEnv(process.env);
  }
  return cached;
}

/** Exposto para testes da política de placeholders do `.env.example`. */
export const __testing = { isPlaceholder, EnvSchema };
