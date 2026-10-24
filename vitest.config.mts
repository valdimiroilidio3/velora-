import { configDefaults, defineConfig } from "vitest/config";

/**
 * Fase 0: apenas testes de lógica de fundação em ambiente Node (sem DOM).
 * Testes de componentes (jsdom + Testing Library) serão adicionados na Fase 1,
 * com justificação de dependências em docs/DEPENDENCIES.md.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "tests/**/*.test.ts"],
    exclude: [...configDefaults.exclude, ".next/**", "node_modules/**"],
    clearMocks: true,
  },
});
