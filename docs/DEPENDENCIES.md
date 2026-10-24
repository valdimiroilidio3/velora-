# VELORA — Dependências: escolhas, versões verificadas, custos e riscos

> Toda a versão citada neste documento foi **lida no registo npm a 2026-10-24**, não recordada de
> memória. "Instalado" = está no `package.json`/`pnpm-lock.yaml`; "adiado" = avaliado, mas
> deliberadamente **não** instalado na Fase 0.

---

## 1. Instalado na Fase 0 (12 pacotes diretos)

| Pacote               | Versão fixada | Licença    | Finalidade                                                                                          | Porquê esta versão                                                                                                 | Impacto de custo |
| -------------------- | ------------- | ---------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------- |
| `next`               | 16.4.3        | MIT        | Framework de aplicação (App Router, RSC, rotas de API)                                              | `latest` estável no registo. Exige Node ≥ 20.9.0 — cumprimos (22.22.3). Turbopack é o bundler por omissão          | €0               |
| `react`              | 19.3.1        | MIT        | Runtime da interface                                                                                | Preenche o peer `^19.0.0` do `next@16.4.3`                                                                         | €0               |
| `react-dom`          | 19.3.1        | MIT        | Render em navegador/streams                                                                         | Tem de casar com `react` (`peer: react@^19.3.1`)                                                                   | €0               |
| `zod`                | 4.6.7         | MIT        | Validação de configuração agora; de todas as fronteiras de entrada nas fases 1+                     | `latest`. Nota de compatibilidade em §3.3                                                                          | €0               |
| `typescript`         | 5.9.3         | Apache-2.0 | Compilador/tipos                                                                                    | Ver §3.1 (a `latest` do registo é 7.0.2, mas está fora do intervalo suportado pelo ecossistema de lint)            | €0               |
| `eslint`             | 9.39.5        | MIT        | Lint                                                                                                | Ver §3.2 (v10 disponível, peers por cumprir)                                                                       | €0               |
| `eslint-config-next` | 16.4.3        | MIT        | Config partilhada: regras Next + react-hooks + jsx-a11y + import + typescript-eslint em flat config | Alinhado com a versão do `next` (o pacote é publicado emparelhado)                                                 | €0               |
| `vitest`             | 5.0.5         | MIT        | Testes unitários de lógica de fundação                                                              | `latest`. Exige Node ^22.12 ou ≥24 — cumprimos                                                                     | €0               |
| `prettier`           | 3.9.10        | MIT        | Formatação determinística (elimina ruído de revisão)                                                | `latest`                                                                                                           | €0               |
| `@types/node`        | 22.20.5       | MIT        | Tipos do Node                                                                                       | Linha 22 = runtime real; a `latest` do pacote é 26.6.5 (Node 26) e introduziria APIs que não existem neste runtime | €0               |
| `@types/react`       | 19.3.0        | MIT        | Tipos do React                                                                                      | Linha 19 alinhada com `react@19.3.1`                                                                               | €0               |
| `@types/react-dom`   | 19.3.0        | MIT        | Tipos do React DOM                                                                                  | idem                                                                                                               | €0               |

Nada disto foi instalado "para o caso de vir a ser preciso": os 12 pacotes sustentam exatamente as
coisas que a Fase 0 executa (build, tipos, lint, testes, arranque, validação de configuração).

Tamanho medido: 23 pacotes no grafo runtime (264 com dev) e 362 entradas no lockfile. O peso real
de `node_modules` é irrelevante para o produto (bundle do browser é medido em Fase 1 com Lighthouse).

---

## 2. O que **não** foi instalado, e porquê

A instrução foi explícita: não encher o `package.json` de bibliotecas futuras. Cada linha abaixo é
uma decisão adiada com critério de ativação, não uma omissão.

| Candidato                                          | Versão verificada no registo           | Estado                  | Critério para instalar                                                                                                                                       |
| -------------------------------------------------- | -------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `three`                                            | 0.186.1 (MIT) + `@types/three` 0.186.0 | adiado                  | Fase 3, quando existir a primeira cena renderizada. Instalar antes = bundle morto e zero capacidade de medir desempenho                                      |
| `@types/three`                                     | 0.186.0                                | adiado                  | acompanha `three` (linhas menores têm de coincidir)                                                                                                          |
| `drizzle-orm`                                      | 0.45.4 (Apache-2.0)                    | **recomendado, adiado** | Fase 1, junto da primeira tabela real + `DATABASE_URL`                                                                                                       |
| `drizzle-kit`                                      | 0.31.11 (MIT)                          | adiado                  | com o `drizzle-orm`                                                                                                                                          |
| `postgres` (postgres.js)                           | 3.4.9 (Unlicense)                      | adiado                  | driver escolhido se a decisão de ORM se mantiver em Drizzle                                                                                                  |
| `prisma` / `@prisma/client`                        | 8.0.0-rc.27 / 7.10.1                   | rejeitado por agora     | ver §3.4                                                                                                                                                     |
| `pg`                                               | 8.23.1 (MIT)                           | alternativa             | só se optarmos por `pg` em vez de `postgres.js`                                                                                                              |
| `next-auth`                                        | 4.24.15 (ISC)                          | adiado, com reserva     | declare peer `next ^12…^16` (compatível) mas a Auth.js v4 está em manutenção; a v3 ainda não tem `latest` estável no registo. Decisão na Fase 1 (`ADR-0002`) |
| `@auth/core`                                       | 0.41.3 (ISC)                           | alternativa             | base de uma solução própria de sessão se preferirmos controlo máximo                                                                                         |
| `@auth/prisma-adapter`                             | 2.11.3                                 | não aplicável           | pressupõe Prisma                                                                                                                                             |
| `bcryptjs`                                         | 3.0.3 (BSD-3-Clause)                   | adiado                  | hashing de palavras-passe na Fase 1; reavaliar `argon2`/`scrypt` nativo do Node                                                                              |
| `tailwindcss`                                      | 4.3.3 (MIT)                            | adiado                  | Fase 1, quando existir sistema de design. Sem UI real, só produz CSS gerado sem dono                                                                         |
| `@tanstack/react-query`                            | 5.104.5 (MIT)                          | adiado                  | Fase 1, quando existir o primeiro cliente que precise de cache de servidor                                                                                   |
| `zustand`                                          | 5.0.16 (MIT)                           | adiado                  | só para estado de editor/cliente; o estado do servidor é do RSC                                                                                              |
| `gsap`                                             | 3.15.0 (licença "Standard no charge")  | adiado + atenção        | ver §3.5 — não é MIT                                                                                                                                         |
| `@testing-library/react` + `jsdom`                 | 16.3.3 / 30.1.3                        | adiado                  | entram com o primeiro teste de componente (Fase 1). `jsdom@30` pede Node ^22.22.2/≥26 → cumprimos                                                            |
| `@vitejs/plugin-react`                             | 6.1.2                                  | adiado                  | necessário para testes que montem JSX; só com a Testing Library                                                                                              |
| `@testing-library/jest-dom`, `@vitest/coverage-v8` | —                                      | adiado                  | utilitários de teste sem benefício na Fase 0                                                                                                                 |
| `playwright`                                       | —                                      | adiado                  | QG-17 (Fase 1)                                                                                                                                               |
| `axe-core`                                         | 4.14.0 (MPL-2.0)                       | adiado                  | base do QG-16 quando houver UI                                                                                                                               |
| `@opentelemetry/*`                                 | —                                      | adiado                  | observabilidade Fase 4+                                                                                                                                      |
| `resend`/`nodemailer`                              | —                                      | adiado                  | e-mail transacional Fase 2+                                                                                                                                  |
| SDKs de provedores de IA                           | —                                      | adiado                  | Fase 3+ e **só** com orçamento aprovado (ver `DEPLOYMENT.md` §3)                                                                                             |

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

### 3.2 ESLint 9.39.5 em vez de 10.13.0

Medido, não assumido (ver `QUALITY-GATES.md` §6.4): com 10.13.0, `pnpm peers check` devolvia
"Issues with peer dependencies found" (3 pacotes) e `globalIgnores` rebentava a configuração
(`@eslint/config-array@0.23.5` não conhece a chave). Com 9.39.5: peers limpos, lint verde.
`eslint-config-next@16.4.3` declara `peer: eslint >=9.0.0`, logo 9.39.5 é a fronteira suportada.

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
   6 **Atualizações** entram por PRs pequenos com `pnpm outdated` + audit + verify completos; Renovate
   é opcional e adiado (precisa de decisão sobre autonomia de merge).

---

## 5. Impacto no orçamento

- Custo mensal direto do stack instalado hoje: **0 €**.
- Licenças todas MIT/ISC/Apache-2.0 (ver tabela §1) → nenhum obstáculo a um produto comercial.
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
