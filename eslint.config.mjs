import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

/**
 * ESLint (flat config).
 * - `next/core-web-vitals`: regras do Next.js + react/a11y/import (inclui react-hooks).
 * - `next/typescript`: typescript-eslint recomendado (exige `typescript` instalado).
 * - Nenhuma regra é desativada em bloco; desativações pontuais têm de justificar-se
 *   inline (política em docs/QUALITY-GATES.md).
 */
const eslintConfig = [
  {
    // `globalIgnores` não é suportado por @eslint/config-array@0.23.5 (dependência do ESLint 10.13.0).
    // Verificado empiricamente nesta fundação; usar `ignores` no primeiro objeto da configuração.
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "node_modules/**",
      "next-env.d.ts",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      // Política: `console.log`/`debug`/`info` não chegam a produção. Diagnóstico estruturado
      // será introduzido com um logger próprio (Fase 1). Em componentes de cliente o console
      // é proibido por completo (docs/SECURITY.md → Registo de eventos).
      "no-console": ["error", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
    },
  },
  {
    // Ferramentas de CLI (`scripts/**`) escrevem no terminal: é a saída do portão, não registo
    // da aplicação. A restrição continua a aplicar-se a `src/**`, que é o que corre no browser.
    files: ["scripts/**/*.mjs"],
    rules: {
      "no-console": "off",
    },
  },
];

export default eslintConfig;
