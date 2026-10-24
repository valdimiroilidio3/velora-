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

| ID    | Portão                           | Comando                                                                                      | Quando é bloqueante                            |
| ----- | -------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| QG-01 | Instalação reproduzível          | `pnpm install --frozen-lockfile`                                                             | Sempre (CI + local)                            |
| QG-02 | Tipos                            | `pnpm run typecheck` (`tsc --noEmit`, `strict: true`)                                        | Sempre                                         |
| QG-03 | Lint                             | `pnpm run lint` (`eslint .`)                                                                 | Sempre                                         |
| QG-04 | Formatação                       | `pnpm run format:check` (`prettier --check .`)                                               | Sempre                                         |
| QG-05 | Testes unitários                 | `pnpm run test` (`vitest run`)                                                               | Sempre                                         |
| QG-06 | Build de produção                | `pnpm run build`                                                                             | Sempre                                         |
| QG-07 | Arranque + smoke test            | `pnpm start -H 0.0.0.0 -p $PORT` + `curl /api/health`                                        | Antes de cada deploy                           |
| QG-08 | Vulnerabilidades de dependências | `pnpm audit --audit-level=high`                                                              | Sempre (falha em high/critical)                |
| QG-09 | Consistência de peers            | `pnpm peers check`                                                                           | Sempre                                         |
| QG-10 | Política de build scripts        | `pnpm permissions` (nenhuma dependência com `build` permitido sem registo)                   | Sempre                                         |
| QG-11 | Revisão de variáveis de ambiente | teste Vitest `contrato de configuração — .env.example ↔ schema`                              | Sempre                                         |
| QG-12 | Varrimento de segredos           | `gitleaks` em CI + verificação manual documentada                                            | Sempre                                         |
| QG-13 | Licenças de dependências         | `license-checker`/`pnpm licenses` (a adotar)                                                 | Antes de 1.º lançamento comercial              |
| QG-14 | Testes de integração (BD)        | `pnpm run test:integration` (a criar na Fase 1, com PostgreSQL efémero)                      | A partir da Fase 1                             |
| QG-15 | Isolamento entre tenants         | suite dedicada de testes de autorização cross-tenant (ver `SECURITY.md` §4)                  | Antes de qualquer dado real de 2.ª organização |
| QG-16 | Acessibilidade                   | `pnpm run a11y` (axe em CI) + revisão manual de teclado/contraste/leitores de ecrã           | A partir da Fase 1, com UI real                |
| QG-17 | E2E                              | Playwright (a adicionar na Fase 1, quando existir jornada crítica)                           | A partir da Fase 1                             |
| QG-18 | Desempenho web                   | Lighthouse CI (orçamento a definir)                                                          | A partir da Fase 2                             |
| QG-19 | Desempenho 3D                    | BCE por cena: tri-count, draw calls, upload GPU, FPS alvo, tempo até interatividade, memória | A partir da Fase 3 (quando existir 3D)         |

Comboio local completo: `pnpm run verify` (QG-02 → QG-03 → QG-04 → QG-05 → QG-06).

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

| ID    | Gate                             | Resultado                 | Observações medidas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----- | -------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QG-01 | `pnpm install --frozen-lockfile` | **APROVADO**              | `Lockfile is up to date, resolution step is skipped` · `Done in 111ms` · exit 0. O lockfile (`pnpm-lock.yaml`, lockfileVersion **9.0**, 4485 linhas) tem hashes de integridade por pacote. Antes de fixar a política de build scripts, o install **falhou com `ERR_PNPM_IGNORED_BUILDS`** (exit 1) — ver §6.1.                                                                                                                                                                                                                                                  |
| QG-02 | `tsc --noEmit`                   | **APROVADO**              | 0 erros com `strict: true` + `noUncheckedIndexedAccess`, `noImplicitOverride`, `noImplicitReturns`, `useUnknownInCatchVariables`, `verbatimModuleSyntax`.                                                                                                                                                                                                                                                                                                                                                                                                       |
| QG-03 | `eslint .`                       | **APROVADO**              | 0 erros, 0 warnings com ESLint 9.39.5 + `eslint-config-next` 16.4.3 (`core-web-vitals` + `typescript`).                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| QG-04 | `prettier --check .`             | **APROVADO**              | 14 ficheiros normalizados; nova execução sem diffs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| QG-05 | `vitest run`                     | **APROVADO**              | **14 testes passaram** em 1 ficheiro (`src/lib/env.test.ts`), 242 ms. Foram escritos **depois** do código e apanharam 2 defeitos reais (ver §6.2, §6.3).                                                                                                                                                                                                                                                                                                                                                                                                        |
| QG-06 | `next build`                     | **APROVADO**              | Next.js 16.4.3 com Turbopack: `Compiled successfully in 4.9s`, `Finished TypeScript in 2.9s`, 3 páginas geradas em 117 ms. Rotas: `/` (estática), `/_not-found` (estática), `/api/health` (dinâmica).                                                                                                                                                                                                                                                                                                                                                           |
| QG-07 | Arranque + smoke                 | **APROVADO**              | `next start -H 0.0.0.0 -p 3000` → `Ready in 111ms`. `GET /` → **HTTP 200**. `GET /api/health` sem segredos em modo produção → **HTTP 503** `{"status":"config_invalid",…}` (fail-fast deliberado, sem revelar valores). Cabeçalhos presentes na resposta: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()`, `Cross-Origin-Opener-Policy: same-origin`; `x-powered-by` **ausente** (`poweredByHeader: false`). |
| QG-08 | `pnpm audit --audit-level=high`  | **APROVADO**              | `No known vulnerabilities found`. Executado também sem filtro de severidade: `No known vulnerabilities found` (todas as severidades).                                                                                                                                                                                                                                                                                                                                                                                                                           |
| QG-09 | `pnpm peers check`               | **APROVADO**              | `No peer dependency issues found`. **Não estava** aprovado com ESLint 10.13.0 (3 peers em falta) — ver §6.4.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| QG-10 | `pnpm permissions`               | **APROVADO**              | `Denied: unrs-resolver build`. Zero dependências com scripts de build permitidos; a recusa é explícita e registada, pelo que o install não fica com aprovação pendente.                                                                                                                                                                                                                                                                                                                                                                                         |
| QG-11 | Contrato `.env.example` ↔ schema | **APROVADO**              | 5 testes no grupo `contrato de configuração`: separador de bloco reservado, chaves ativas ⊆ schema, schema ⊆ chaves ativas, bloco reservado fora do schema, e "sem credenciais reais no exemplo".                                                                                                                                                                                                                                                                                                                                                               |
| QG-12 | Varrimento de segredos           | **APROVADO (manual/CLI)** | `git check-ignore -v .env.local` → ignorado por `.gitignore:17 (/.env.*)`. Varredura de 19 ficheiros preparados para commit com padrões `AKIA…`, `ghp_…`, `xox[baprs]-`, `-----BEGIN …PRIVATE KEY`, `sk-…`, `AIza…` → **0 ocorrências**. Atribuições `*SECRET*="…"`/`*PASSWORD*="…"` fora de exemplos/testes → **0 ocorrências**. `gitleaks` em CI: **PENDENTE** (ferramenta não instalada no sandbox; fica no workflow como job não-bloqueante até haver decisão de pinned version).                                                                           |
| QG-13 | Licenças                         | **PENDENTE**              | Feito manualmente nesta fase: as 12 dependências diretas são MIT/ISC/Apache-2.0 (ver `DEPENDENCIES.md` §1). Automatizar com `pnpm licenses` na Fase 1.                                                                                                                                                                                                                                                                                                                                                                                                          |
| QG-14 | Testes de integração BD          | **BLOQUEADO**             | Sem Docker, sem binário PostgreSQL e sem base de dados acessível neste ambiente. Nenhum teste de integração foi escrito nem executado.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| QG-15 | Isolamento entre tenants         | **BLOQUEADO**             | Não existe persistência nem autorização implementadas. **Nenhuma afirmação de proteção cross-tenant é feita** — ver `SECURITY.md` §4.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| QG-16 | Acessibilidade                   | **PENDENTE**              | Feita apenas revisão manual do shell (nada automatizado): `<html lang="pt">`, ordem de títulos `h1 → h2`, `<main id="conteudo">`, skip link funcional, foco visível (`:focus-visible` com outline), conteúdo não depende só de cor, `prefers-color-scheme` e `prefers-reduced-motion` respeitados, texto de 16 px com `line-height 1.6`. Auditoria axe em CI e teste com leitor de ecrã: **PENDENTE** da Fase 1 (precisa de UI real).                                                                                                                           |
| QG-17 | E2E                              | **PENDENTE**              | Playwright ainda não adicionado (peso de download dos browsers + decisão de ambiente de execução).                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| QG-18 | Lighthouse                       | **PENDENTE**              | A partir do momento em que existir UI com jornada real.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| QG-19 | Desempenho 3D                    | **PENDENTE**              | Nada de 3D implementado. O orçamento a que teremos de obedecer está definido em `ARCHITECTURE.md` §8, mas não existe um único byte de cena 3D para medir.                                                                                                                                                                                                                                                                                                                                                                                                       |

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

## 5. O que um PR tem de mostrar

1. Saída de `pnpm run verify` verde (ou o job de CI correspondente ligado ao PR).
2. Se tocou em dependências: resultado de `pnpm audit`, `pnpm peers check` e a linha correspondente em `DEPENDENCIES.md` atualizada.
3. Se introduziu variável de ambiente: `.env.example` no bloco certo + teste QG-11 verde.
4. Se tocou em autorização ou dados: teste QG-15 respetivo a passar, com o caso de teste visível no PR (negativo primeiro: provar que falha quando o controlo é removido).
5. Se mexeu num gate ou numa regra de lint: justificação no ADR, não apenas na descrição do PR.

---

## 6. Defeitos encontrados e corrigidos durante a Fase 0

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

### 6.6 Telemetria do Next.js

O primeiro build imprimiu o aviso de recolha de telemetria. Não existe forma limpa de a desligar a
partir do repositório sem uma dependência extra (isto é preciso que `NEXT_TELEMETRY_DISABLED=1`
esteja definido antes do arranque do processo). Ficou: variável documentada no bloco ATIVO do
`.env.example` **e** definida no job de CI. Em ambiente local é responsabilidade do developer.

---

## 7. Limites do que foi verificado

Para não deixar dúvidas sobre o que esta fase **não** prova:

- Não existe teste de base de dados, de isolamento por organização, de autenticação ou de autorização.
- Não existe análise de acessibilidade automatizada nem auditoria Lighthouse.
- O `pnpm audit` cobre o grafo instalado hoje; não cobre o que ainda não foi adicionado
  (Three.js, ORM, drivers de IA), nem substitui revisão de licenças.
- O smoke test QG-07 foi executado num único ambiente de execução, com o build do próprio repositório.
- O caminho de deploy (Vercel) não foi exercitado: `vercel.com` não é alcançável a partir deste sandbox.
