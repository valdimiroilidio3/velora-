# ADR 0001 — Arquitetura inicial, ferramenta de qualidade e limites da Fase 0

> **Substituído em parte pela `ADR 0005`** (Fase 2, 2026-10-24): a decisão 3 de qualidade fixava
> ESLint 9.39.5 e não previa portão de peers com exceções nem orçamento de bundle; a Fase 2 subiu
> para ESLint 10.13.0 e acrescentou `pnpm run peers` + `pnpm run budget` + QG-20/QG-21. O resto
> deste ADR — monolito modular, pnpm/Corepack, `allowBuilds`, política de configuração, adiamento de
> persistência e de fornecedores — mantém-se em vigor. O texto abaixo **não foi reescrito**: é o
> registo do que se sabia a 2026-10-24 de manhã.

- **Estado**: Aceite (parcialmente Implementado — ver §Verificação); §2.3 substituído pela `ADR 0005`
- **Data**: 2026-10-24
- **Impacto de fase**: Fase 0 (condiciona F1–F6)
- **Decisão tomada por**: agente técnico (Arena) no âmbito do pedido de Fase 0; decisões que exigem
  escolha de fornecedor/pagamento ficam **pendentes de aprovação humana** (§Abertas)

## 1. Contexto

O VELORA tem de suportar, ao longo de seis fases: geração por IA, editor de construção/BIM,
visualização 3D em browser, experiências de venda, multi-tenancy por organização, i18n e cobrança
por projeto — com orçamento de 0 € e sem serviços pagos ativados. O repositório estava vazio
(1 commit, só `README.md` = `# velora-`) e não existia qualquer código, base de dados ou pipeline.

O risco maior nesta situação não é "faltar arquitetura"; é **construir arquitetura por antecipação**:
instalar ORM/auth/3D sem necessidade demonstrada, escolher fornecedores que não se adaptam a uso
comercial, e declarar qualidade sem a ter executado. Esta ADR fixa o mínimo verificável e adia o resto
com critérios de ativação.

## 2. Decisão

1. **Framework/aplicação**: Next.js 16.4.3, App Router, React 19.3.1, TypeScript 5.9.3 em modo
   `strict` + regras duras. Uma única aplicação (monolito modular) com fronteiras de import disciplinadas.
2. **Gestão de pacotes**: pnpm 12.15.0 via Corepack, `packageManager` fixado, versões exatas,
   lockfile commitizado, scripts de build de dependências **bloqueados por omissão**.
3. **Qualidade**: ESLint 9.39.5 com `eslint-config-next` (core-web-vitals + typescript) em flat
   config; Prettier 3.9.10; Vitest 5.0.5 (ambiente node) para lógica de fundação; build de produção
   obrigatório; `pnpm audit`, `pnpm peers check`, `pnpm permissions` e contrato de `.env.example`
   como gates; CI no GitHub Actions com os mesmos comandos.
4. **Configuração**: validação central em `src/lib/env.ts` (Zod 4.6.7), defaults só para dev local,
   fail-fast em produção, mensagens de erro sem valores.
5. **Persistência (decidida, não implementada)**: PostgreSQL + Drizzle ORM + `postgres.js` como
   recomendação, **adiada para a Fase 1** — nenhuma dependência instalada nesta fase porque não há
   tabela, não há `DATABASE_URL` verificável no ambiente e o sandbox não tem Docker/Postgres.
6. **Isolamento multi-tenant**: base partilhada + RLS por organização, com `organization_id` sempre
   derivado de sessão verificada e `set_config('app.organization_id', …, true)` dentro de transação;
   papel de aplicação sem `BYPASSRLS`; `FORCE ROW LEVEL SECURITY` + `WITH CHECK`. **Sem testes ⇒ sem
   qualquer alegação de proteção.**
7. **Alojamento**: Vercel mantém-se como alvo inicial para desenvolvimento/preview, com a restrição de
   que o plano gratuito (Hobby) é só para uso pessoal **não-comercial**. Zero € hoje ⇒ nenhuma ativação
   foi feita; decisão de alojamento comercial fica pendente (B-02).
8. **Base mínima de aplicação**: um shell (layout + página de estado + `/api/health`) existe
   deliberadamente para poder **executar** os gates QG-04/QG-06/QG-07. É a única "aplicação" criada
   nesta fase e não contém funcionalidade de produto.
9. **Estrutura documental**: os 7 documentos pedidos + `DEPENDENCIES.md` (anexo) + este ADR +
   `TEMPLATE.md`. Justificação do anexo em §6.

## 3. Alternativas consideradas

| Área        | Alternativa                                                         | Porque não (agora)                                                                                                                                                                             |
| ----------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework   | Vite SPA + API Node separada                                        | duplica auth/cache/deploy; perde RSC; não há requisito que o pague                                                                                                                             |
| Framework   | Remix/React Router 7, Astro                                         | válidos; o pedido de produto assumiu Next.js App Router — trocar exige ADR novo                                                                                                                |
| Framework   | Next 15 (canal `backport` 15.5.28)                                  | linha mantida em backport, sem vantagem; o `eslint-config-next` é publicado emparelhado com `next`                                                                                             |
| TypeScript  | `latest` = 7.0.2                                                    | `typescript-eslint@8.72.0` exige `>=4.8.4 <6.1.0` — 7.0.2 está fora; instalaria lint partido                                                                                                   |
| TypeScript  | 6.0.3                                                               | compatível com os peers atuais; adiado para F1 com ADR próprio para não acumular dois riscos (TS + lint) na mesma fase                                                                         |
| Lint        | ESLint 10.13.0                                                      | verificado: `pnpm peers check` com 3 peers em falta e `globalIgnores` a rebentar a config (`@eslint/config-array@0.23.5`)                                                                      |
| Lint/format | Biome (2.6.3)                                                       | mais rápido e mais simples, mas `eslint-config-next` cobre as regras de Next/React/a11y que queremos; Biome fica como candidato a _substituto_ se o custo de manutenção do ESLint se verificar |
| Testes      | node:test + sem runner                                              | zero dependências, mas perde watch/coverage/jsdom que a Fase 1 vai pedir; Vitest é o padrão do ecossistema Vite/Next                                                                           |
| Testes      | Jest                                                                | mais configuração com ESM/TS e menos alinhado com o Vite que o Vitest partilha                                                                                                                 |
| ORM         | Prisma 7.10.1                                                       | `dist-tags.latest` do CLI é `8.0.0-rc.27` (pré-release) — sinal de instabilidade de versão; cliente gerado + motor binário; adiado                                                             |
| ORM         | Kysely / `pg` cru                                                   | menos scaffolding, mais superfície de erro humano em RLS/migrações                                                                                                                             |
| BD          | Supabase (BD+auth+storage num)                                      | conveniência vs acoplamento: a auth e o storage terão requisitos próprios; fica como alternativa da tabela de custos                                                                           |
| BD          | database-per-tenant                                                 | isolamento forte, mas N migrações e N pools sem escala que o justifique                                                                                                                        |
| Alojamento  | Cloudflare Pages/Workers, VPS                                       | permitem uso comercial em free tier (Pages) — **a considerar seriamente em B-02**, mas runtime Node do Next a validar antes de decidir                                                         |
| Alojamento  | manter tudo local, sem alojamento                                   | impossível verificar o ambiente que o produto vai usar (headers, env de produção, limites de função)                                                                                           |
| 3D          | `@react-three/fiber`+drei agora                                     | só quando existir cena serializada para renderizar; instalar antes é bundle morto                                                                                                              |
| Auth        | Auth.js v4 (4.24.15, em manutenção) vs serviço gerido (Clerk/Auth0) | decisão adiada para F1 (`ADR/0002`): é onde o custo por MAU e o lock-in de identidade pesam, e exige primeiro tabela de sessão                                                                 |
| Repo        | criar `velora` privado de raiz                                      | não é decisão técnica de agente: mudança de repositório/visibilidade é ação humana (B-01)                                                                                                      |

## 4. Consequências

**Aceites de bom grado**

- Duas linhas de decisão travadas até haver evidência: ORM e auth. Se a Fase 1 as mudar, o custo é um
  ADR novo, não uma reescrita (as fronteiras `src/server`/`src/db` já o garantem por desenho).
- `tsconfig.json` passa a ser parcialmente gerido pelo Next (aceitou `jsx: react-jsx` e
  `.next/dev/types/**` no `include` na 1.ª build) — sinal de que mudanças inesperadas ali são um
  sintoma a investigar, não ruído.
- O gate QG-11 (contrato `.env.example`↔schema) obriga a mexer em dois sítios sempre que se adiciona
  uma variável. É fricção intencional.
- Bloquear `postinstall`s pode partir uma dependência futura (ex.: `sharp`, `unrs-resolver`). A
  política é "aprovar explicitamente com justificação", não "desbloquear para o build passar".
- O `pnpm audit` limpo de hoje não diz nada do grafo de amanhã: o gate é recorrente, não uma medalha.

**Riscos que isto deixa vivos**

- O produto é 3D-intensivo e a fundação não mediu nada de 3D. O orçamento QG-19 é a nossa única
  proteção contra decisões irreversíveis tardias em F3.
- Sem ambiente de alojamento exercitado, o caminho Vercel→runtime real tem uma distância desconhecida
  (limite de 300 s por função vs geração por IA longa ⇒ o modelo de _job_ assíncrono do
  `DATA-MODEL.md` §3.10 não é opcional).
- Multi-tenancy partilhada + RLS exige maturidade de disciplina de query; o risco de regressão é alto e
  por isso os testes negativos são gate (QG-15) e não sugestão.

## 5. Verificação (comandos e resultado observado — 2026-10-24)

| Verificação                   | Comando                                                           | Resultado                                                                                                                                |
| ----------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Versões reais no registo      | `npm view <pkg> version/engines/peerDependencies`                 | usadas para fixar `next@16.4.3`, `react@19.3.1`, `typescript@5.9.3`, `eslint@9.39.5`, `vitest@5.0.5`, `zod@4.6.7`, `@types/node@22.20.5` |
| Instalação reproduzível       | `pnpm install --frozen-lockfile`                                  | exit 0 · `✓ Lockfile passes supply-chain policies`                                                                                       |
| Tipos                         | `pnpm run typecheck`                                              | 0 erros (strict)                                                                                                                         |
| Lint                          | `pnpm run lint`                                                   | 0 erros                                                                                                                                  |
| Formatação                    | `pnpm run format:check`                                           | sem diffs                                                                                                                                |
| Testes                        | `pnpm run test`                                                   | 14/14, 242 ms                                                                                                                            |
| Build                         | `pnpm run build`                                                  | Turbopack, 4.9 s, 3 rotas, TS 2.9 s                                                                                                      |
| Runtime + headers + fail-fast | `pnpm start -H 0.0.0.0 -p 3000` + `curl`                          | `/` 200 com 5 headers de segurança; `/api/health` → 503 `config_invalid` sem segredos em produção                                        |
| Vulnerabilidades              | `pnpm audit --audit-level=high` e `pnpm audit`                    | `No known vulnerabilities found`                                                                                                         |
| Peers                         | `pnpm peers check`                                                | `No peer dependency issues found`                                                                                                        |
| Supply-chain                  | `pnpm permissions`                                                | `Denied: unrs-resolver build`                                                                                                            |
| Segredos                      | `git check-ignore`, grep de padrões de credencial em 19 ficheiros | 0 ocorrências; `.env.local` ignorado                                                                                                     |

Detalhe completo em `docs/QUALITY-GATES.md` §4, incluindo os 5 defeitos reais que este processo apanhou
(§6.1–§6.6).

## 6. Alterações à estrutura pedida

A estrutura de referência pedia `README.md`, `.gitignore`, `.env.example`, `docs/{PRODUCT-SPEC,
ARCHITECTURE,DATA-MODEL,SECURITY,QUALITY-GATES,DEPLOYMENT,DEVELOPMENT-WORKFLOW}.md`, `docs/ADR/0001-…`
e `src/`. Duas mudanças, com justificação:

1. **Adição de `docs/DEPENDENCIES.md`** — o pedido de Fase 0 exige documentação por dependência
   (finalidade, justificação, alternativas, compatibilidade, impacto de custo, risco). Isso são ~12
   pacotes + 25 candidatos adiados: dentro de `ARCHITECTURE.md` afogaria a arquitetura, dentro de
   `QUALITY-GATES.md` confundiria decisão com verificação. Tornou-se anexo explícito.
2. **Adição de `docs/ADR/TEMPLATE.md`** e **`.github/workflows/ci.yml`** — o template evita ADRs
   assimétricos; o workflow não é opcional se os gates têm de ser verificáveis por outra pessoa.

Nada foi feito "para simular progresso": zero ficheiros de aplicação vazios, zero diretórios
pré-criados (`src/core`, `src/db`, …) — o espaço vive em `ARCHITECTURE.md` §3.1 até existir conteúdo.

## 7. Decisões que ficam deliberadamente em aberto

| ID   | Aberta até                                                                | Dono                                                                                        |
| ---- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| B-01 | Repositório: `velora` privado (vs `velora-` público)                      | dono GitHub                                                                                 |
| B-02 | Alojamento comercial (Vercel Pro / Cloudflare / VPS)                      | dono produto                                                                                |
| B-03 | Fornecedor Postgres (Neon / Supabase / self-host)                         | tech lead, em F1                                                                            |
| B-04 | Auth: Auth.js próprio vs serviço gerido                                   | tech lead, em F1 (`ADR/0002`)                                                               |
| B-05 | Orçamento de IA e provedores                                              | dono produto, antes de F3                                                                   |
| B-06 | Sistema de design (Tailwind vs CSS próprio) e convenções de UI            | tech lead, em F1                                                                            |
| B-07 | Estratégia i18n (`next-intl` vs rotas próprias)                           | tech lead, em F1                                                                            |
| B-08 | Formato de cena e contrato `scene.schema.json`                            | tech lead, antes de F2 (é a decisão com maior custo de reversão — ver `ARCHITECTURE.md` §8) |
| B-09 | QG-12 automático (`gitleaks` com versão pinada) e QG-13 (`pnpm licenses`) | tech lead, F1                                                                               |
| B-10 | Bases legais/DPA/mercados-alvo (RGPD)                                     | dono produto + jurídico                                                                     |

## 8. Reversão

- A fundação é 12 pacotes + 9 ficheiros de configuração + 5 de aplicação + 9 de documentação. Reverter
  a toolchain = apagar configs e `pnpm-lock.yaml`, sem perda de produto (não existe produto).
- As duas decisões com custo real de reversão são **multi-tenancy partilhado + RLS** (mudar para
  database-per-tenant implica mover dados e ligações) e **formato de cena JSON** (B-08). Por isso ambas
  têm testes/orçamentos como gate e não como intenção.
- Nenhuma ação desta fase alterou serviços externos, permissões, branches remotas ou dados — não há nada
  a reverter fora do repositório.
