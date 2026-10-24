# VELORA

**SaaS internacional para criar, apresentar e comercializar empreendimentos imobiliários** com
geração assistida por IA, modelação BIM progressiva e experiências 3D interativas no navegador.

> **Estado atual: Fase 2 concluída localmente — aplicação-base, sistema de design e camada 3D de
> demonstração, com evidência executada.** Existem rotas, componentes, tokens, uma cena WebGL e dados
> de demonstração rotulados. **Não** existe: autenticação real, persistência, multi-tenancy, editor de
> geometria, importação de plantas, IA, pagamentos nem publicação. Ver §[Estado real](#estado-real)
> e `docs/QUALITY-GATES.md` §4.3.

---

## Objetivo do produto

Substituir o fluxo disperso de venda de um empreendimento (PDFs, plantas, renders avulsos,
folhas de cálculo, links de drive) por um ativo digital único: gerar o projeto a partir de material
bruto, refiná-lo num editor com capacidades de construção, publicá-lo em versões imutáveis,
apresentá-lo em 3D ou numa visita guiada partilhável e converter interesse em leads dentro do mesmo
espaço de trabalho — privado por organização.

Detalhe, personas, jornadas, âmbito e critérios de sucesso: `docs/PRODUCT-SPEC.md`.

## Stack técnica (versões fixadas a 2026-10-24, lidas no registo npm)

| Camada        | Escolha                                                                         | Onde está a justificação                   |
| ------------- | ------------------------------------------------------------------------------- | ------------------------------------------ |
| Aplicação     | Next.js **16.4.3** (App Router, Turbopack) + React **19.3.1**                   | `docs/ADR/0001`, `docs/DEPENDENCIES.md`    |
| Linguagem     | TypeScript **5.9.3** com `strict` + regras duras                                | `docs/ARCHITECTURE.md`                     |
| Validação     | Zod **4.6.7** (configuração agora; todas as fronteiras na Fase 1)               | `src/lib/env.ts`                           |
| Qualidade     | ESLint **10.13.0** + `eslint-config-next` 16.4.3, Prettier 3.9.10               | `docs/ADR/0005`, `docs/QUALITY-GATES.md`   |
| Interface     | Tailwind CSS **4.3.3** com 128 tokens em `src/app/globals.css`                  | `docs/DESIGN-SYSTEM.md`, `docs/ADR/0003`   |
| Testes        | Vitest 5.0.5 em 2 projetos (`node`, `dom`/jsdom) + Testing Library + `axe-core` | `docs/QUALITY-GATES.md` §4.3               |
| Ícones        | `lucide-react` 1.61.0 (ISC)                                                     | `docs/DEPENDENCIES.md` §1.2                |
| Pacotes       | pnpm **12.15.0** via Corepack, lockfile commitizado, `allowBuilds` restrito     | `docs/DEPENDENCIES.md` §4                  |
| Base de dados | PostgreSQL + Drizzle — **decidido, adiado para a Fase 1** (nada instalado)      | `docs/DATA-MODEL.md` §7                    |
| 3D            | Three.js **0.186.1** — volumetria WebGL com alternativa não-gráfica             | `docs/ADR/0004`, `docs/ARCHITECTURE.md` §8 |
| Alojamento    | Vercel para dev/preview; alojamento de uso **comercial** é decisão pendente     | `docs/DEPLOYMENT.md` §2                    |

Multi-tenancy: uma base partilhada, isolamento por organização com Row-Level Security; a política, a
configuração correta do contexto de tenant e os testes exigidos estão em `docs/SECURITY.md` §3.

## Pré-requisitos

- Node.js **≥ 22.12** (ver `.nvmrc`; o mínimo é o cruzamento dos `engines` de Next/Vitest/ESLint).
- pnpm: fornecido pelo **Corepack** através do campo `packageManager` — `corepack enable pnpm`.
- Git 2.x. Docker/base de dados: **não** são precisos na Fase 2 — não há persistência.
- Browser com WebGL 2 para ver a cena; sem WebGL a vista degrada para planta + tabela de pisos.
- Nada de contas pagas: a fundação corre sem qualquer serviço externo.

## Instalação e execução local

```bash
corepack enable pnpm
pnpm install --frozen-lockfile
pnpm dev            # http://localhost:3000
```

Rotas para percorrer (todas com dados de demonstração rotulados):

| Rota                   | O que mostra                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `/`                    | landing com posicionamento e maquete vetorial de marca                                   |
| `/acesso`              | formulário com validação real — **não** cria sessão nem simula autenticação              |
| `/app`                 | shell com barra lateral adaptativa, cabeçalho contextual e visão geral                   |
| `/app/projetos`        | lista/grelha com pesquisa e filtros no URL (funcionam sem JavaScript) + estado vazio     |
| `/app/projetos/<slug>` | ficha de projeto com planta SVG, medidas e cena 3D                                       |
| `/app/cena`            | palco 3D: presets de vista, órbita limitada, métricas de render, alternativa não-gráfica |
| `/app/preferencias`    | tema, densidade e movimento (só em `localStorage`) + mapa do estado das rotas            |
| `/api/health`          | verificação de runtime (config + headers de segurança)                                   |

Build de produção e verificação de runtime (o que a Fase 0 executa como gate QG-06/QG-07):

```bash
pnpm run build
pnpm start -H 0.0.0.0 -p 3000
curl -s http://127.0.0.1:3000/api/health
curl -sI http://127.0.0.1:3000/ | grep -iE 'x-content-type|referrer|x-frame|permissions-policy|cross-origin-opener'
```

## Configuração de variáveis de ambiente

Copiar `.env.example` para `.env.local` (não commitizado). Na Fase 0 **nenhuma variável é obrigatória**
para correr em desenvolvimento.

- O ficheiro divide-se em **BLOCO ATIVO** (validado por `src/lib/env.ts`) e **BLOCO RESERVADO**
  (documentado para fases futuras, propositadamente fora do schema).
- A consistência entre os dois é um teste (`pnpm run test`), não uma nota de revisão.
- Em **produção** a validação é fail-fast: sem `AUTH_SECRET`, sem `DATABASE_URL` ou com
  `NEXT_PUBLIC_SITE_URL` não-HTTPS a aplicação recusa-se e `/api/health` responde `503 config_invalid`
  (sem revelar valores, por desenho).
- Segredos reais nunca entram no repositório: vivem no host de alojamento/secret manager.

## Comandos de qualidade

| Comando                         | O que verifica                                                                                              |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `pnpm run typecheck`            | `tsc --noEmit` com `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `useUnknownInCatchVariables` |
| `pnpm run lint`                 | ESLint (regras Next + react-hooks + jsx-a11y + typescript-eslint) — **sem desativações em bloco**           |
| `pnpm run format:check`         | Prettier                                                                                                    |
| `pnpm run test`                 | Vitest — **14 ficheiros, 153 testes** (113 em Node, 40 em jsdom)                                            |
| `pnpm run test:a11y`            | só o projeto de DOM, com varrimento `axe-core` (QG-16)                                                      |
| `pnpm run budget`               | orçamento de bundle em gzip: partilhado 150 kB · first-load 240 kB · total 520 kB (QG-20)                   |
| `pnpm run build`                | Build de produção (Turbopack)                                                                               |
| `pnpm run verify`               | peers → typecheck → lint → format:check → test → build → budget                                             |
| `pnpm audit --audit-level=high` | vulnerabilidades conhecidas do grafo                                                                        |
| `pnpm run peers`                | portão de peers com allowlist nomeada: falha em achado novo **e** em exceção obsoleta                       |
| `pnpm permissions`              | política de scripts de build de dependências (`Denied: unrs-resolver build`)                                |

Estado de cada portão — incluindo o que **não** pôde ser executado aqui (QG-17 E2E, QG-18
Lighthouse, QG-19 desempenho 3D por dispositivo por falta de GPU/browser; QG-14/QG-15 por falta de
base de dados) — em `docs/QUALITY-GATES.md` §2 e §4.3.

## Estratégia de versionamento

- `main` protegida, trabalho por PR com `pnpm run verify` verde; Commits convencionais
  (`type(scope): resumo`); tags anotadas `vX.Y.Z`.
- Decisões estruturais entram como ADR novos em `docs/ADR/` — o histórico não se reescreve.
- Ramos de sessão/ferramenta (ex.: `arena/*`) incorporam-se por PR, nunca com push direto em `main`.
- `1.0` só com isolamento entre tenants testado, autenticação real, backup com restauro testado
  (critérios em `docs/PRODUCT-SPEC.md` §7.3 e `docs/DEVELOPMENT-WORKFLOW.md` §9).

## Estado real do que existe

**Implementado e executado na Fase 2** (evidência por portão em `docs/QUALITY-GATES.md` §4.3):

- **7 rotas de produto** + `/api/health`, com estados de carregamento, erro e 404 por segmento.
- **Sistema de design** — 128 tokens num único ficheiro, tema claro/escuro, duas densidades,
  movimento reduzido, 9 primitivas de UI testadas, contrato de contraste automatizado (QG-21) e
  contrato de identidade (sem gradientes, um único acento, três níveis de sombra).
- **Camada 3D** — `three@0.186.1` com volumetria procedural determinística, controlos de câmera com
  limites, `dispose()` + `forceContextLoss()`, alternativa não-gráfica seleccionável e leitura de
  fps/triângulos/`drawCalls` no palco. `three` fica fora do chunk partilhado (134,5 kB diferidos).
- **Dados de demonstração** — 6 empreendimentos fictícios tipados (`DEMO-01…06`) com
  `DemoBadge`/`DemoNotice` em cada superfície; nada é apresentado como dado de cliente.
- **Ferramenta alargada** — ESLint 10, dois projetos de teste, `axe-core`, portão de peers com
  exceções escritas, portão de orçamento de bundle, 153 testes; os mesmos comandos em CI.
- **Documentação** — `docs/DESIGN-SYSTEM.md` + `ADR 0003`/`0004`/`0005`, com os documentos da
  Fase 0 atualizados para o estado real (arquitetura, produto, dependências, qualidade, workflow).

**Implementado na Fase 0 (mantém-se):**

- 9 documentos de decisão (`docs/`) + 1 ADR + template de ADR.
- Configuração completa da ferramenta: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`,
  `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`, `vitest.config.mts`, `.prettierrc.json`,
  `.npmrc`, `.nvmrc`, `.gitignore`, `.env.example`.
- Aplicação mínima real: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`,
  `src/app/api/health/route.ts`, `src/lib/env.ts`, `src/lib/env.test.ts`. Serve para **executar**
  build, testes, cabeçalhos e smoke test — não para simular progresso.
- CI definida **e executada** em `.github/workflows/ci.yml`: run 40109854774 no branch de trabalho,
  workflow `CI`, 15/15 passos verdes em 32 s (ver `docs/QUALITY-GATES.md` §4.1).
- Resultados medidos: typecheck, lint, formatação, 14 testes, build, arranque com `HTTP 200`,
  `audit` sem vulnerabilidades, `peers check` limpo, varrimento de segredos limpo.

**Não implementado (nada disto tem código, esquemas ou testes):**

- Autenticação, sessões, MFA, convite/papéis por organização.
- PostgreSQL, ORM, migrações, RLS, testes de isolamento entre tenants.
- Uploads/gerestão de ficheiros (validação por conteúdo, URLs pré-assinadas, EXIF).
- Gestão de empreendimentos/tipologias/projetos/versões; editor de construção; camadas BIM.
- Editor de seleção/transformação de elementos, materiais PBR por projeto, LOD, KTX2 e medição de
  desempenho 3D em dispositivo real (QG-19).
- Geração por IA (texto/imagem/planta/ficheiro) e o seu modelo de custo/limites.
- Visitas guiadas, experiência cinematográfica, partilhas públicas, analytics de visita.
- Leads, pedidos de contacto, notificações, planos, pagamentos, ativação manual.
- i18n (UI e conteúdo), acessibilidade auditada (axe/Lighthouse), E2E, observabilidade, backups.

**Bloqueios que exigem ação humana** (detalhe em `docs/DEPLOYMENT.md` §4 e §10):

- **B-01** O repositório encontrado é `valdimiroilidio3/velora-` e é **público**; o plano previa `velora`
  **privado**. Nada foi renomeado nem alterado — é decisão do dono da conta.
- **B-02** O free tier da Vercel (Hobby) é só para uso pessoal **não-comercial** (fair use/ToS), o que não
  é compatível com o lançamento comercial do VELORA. Precisa de decisão antes do primeiro beta público.
- **B-05/B-10** Orçamento de IA e bases legais/DPA.
- Proteção de `main` (branch protection + revisões obrigatórias) ainda **não** está ativa: o CI já
  corre em cada push, mas nada impede hoje um merge sem CI verde. Ação humana pendente.

## Índice de documentação

| Documento                               | Conteúdo                                                                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/PRODUCT-SPEC.md`                  | visão, personas, jornadas, âmbito, restrições, critérios de sucesso, riscos                                                           |
| `docs/ARCHITECTURE.md`                  | fronteiras e camadas, regra de dependência, configuração, erros/observabilidade, limites 3D/BIM, o que não antecipar                  |
| `docs/DATA-MODEL.md`                    | entidades conceptuais, relações, posse, matriz de acesso, estados, decisões abertas                                                   |
| `docs/SECURITY.md`                      | identidade/autorização, isolamento por tenant + RLS, segredos, entradas, uploads, rate limiting, auditoria, backups, privacidade      |
| `docs/QUALITY-GATES.md`                 | portões QG-01…QG-21, ambiente, **resultados executados** (Fase 0 em §4, Fase 2 em §4.3), defeitos encontrados, limites da verificação |
| `docs/DESIGN-SYSTEM.md`                 | tokens, contraste medido, tipografia, espaçamento, movimento, inventário de componentes, estados e acessibilidade                     |
| `docs/ADR/0003-design-system.md`        | tokens num único ficheiro, tema por `data-*`, densidade por multiplicador, tipografia de sistema                                      |
| `docs/ADR/0004-camada-3d.md`            | volumetria procedural, ciclo de vida WebGL, alternativa não-gráfica, o que fica travado                                               |
| `docs/ADR/0005-toolchain-fase-2.md`     | ESLint 10 com allowlist de peers, orçamento de bundle, dois projetos de teste, `axe-core`                                             |
| `docs/DEPENDENCIES.md`                  | por pacote: finalidade, justificação, alternativas, compatibilidade verificada, custo, risco                                          |
| `docs/DEPLOYMENT.md`                    | serviços, limites gratuitos, riscos de preço, ambientes, CI, checklist pós-deploy, backups                                            |
| `docs/DEVELOPMENT-WORKFLOW.md`          | ramos, commits, PRs, DoD, portões entre fases, convenções, release                                                                    |
| `docs/ADR/0001-initial-architecture.md` | decisão de arquitetura inicial, alternativas, consequências, verificação, decisões abertas                                            |
| `docs/ADR/TEMPLATE.md`                  | formato para os ADR seguintes                                                                                                         |

## Licença e dados

Projeto privado em fase de fundação (`UNLICENSED` por omissão até haver decisão de licença).
Nenhum dado real, credencial ou conteúdo de cliente neste repositório. Exemplos de configuração usam
`***`, `example` ou domínios `.invalid` — e um teste unitário garante que assim se mantém.
