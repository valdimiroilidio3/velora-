import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

/**
 * Sem nisto, os `render()` de um teste sobrevivem no `document.body` do teste seguinte e as queries
 * começam a apanhar múltiplas cópias do mesmo nó — o clássico falso positivo de Testing Library.
 * Em `package.json` não há `globals: true`, por isso o `afterEach` tem de ser importado.
 */
afterEach(() => cleanup());
