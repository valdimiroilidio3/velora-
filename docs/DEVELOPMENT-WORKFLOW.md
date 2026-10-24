# VELORA — Fluxo de trabalho de desenvolvimento

> Como se trabalha neste repositório. Destina-se a manter a qualidade e a segurança à medida que o
> projeto cresce, sem depender da memória de quem começou.

---

## 1. Ramos e proteção

- `main` = sempre funcional e verificada. Cada merge na `main` implica `pnpm run verify` verde.
- Ramos de trabalho: `feat/<fase>-<tema>`, `fix/<tema>`, `chore/<tema>`, `docs/<tema>`, `adr/<numero>-<tema>`.
- Proteção a ativar no GitHub (**pendente, B-01 está relacionado**): `main` com branch protection —
  PR obrigatório, CI verde obrigatória, sem force-push, sem deleção, 1 revisão.
- Ramos de sessão (ex.: `arena/*`) servem para trabalho guiado por agentes/ferramentas e têm de ser
  incorporados por PR, nunca push direto na `main`.
- Nunca `git push --force` em ramo partilhado; nunca reescrever histórico de `main`; nunca alterar
  visibilidade/permissões do repositório sem pedido explícito (regra que a Fase 0 cumpriu: zero mudanças de repo).

## 2. Commits e Pull Requests

- **Conventional Commits**: `type(scope): resumo` — tipos `feat`, `fix`, `refactor`, `test`, `docs`,
  `chore`, `build`, `ci`, `security`, `perf`. Sujeito no imperativo, ≤ 72 caracteres, corpo a explicar
  _porque_ (não _o quê_). Exemplos desta fase: `chore: fundação de toolchain e gates de qualidade (Fase 0)`,
  `docs: registar limites gratuitos e risco de elegibilidade do Vercel Hobby`.
- Um PR = uma decisão/fatiável. Se um PR mexe em `package.json`, o corpo tem de responder a:
  porque é preciso, quem mais poderia cobrir, impacto no bundle/custo, como se reverte.
- Mudança arquitetural ⇒ ADR novo (não editar o anterior). Documento de ADR é parte do PR.
- Template de descrição do PR a criar na Fase 1 (`.github/pull_request_template.md`) com a matriz do §4.

## 3. Ambiente local

```bash
# 1. Node ≥ 22.12 (ver .nvmrc) — o pnpm vem do Corepack, com versão do packageManager
corepack enable pnpm
# 2. Instalação reproduzível (bloqueia scripts de build de dependências)
pnpm install --frozen-lockfile
# 3. Configuração local (o repo não precisa de segredos na Fase 0)
cp .env.example .env.local     # editar apenas o que for preciso
# 4. Trabalhar
pnpm dev                       # http://localhost:3000
pnpm run verify                # typecheck + lint + format:check + test + build
pnpm audit --audit-level=high
```

Sem base de dados na Fase 0: nada é preciso subir além do Node. A partir da Fase 1, adicionar
`docker compose up -d postgres` (ficheiro a criar com ADR/`docs/RUNBOOK.md`) ou o `DATABASE_URL` de
um serviço — e o `.env.local` passa a ter uma base dedicada, nunca partilhada.

## 4. Definition of Done (por PR)

- [ ] `pnpm run verify` verde (ou o job de CI correspondente no PR).
- [ ] Nenhum gate enfraquecido: sem `eslint-disable` em bloco, sem `@ts-expect-error` sem justificação,
      sem `test.skip`, sem `--no-verify`.
- [ ] Documentação sincronizada: `DEPENDENCIES.md` (pacotes), `QUALITY-GATES.md` (estados),
      `DATA-MODEL.md` (entidades/campos), `SECURITY.md` (novas superfícies/decisões).
- [ ] Se houve decisão estrutural ⇒ `docs/ADR/NNNN-*.md` (usar `TEMPLATE.md`).
- [ ] Se há dado de cliente/tenant em causa ⇒ teste negativo de autorização escrito **antes** do
      controlo (provar que falha sem ele) e a correr em CI.
- [ ] Se mudou variável de ambiente ⇒ `.env.example` atualizado no bloco certo + teste QG-11 verde.
- [ ] Revisão de acessibilidade manual (quando existir UI): teclado, contraste, foco visível, ordem de
      leitura, `aria-*` só quando necessário (QG-16).
- [ ] Nenhuma credencial/ficheiro de dados na diff (`git diff --cached` revisto; verificado por QG-12).

## 5. Portões entre fases

Cada fase fecha com **relatório de evidência**, no formato pedido na Fase 0:

1. Diagnóstico inicial (estado encontrado, versões, branch, repositório).
2. Alterações realizadas (lista exata de ficheiros + finalidade de cada um).
3. Decisões arquiteturais e questões abertas.
4. Verificações executadas (comandos + resultados + erros encontrados).
5. Matriz de aceitação com `APROVADO / REPROVADO / PENDENTE / BLOQUEADO` + evidência.
6. Custos e dependências (o que mudou face a `DEPLOYMENT.md` §2).
7. Bloqueios que exigem ação humana.
8. Próxima ação (uma).

Regra: uma fase não começa enquanto os `BLOQUEADO` que a impedem não forem levantados por um humano.
Funcionalidade não se declara implementada sem teste que a exerça; documentação não é prova de
funcionamento.

## 6. Convenções de código

- **Português** na documentação, comentários de produto e comunicação; **inglês** em identificadores,
  nomes de tabelas/colunas, tipos e chaves de API (o produto é internacional).
- Mensagens de UI em catálogo i18n desde o primeiro ecrã (ver `ARCHITECTURE.md` §10); nenhum literal de
  texto "duro" em componentes.
- Ficheiros: `kebab-case.ts`; componentes React em `PascalCase` quando o ficheiro só tem o componente;
  tipos exportados com `type`/`interface` conforme a convenção de `verbatimModuleSyntax` (ativa).
- Um módulo não importa camadas proibidas (`ARCHITECTURE.md` §3.2); quando a regra mecânica ainda não
  existir, a revisão de código aplica-a.
- Erros: exceções de domínio tipadas, sem mensagens técnicas para o cliente (`ARCHITECTURE.md` §6.1).
- Zero `any`; `unknown` + narrowing (com `useUnknownInCatchVariables` ativo o `catch` já obriga).
- Nada de "TODO" sem dono: `TODO(Fase)(D-ID): …` a apontar para um item das tabelas de decisões.

## 7. Dependências e fornecedor

1. Regra de entrada: só se instala quando um requisito da fase o exige (ver `DEPENDENCIES.md` §2 e §4).
2. Antes de aprovar um `postinstall` de dependência ⇒ alterar `pnpm-workspace.yaml` com justificação
   (gate QG-10 lê isto; `pnpm permissions` tem de continuar "Denied" para tudo o que não for aprovado).
3. `pnpm audit`, `pnpm peers check`, versões `latest` verificadas no registo (não em blogues).
4. Atualizações de `next`/`eslint-config-next`/`typescript` entram em PR isolado (o `eslint-config-next`
   é publicado emparelhado com o `next` — manter espelhados).
5. Um pacote "gratuito para sempre" só é aceite como tal se os termos estiverem registados na tabela de
   custos (ver Vercel Hobby como exemplo real de "grátis mas inelegível para uso comercial").

## 8. Segurança no dia-a-dia

- Nada de segredo em código, teste, fixture, log, screenshot ou vídeo. Fixtures usam
  `example.invalid`, `***`, `changeme` — o teste QG-11 garante-o.
- Dados de clientes nunca em repositório. Dumps/exports vivem fora do repo e em storage privado.
- Contas de teste multi-tenant têm de ser **duas organizações** (não só dois utilizadores) — é assim
  que o teste de isolamento apanha fugas.
- Rotação: qualquer segredo partilhado em chat/PR é considerado comprometido e roda-se de imediato.
- Acesso administrativo de suporte (se vier a existir) é time-boxed e auditado.

## 9. Release e produção

- Sem deploy automático pela Fase 0 (nenhum ambiente de produção existe). Estratégia em
  `DEPLOYMENT.md` §7.
- Versionamento: `0.x` enquanto for privado/interno; `1.0` exige (i) isolamento entre tenants testado,
  (ii) autenticação real, (iii) backup com restauro testado, (iv) critérios de "pronto para vender"
  de `PRODUCT-SPEC.md` §7.3.
- Cada release publicada fica com tag anotada `vX.Y.Z` + changelog gerado de commits convencionais
  (ferramenta a escolher na Fase 1 — não instalar agora).
- Reversão: qualquer release tem de poder ser revertida com redeploy da tag anterior + migrações
  compatíveis com o passo anterior (regra "migração aditiva primeiro").

## 10. Documentos e onde se registam coisas

| Coisa                           | Onde                                                                              |
| ------------------------------- | --------------------------------------------------------------------------------- |
| Decisão estrutural              | `docs/ADR/NNNN-*.md`                                                              |
| Estado de qualidade real        | `docs/QUALITY-GATES.md` §4                                                        |
| Dependência adicionada/recusada | `docs/DEPENDENCIES.md`                                                            |
| Entidade/campo novo             | `docs/DATA-MODEL.md` (antes da migração)                                          |
| Requisito novo ou hipótese      | `docs/PRODUCT-SPEC.md` §1/§5/§6, com marcador `[Aprovado]/[Hipótese]/[Em aberto]` |
| Custo/serviço novo              | `docs/DEPLOYMENT.md` §2.1                                                         |
| Incidente/runbook               | `docs/RUNBOOK.md` (a criar na Fase 1, com o registo de restauro mensal)           |
