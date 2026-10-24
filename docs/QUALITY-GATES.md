# VELORA — Estratégia de Qualidade e Portões (Quality Gates)

> Fase 0. Este documento define **o que tem de ser verde antes de qualquer merge** e regista
> o que foi **efetivamente executado** na fundação. Documentação não é evidência: a secção
> "Resultados executados" é a única parte que prova funcionamento.

---

## 1. Estados possíveis

| Estado        | Significado                                                            |
| ------------- | ---------------------------------------------------------------------- |
| **APROVADO**  | O comando foi executado neste ambiente e passou.                       |
| **REPROVADO** | O comando foi executado e falhou.                                      |
| **PENDENTE**  | Ainda não pode ser executado (não existe objeto a testar nesta fase).  |
| **BLOQUEADO** | Depende de acesso, decisão ou serviço externo que não está disponível. |

Regras de honestidade desta fase:

1. Um gate só pode ser `APROVADO` com comando + resultado registados neste ficheiro.
2. É proibido desativar regras de lint em bloco, afrouxar o `strict` do TypeScript, adicionar
   `@ts-ignore` sem justificação ou usar `--no-verify` para obter um build verde.
3. `continue-on-error` em CI está reservado a passos informativos explicitamente marcados.
4. Corrigir um gate falhando alterando o **teste** (e não o código) exige justificação no PR.

---

## 2. Portões definidos

| ID    | Portão                           | Comando                                                                                                                                                                                                   | Quando é bloqueante                            |
| ----- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| QG-01 | Instalação reproduzível          | `pnpm install --frozen-lockfile`                                                                                                                                                                          | Sempre (CI + local)                            |
| QG-02 | Tipos                            | `pnpm run typecheck` (`tsc --noEmit`, `strict: true`)                                                                                                                                                     | Sempre                                         |
| QG-03 | Lint                             | `pnpm run lint` (`eslint .`)                                                                                                                                                                              | Sempre                                         |
| QG-04 | Formatação                       | `pnpm run format:check` (`prettier --check .`)                                                                                                                                                            | Sempre                                         |
| QG-05 | Testes unitários                 | `pnpm run test` (`vitest run`)                                                                                                                                                                            | Sempre                                         |
| QG-06 | Build de produção                | `pnpm run build`                                                                                                                                                                                          | Sempre                                         |
| QG-07 | Arranque + smoke test            | `pnpm start -H 0.0.0.0 -p $PORT` + `curl /api/health`                                                                                                                                                     | Antes de cada deploy                           |
| QG-08 | Vulnerabilidades de dependências | `pnpm audit --audit-level=high`                                                                                                                                                                           | Sempre (falha em high/critical)                |
| QG-09 | Consistência de peers            | `pnpm run peers` (`scripts/check-peer-deps.mjs`, allowlist nomeada; `pnpm peers check` é o seu input)                                                                                                     | Sempre                                         |
| QG-10 | Política de build scripts        | `pnpm permissions` (nenhuma dependência com `build` permitido sem registo)                                                                                                                                | Sempre                                         |
| QG-11 | Revisão de variáveis de ambiente | teste Vitest `contrato de configuração — .env.example ↔ schema`                                                                                                                                           | Sempre                                         |
| QG-12 | Varrimento de segredos           | `gitleaks` em CI + verificação manual documentada                                                                                                                                                         | Sempre                                         |
| QG-13 | Licenças de dependências         | `license-checker`/`pnpm licenses` (a adotar)                                                                                                                                                              | Antes de 1.º lançamento comercial              |
| QG-14 | Testes de integração (BD)        | `pnpm run test:integration` (a criar na Fase 1, com PostgreSQL efémero)                                                                                                                                   | A partir da Fase 1                             |
| QG-15 | Isolamento entre tenants         | suite dedicada de testes de autorização cross-tenant (ver `SECURITY.md` §4)                                                                                                                               | Antes de qualquer dado real de 2.ª organização |
| QG-16 | Acessibilidade                   | `pnpm run test:a11y` (axe-core no projeto `dom`) + revisão manual de teclado/contraste + portão QG-21                                                                                                     | Desde a Fase 2, com UI real                    |
| QG-17 | E2E                              | Playwright (a adicionar na Fase 1, quando existir jornada crítica)                                                                                                                                        | A partir da Fase 1                             |
| QG-18 | Desempenho web                   | Lighthouse CI (orçamento a definir; sem browser neste ambiente)                                                                                                                                           | A partir da Fase 3                             |
| QG-19 | Desempenho 3D                    | BCE por cena: tri-count, draw calls, upload GPU, FPS alvo, tempo até interatividade, memória — instrumento no editor (`PerformanceMonitor` + linha de estado) e protocolo em `docs/MANUAL-3D-TESTS.md` §6 | A partir da Fase 3, em dispositivo real        |
| QG-20 | Orçamento de bundle de cliente   | `pnpm run budget` (`scripts/bundle-budget.mjs`, gzip medido na build)                                                                                                                                     | Desde a Fase 2                                 |
| QG-21 | Contrato de tokens e contraste   | `vitest run src/app/design-tokens.test.ts` (pares WCAG + proibições de identidade)                                                                                                                        | Desde a Fase 2                                 |
| QG-22 | Fronteira do motor 3D            | `vitest run src/three/boundary.test.ts` (importações runtime de `three` fora das portas nomeadas + `ssr: false` verificado nos hosts)                                                                     | Desde a Fase 3                                 |

Comboio local completo: `pnpm run verify` = `peers` (QG-09) → `typecheck` (QG-02) → `lint`
(QG-03) → `format:check` (QG-04) → `test` (QG-05, com QG-11 e QG-16 dentro) → `build` (QG-06) →
`budget` (QG-20). Cada passo é o comando da tabela, sem atalhos. Em CI os mesmos passos correm por
extenso (`QG-01` e `QG-10` incluem o install e a política de builds).

---

## 3. Ambiente da execução

| Item                               | Valor verificado                                                                                                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Data da execução                   | 2026-10-24 (UTC)                                                                                                                                                  |
| Sistema operativo                  | Debian GNU/Linux 12 (bookworm), kernel 6.1.158+                                                                                                                   |
| CPU / RAM / disco                  | 2 vCPU · 3,8 GiB · 20 GiB disponíveis                                                                                                                             |
| Node.js                            | v22.22.3                                                                                                                                                          |
| pnpm                               | 12.15.0 (fornecido por Corepack 0.34.6; `packageManager` no `package.json`)                                                                                       |
| npm (só para referência)           | 10.9.8                                                                                                                                                            |
| Git                                | 2.39.5                                                                                                                                                            |
| Docker / `psql` / PostgreSQL local | **ausentes** (condiciona QG-14/QG-15)                                                                                                                             |
| Rede a partir do sandbox           | permitida a: `github.com`, `api.github.com`, `codeload.github.com`, `registry.npmjs.org`, `pypi.org`, `files.pythonhosted.org`. **`vercel.com` não é alcançável** |
| Repositório                        | `https://github.com/valdimiroilidio3/velora-` · branch de trabalho `arena/5051ef25-velora`                                                                        |

Nota de ambiente: o `shim` global do pnpm foi ligado com `corepack enable pnpm` para que os
scripts encadeados (`pnpm run …` dentro de `verify`) corressem neste sandbox. Um developer com
Node ≥ 22 e Corepack ativo obtém o mesmo a partir do campo `packageManager`.

---

## 4. Resultados executados (evidência real)

| ID    | Gate                             | Resultado                                                                                                                                 | Observações medidas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QG-01 | `pnpm install --frozen-lockfile` | **APROVADO**                                                                                                                              | `Lockfile is up to date, resolution step is skipped` · `Done in 111ms` · exit 0. O lockfile (`pnpm-lock.yaml`, lockfileVersion **9.0**, 4485 linhas) tem hashes de integridade por pacote. Antes de fixar a política de build scripts, o install **falhou com `ERR_PNPM_IGNORED_BUILDS`** (exit 1) — ver §6.1.                                                                                                                                                                                                                                                  |
| QG-02 | `tsc --noEmit`                   | **APROVADO**                                                                                                                              | 0 erros com `strict: true` + `noUncheckedIndexedAccess`, `noImplicitOverride`, `noImplicitReturns`, `useUnknownInCatchVariables`, `verbatimModuleSyntax`.                                                                                                                                                                                                                                                                                                                                                                                                       |
| QG-03 | `eslint .`                       | **APROVADO**                                                                                                                              | 0 erros, 0 warnings com ESLint 9.39.5 + `eslint-config-next` 16.4.3 (`core-web-vitals` + `typescript`).                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| QG-04 | `prettier --check .`             | **APROVADO**                                                                                                                              | 14 ficheiros normalizados; nova execução sem diffs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| QG-05 | `vitest run`                     | **APROVADO**                                                                                                                              | **14 testes passaram** em 1 ficheiro (`src/lib/env.test.ts`), 242 ms. Foram escritos **depois** do código e apanharam 2 defeitos reais (ver §6.2, §6.3).                                                                                                                                                                                                                                                                                                                                                                                                        |
| QG-06 | `next build`                     | **APROVADO**                                                                                                                              | Next.js 16.4.3 com Turbopack: `Compiled successfully in 4.9s`, `Finished TypeScript in 2.9s`, 3 páginas geradas em 117 ms. Rotas: `/` (estática), `/_not-found` (estática), `/api/health` (dinâmica).                                                                                                                                                                                                                                                                                                                                                           |
| QG-07 | Arranque + smoke                 | **APROVADO**                                                                                                                              | `next start -H 0.0.0.0 -p 3000` → `Ready in 111ms`. `GET /` → **HTTP 200**. `GET /api/health` sem segredos em modo produção → **HTTP 503** `{"status":"config_invalid",…}` (fail-fast deliberado, sem revelar valores). Cabeçalhos presentes na resposta: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()`, `Cross-Origin-Opener-Policy: same-origin`; `x-powered-by` **ausente** (`poweredByHeader: false`). |
| QG-08 | `pnpm audit --audit-level=high`  | **APROVADO**                                                                                                                              | `No known vulnerabilities found`. Executado também sem filtro de severidade: `No known vulnerabilities found` (todas as severidades).                                                                                                                                                                                                                                                                                                                                                                                                                           |
| QG-09 | Consistência de peers            | `pnpm run peers` (`scripts/check-peer-deps.mjs`, allowlist nomeada; `pnpm peers check` é o seu input)                                     | Sempre                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| QG-10 | `pnpm permissions`               | **APROVADO**                                                                                                                              | `Denied: unrs-resolver build`. Zero dependências com scripts de build permitidos; a recusa é explícita e registada, pelo que o install não fica com aprovação pendente.                                                                                                                                                                                                                                                                                                                                                                                         |
| QG-11 | Contrato `.env.example` ↔ schema | **APROVADO**                                                                                                                              | 5 testes no grupo `contrato de configuração`: separador de bloco reservado, chaves ativas ⊆ schema, schema ⊆ chaves ativas, bloco reservado fora do schema, e "sem credenciais reais no exemplo".                                                                                                                                                                                                                                                                                                                                                               |
| QG-12 | Varrimento de segredos           | **APROVADO (manual/CLI)**                                                                                                                 | `git check-ignore -v .env.local` → ignorado por `.gitignore:17 (/.env.*)`. Varredura de 19 ficheiros preparados para commit com padrões `AKIA…`, `ghp_…`, `xox[baprs]-`, `-----BEGIN …PRIVATE KEY`, `sk-…`, `AIza…` → **0 ocorrências**. Atribuições `*SECRET*="…"`/`*PASSWORD*="…"` fora de exemplos/testes → **0 ocorrências**. `gitleaks` em CI: **PENDENTE** (ferramenta não instalada no sandbox; fica no workflow como job não-bloqueante até haver decisão de pinned version).                                                                           |
| QG-13 | Licenças                         | **PENDENTE**                                                                                                                              | Feito manualmente nesta fase: as 12 dependências diretas são MIT/ISC/Apache-2.0 (ver `DEPENDENCIES.md` §1). Automatizar com `pnpm licenses` na Fase 1.                                                                                                                                                                                                                                                                                                                                                                                                          |
| QG-14 | Testes de integração BD          | **BLOQUEADO**                                                                                                                             | Sem Docker, sem binário PostgreSQL e sem base de dados acessível neste ambiente. Nenhum teste de integração foi escrito nem executado.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| QG-15 | Isolamento entre tenants         | **BLOQUEADO**                                                                                                                             | Não existe persistência nem autorização implementadas. **Nenhuma afirmação de proteção cross-tenant é feita** — ver `SECURITY.md` §4.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| QG-16 | Acessibilidade                   | `pnpm run test:a11y` (axe-core no projeto `dom`) + revisão manual de teclado/contraste + portão QG-21                                     | Desde a Fase 2, com UI real                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| QG-17 | E2E                              | **PENDENTE**                                                                                                                              | Playwright ainda não adicionado (peso de download dos browsers + decisão de ambiente de execução).                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| QG-18 | Desempenho web                   | Lighthouse CI (orçamento a definir; sem browser neste ambiente)                                                                           | A partir da Fase 3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| QG-19 | Desempenho 3D                    | BCE por cena: tri-count, draw calls, upload GPU, FPS alvo, tempo até interatividade, memória — instrumento já existe no palco (`onStats`) | A partir da Fase 3, em dispositivo real                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

### 4.1 Execução em CI — GitHub Actions (evidência remota)

Não é só local: o workflow foi empurrado e executado no GitHub.

| Item                                    | Valor                                                                                                                                                                                                                                                       |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Execução                                | run **40109854774** · workflow `CI` · branch `arena/5051ef25-velora` · evento `push`                                                                                                                                                                        |
| URL                                     | https://github.com/valdimiroilidio3/velora-/actions/runs/40109854774                                                                                                                                                                                        |
| Resultado                               | **sucesso**, `Quality gates in 32s`, 15/15 passos verdes (QG-01, QG-10, QG-09, QG-02, QG-03, QG-04, QG-05+QG-11, QG-06, QG-07, QG-08, QG-12)                                                                                                                |
| Verificação feita por                   | `gh run watch 40109854774 --exit-status` → exit 0                                                                                                                                                                                                           |
| Anotação do GitHub (a tratar na Fase 1) | "the ubuntu-latest label will migrate to Ubuntu 26 beginning October 19, 2026" (`actions/runner-images#14748`) — o nosso `runs-on` é um _label_, não uma imagem fixada                                                                                      |
| Limite desta evidência                  | o download do log bruto do job **não foi possível a partir deste sandbox** (o host `results-receiver.actions.githubusercontent.com` não está na allowlist de rede). O resultado por passo vem do sumário da API `gh run view`, não do texto integral do log |

### 4.2 Contas de resultados

- Portões **APROVADOS**: 11 (QG-01 … QG-12), executados **duas vezes** — no sandbox local e no
  GitHub Actions (run 40109854774, 15/15 passos verdes em 32 s).
- Portões **PENDENTES**: 5 (QG-13 parcialmente manual, QG-16, QG-17, QG-18, QG-19).
- Portões **BLOQUEADOS**: 2 (QG-14, QG-15 — ausente acesso a PostgreSQL).
- Portões **REPROVADOS**: 0.
- Testes automatizados a correr: **14** (0 falhas). Ficheiros de código-fonte da aplicação: 5 (todos justificados em `ARCHITECTURE.md` §3.4).

---

### 4.3 Execução da Fase 2 — mesma máquina, outro objeto de teste (2026-10-24)

A Fase 2 acrescentou UI real (40+ ficheiros), tokens, camada 3D, dois portões novos e uma suite de
testes de DOM. Cada linha abaixo é um comando executado depois da última alteração de código.

| ID            | Gate                                       | Resultado                 | Observações medidas                                                                                                                                                                                                                                                                                                                                        |
| ------------- | ------------------------------------------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QG-02         | `pnpm run typecheck`                       | **APROVADO**              | `tsc --noEmit` com `strict` + `noUncheckedIndexedAccess` + `verbatimModuleSyntax`: 0 erros, incluindo 14 ficheiros de teste no `include`                                                                                                                                                                                                                   |
| QG-03         | `pnpm run lint`                            | **APROVADO**              | ESLint **10.13.0** (ver `ADR 0005`), 0 erros e 0 warnings; `no-console` com override apenas em `scripts/**`; 0 usos de `@ts-ignore`/`eslint-disable` em `src/**`                                                                                                                                                                                           |
| QG-04         | `pnpm run format:check`                    | **APROVADO**              | `All matched files use Prettier code style!`                                                                                                                                                                                                                                                                                                               |
| QG-05         | `pnpm run test`                            | **APROVADO**              | **14 ficheiros / 153 testes** em 7,8 s — projeto `node` 113 testes, projeto `dom` 40 testes; 0 falhas, 0 saltados                                                                                                                                                                                                                                          |
| QG-06         | `pnpm run build`                           | **APROVADO**              | Next 16.4.3 (Turbopack), 10 rotas no manifesto, **12 páginas pré-renderizadas** (incl. as 6 fichas de projeto), 0 erros; TS 5,5 s                                                                                                                                                                                                                          |
| QG-09         | `pnpm run peers`                           | **APROVADO**              | `3 achado(s), 3 coberto(s), 0 inesperados` · exit 0 — os 3 achados são tetos `eslint ^9` de plugins do `eslint-config-next`, cada um com `reason`/`until` escritos                                                                                                                                                                                         |
| QG-16         | `pnpm run test:a11y`                       | **APROVADO (parcial)**    | axe-core 4.14.0 sobre superfícies compostas: 3 varrimentos limpos; a violação `heading-order` (`h1 → h3`) foi **encontrada por este teste e corrigida no código**; 3 regras desativadas com justificação escrita; revisão manual de teclado/contraste registada em `DESIGN-SYSTEM.md` §11. **Não substitui** leitor de ecrã real nem auditoria com browser |
| QG-20         | `pnpm run budget`                          | **APROVADO**              | partilhado **128,9 kB** / 150 · total **359,5 kB** / 520 · first-load máximo **202,5 kB** / 240 (`/app/projetos/[slug]`) · `three` **134,5 kB** em 1 chunk diferido, `partilhado=false`, `rotas-iniciais=nenhuma`                                                                                                                                          |
| QG-21         | `vitest run src/app/design-tokens.test.ts` | **APROVADO**              | 31 asserções: 20 pares de texto ≥ 4,5:1 e ≥ 3:1 de componentes nos dois temas, proibição de `text-ink-faint`, ausência de gradientes fora de `.blueprint-grid`, escala de raios 2–12 px, 3 níveis de sombra, `prefers-reduced-motion`, acento único                                                                                                        |
| QG-11         | contrato `.env.example` ↔ schema           | **APROVADO**              | 14 testes em `src/lib/env.test.ts`; nenhuma variável nova foi precisa nesta fase                                                                                                                                                                                                                                                                           |
| QG-12         | segredos                                   | **APROVADO (manual/CLI)** | `.env*` ignorado; varredura de padrões de credencial em todos os ficheiros para commit → 0 ocorrências; o repo é público e **não** contém chaves nem dados de clientes reais                                                                                                                                                                               |
| QG-13         | licenças                                   | **PARCIAL**               | as 11 dependências da Fase 2 são MIT/ISC, exceto `axe-core` (MPL-2.0, só em testes) — ver `DEPENDENCIES.md` §5; automação com `pnpm licenses` ainda pendente                                                                                                                                                                                               |
| QG-08         | `pnpm audit --audit-level=high`            | **APROVADO**              | `No known vulnerabilities found` no grafo de 2026-10-24                                                                                                                                                                                                                                                                                                    |
| QG-18         | Lighthouse                                 | **PENDENTE**              | sem browser neste sandbox; o que foi possível medir automatizou-se como QG-20 (bundle)                                                                                                                                                                                                                                                                     |
| QG-19         | Desempenho 3D                              | **PENDENTE**              | o instrumento existe (fps/triângulos/`drawCalls` no palco via `onStats`) mas **não há GPU nem browser aqui**; nenhuma alegação de FPS é feita                                                                                                                                                                                                              |
| QG-17         | E2E                                        | **PENDENTE**              | decisão registada: não adicionar Playwright sem browser disponível para o executar; protocolo manual em `docs/` (Fase 2) cobre o que os testes de DOM não cobrem                                                                                                                                                                                           |
| QG-14 / QG-15 | BD e isolamento de tenants                 | **BLOQUEADO**             | sem persistência nesta fase — e a Fase 2 não simulou base de dados nem sessão autenticada                                                                                                                                                                                                                                                                  |

**Execução em CI (GitHub Actions) da Fase 2.** O `push` de `93b7c0a` correu o workflow `CI` na
branch `arena/5051ef25-velora`: run **40115219308**, resultado **sucesso** (48 s), verificado com
`gh run list --branch arena/5051ef25-velora` — o mesmo conjunto de comandos de `pnpm run verify`,
portanto os portões QG-02…QG-06, QG-09, QG-20 e QG-21 estão também aprovados fora desta máquina.
https://github.com/valdimiroilidio3/velora-/actions/runs/40115219308

### 4.4 Contas da Fase 2

- Portões **APROVADOS nesta execução**: 12 (QG-02, 03, 04, 05, 06, 08, 09, 11, 12, 20, 21 + QG-01 pelo `install --frozen-lockfile` do CI).
- **APROVADO parcial**: 2 (QG-16 sem browser/leitor de ecrã, QG-13 manual).
- **PENDENTE**: 3 (QG-17, QG-18, QG-19) — cada um com o motivo ambiente escrito, nenhum "escondido".
- **BLOQUEADO**: 2 (QG-14, QG-15) — fora do âmbito declarado da Fase 2.
- **REPROVADOS**: 0. Nenhum portão foi desativado, afrouxado ou contornado para chegar aqui; os 6 defeitos em §6.7–§6.12 são a prova do contrário (3 deles foram encontrados **pelos** gates).
- Testes a correr: **153** em 14 ficheiros (Fase 0: 14 testes em 1 ficheiro). Ficheiros em `src/**`: **74** (6 na Fase 0), dos quais 13 são ficheiros de teste.

---

### 4.5 Execução da Fase 3 — motor 3D, editor de modelo e fronteira de bundle (2026-10-24)

Objeto novo medido em disco: **19 módulos** em `src/three/**` (11 de domínio puro + 8 de motor),
**11 módulos** em `src/components/editor/**`, a rota `/app/modelo` e **16 ficheiros de teste
novos**. Em `src/**` há agora 120 módulos `.ts`/`.tsx` (Fase 2: 74).

| ID                    | Gate                                    | Resultado              | Observações medidas                                                                                                                                                                                                                                                    |
| --------------------- | --------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QG-01                 | `pnpm install --frozen-lockfile`        | **APROVADO**           | zero dependências adicionadas nesta fase: `three@0.186.1` e `@types/three@0.186.0` já vinham da Fase 2                                                                                                                                                                 |
| QG-02                 | `pnpm run typecheck`                    | **APROVADO**           | `tsc --noEmit` com `strict` + `noUncheckedIndexedAccess`, sem `any` em `src/three`                                                                                                                                                                                     |
| QG-03                 | `pnpm run lint`                         | **APROVADO**           | 0 erros, 0 warnings em todo o repositório; as regras `react-hooks` v7 não foram relajadas para o editor passar                                                                                                                                                         |
| QG-04                 | `pnpm run format:check`                 | **APROVADO**           | `All matched files use Prettier code style!`                                                                                                                                                                                                                           |
| QG-05                 | `pnpm run test`                         | **APROVADO**           | **30 ficheiros / 300 testes** (Fase 2: 14/153). Projeto `node`: 22 ficheiros / 233 testes; `dom`: 8 / 67                                                                                                                                                               |
| QG-06                 | `pnpm run build`                        | **APROVADO**           | Next 16.4.3 (Turbopack), **13 rotas**, 12 pré-renderizadas, 0 erros; `/app/modelo` é dinâmica (`searchParams`)                                                                                                                                                         |
| QG-08                 | `pnpm audit --audit-level=high`         | **APROVADO**           | sem vulnerabilidades conhecidas novas (nenhum pacote novo instalado)                                                                                                                                                                                                   |
| QG-09                 | `pnpm run peers`                        | **APROVADO**           | `3 achado(s), 3 coberto(s) por exceção nomeada, 0 inesperados` — inalterado pela Fase 3                                                                                                                                                                                |
| QG-16                 | `pnpm run test:a11y`                    | **APROVADO (parcial)** | axe-core sobre as superfícies da Fase 2 **e o editor de modelo** (árvore `role=tree`, `role=toolbar`, `role=application`, _toolbar_ de qualidade): 0 violações; sem browser/leitor de ecrã aqui                                                                        |
| QG-20                 | `pnpm run budget`                       | **APROVADO**           | partilhado **129 kB**/150; total **401,1 kB**/520 (21 _chunks_); pior rota pré-renderizada **205,4 kB**; `three` **135,1 kB** em 1 _chunk_ diferido, `partilhado=false`, `rotas-iniciais=nenhuma`                                                                      |
| QG-22                 | `vitest run src/three/boundary.test.ts` | **APROVADO**           | 5 asserções: 58 módulos de UI varridos, 2 portas nomeadas do motor, ambas atrás de `dynamic(…, { ssr: false })`, camada pura sem `three`                                                                                                                               |
| QG-11 / QG-12 / QG-13 | contratos `.env`, segredos, licenças    | **sem alteração**      | nenhum pacote novo; nenhuma chave nova                                                                                                                                                                                                                                 |
| QG-18                 | Lighthouse                              | **PENDENTE**           | continua sem browser neste sandbox                                                                                                                                                                                                                                     |
| QG-19                 | Desempenho 3D                           | **PENDENTE**           | o instrumento existe e corre (`fps · ms · triângulos · draws · malhas` na linha de estado, com contadores reais do `renderer.info`); **as medições por dispositivo são manuais** — ver `docs/MANUAL-3D-TESTS.md` §6. Nenhuma alegação de FPS é feita neste repositório |
| QG-17                 | E2E                                     | **PENDENTE**           | decisão de Fase 0/2 mantém-se                                                                                                                                                                                                                                          |
| QG-14 / QG-15         | BD e isolamento                         | **BLOQUEADO**          | fora do âmbito declarado (Fase 3 não tem persistência)                                                                                                                                                                                                                 |

Medição direta do primeiro _load_ da rota nova, porque o _budget_ só cobre rotas pré-renderizadas:
`next start` + `<script>` do HTML de `/app/modelo` → 12 _scripts_, **214 kB gzip**, `three` = **0 kB**
(o _chunk_ do motor é carregado à parte, quando há WebGL). Antes de mover `VIEW_PRESETS` para a
camada pura eram 279,8 kB **com 54 kB de `three` no inicial** — ver §6.13.

### 4.6 Contas da Fase 3

- Portões **APROVADOS nesta execução**: 10 (QG-01…QG-06, QG-08, QG-09, QG-20, QG-22) + QG-16 parcial.
- **PENDENTE**: 3 (QG-17, QG-18, QG-19) — todos por limitação de ambiente declarada, cada um com o
  protocolo manual que o fecha.
- **BLOQUEADO**: 2 (QG-14, QG-15).
- **REPROVADOS**: 0. Nenhum portão foi desativado nem afrouxado: o QG-22 foi **adicionado** porque a
  medição encontrou um problema que nenhum portão cobria.
- Testes: **300** em 30 ficheiros (Fase 2: 153/14). Ficheiros em `src/**`: **109** (Fase 2: 74).
- Evidência de CI desta fase: ver §4.7.

### 4.7 Execução em CI da Fase 3

A preencher **depois** do `push` desta fase: run do workflow `CI` na branch `arena/5051ef25-velora`,
com o resultado lido por `gh run list`. Não há linha aqui enquanto o run não existir — um portão
sem execução não é um portão aprovado.

## 5. O que um PR tem de mostrar

1. Saída de `pnpm run verify` verde (ou o job de CI correspondente ligado ao PR).
2. Se tocou em dependências: resultado de `pnpm audit`, `pnpm peers check` e a linha correspondente em `DEPENDENCIES.md` atualizada.
3. Se introduziu variável de ambiente: `.env.example` no bloco certo + teste QG-11 verde.
4. Se tocou em autorização ou dados: teste QG-15 respetivo a passar, com o caso de teste visível no PR (negativo primeiro: provar que falha quando o controlo é removido).
5. Se mexeu num gate ou numa regra de lint: justificação no ADR, não apenas na descrição do PR.

---

## 6. Defeitos encontrados e corrigidos (Fases 0 e 2)

Estes não são notas decorativas: cada um deles teria rebentado mais tarde. Ficam registados
para que a decisão técnica fique percetível a quem chega depois.

### 6.1 `ERR_PNPM_IGNORED_BUILDS` — o install falhava com exit 1

`unrs-resolver` (dependência transitiva do resolvedor de imports do `eslint-plugin-import-x`) tem
`postinstall`. Com a política de bloqueio por omissão, o pnpm 12.15.0 **devolve erro** em vez de
apenas avisar. As chaves `onlyBuiltDependencies`/`ignoredBuiltDependencies` foram experimentadas e
**são ignoradas em silêncio** (o CHANGELOG do pnpm regista que foram substituídas por `allowBuilds`
na versão 11). Correção aplicada, em `pnpm-workspace.yaml`:

```yaml
allowBuilds:
  unrs-resolver: false
```

Resultado medido: `pnpm install --frozen-lockfile` → exit 0; `pnpm permissions` →
`Denied: unrs-resolver build`; `eslint .` → 0 erros com o `postinstall` bloqueado. O `postinstall`
destes pacotes serve apenas para escolher o binário de plataforma, que já chega via
`optionalDependencies` — por isso o bloqueio não custa funcionalidade.

### 6.2 Deriva entre `.env.example` e o schema (apanhada pelo QG-11)

O primeiro teste de contrato falhou com 11 chaves documentadas mas inexistentes no schema
(`S3_*`, `SENTRY_DSN`, `SMTP_*`, `MAIL_FROM`). Resolvemos o conflito **endurecendo o contrato** em
vez de apagar a documentação: o `.env.example` passou a ter um bloco **ATIVO** (validado) e um bloco
**RESERVADO** (documentado para as fases futuras, explicitamente fora do schema). Um teste garante os
dois sentidos da deriva, incluindo "o reservado não é validado precocemente".

### 6.3 `z.url()` aceitava valores inválidos como origem pública

`NEXT_PUBLIC_SITE_URL: "localhost:3000"` **passava** na validação (`Url can be parsed` → esquema
`localhost:`). Corrigido com `.refine` que exige `http(s)://` e ausência de caminho no valor base.
Teste unitário cobre o caso.

### 6.4 ESLint 10.13.0 gerava 3 peers em falta

Com `eslint@10.13.0`, `pnpm peers check` acusava `eslint-plugin-import@2.32.0`,
`eslint-plugin-jsx-a11y@6.10.2` e `eslint-plugin-react@7.37.5` (todos dependências do
`eslint-config-next@16.4.3`) com intervalos de peer até ESLint 9. O `eslint .` funcionava, mas
`globalIgnores` **rebentava** a config (`ConfigError: Unexpected key "globalIgnores" found.` em
`@eslint/config-array@0.23.5`), e a base ficaria com avisos de peers permanentes. Decisão:
**fixar `eslint@9.39.5`** (canal de manutenção `maintenance` declarado no registo npm), o que deu
`No peer dependency issues found` e lint verde. A subida para ESLint 10 é uma tarefa da Fase 1,
condicionada a o `eslint-config-next` declarar suporte.

### 6.5 O Next.js reescreveu o `tsconfig.json`

Durante o `next build` o framework impôs `jsx: "react-jsx"` e acrescentou
`.next/dev/types/**/*.ts` ao `include`. É comportamento esperado e não conflito; ficou aceite e o
ficheiro foi reformatado. Se algum dia o build voltar a mexer noutro campo, isso é sinal de que o
`tsconfig.json` divergiu do suportado e deve ser revisto, não ignorado.

### 6.7 React Hooks 7: duas regras que obrigaram a mudar a arquitetura, não o código

`react-hooks/set-state-in-effect` reprova `setState` no corpo de um `useEffect`, e
`react-hooks/refs` reprova ler `ref.current` durante o render — inclusive através de um array de
`onClick` construído antes do JSX. Em vez de desativar as regras (proibido por §1, regra 2), a UI
mudou de forma: a deteção de WebGL passou a `useSyncExternalStore` com snapshot de servidor
`"unknown"`, o campo de pesquisa passou a **não controlado** a ler `location.search`, e as
controlações da cena passaram a seis `<Button>` explícitos em vez de `.map()`. Custo: mais 20 linhas
de JSX. Ganho: zero estado redundante com o URL e zero _mismatch_ de hidratação.

### 6.8 Contraste: dois tokens eram invisíveis onde a WCAG obriga

A varredura que escrevi para o QG-21 encontrou o que a revisão humana não tinha visto:
`--ink-faint` usado como texto em 22 ficheiros (2,62:1) e a borda dos campos a 1,88:1. Correcção na
fonte: `--ink-faint` passou a não-texto (com teste que varre `src/**` à procura de `text-ink-faint`),
`--ink-muted` foi escurecido para `#63676d` e nasceu `--line-control` (3,94:1) para fronteiras de
controlo. **Nenhum limiar do teste foi alterado** — os valores de cor é que mudaram.

### 6.9 `axe-core` apanhou uma hierarquia de títulos partida

`h1 → h3` na lista de projetos (o `h2` era só da página comprimida). Teste vermelho → componente
`ProjectCard` passou a viver dentro de uma secção com `h2` próprio. É o exemplo mais claro de porque
convém ter o instrumento em vez de confiar na boa intenção.

### 6.10 Dois testes que provavam nada (e foram reescritos)

`expect(a).not.toBe(a)` numa asserção de slug e um teste que afirmava que "um `input` desativado não
emite `change`" — em jsdom, `fireEvent.click` num controlador desativado **dispara** `change`. O
segundo foi substituído por `toBeDisabled()` + `aria-disabled` com comentário a explicar a diferença
de ambiente; o primeiro foi eliminado. Um teste verde que não pode falhar é pior do que nenhum teste.

### 6.11 Ambiente de teste: três armadilhas do Vitest com jsdom

`import.meta.url` não é um `file:` URL no projeto `dom` (usa-se `join(process.cwd(), …)`); `paths` do
`tsconfig` não existem para o Vite (precisam de `resolve.alias` explícito no `vitest.config.mts`); e
o padrão `src/**/*.test.ts` do projeto `node` apanhava os `*.dom.test.ts`, que falhavam por falta de
`window` e não por defeito. Todos corrigidos no config, não nos testes.

### 6.12 Dados de demonstração com nome impróprio

Um dos seis projetos demo chamava-se "Coimas Terraço" — _coima_ é suborno em português. Foi renaming
para **"Colinas Terraço"** (`slug: colinas-terraco`, `id: prj_colinas`) antes do push, com o teste de
pesquisa atualizado. Sem consequência funcional, com consequência de produto: são dados fictícios que
serão lidos por clientes.

### 6.6 Telemetria do Next.js

O primeiro build imprimiu o aviso de recolha de telemetria. Não existe forma limpa de a desligar a
partir do repositório sem uma dependência extra (isto é preciso que `NEXT_TELEMETRY_DISABLED=1`
esteja definido antes do arranque do processo). Ficou: variável documentada no bloco ATIVO do
`.env.example` **e** definida no job de CI. Em ambiente local é responsabilidade do developer.

---

### 6.13 Etiquetas de vista a arrastar 54 kB de `three` para o primeiro _load_

Encontrado por medição, não por revisão. O `EditorToolbar` precisava dos rótulos das vistas de
câmera e importou `VIEW_PRESETS` de `@/three/engine/camera-controller` — um módulo que importa
`three` e o `OrbitControls`. Um `import` de _labels_ tornou o `three` dependência _eager_ da rota:
o primeiro _load_ de `/app/modelo` medido no HTML servido passou de 214 kB para 279,8 kB, com
54 kB vindos do motor.

- **Correção:** as etiquetas passaram para `src/three/view-presets.ts` (camada pura, sem `three`) e
  o motor reexporta-as, por isso nenhum chamador do motor mudou.
- **Portão novo:** QG-22 (`src/three/boundary.test.ts`) varre `src/components/**` e `src/app/**` e
  falha se algum módulo importar `three`, `three/*` ou `@/three/engine/**` em runtime — exceto as
  duas portas nomeadas, cujo `dynamic(…, { ssr: false })` o mesmo teste confirma, dois graus acima.
- **Lição registada:** sem browser e sem análise de _chunks_ do Turbopack por rota, a única forma de
  apanhar dependências _eager_ indesejadas é ter um teste de grafo de importações. A medição do
  HTML servido foi o que tornou o problema visível; o portão é o que o impede de voltar.

## 7. Limites do que foi verificado

Para não deixar dúvidas sobre o que esta fase **não** prova:

- Não existe teste de base de dados, de isolamento por organização, de autenticação ou de autorização.
- Não existe análise de acessibilidade automatizada nem auditoria Lighthouse.
- O `pnpm audit` cobre o grafo instalado hoje; não cobre o que ainda não foi adicionado
  (Three.js, ORM, drivers de IA), nem substitui revisão de licenças.
- O smoke test QG-07 foi executado num único ambiente de execução, com o build do próprio repositório.
- O caminho de deploy (Vercel) não foi exercitado: `vercel.com` não é alcançável a partir deste sandbox.
- **Fase 2:** não existe browser neste ambiente — logo nenhum screenshot foi visto, nenhum Lighthouse,
  nenhum teste com leitor de ecrã, nenhuma medição de FPS/GPU, nenhum teste de clique real no canvas
  WebGL. O que existe é: cálculo de contraste a partir dos hexadecimais, DOM em jsdom, testes de
  comportamento de componentes, orçamento medido no output da build e o código de ciclo de vida da
  cena escrito para ser auditável. Um navegador é o próximo verificador, não este documento.
- **Fase 2:** a navegação em mobile (360 px) foi verificada por inspeção de CSS e pelas asserções de
  breakpoints do QG-21, não por medição em viewport real; nenhum _layout shift_ foi medido.
- O **palco 3D nunca foi desenhado** neste ambiente: não há GPU, browser nem ecrã. Estão cobertos
  por teste em Node/jsdom o modelo de dados, as regras de edição, o _snapping_, o _sync_
  cena ⇄ documento, a libertação de recursos e os estados de erro; estão em
  `docs/MANUAL-3D-TESTS.md` (R1…E7, com o protocolo de medição §6) tudo o que é pixel, sombra,
  _touch_, FPS e memória de GPU. Nenhuma frase deste repositório afirma desempenho de render.
- **Fase 2:** não há teste de persistência para além de `localStorage` (parse/serialize/corrupto),
  porque não há backend — as páginas de acesso e de preferências **não** simulam sessão nem base de dados.
