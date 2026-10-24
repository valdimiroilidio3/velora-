import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ENV_KEYS, EnvValidationError, __testing, parseEnv } from "./env";

const base = { NODE_ENV: "development" } as const;

describe("parseEnv — defaults seguros para desenvolvimento local", () => {
  it("aplica defaults quando apenas NODE_ENV está definido", () => {
    const env = parseEnv(base);
    expect(env.NODE_ENV).toBe("development");
    expect(env.PORT).toBe(3000);
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000");
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.AUTH_SECRET).toBeUndefined();
    expect(env.DATABASE_POOL_MAX).toBe(5);
    expect(env.NEXT_TELEMETRY_DISABLED).toBe("1");
  });

  it("aceita uma configuração de desenvolvimento completa", () => {
    const env = parseEnv({
      ...base,
      PORT: "4000",
      NEXT_PUBLIC_SITE_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://velora:***@localhost:5432/velora_dev",
    });
    expect(env.PORT).toBe(4000);
    expect(env.DATABASE_URL).toContain("velora_dev");
  });

  it("trata strings vazias como ausentes (comportamento típico de .env)", () => {
    const env = parseEnv({ ...base, DATABASE_URL: "", AUTH_SECRET: "", NEXT_PUBLIC_GIT_SHA: "" });
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.AUTH_SECRET).toBeUndefined();
    expect(env.NEXT_PUBLIC_GIT_SHA).toBeUndefined();
  });
});

describe("parseEnv — rejeição sem exposição de valores", () => {
  it("rejeita PORT não numérica", () => {
    expect(() => parseEnv({ ...base, PORT: "abc" })).toThrow(EnvValidationError);
  });

  it("rejeita NEXT_PUBLIC_SITE_URL que não seja URL", () => {
    expect(() => parseEnv({ ...base, NEXT_PUBLIC_SITE_URL: "localhost:3000" })).toThrow(EnvValidationError);
  });

  it("rejeita DATABASE_URL que não seja PostgreSQL", () => {
    expect(() => parseEnv({ ...base, DATABASE_URL: "mysql://localhost:3306/x" })).toThrow(EnvValidationError);
  });

  it("não inclui o valor inválido na mensagem de erro", () => {
    let message = "";
    try {
      parseEnv({ ...base, AUTH_SECRET: "supershort" });
    } catch (error) {
      message = (error as EnvValidationError).message;
    }
    expect(message).toContain("AUTH_SECRET");
    expect(message).not.toContain("supershort");
  });

  it("em produção exige segredo, base de dados e HTTPS", () => {
    expect(() => parseEnv({ NODE_ENV: "production" })).toThrow(EnvValidationError);
    expect(() =>
      parseEnv({
        NODE_ENV: "production",
        AUTH_SECRET: "x".repeat(48),
        DATABASE_URL: "postgresql://u:***@h/db",
        NEXT_PUBLIC_SITE_URL: "https://velora.example",
      }),
    ).not.toThrow();
  });
});

describe("contrato de configuração — .env.example ↔ schema", () => {
  const example = readFileSync(new URL("../../.env.example", import.meta.url), "utf8");
  const reservedMarker = "# --- BLOCO RESERVADO";

  const parseEntries = (text: string) =>
    text
      .split("\n")
      .filter((line) => /^[A-Z][A-Z0-9_]*=/.test(line.trim()))
      .map((line) => {
        const index = line.indexOf("=");
        return { key: line.slice(0, index).trim(), value: line.slice(index + 1).trim() };
      });

  const active = parseEntries(example.split(reservedMarker)[0] ?? "");
  const reserved = parseEntries(example.slice(example.indexOf(reservedMarker)));

  it("o separador de bloco reservado existe (falha ruidosa se for removido)", () => {
    expect(example).toContain(reservedMarker);
  });

  it("todas as variáveis ativas documentadas existem no schema", () => {
    const unknown = active.map((entry) => entry.key).filter((key) => !(ENV_KEYS as string[]).includes(key));
    expect(unknown).toEqual([]);
  });

  it("todas as variáveis do schema estão documentadas no bloco ativo", () => {
    const documented = new Set(active.map((entry) => entry.key));
    const missing = ENV_KEYS.filter((key) => !documented.has(key));
    expect(missing).toEqual([]);
  });

  it("o bloco reservado não é validado precocemente pelo schema", () => {
    const schemaKeys = new Set(ENV_KEYS as string[]);
    const leaked = reserved.map((entry) => entry.key).filter((key) => schemaKeys.has(key));
    expect(leaked).toEqual([]);
  });

  it("URLs de ligação não transportam credenciais reais", () => {
    const urls = [...active, ...reserved].filter(
      (entry) => /_URL$|ENDPOINT$|DSN$/.test(entry.key) && entry.value !== "",
    );
    expect(urls.length).toBeGreaterThan(0);
    const offenders = urls.filter((entry) => {
      const credentials = /\/\/[^/@]*:([^@/]*)@/.exec(entry.value);
      return credentials !== null && !__testing.isPlaceholder(credentials[1] ?? "");
    });
    expect(offenders).toEqual([]);
  });

  it("nenhuma variável sensível tem valor real no .env.example", () => {
    const sensitive = [...active, ...reserved].filter((entry) =>
      /(SECRET|KEY|TOKEN|PASSWORD|DSN)/.test(entry.key),
    );
    expect(sensitive.length).toBeGreaterThan(0);
    const leaked = sensitive.filter((entry) => !__testing.isPlaceholder(entry.value));
    expect(leaked).toEqual([]);
  });
});
