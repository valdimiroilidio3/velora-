# VELORA — Dependências: escolhas, versões verificadas, custos e riscos

> Toda a versão citada neste documento foi **lida no registo npm a 2026-10-24**, não recordada de
> memória. "Instalado" = está no `package.json`/`pnpm-lock.yaml`; "adiado" = avaliado, mas
> deliberadamente **não** instalado. A §1 é a fundação da Fase 0 e a §1.2 o que a Fase 2 acrescentou;
> as linhas de §2 que a Fase 2 converteu em "instalado" mantêm-se visíveis com esse marcador — este
> ficheiro é histórico de decisões, não um estado actual reescrito.

---

## 1. Instalado na Fase 0 (12 pacotes diretos)

| Pacote               | Versão fixada                 | Licença    | Finalidade                                                                                          | Porquê esta versão                                                                                                 | Impacto de custo |
| -------------------- | ----------------------------- | ---------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------- |
| `next`               | 16.4.3                        | MIT        | Framework de aplicação (App Router, RSC, rotas de API)                                              | `latest` estável no registo. Exige Node ≥ 20.9.0 — cumprimos (22.22.3). Turbopack é o bundler por omissão          | €0               |
| `react`              | 19.3.1                        | MIT        | Runtime da interface                                                                                | Preenche o peer `^19.0.0` do `next@16.4.3`                                                                         | €0               |
| `react-dom`          | 19.3.1                        | MIT        | Render em navegador/streams                                                                         | Tem de casar com `react` (`peer: react@^19.3.1`)                                                                   | €0               |
| `zod`                | 4.6.7                         | MIT        | Validação de configuração agora; de todas as fronteiras de entrada nas fases 1+                     | `latest`. Nota de compatibilidade em §3.3                                                                          | €0               |
| `typescript`         | 5.9.3                         | Apache-2.0 | Compilador/tipos                                                                                    | Ver §3.1 (a `latest` do registo é 7.0.2, mas está fora do intervalo suportado pelo ecossistema de lint)            | €0               |
| `eslint`             | 9.39.5 → **10.13.0** (Fase 2) | MIT        | Lint                                                                                                | §3.2 e `ADR 0005`: a 9.x ficou sem manutenção; os 3 peers por cumprir passaram a exceção escrita no portão         | €0               |
| `eslint-config-next` | 16.4.3                        | MIT        | Config partilhada: regras Next + react-hooks + jsx-a11y + import + typescript-eslint em flat config | Alinhado com a versão do `next` (o pacote é publicado emparelhado)                                                 | €0               |
| `vitest`             | 5.0.5                         | MIT        | Testes unitários de lógica de fundação                                                              | `latest`. Exige Node ^22.12 ou ≥24 — cumprimos                                                                     | €0               |
| `prettier`           | 3.9.10                        | MIT        | Formatação determinística (elimina ruído de revisão)                                                | `latest`                                                                                                           | €0               |
| `@types/node`        | 22.20.5                       | MIT        | Tipos do Node                                                                                       | Linha 22 = runtime real; a `latest` do pacote é 26.6.5 (Node 26) e introduziria APIs que não existem neste runtime | €0               |
| `@types/react`       | 19.3.0                        | MIT        | Tipos do React                                                                                      | Linha 19 alinhada com `react@19.3.1`                                                                               | €0               |
| `@types/react-dom`   | 19.3.0                        | MIT        | Tipos do React DOM                                                                                  | idem                                                                                                               | €0               |

Nada disto foi instalado "para o caso de vir a ser preciso": os 12 pacotes sustentam exatamente as
coisas que a Fase 0 executa (build, tipos, lint, testes, arranque, validação de configuração).

### 1.2 Adicionados na Fase 2 (11 pacotes diretos: 5 de produto, 6 de teste)

| Pacote                                            | Versão          | Licença     | Finalidade                                                       | Porquê esta versão / esta altura                                                                 | Peso medido                                  |
| ------------------------------------------------- | --------------- | ----------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| `tailwindcss`                                     | 4.3.3           | MIT         | tokens → utilitários (`@theme`), escala tipográfica, breakpoints | linha actual; o projeto é `@theme`-first (`ADR 0003`), a config JS da v3 não nos serve           | 839 kB em disco                              |
| `@tailwindcss/postcss`                            | 4.3.3           | MIT         | ponte PostCSS usada pelo Next                                    | tem de casar com `tailwindcss` (são publicados em conjunto)                                      | dev/build                                    |
| `clsx`                                            | 2.1.1           | MIT         | composição condicional de classes nos primitivos                 | ~1 kB, zero APIs; cobre o que `cva`/`tailwind-merge` dariam, sem o custo                         | dev/build                                    |
| `lucide-react`                                    | 1.61.0          | ISC         | ícones de navegação, estado e controlos da cena                  | pedido explícito da Fase 2; importações nomeadas são _tree-shaken_                               | 41 MB em disco, nada de extra no bundle      |
| `three`                                           | 0.186.1         | MIT         | volumetria WebGL                                                 | `ADR 0004`; entra só na rota da cena, como chunk diferido                                        | 23 MB em disco · **134,5 kB gzip** diferidos |
| `@types/three`                                    | 0.186.0         | MIT         | tipos do `three`                                                 | a linha menor tem de coincidir (0.186)                                                           | dev                                          |
| `jsdom`                                           | 30.1.3          | MIT         | ambiente de teste de DOM                                         | `engines` pede Node ^22.22.2/≥26 → cumprimos (22.22.3)                                           | 7,1 MB · dev                                 |
| `@testing-library/react` + `@testing-library/dom` | 16.3.3 / 10.4.1 | MIT         | teste de componentes e de estados                                | `dom` é peer declarado pela RTL e por isso foi instalado à frente, não deixado à resolução       | dev                                          |
| `@testing-library/jest-dom`                       | 7.0.1           | MIT         | _matchers_ de acessibilidade (`toBeDisabled`, `toHaveAttribute`) | versão com export `./vitest` estável                                                             | dev                                          |
| `axe-core`                                        | 4.14.0          | **MPL-2.0** | varrimento de acessibilidade (QG-16)                             | é o motor por trás do `jest-axe`; usámo-lo directamente para não herdar manutenção de um wrapper | 3,4 MB · dev                                 |

Delta medido no grafo: `pnpm-lock.yaml` de 4.554 → 5.405 linhas, 531 entradas em
`node_modules/.pnpm`, 622 MB em disco. O que chega ao browser não é "o tamanho do `node_modules`":
é o que o portão mede — **128,9 kB** de chunk partilhado, **359,5 kB** de total de cliente,
**202,5 kB** de primeiro carregamento máximo (`/app/projetos/[slug]`), tudo em gzip, com `three`
fora do partilhado.

Deliberadamente **de fora**: `@vitejs/plugin-react` (verificado — o esbuild do Vitest compila o JSX
dos testes sem plugin), `@vitest/coverage-v8` (nenhum gate pede percentagem), `cva`,
`tailwind-merge`, `next-themes`, e qualquer biblioteca de animação.

Tamanho medido: 23 pacotes no grafo runtime (264 com dev) e 362 entradas no lockfile. O peso real
de `node_modules` é irrelevante para o produto (bundle do browser é medido em Fase 1 com Lighthouse).

---

## 2. O que **não** foi instalado, e porquê

A instrução foi explícita: não encher o `package.json` de bibliotecas futuras. Cada linha abaixo é
uma decisão adiada com critério de ativação, não uma omissão.

| Candidato                                          | Versão verificada no registo           | Estado                           | Critério para instalar                                                                                                                                       |
| -------------------------------------------------- | -------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|                                                    | 0.186.1 (MIT) + `@types/three` 0.186.0 | **instalado na Fase 2**          | o pedido da Fase 2 exigia área 3D real com gestão de contexto; ver §1.2 e `ADR 0004`                                                                         |     |
| `@types/three`                                     | 0.186.0                                | adiado                           | acompanha `three` (linhas menores têm de coincidir)                                                                                                          |
| `drizzle-orm`                                      | 0.45.4 (Apache-2.0)                    | **recomendado, adiado**          | Fase 1, junto da primeira tabela real + `DATABASE_URL`                                                                                                       |
| `drizzle-kit`                                      | 0.31.11 (MIT)                          | adiado                           | com o `drizzle-orm`                                                                                                                                          |
| `postgres` (postgres.js)                           | 3.4.9 (Unlicense)                      | adiado                           | driver escolhido se a decisão de ORM se mantiver em Drizzle                                                                                                  |
| `prisma` / `@prisma/client`                        | 8.0.0-rc.27 / 7.10.1                   | rejeitado por agora              | ver §3.4                                                                                                                                                     |
| `pg`                                               | 8.23.1 (MIT)                           | alternativa                      | só se optarmos por `pg` em vez de `postgres.js`                                                                                                              |
| `next-auth`                                        | 4.24.15 (ISC)                          | adiado, com reserva              | declare peer `next ^12…^16` (compatível) mas a Auth.js v4 está em manutenção; a v3 ainda não tem `latest` estável no registo. Decisão na Fase 1 (`ADR-0002`) |
| `@auth/core`                                       | 0.41.3 (ISC)                           | alternativa                      | base de uma solução própria de sessão se preferirmos controlo máximo                                                                                         |
| `@auth/prisma-adapter`                             | 2.11.3                                 | não aplicável                    | pressupõe Prisma                                                                                                                                             |
| `bcryptjs`                                         | 3.0.3 (BSD-3-Clause)                   | adiado                           | hashing de palavras-passe na Fase 1; reavaliar `argon2`/`scrypt` nativo do Node                                                                              |
|                                                    | 4.3.3 (MIT)                            | **instalado na Fase 2**          | entrou com o sistema de design (§1.2, `ADR 0003`); a regra de ativação era exatamente essa                                                                   |     |
| `@tanstack/react-query`                            | 5.104.5 (MIT)                          | adiado                           | Fase 1, quando existir o primeiro cliente que precise de cache de servidor                                                                                   |
| `zustand`                                          | 5.0.16 (MIT)                           | adiado                           | só para estado de editor/cliente; o estado do servidor é do RSC                                                                                              |
| `gsap`                                             | 3.15.0 (licença "Standard no charge")  | adiado + atenção                 | ver §3.5 — não é MIT                                                                                                                                         |
|                                                    | 16.3.3 / 30.1.3                        | **instalado na Fase 2**          | entraram com o primeiro teste de componente (§1.2). `jsdom@30` pede Node ^22.22.2/≥26 → cumprimos                                                            |     |
|                                                    | 6.1.2                                  | **não foi preciso**              | verificado na Fase 2: o esbuild do Vitest compila o JSX dos testes sem plugin (Fast Refresh não é usado em `vitest run`)                                     |     |
| `@testing-library/jest-dom`, `@vitest/coverage-v8` | 7.0.1 / —                              | **jest-dom instalado na Fase 2** | cobertura `@vitest/coverage-v8` continua adiada: nenhum gate nosso pede percentagem de cobertura                                                             |
| `playwright`                                       | —                                      | adiado                           | QG-17 (Fase 1)                                                                                                                                               |
|                                                    | 4.14.0 (MPL-2.0)                       | **instalado na Fase 2**          | QG-16 automatizado no projeto `dom` do Vitest; MPL-2.0 é copyleft de ficheiro ⇒ nunca modificar o fonte da lib no repo (QG-13 confirma)                      |     |
| `@opentelemetry/*`                                 | —                                      | adiado                           | observabilidade Fase 4+                                                                                                                                      |
| `resend`/`nodemailer`                              | —                                      | adiado                           | e-mail transacional Fase 2+                                                                                                                                  |
| SDKs de provedores de IA                           | —                                      | adiado                           | Fase 3+ e **só** com orçamento aprovado (ver `DEPLOYMENT.md` §3)                                                                                             |

---

## 3. Notas de compatibilidade verificadas (o detalhe que costuma doer)

### 3.1 TypeScript: porquê 5.9.3 e não 7.0.2

O registo npm tem `typescript@latest = 7.0.2` (e 6.0.3 na linha 6). O que decide não é o "latest",
é o intervalo de peer das ferramentas que consumem o compilador:

- `typescript-eslint@8.72.0` → `peer: typescript ">=4.8.4 <6.1.0"` → **TS 6.0.x cabe, TS 7.0.2 não**.
- `eslint-config-next@16.4.3` → `peer: typescript ">=3.3.1"` (neutro).
- `@prisma/client@7.10.1` → `peer: typescript ">=5.4.0"`.

Escolha: **5.9.3** (linha mais conservadora ainda suportada por tudo). Subida para 6.0.3 é
segura do ponto de vista dos peers e pode ser feita na Fase 1 com um ADR próprio; para 7.x só
quando o `typescript-eslint` alargar o intervalo. Não aceitamos "typescript@latest" às cegas.

### 3.2 ESLint: 9.39.5 na Fase 0, **10.13.0** na Fase 2 (3 peers por exceção escrita)

Medido, não assumido (ver `QUALITY-GATES.md` §6.4): com 10.13.0, `pnpm peers check` devolvia
"Issues with peer dependencies found" (3 pacotes) e `globalIgnores` rebentava a configuração
(`@eslint/config-array@0.23.5` não conhece a chave). Com 9.39.5: peers limpos, lint verde.
`eslint-config-next@16.4.3` declara `peer: eslint >=9.0.0`, logo 9.39.5 era a fronteira suportada.

**Actualizado na Fase 2** (decisão completa em `ADR 0005`): subimos para **10.13.0**. O que foi
verificado antes de subir, e não depois:

- `eslint-config-next@16.4.3` declara `peer: eslint >=9.0.0` — **sem teto**; a linha 9.x está marcada
  como manutenção no registo, pelo que ficar nela era escolher dívida com data.
- Os 3 achados são tetos de terceiros — `eslint-plugin-import@2.32.0`,
  `eslint-plugin-jsx-a11y@6.10.2`, `eslint-plugin-react@7.37.5` declaram `eslint ^9` porque o autor
  não testou contra a 10, não por incompatibilidade conhecida; nenhuma das regras que o nosso config
  activa usa API removida na 10, e `pnpm run lint` está verde com 0 erros.
- O portão deixou de ser o `pnpm peers check` nu: `pnpm run peers` compara o JSON do pnpm com uma
  allowlist nomeada e **falha nos dois sentidos** (achado sem exceção, exceção sem achado), com 8
  testes no `scripts/gates.test.mjs`. `missing` e `conflicts` nunca são aceites — só `unmet` de teto.

### 3.3 Zod 4 em vez de 3

Zod 4 (4.6.7) é a linha estável; a linha 3 mantém-se em `next`/`alpha` como manutenção. Consequência
direta que apanhámos em teste: em v4 `z.string().url()` foi substituído por `z.url()` e este aceita
qualquer URL válida para o parser WHATWG — daí o `.refine` explícito em `src/lib/env.ts` para
forçar http(s). Ao adicionar validação de formulários na Fase 1, manter `z.url()` + refinar por
esquema em vez de assumir que "URL" significa "site".

### 3.4 Prisma: o registo está a apontar para um RC

`prisma` tem `dist-tags.latest = 8.0.0-rc.27` (pré-lançamento) enquanto `@prisma/client` tem
`latest = 7.10.1`. Instalar hoje com "latest" produziria CLI e cliente em linhas maiores diferentes.
Se a decisão de ORM for Prisma, fixar **7.10.1 em ambos** e registar num ADR. Recomendação da Fase 0:
**Drizzle + `postgres.js`** (menos mágica de geração de código, controlo explícito de SQL para RLS,
`drizzle-kit` para migrações). Esta recomendação **não** é ainda uma decisão implementada — não há
BD nesta fase.

### 3.5 GSAP não é MIT

`gsap@3.15.0` traz licença "Standard 'no charge'": uso gratuito em projetos pessoais e comerciais de
equipas pequenas, mas com limites de dimensão de empresa e restrição de "boilerplate/SaaS" que se
aplique a um produto nosso. Para um SaaS comercial isto é risco de licenciar depois. Alternativas
a avaliar na Fase 4: Web Animations API + transições CSS; `motion` (MIT, `motion.dev`); Framer
Motion passou a `motion` (MIT) — verificar versão no momento da decisão. Não adicionar GSAP agora.

### 3.6 Postgres: `Unlicense` no `postgres.js`

O driver `postgres@3.4.9` é `Unlicense` (domínio público). Sem risco de custo, mas a ausência de
garantia de licença explícita deve constar da revisão QG-13 antes do primeiro lançamento comercial.
Alternativa MIT: `pg@8.23.1`.

---

## 4. Política de instalação

1. **Toda a dependência nova** entra com linha neste ficheiro (finalidade, alternativa recusada, risco)
   e com justificação no PR. Zero exceções "é só um utilitário".
2. **Lockfile commitizado** (`pnpm-lock.yaml`, lockfileVersion 9.0) é a fonte de verdade da resolução;
   o `package.json` usa versões exatas (`.npmrc` → `save-exact=true`).
3. **Scripts de build de dependências bloqueados** por omissão (`pnpm-workspace.yaml` →
   `allowBuilds: {unrs-resolver: false}`). Approvar um `postinstall` exige: quem é o pacote, o que
   o script faz, alternativa inexistente, e registo nesta tabela.
4. **Versões fixadas com o runtime verificado**: nada de ranges abertos em dependências diretas.
   Quando a política `minimumReleaseAge` do pnpm for ativada (candidato Fase 1), as atualizações
   ficam em fila o tempo suficiente para apanhar releases maliciosos recém-publicados.
5. **Sem dependências comerciais** nesta fase. Reavaliar §2.5 de `DEPLOYMENT.md` antes de pagar seja
   o que for.
6. **Peers**: o portão é `pnpm run peers`, não o `pnpm peers check` nu. Uma exceção só entra com
   `parent`, `peer`, `reason` e `until` escritos, e tem de corresponder a um achado real; uma
   allowlist que deixa de ser usada é uma falha, não uma limpeza.
7. **Peso no cliente**: dependência nova que chegue ao browser tem de passar em `pnpm run budget`
   (150 kB partilhado / 240 kB por rota / 520 kB total, gzip). Se o único modo de a fazer caber for
   `next/dynamic` com `ssr: false`, isso faz parte da decisão de instalação — foi assim que o `three`
   coube (134,5 kB diferidos, 0 kB partilhados).
   6 **Atualizações** entram por PRs pequenos com `pnpm outdated` + audit + verify completos; Renovate
   é opcional e adiado (precisa de decisão sobre autonomia de merge).

---

## 5. Impacto no orçamento

- Custo mensal direto do stack instalado hoje: **0 €**.
- Licenças: MIT/ISC/Apache-2.0 em §1 e §1.2, com **uma excepção a vigiar** — `axe-core` é MPL-2.0
  (usado como pacote não modificado em testes de desenvolvimento; nenhum MPL no _bundle_ do produto).
  A confirmação automatizada fica no QG-13 (`pnpm licenses`).
- Riscos a monitorizar (sem custo hoje, com custo potencial depois):

| Risco                                                        | Sinal de alarme                                 | Mitigação                                                                                                     |
| ------------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| "Gratuito" que passa a pago (Vercel, Neon, R2)               | alteração de planos/limites na página de preços | limites e alternativas registados em `DEPLOYMENT.md`; nenhuma dependência exclusiva de fornecedor sem wrapper |
| Ruptura de peer do ecossistema (ESLint/TS/Next emparelhados) | `pnpm peers check` a falhar                     | fixar `eslint-config-next` em espelho do `next` e subir em PR dedicado                                        |
| Fork/abandono de pacote pequeno                              | 0 commits > 12 meses + issues sem resposta      | candidatos com plano de substituição documentado (ex.: driver `postgres` ↔ `pg`)                              |
| Licença a mudar (GSAP-like)                                  | release notes do pacote                         | QG-13 automático a correr `pnpm licenses`                                                                     |

---

## 6. Referências usadas

- Registo npm, lido em 2026-10-24: metadados `dist-tags`, `peerDependencies` e `engines` de cada
  pacote acima (via `registry.npmjs.org`), mais `pnpm view`/`pnpm ls`/`pnpm peers check` no projeto.
- CHANGELOG do pnpm 12.15.0 (local, em `node_modules`) para a substituição de `onlyBuiltDependencies`
  por `allowBuilds` (§4.3).
- Limites de serviços externos: documentados e citados em `DEPLOYMENT.md` §2.

---

## 7. Fase 3: **zero pacotes novos** (e porque isso é o resultado)

O pedido da Fase 3 dizia para verificar impacto no bundle antes de adicionar bibliotecas. A verificação
fez-se **antes** de escrever código e o resultado foi não instalar nada: `three@0.186.1` e
`@types/three@0.186.0` já estavam no grafo desde a Fase 2 (ver `ADR 0004`).

| Candidato                                      | Decisão                       | Custo evitado / motivo                                                                                                                                                 |
| ---------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@react-three/fiber` + `drei`                  | **recusado**                  | ~3 pacotes e um modelo mental novo para um trabalho imperativo; o reconciliador ficaria no caminho mais quente (arrastar um gizmo). Razões completas em `ADR 0006` §1. |
| `@react-three/postprocessing` / EffectComposer | **recusado**                  | o pedido pedia pós-processamento pesado evitado; nenhum efeito foi precisado                                                                                           |
| `zustand` / `jotai` para o estado do editor    | **recusado**                  | o store do editor são ~180 linhas sem dependências, testáveis em Node, ligados ao React por `useSyncExternalStore` (o padrão já existe em `lib/preferences-store.ts`)  |
| `@dimforge/rapier` (física), `web-ifc` (IFC)   | **recusados, fora de âmbito** | declarados no §13 do pedido como fora da fase; o `model-loader.ts` recusa formatos em vez de os receber "para já"                                                      |
| `stats.js`                                     | **recusado**                  | 6 contadores próprios sobre `renderer.info` + `performance.now()` cobrem o que a UI mostra, com as strings no catálogo `i18n`                                          |

Custo real no cliente, medido no fim da fase (`next build`, mais o HTML servido por `next start`):

- `three` **135,1 kB gzip num único _chunk_ diferido** (o `next build` reporta-o como `3q22nnx_8z0a4.js`),
  nunca no _chunk_ partilhado nem em rota pré-renderizada — é o que o portão QG-20 verifica;
- `/app/modelo` abre com **214 kB gzip** de scripts iniciais e **0 kB** de motor; o motor só é pedido
  quando há WebGL para montar o palco (`dynamic(…, { ssr: false })`);
- para comparação, as rotas sem 3D pagam 171,1–205,4 kB. O editor custa, portanto, ~9 kB de UI própria.

Licenças: nada novo a registar — `three` é MIT (já coberto pelo inventário do §2 e pelo portão QG-13).

O que a ausência de pacotes novos **não** prova: que a volumetria é bonita, que a cena corre a 60 fps,
ou que `OrbitControls`/`TransformControls` se comportam bem em telemóvel. Nada disso é verificável sem
browser e sem GPU; o protocolo está em `docs/MANUAL-3D-TESTS.md` e o QG-19 continua PENDENTE.
