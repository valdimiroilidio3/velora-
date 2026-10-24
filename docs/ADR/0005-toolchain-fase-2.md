# ADR 0005 — ESLint 10 com portão de peers nomeado, orçamento de bundle e dois projetos de teste

- **Estado**: Implementado
- **Data**: 2026-10-24
- **Impacto de fase**: Fase 2 (substitui a decisão 3 de qualidade do `ADR 0001` §2; o resto do
  ADR 0001 mantém-se)
- **Decisão tomada por**: agente técnico (Arena); a escolha de **aceitar** 3 peers por exceção
  escrita em vez de descer de versão é uma decisão de risco de manutenção — merece revisão humana

## 1. Contexto

`ADR 0001` §2 fixou **ESLint 9.39.5** com duas razões verificadas na altura: (a) `eslint@10.13.0`
produzia 3 peers em falta e rebentava a configuração com `globalIgnores`
(`@eslint/config-array@0.23.5`); (b) o `eslint-config-next@16.4.3` pede `eslint >=9`. A Fase 2
trouxe Tailwind, `lucide-react`, `three`, uma suite de testes de DOM e uma camada de UI com 40
ficheiros novos — e com eles três factos que obrigaram a reabrir a decisão:

1. A linha 9.x está marcada como **fim de suporte** no registo público; manter o lint do produto
   numa linha sem correções é dívida com data.
2. Os 3 peers em falta que motivaram a fixagem **não são incompatibilidade**: são tetos de
   `peerDependencies` (`^9`) de `eslint-plugin-import`, `eslint-plugin-jsx-a11y` e
   `eslint-plugin-react`, declarados por `eslint-config-next@16.4.3`. O `pnpm peers check` é
   binário — ou limpo, ou vermelho — e uma equipa que o tem no CI vai acabar por o tirar do CI.
3. Ao mesmo tempo, a Fase 2 introduziu uma classe de risco nova que nenhum gate cobria:
   dependências visuais. Sem um número fixo, "leve" passa a significar o que convinha.

## 2. Decisão

1. **ESLint 10.13.0** com `eslint-config-next@16.4.3` (flat config, `core-web-vitals` +
   `typescript`), `@typescript-eslint` via o config do Next, e três regras nossas além do preset:
   `no-console: error` (exceto `warn`/`error`), `eqeqeq`,
   `@typescript-eslint/consistent-type-imports`. As versões continuam exatas, sem ranges.
2. **Os 3 peers ficam registados, não calados.** Novo portão `pnpm run peers`
   (`scripts/check-peer-deps.mjs`): corre `pnpm peers check --json`, compara com uma **allowlist
   nomeada** de exceções (uma por pacote declarante, com `reason` e `until` escritos) e falha nos
   **dois sentidos** — achado sem exceção, e exceção que já não corresponde a nada. `missing` e
   `conflicts` nunca são desculáveis. A alternativa contrária — `|| true`, `continue-on-error` ou
   descer para 9.x — estava proibida pelo princípio da Fase 0 de nunca desactivar um gate para
   ficar verde.
3. **Orçamento de bundle executável** (`pnpm run budget`, `scripts/bundle-budget.mjs`): limites
   fixos de **150 kB** de chunk partilhado, **240 kB** de first-load por rota e **520 kB** de
   total de cliente, todos em gzip, medidos no output da build. Como o Turbopack não publica
   `app-build-manifest.json`, o mapeamento rota → chunk é feito a partir de `rootMainFiles` e dos
   `<script src="/_next/static/…">` do HTML pré-renderizado de cada rota (as rotas dinâmicas são
   cobertas pelo chunk partilhado + pela rota-irmã pré-renderizada); uma dependência que entre no
   bundle partilhado fora do permitido falha o gate. `three` é medido separadamente como diferido.
4. **Dois projetos de teste** em `vitest.config.mts`: `node` (lógica pura + scripts do repo) e
   `dom` (jsdom + Testing Library + jest-dom), com `resolve.alias` declarado explicitamente
   porque o Vite não herda os `paths` do `tsconfig`. O `*.dom.test.ts` é excluído do projeto `node`
   — sem `window`, falharia por ambiente e não por defeito.
5. **Acessibilidade passa a ter instrumento**: `axe-core@4.14.0` (MPL-2.0) no projeto `dom`
   (`src/app/accessibility.test.tsx`), com três regras desactivadas **cada uma com justificação
   escrita no ficheiro** (`color-contrast`, coberto pelo contrato de tokens QG-21;
   `landmark-one-main` e `region`, porque os fragmentos montados em teste vivem fora do
   `AppShell`). `pnpm run test:a11y` é o comando curto.
6. **Comboio local** = `pnpm run verify` na ordem
   `peers → typecheck → lint → format:check → test → build → budget` (QG-09, 02, 03, 04, 05, 06,
   20), replicado passo a passo em CI.
7. **Duas novas classes de contrato automatizado**: QG-21 (tokens/contraste — `ADR 0003`) e testes
   dos próprios portões (`scripts/gates.test.mjs`, 8 casos) para que o verificador não fique sem
   verificador.

## 3. Alternativas consideradas

| Alternativa                                                         | Porque não                                                                                                                                         |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ficar em ESLint 9.39.5                                              | linha sem manutenção; o problema dos peers existe exatamente igual, só deixa de ser nosso                                                          |
| `eslint --no-eslintrc`/`--fix` em CI, ou `peers check \|\| true`    | silenciar um portão é o que a Fase 0 proibiu por regra (QG §1, regra 2)                                                                            |
| Trocar para Biome 2.6.3                                             | mais rápido e cobre format+lint, mas `eslint-config-next` não é recriável em 1 dia; fica como candidato declarado em `DEPENDENCIES.md` §2          |
| Patches de `package.json` (`pnpm.overrides`) para alargar os ranges | mentiria ao grafo: os pacotes não testaram contra 10; esconde o risco em vez de o listar                                                           |
| `size-limit` / `@next/bundle-analyzer` no CI                        | `size-limit` mede um bundle próprio que não é o da build do Next; o analyzer é interativo, não um portão. O nosso leitura é o output real da build |
| Lighthouse CI já nesta fase                                         | exige browser; o sandbox não o tem. QG-18 fica PENDENTE com o motivo escrito                                                                       |
| Um único projeto Vitest com `environmentMatchGlobs`                 | deprecado no Vitest 5; dois projetos explícitos mostram o que corre onde                                                                           |

## 4. Consequências

- **Positivas, medidas**: `pnpm run peers` → `3 achado(s), 3 coberto(s), 0 inesperados`, exit 0, e
  o teste do portão prova que um **4.º** peer inesperado falha e que uma exceção obsoleta também
  falha; `pnpm run budget` → 128,9 kB partilhado, 359,5 kB total, 202,5 kB de first-load máximo
  (75 % do limite); suite completa em 7,8 s com 113 testes de Node + 40 de DOM; `pnpm run lint` 0
  erros com as 3 regras adicionais.
- **Aceites**: 3 peers em falta continuam no grafo enquanto os autores não alargarem os ranges — o
  `until` de cada exceção diz o que fecha a conta, e `DEPENDENCIES.md` §4 é o sítio de rastreio;
  `no-console` fica desligado em `scripts/**/*.mjs` porque ali o stdout **é** a saída do portão
  (override de 5 linhas no `eslint.config.mjs`, aplicado a `scripts/**` só); os limites de bundle
  foram escolhidos a partir do que a app já mede + folga, o que pode levar a afrouxá-los em fases
  futuras — cada afrouxamento vai precisar de linha própria em `QUALITY-GATES.md`.
- **Travado sem ADR novo**: adicionar uma exceção à allowlist de peers sem `reason`/`until`
  (o script falha em entradas incompletas); adicionar dependência que entre no bundle partilhado
  sem justificar no budget; voltar a um único projeto de teste com `environmentMatchGlobs`.

## 5. Verificação (comandos executados — 2026-10-24)

| Verificação                       | Comando                                       | Resultado                                                             |
| --------------------------------- | --------------------------------------------- | --------------------------------------------------------------------- |
| Portão de peers                   | `pnpm run peers`                              | exit 0 · `3 achado(s), 3 coberto(s), 0 inesperados`                   |
| Portão de peers falha quando deve | `pnpm exec vitest run scripts/gates.test.mjs` | **8/8**, incluindo os dois sentidos da allowlist                      |
| Orçamento de bundle               | `pnpm run budget`                             | `Dentro do orçamento.` exit 0 (3 limites + regra de `three` diferido) |
| Lint                              | `pnpm run lint`                               | 0 erros, 0 avisos (ESLint 10.13.0)                                    |
| Suite completa                    | `pnpm run test`                               | 14 ficheiros / 153 testes, 0 falhas                                   |
| Comboio completo                  | `pnpm run verify`                             | exit 0 nos 7 passos                                                   |
| CI remoto                         | `gh run watch <run> --exit-status`            | ver `QUALITY-GATES.md` §4.3                                           |

## 6. Reversão

Descer para ESLint 9.39.5 é um comando (`pnpm add -D eslint@9.39.5`) e apaga a allowlist de peers —
mas mantém o `check-peer-deps.mjs` a trabalhar (a allowlist ficaria vazia e o portão passaria a
ser redundante, não partido). O `bundle-budget.mjs` e os dois projetos de teste são independentes do
lint: sobrevivem a qualquer troca de ferramenta, incluindo Biome.
