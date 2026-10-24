# VELORA — Arquitetura (referência de Fase 0, atualizada na Fase 2)

> Documento vivo. A Fase 0 define **fronteiras, contratos e limites**; não implementa módulos
> funcionais. Onde este texto descrever algo que ainda não existe, está marcado como _plano_.
> As decisões com alternativas e consequências estão em `docs/ADR/0001-initial-architecture.md`.

---

## 1. Princípios estruturantes

1. **Um produto, muitos tenants.** A organização (imobiliária/promotor) é a raiz de posse de todos os
   dados. Não existe entidade de negócio "solta" fora de uma organização.
2. **O controlo é no servidor.** Autorização, rate limiting, validação e isolamento aplicam-se em
   rotas/serviços/BD. Esconder um botão é UX, nunca segurança (`SECURITY.md` §3).
3. **Fronteiras finas, domínio puro.** Lógica de negócio em módulos sem dependências de framework
   nem de rede; Next.js, o driver de BD e SDKs de IA ficam nos bordos. Isto mantém o núcleo
   testável sem browser, sem servidor e sem base de dados.
4. **3D é um subsistema, não o centro.** A camada Three.js consome uma descrição de cena serializável
   produzida pelo domínio; nunca é fonte de verdade dos dados.
5. **Progressivo e verificável.** Cada fase termina com um gate verde e com a descrição do que ainda
   não funciona. Complexidade só entra com necessidade demonstrada (ver §9 "não antecipar").
6. **Custo 0 € até existir cliente pagante.** Toda a integração externa paga tem de ser substituível
   por uma alternativa self-hosted sem reescrever o domínio (ports & adapters).

---

## 2. Vista de conjunto

```
┌──────────────────────────── Navegador ─────────────────────────────┐
│  React (RSC + ilhas client)   ·   Canvas/WebGL (Three.js) [plano] │
│  i18n (locale no pathname)    ·   Player de visita guiada [plano] │
└───────────────┬────────────────────────────▲───────────────────────┘
                │ HTTP(S) + cookies de sessão │ streaming de assets / CDN
┌───────────────▼─────────────────────────────┴──────────────────────┐
│  Next.js 16 (App Router) — alojamento a decidir (Vercel? §DEPLOY)  │
│  ├── rotas de página (RSC)                                         │
│  ├── route handlers (`/api/*`) — fronteira de entrada HTTP         │
│  ├── middleware — sessão, CSRF, limites, locale  [plano Fase 1]    │
│  └── server actions — mutações simples          [plano Fase 1]     │
└───────────────┬────────────────────────────────────────────────────┘
                │ chamadas diretas (mesmo processo) — sem HTTP interno
┌───────────────▼────────────────────────────────────────────────────┐
│  src/server  (casos de uso / orquestração)                         │
│  autorização por tenant → validação (zod) → domínio → persistência │
└──────┬──────────────────────────┬───────────────────────────┬──────┘
       │                          │                           │
┌──────▼───────┐        ┌─────────▼──────────┐      ┌─────────▼──────────┐
│ src/core     │        │ src/db (plano F1)  │      │ src/integrations   │
│ domínio puro │        │ Drizzle + RLS      │      │ IA, storage, e-mail│
│ tipos, regras│        │ postgres.js        │      │ (ports + adapters) │
└──────────────┘        └────────────────────┘      └────────────────────┘
```

Pragmático: o desenho é "monolito modular" — uma aplicação Next.js com fronteiras de import
disciplinadas. **Não** há microsserviços, fila externa nem gateway de API nesta fase; nenhum dos
três tem um único requisito demonstrado. A regra de ativação está em §9.

---

## 3. Organização do código

### 3.1 Estrutura real (Depois da Fase 2)

```
velora/
├── .github/workflows/ci.yml          # QG-01…QG-12, QG-16, QG-20, QG-21 (ver QUALITY-GATES.md §4.3)
├── scripts/                          # portões executáveis: check-peer-deps.mjs, bundle-budget.mjs (+ teste dos dois)
├── docs/                             # este diretório: DESIGN-SYSTEM.md, ADR/0001…0005
├── src/
│   ├── app/                          # única fronteira HTTP (App Router)
│   │   ├── layout.tsx / page.tsx     # raiz: arranque de preferências sem flash + landing pública
│   │   ├── globals.css               # ÚNICA fonte de tokens de design (ver DESIGN-SYSTEM.md)
│   │   ├── api/health/route.ts       # smoke test de runtime; não lê nem escreve dados
│   │   ├── acesso/page.tsx           # página de acesso: valida credenciais, NÃO cria sessão
│   │   ├── error.tsx · not-found.tsx # estados de erro/404 da raiz
│   │   ├── design-tokens.test.ts     # QG-21 (contraste, paleta, proibições de identidade)
│   │   └── app/                      # shell autenticado por aparência (sem auth real)
│   │       ├── layout.tsx · loading.tsx · not-found.tsx · error.tsx
│   │       ├── page.tsx              # visão geral
│   │       ├── projetos/             # lista/filtros por URL + [slug] (pré-render ×6)
│   │       ├── cena/                 # palco 3D isolado (WebGL, fallback, métricas)
│   │       └── preferencias/         # tema / densidade / movimento (+ mapa de estado das rotas)
│   ├── components/
│   │   ├── ui/                       # primitivas de apresentação (button, field, alert, toast, …)
│   │   ├── layout/                   # shell, nav, cabeçalho, preferências (efeitos + formulário)
│   │   ├── projects/                 # cartões, linha, toolbar com estado no URL, planta SVG
│   │   └── scene/                    # volume-scene.ts (imperativo) + scene-stage/view/fallback
│   ├── config/nav.ts                 # estrutura de navegação + estado por fase (sem ícones)
│   ├── demo/                         # dados fictícios rotulados + query determinística + volumetria
│   ├── i18n/pt.ts                    # catálogo das strings de interface (idioma único por enquanto)
│   └── lib/                          # cn, format (Intl), preferences (+ store), webgl, env, validação de acesso
├── tests/                            # [plano F4] integração/E2E; unitários vivem junto do código
├── public/                           # [plano] só quando existir asset binário versionado
└── src/{core,server,db,integrations}/ # [plano F1+] espaços previstos na §3.2, ainda sem conteúdo
```

Não há ficheiros de preenchimento: `src/core`, `src/server`, `src/db` e `src/integrations` **ainda não
existem** e não foram criados "para a arquitetura se ver". A Fase 2 encheu de facto três dos espaços
previstos (`components/`, `i18n/`, `lib/`) e criou dois novos com justificação própria (`demo/`,
`config/`, `components/scene/` + `scripts/`).

### 3.1.1 Para onde vai cada coisa (a regra que evita o monólito)

| Pergunta                                       | Resposta hoje                                                                                                                                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Onde vive uma string de interface?             | `src/i18n/pt.ts`. Um rótulo escrito dentro de um `.tsx` é defeito de revisão.                                                                                                               |
| Onde vive um dado de demonstração?             | `src/demo/**`, sempre com `isDemo`/`DEMO_NOTICE`. Uma página nunca declara um número de exemplo no JSX.                                                                                     |
| Onde vive geometria?                           | `src/demo/massing.ts` produz o `Massing`; `components/scene/volume-scene.ts` renderiza-o; `components/projects/plan-drawing.tsx` desenha-o em SVG. Uma descrição, três consumidores.        |
| Onde vive estado de cliente?                   | Módulos com `useSyncExternalStore` (`lib/preferences-store.ts`) ou o próprio URL (`components/projects/search-events.ts`). Não há biblioteca de estado nem contexto para dados de servidor. |
| Onde vai parar um caso de uso real?            | `src/server/` (com `src/core` por baixo) quando existir persistência; os componentes de hoje chamariam esse módulo, não `src/demo`.                                                         |
| Onde entram integrações (IA, storage, e-mail)? | `src/integrations/` atrás de um _port_ em `src/core`; a UI não conhece SDKs. A fronteira está descrita em §8 e em `SECURITY.md` §6; nenhuma implementação existe.                           | ### 3.2 Regra de dependência (o contrato que a torna possível) |

| Camada                                   | Pode importar                                       | Nunca pode importar                                    |
| ---------------------------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| `src/core`                               | só `src/core`, `zod`                                | Next, `src/db`, `src/integrations`, browser APIs       |
| `src/db`                                 | `src/core` (tipos), driver, `src/lib`               | `src/app`, `src/components`                            |
| `src/integrations`                       | `src/core` (ports), SDKs                            | `src/app`                                              |
| `src/server`                             | `src/core`, `src/db`, `src/integrations`, `src/lib` | JSX/componentes                                        |
| `src/app`, `src/components`              | `src/server`, `src/core` (tipos), UI                | `src/db`, `src/integrations` (exceto via `src/server`) |
| `src/components/ui`                      | `src/lib`, `src/i18n`, React                        | `src/demo`, `src/config`, rotas, `three`               |
| `src/components/{layout,projects,scene}` | `ui`, `lib`, `demo`, `config`, `i18n`               | outros grupos de componentes; `src/app`                |
| `src/demo`, `src/config`, `src/i18n`     | tipos de `src/lib`, `zod`                           | React, `three`, DOM — têm de poder correr no Node      |
| `src/lib`                                | `src/lib`                                           | React DOM no servidor, `src/components`, dados de demo |
| `src/three` (previsto, F3)               | `src/core` (dados de cena)                          | React, Next                                            |

A regra é verificada a dois níveis: os testes de contrato (`design-tokens.test.ts` varre `src/**` à
procura de cores literais; `nav.test.ts` proíbe o catálogo de navegação de importar ícones) e o
orçamento de bundle (QG-20), que falha se uma dependência de renderização entrar no chunk partilhado.

Obrigação de a tornar mecânica na Fase 1 (e não só escrita): regra de `import/no-restricted-paths`
ou `eslint-plugin-boundaries` + teste de arquitetura. Enquanto for apenas convenção, é
documentada como **não verificada**.

### 3.3 Limites de responsabilidade

- **`src/app`**: traduzir HTTP ⇄ domínio. Fazer parse/validação de entrada, chamar um caso de uso,
  mapear erros para respostas. Zero SQL, zero regras de negócio.
- **`src/server`**: autenticar → resolver organização ativa → autorizar papel → orquestrar. É o
  único lugar onde `organizationId` entra nas queries.
- **`src/core`**: invariantes (estados de projeto, transições permitidas, regras de versão), tipos
  de domínio, erros de domínio tipados. Determinístico e sem E/S.
- **`src/db`**: esquema, migrações, transações, políticas de RLS, paginação. Não decide regras.
- **`src/integrations`**: retry/timeouts, limites de custo, transformação para tipos do domínio.

### 3.4 O que já existe (Fases 0 e 2), e porquê

| Ficheiro                                          | Justificação                                                                                                                              |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/layout.tsx` · `page.tsx` · `globals.css` | Sem uma página não há build, não há QG-06/QG-07, não há evidência de cabeçalhos. É intencionalmente uma página de estado, não um produto. |
| `src/app/api/health/route.ts`                     | Smoke test de runtime e verificação post-deploy (QG-07). Não lê nem escreve dados.                                                        |
| `src/lib/env.ts`                                  | Validação de configuração com falha-rápida sem exposição de valores. É a fronteira da gestão de configuração (§5).                        |
| `src/lib/env.test.ts`                             | 14 testes: comportamento do schema + contrato com `.env.example` (QG-11).                                                                 |

| `src/components/ui/**` (9 primitivas) | Toda a superfície de estados (foco, erro, vazio, carregamento, selecção) foi desenhada uma vez, testada 14× e reutilizada em 7 rotas. Sem isto cada página reinventaria botões. |
| `src/components/scene/**` + `src/lib/webgl.ts` | Pedidos de Fase 2 exigiam 3D **com** gestão de contexto, fallback e limites móveis. `ADR 0004`. |
| `src/demo/**` | O produto não tem base de dados: os dados de demonstração precisam de ser tipados, rotulados e determinísticos, não literais no JSX. |
| `scripts/check-peer-deps.mjs` · `bundle-budget.mjs` | Portões QG-09 (com allowlist nomeada) e QG-20; cada um tem teste próprio (`scripts/gates.test.mjs`). |

Nada do que existe hoje contém: persistência, autenticação real, multi-tenancy, geração por IA,
importação de plantas, editor de geometria, exportação IFC ou cobrança.

---

## 4. Estratégia de fronteira única (por que não "API + SPA" nem "microserviços")

Requisito real: o mesmo produto tem de servir páginas públicas leves, uma área autenticada por
organização, e (depois) um editor 3D e uma experiência de visualização partilhável. Alternativa
"SPA + API separada" duplicaria autenticação, cache e deploy; "microserviços" pagaria em
operações por uma escala que não existe. O App Router dá RSC (menos JavaScript no browser),
route handlers para streaming e mutações server-side, e mantém tudo no mesmo build.

Contrato de migração futura: se um dia a camada de renderização deixar de chegar (ex.: um runtime
de GPU ou workers de tesselação), **extraímos** `src/core` + `src/server` para um serviço — os
módulos já não conhecem Next. Nada a construir hoje.

---

## 5. Gestão de configuração

1. Uma única fronteira: `src/lib/env.ts` valida tudo com Zod. Nada de `process.env.X` disperso por
   código de servidor (componentes de cliente leem `NEXT_PUBLIC_*` diretamente — exige acesso
   literal, o bundler substitui em build; ver comentário no ficheiro).
2. **Regra de default**: nenhuma variável tem default de produção. Defaults só existem para
   desenvolvimento local (ex.: `PORT=3000`, `DATABASE_POOL_MAX=5`).
3. **Fail-fast**: em produção faltam `AUTH_SECRET`, `DATABASE_URL` ou um `NEXT_PUBLIC_SITE_URL` não-HTTPS
   ⇒ validação falha. Comprovado no QG-07: `/api/health` devolve `503 config_invalid`.
4. **Ambiente ≠ deploy**: `NEXT_PUBLIC_APP_ENV` (dev/staging/prod) distingue os rótulos; `NODE_ENV`
   não é usado como bandeira funcional dentro do domínio.
5. Segredos nunca vão para o repositório nem para `NEXT_PUBLIC_*` (é inlined no bundle). Ver
   `SECURITY.md` §5.
6. O `.env.example` tem bloco **ATIVO** (validado) e **RESERVADO** (documentado para fases futuras);
   a consistência é verificada por teste, não por disciplina de revisão.
7. Telemetria do framework: `NEXT_TELEMETRY_DISABLED=1` é definido no CI; localmente é decisão do
   developer. Não é opcional em produção partilhada.

---

## 6. Erros, diagnósticos e observabilidade

### 6.1 Taxonomia de erros (plano, Fase 1)

| Classe                                | Exemplo                           | HTTP                   | Registo                            |
| ------------------------------------- | --------------------------------- | ---------------------- | ---------------------------------- |
| `ValidationError`                     | payload não passa no Zod          | 422                    | `warn`, sem dados do payload       |
| `AuthenticationError`                 | sessão ausente/expirada           | 401                    | `info` (contável para brute-force) |
| `AuthorizationError`                  | papel/organização insuficiente    | 403                    | `warn` + evento de auditoria       |
| `NotFoundError`                       | id válido, não pertence ao tenant | 404 (não 403)          | `info` — revelar existência é fuga |
| `DomainError` (subclasses por módulo) | publicar projeto sem versão       | 409 / 422              | `info`                             |
| `ConflictError`                       | otimista de versão (ETag)         | 409                    | `info`                             |
| `IntegrationError`                    | IA/armazenamento falhou           | 502                    | `error` + retry/métrica            |
| `InternalError`                       | bug nosso                         | 500, mensagem genérica | `error` + stack **só** no servidor |

Regras: (a) nunca devolver stack, SQL, chaves, paths ou env ao cliente; (b) o corpo de erro tem
`code` estável + mensagem localizável, nunca texto de exceção crua; (c) `cause` interno mantém-se
para logs; (d) `try/catch` só onde há fronteira — não em cada função.

### 6.2 Observabilidade (plano Fase 4+; hoje não existe nada)

- Logs estruturados em JSON com `requestId` (gerado no middleware) e `organizationId` quando
  autenticado. Proibidos: tokens, passwords, chaves de API, conteúdo de ficheiros, PII além do mínimo.
- `console.log` bloqueado por lint (`no-console`), com `warn`/`error` permitidos para diagnóstico;
  um logger próprio substitui isto quando existir transporte.
- Erros: Sentry (Developer, 5 000 erros/mês) **apenas** com `beforeSend` a scrubar PII — decisão
  adiada; hoje nenhum serviço de erros está ligado.
- Métricas de negócio e de performance: só quando houver tráfego. O budget de performance por
  página é medido com Lighthouse CI (QG-18).

---

## 7. Estratégia de renderização e de dados

- **Server Components por omissão**; `"use client"` apenas onde há interação (canvas, editor,
  formulários com estado de cliente). Orçamento **medido na Fase 2**: chunk partilhado do shell 128,9 kB gzip, primeiro carregamento por
  rota 185–203 kB, total de cliente 359,5 kB (limites 150/240/520 kB, `pnpm run budget`).
- **Mutações**: server actions para operações simples; route handlers quando for preciso streaming,
  uploads `multipart` ou chamadas de terceiros. Sempre com validação de origem/payload e verificação
  de papel no servidor.
- **Cache**: RSC cache/`revalidateTag` por chave de tenant — toda a tag tem de levar
  `org:{organizationId}`; caches partilhados entre tenants são bug de segurança, não de desempenho.
- **Realtime/progresso**: para geração por IA (fase 3), o contrato é tarefa-assíncrona com estados
  (`queued → running → succeeded|failed`) e o cliente faz _poll_ do estado ou lê por stream; não há
  sockets nesta fase.

---

## 8. Camada 3D/BIM (primeira camada implementada na Fase 2)

Estado: **existe uma cena WebGL real com volumetria procedural** (`components/scene/`), alimentada por
um `Massing` derivado de um `SceneSeed` declarativo. Isto **não** é um modelo BIM nem uma planta
certificada — e a própria interface o diz (`ADR 0004` §2.11). Os limites abaixo continuam a ser os
contratos para as fases seguintes; o ponto 1 está parcial (o `SceneSeed` é o esboço desse formato, mas
ainda não tem `schemaVersion` nem ficheiro `.schema.json` — não há importação nem persistência).

Limites que aceitamos **já**, para não termos de reescrever depois:

1. Formato de intercâmbio: **cena descrita por JSON versionado** (`scene.schema.json`, `schemaVersion`
   obrigatório). Three.js é detalhe de renderização; a cena sobrevive a trocas de motor.
2. Modelo de representação separado do modelo de construção: geometria/visual ↔ elementos BIM
   (paredes, vãos, pisos) com identificação persistente. O editor trabalha o segundo, o renderer
   consome o primeiro.
3. Assets binários nunca vão para a BD: ficam em armazenamento de objetos com `resource`
   (`ETag`, tamanho, mime, hash) — política de uploads em `SECURITY.md` §6.
4. Orçamento de performance (medido a partir da Fase 3): ≤ 1,5 M de triângulos por cena ativa,
   ≤ 1 500 draw calls, texturas comprimidas (KTX2/Basis), carregamento progressivo por LOD, e
   degradação explícita em dispositivos fracos. Sem medidor em CI, não prometemos números.
5. Formatos de entrada (IFC/GLB/planos imagem) entram por _parsers_ em worker; parsing de ficheiro
   de terceiro é superfície de ataque — timeout, limites de primitivas e sandbox obrigatórios.

---

## 9. O que não deve ser antecipado (e como sabemos que chegou a hora)

| Não construir agora    | Gatilho de ativação                                                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| ORM/migrações/esquema  | Primeiro endpoint que precise de persistir entre restarts (Fase 1)                                                                            |
| Autenticação completa  | Primeiro dado que não possa ser público (Fase 1)                                                                                              |
| Fila/worker externo    | Tarefa que não caiba em 300 s de função serverless (IA em massa, exportações)                                                                 |
| Microsserviços         | Dois módulos com escalas/SLAs incompatíveis e fronteira estável medida                                                                        |
| Cache distribuído      | P95 de leitura de projeto > 300 ms com índices corretos                                                                                       |
| Camada 3D              | ✅ **ativado na Fase 2** — existe volumetria paramétrica (`Massing`) renderizada; o próximo degrau é seleção/edição sobre um documento tipado |
| Sistema de design      | ✅ **ativado na Fase 2** — 7 superfícies reais, tokens únicos, contrato automatizado (QG-21)                                                  |
| Pagamentos recorrentes | Primeiro cliente pronto a pagar + decisão de plano (Fase 5)                                                                                   |
| Infra Terraform/K8s    | Custos/scope que o justifiquem por escrito                                                                                                    |

---

## 10. Internacionalização (estrutura, decisão adiada)

- Locale no pathname (`/pt`, `/en`, `/fr`) para URLs partilháveis e SEO; `en` como fallback de produto.
- Todas as strings de UI por chave; nada de concatenação — usar ICU. Data/hora/moeda/área via `Intl`
  e `Intl.NumberFormat`, nunca formato à mão.
- Conteúdo de domínio (nome de empreendimento, descrições, textos de venda) é **por idioma na BD**,
  não no código: as entidades de `DATA-MODEL.md` levam `locale` onde o texto é editável.
- O editor 3D traduz rótulos de UI, nunca estados internos.
- Ferramenta (ex.: `next-intl`) só com UI real; decisão em ADR próprio (Fase 1).

---

## 11. Testabilidade da arquitetura

- `src/core` é puro ⇒ testes unitários sem browser, sem rede, sem BD (é o que já fazemos com
  `env.ts`: 14 testes, 242 ms, zero infraestrutura).
- `src/db` ⇒ testes de integração contra PostgreSQL efémero (QG-14) — **bloqueado na Fase 0**
  (ausência de Docker/Postgres neste ambiente).
- Autorização/tenant ⇒ testes negativos obrigatórios (QG-15).
- UI ⇒ Testing Library por comportamento; E2E só para jornadas de dinheiro/segurança (QG-17).
- 3D ⇒ _golden image_ comparada com tolerância + métricas do §8 (a adicionar na Fase 3).

---

## 12. Evolução incremental

1. Cada fase termina com gate + atualização de `QUALITY-GATES.md` (estado real, não aspiracional).
2. Alterações estruturais ⇒ ADR novo; o anterior fica (histórico, não reescrito).
3. Regra de reversibilidade: o que for adicionado neste sprint e não for usado no fim do sprint é
   removido no mesmo. Aplicou-se já: ver `DEPENDENCIES.md` §2 (zero dependências "para o caso").
4. Fronteiras mecânicas (§3.2) entram antes de existir volume de código; se a regra de import for
   cara de manter, reduz-se a ambição — nunca se remove a disciplina sem ADR.
