import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Dois projetos de teste, porque as duas metades do código têm meios diferentes:
 *
 * - `node`: lógica pura (dados de demonstração, consulta, projeção de volumes, tokens,
 *   preferências, orçamento de bundle). Sem DOM de propósito — o que não precisa de browser
 *   não deve pagar o custo de jsdom nem ficar tentado a acoplar-se à renderização.
 * - `dom`: componentes renderizados em jsdom + Testing Library, incluindo o varrimento
 *   de acessibilidade com axe-core. É o que prova que os estados de foco, rótulos e
 *   regiões anunciadas existem de facto e não por promessa.
 */
export default defineConfig({
  resolve: {
    // O `paths` do tsconfig é do TypeScript; o Vite precisa do alias declarado à mão.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    clearMocks: true,
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.ts", "scripts/**/*.test.mjs"],
          exclude: ["**/node_modules/**", "src/**/*.dom.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["src/**/*.test.tsx", "src/**/*.dom.test.ts"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
    ],
  },
});
