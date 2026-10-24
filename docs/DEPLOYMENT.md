# VELORA — Alojamento, ambientes, custos e operação

> Estado da Fase 0: **nenhum serviço externo foi ativado, nenhuma subscrição foi feita, nenhum
> cartão foi introduzido, nenhum deploy foi executado.** Este documento prepara a decisão.

---

## 1. Ambiente atual da fundação (o que está verificado)

| Item          | Estado                                                                                                                                                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Aplicação     | Next.js 16.4.3 (App Router, Turbopack), build de produção OK, `next start` OK em `0.0.0.0:3000`                                                                                                       |
| Base de dados | **nenhuma** (sem `psql`, sem Docker, sem serviço acessível no sandbox)                                                                                                                                |
| Autenticação  | nenhuma                                                                                                                                                                                               |
| Deploy        | nenhum; `vercel.com` não é alcançável a partir do sandbox (`api.github.com`, `registry.npmjs.org`, `pypi.org`, `github.com`, `codeload.github.com`, `files.pythonhosted.org` são os hosts permitidos) |
| CI            | `.github/workflows/ci.yml` criado nesta fase; ainda **sem execução registada** (o workflow corre no GitHub, não aqui)                                                                                 |

---

## 2. Serviços externos, planos gratuitos, limites e riscos

Limites verificados em 2026-10-24. **"Verificar antes de depender" é regra**: um free tier pode
mudar de preço, de limites ou de termos sem aviso — nada aqui é garantido para sempre.

### 2.1 Tabela mestre

| Serviço                           | Finalidade                               | Plano / alternativa gratuita                                                        | Limites relevantes                                                                                                                                                                                                                       | Cartão?                  | Risco de custo inesperado                                                                                                                                                                      | Quando passa a ser necessário                                            |
| --------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **GitHub**                        | repositório, CI, issues                  | GitHub Free                                                                         | Actions: grátis e ilimitado em repo **público**; **2 000 min/mês + 500 MB artefactos** em privado; 500 MB por repositório recomendados                                                                                                   | não                      | baixo (excedente $0,006/min Linux)                                                                                                                                                             | já (o repo existe)                                                       |
| **Vercel**                        | alojamento da app                        | Hobby (US$0)                                                                        | 100 GB Fast Data Transfer/mês; 1 M invocações; 4 CPU-h de Active CPU; 360 GB-h de memória provisionada; função ≤ 300 s; 100 deploys/dia; 1 build concorrente; build ≤ 45 min (2 vCPU/8 GB); 5 000 transformações de imagem; 200 projetos | não no Hobby             | **médio-alto**: _elegibilidade_, não tráfego — o Hobby é só para uso pessoal não-comercial (fair use + ToS §4). Um SaaS comercial exige Pro (US$20/assento/mês, com US$20 de crédito incluído) | Fase 1 para preview interno; **antes** de qualquer uso comercial público |
| **PostgreSQL gerenciado (Neon)**  | base de dados                            | Neon Free                                                                           | 100 projetos; 100 CU-h/projeto/mês; 1 GB storage/projeto (20 GB por conta); 10 branches; scale-to-zero após 5 min (não desativável); 5 GB egress; restauro ~6 h; 1 snapshot                                                              | não                      | médio (compute extra por query loops; escala para pay-as-you-go $0,106/CU-h)                                                                                                                   | Fase 1                                                                   |
| **Supabase** (alternativa a Neon) | Postgres + storage + auth                | Free                                                                                | limites típicos: 500 MB DB, 1 GB storage, projetos pausam por inatividade                                                                                                                                                                | não                      | médio (pausa do projeto é indisponibilidade, não custo)                                                                                                                                        | Fase 1, se preferirmos storage+auth no mesmo sítio                       |
| **Self-host Postgres**            | controlo total e 0 €                     | VPS/`docker` próprio                                                                | depende da máquina; backup/PITR/passagem de patches são nossos                                                                                                                                                                           | n/a                      | **alto em risco operacional**, não em fatura                                                                                                                                                   | Fase 1 se rejeitarmos SaaS de BD; precisa de ADR                         |
| **Cloudflare R2**                 | objetos (plantas, imagens, GLB, exports) | Free tier Standard                                                                  | 10 GB-mês; 1 M operações classe A (escritas); 10 M classe B (leituras); **egress grátis**; sem cobrança de storage de dados de terceiros                                                                                                 | não                      | baixo (1 M escritas/mês é generoso para a Fase 2; o risco é o custo por objeto em importações em massa)                                                                                        | Fase 2 (uploads reais)                                                   |
| **Vercel Blob** (alternativa)     | objetos simples                          | incluído no plano                                                                   | ~1 GB de armazenamento no Hobby; limites partilhados com o plano                                                                                                                                                                         | não                      | médio (cresce com a app; liga-nos a um fornecedor)                                                                                                                                             | Fase 2 se aceitarmos lock-in                                             |
| **Autenticação**                  | identidade                               | opção A: Auth.js (grátis, no nosso código); opção B: Clerk/Auth0/Cognito free tiers | Auth.js = 0 € mas somos nós (manutenção, MFA, reset). Clerk free ~10 MAU; Auth0 free ~25k MAU (limites mudam)                                                                                                                            | Auth0/Clerk às vezes sim | médio: **preço por MAU cresce connosco** e migração de identidade é cara                                                                                                                       | decisão na Fase 1 (ver `ADR/0002` a criar)                               |
| **E-mail transacional**           | convites, pedidos de contacto            | Resend Free / Brevo Free                                                            | Resend: ~3 000 e-mails/mês, 100/dia; Brevo: ~300/dia (a confirmar quando entrarmos nisto)                                                                                                                                                | não                      | médio (o volume escala com leads)                                                                                                                                                              | Fase 2 (convites reais)                                                  |
| **Observabilidade de erros**      | Sentry                                   | Developer (US$0)                                                                    | 1 utilizador; 5 000 erros/mês; 5 M spans; 50 replays; 30 dias de retenção; **eventos acima da quota são descartados**, não cobrados                                                                                                      | não                      | baixo (risco é cegueira por excesso, não fatura)                                                                                                                                               | Fase 1 (recomendado) / Fase 4 (obrigatório)                              |
| **Uptime monitoring**             | alertas de disponibilidade               | Better Stack free: 10 monitores, 1 status page                                      | 100k exceções/mês, retenção 3 dias (free)                                                                                                                                                                                                | não                      | baixo                                                                                                                                                                                          | Fase 4                                                                   |
| **IA (texto → 3D/visuais)**       | geração                                  | **sem plano gratuito sustentável para uso comercial**                               | APIs de paid tier a partir de ~$; modelos open-weights exigem GPU que não temos                                                                                                                                                          | sim                      | **alto** — é a nossa maior fatura potencial e não tem teto por omissão                                                                                                                         | Fase 3, com orçamento aprovado pelo dono do produto                      |
| **Domínio**                       | `velora.*`                               | registar (.eu/.pt/.com)                                                             | —                                                                                                                                                                                                                                        | sim                      | baixo/único                                                                                                                                                                                    | antes do beta público                                                    |

### 2.2 Riscos de preço a tratar como decisão, não como nota

1. **Vercel Hobby ≠ uso comercial.** A regra é de elegibilidade, não de tráfego: "any Deployment that
   is used for the purpose of financial gain of anyone involved in any part of the production of the
   project, including a paid employee or consultant writing the code" está fora do Hobby. Consequência
   prática: podemos usar Hobby para desenvolvimento/preview, mas o 1.º uso comercial público exige
   (a) Pro US$20/mês, (b) auto-alojamento (Cloudflare Pages/Workers free, que permitem uso comercial;
   Node runtime a validar), ou (c) VPS. **Decisão B-02, a tomar por um humano antes do beta.**
2. **Scale-to-zero da Neon não é desativável no free.** A app vê latência de arranque (cold start de
   centenas de ms) e, com RLS+pools, a latência aparece no primeiro pedido de cada utilizador. Aceitável
   em dev; a avaliar antes de beta público.
3. **Actions em repo privado = 2 000 min/mês.** Um job de CI de ~2-3 min por push é seguro para um
   dev solo; se o repo passar a privado _e_ o volume subir, o risco é de indisponibilidade de CI, não de fatura.
4. **IA sem teto é o único risco real de "fatura surpresa" deste produto.** Mitigação estrutural definida
   em `SECURITY.md` §8 + campos de custo em `DATA-MODEL.md` §3.10 — a implementação é Fase 3 e o gate é
   "não se liga o provedor sem teto configurado".

---

## 3. Política de 0 €

1. Só se ativa um serviço quando um requisito da fase o exigir — não "para já estar preparado".
2. Antes de ativar: registar nesta tabela limites + risco + gatilho de upgrade, e escrever quanto custa
   quando a conta deixar de ser gratuita.
3. Serviços pagos/provadores de custo exigem **teto configurado** + alerta antes da primeira chamada real.
4. Nada de cartão de pagamento, nada de subscrição e nada de ativação de billing durante a Fase 0.
5. Free tiers com regras de elegibilidade (Vercel Hobby) têm de ser revistos em cada fase, não assumidos.

---

## 4. Repositório e visibilidade (bloqueio registado)

| Item                               | Valor observado (via `gh api` + `git remote -v`)                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------- |
| Remote                             | `https://github.com/valdimiroilidio3/velora-.git`                                     |
| Nome / dono                        | `velora-` / `valdimiroilidio3` — **não** é o `velora` previsto no plano               |
| Visibilidade                       | `public` — o plano pedia `private`                                                    |
| Branch por omissão                 | `main` (1 commit, `Initial commit`, só com `README.md` = `# velora-`)                 |
| Estado do working tree no arranque | limpo; clone raso (`.git/shallow` presente, histórico com 1 commit)                   |
| Autenticação `gh`                  | OK, utilizador `valdimiroilidio3`, permissões `admin` sobre o repositório             |
| Branch de trabalho desta sessão    | `arena/5051ef25-velora` (criada a partir de `main`, preservando o conteúdo existente) |

Não criámos nem alterámos repositórios, visibilidade ou permissões: **isso é ação humana** e fica como
B-01 no relatório final. Opções (não excludentes):

- **A.** Manter este repositório, tornar privado (`Settings → Danger Zone`) e renomear `velora-` → `velora`
  (o GitHub mantém redirects para clones HTTP). Impacto: passa a ter 2 000 min/mês de Actions em vez de ilimitado.
- **B.** Criar `valdimiroilidio3/velora` privado e mover o conteúdo (`git push --mirror` do que existe
  após a Fase 0, sem `--force` em `main` de terceiros).
- **C.** Deixar público até existir código com valor comercial (hoje: documentação e um shell) e decidir
  mais tarde — aceitando que histórico público é indexável e que "tornar privado depois" não retira
  o que foi clonado.

Recomendação: **A** antes do primeiro conteúdo não-público (Fase 1: dados de exemplo/seed reais, chaves
de preview), com verificação imediata de que `main` fica protegida.

---

## 5. Configuração por ambiente

| Variável                  | dev local               | CI                        | preview         | produção                            |
| ------------------------- | ----------------------- | ------------------------- | --------------- | ----------------------------------- |
| `NODE_ENV`                | `development`           | `test`/`production`       | `production`    | `production`                        |
| `DATABASE_URL`            | opcional (F0)           | ausente (não há BD em F0) | obrigatório F1+ | obrigatório                         |
| `AUTH_SECRET`             | vazio permitido         | ausente                   | obrigatório F1+ | obrigatório, por ambiente, rotativo |
| `NEXT_PUBLIC_SITE_URL`    | `http://localhost:3000` | n/a                       | URL do preview  | `https://…` (validado)              |
| `NEXT_TELEMETRY_DISABLED` | decisão do dev          | **1** (definido no job)   | 1               | 1                                   |
| `NEXT_PUBLIC_APP_ENV`     | `development`           | `test`                    | `staging`       | `production`                        |

Regras: defaults de produção nunca vivem no repositório; segredos só no host de alojamento; chaves por
ambiente e rotacionáveis; a validação em runtime (`src/lib/env.ts`) é o que transforma uma
configuração errada num arranque ruidoso em vez de um bug silencioso (prova no QG-07: `503
config_invalid`).

---

## 6. Pipeline CI (definido nesta fase)

Job `quality` (único, ubuntu-latest, Node 22.22.3, pnpm via Corepack):

1. `pnpm install --frozen-lockfile`
2. `pnpm run typecheck`
3. `pnpm run lint`
4. `pnpm run format:check`
5. `pnpm run test`
6. `pnpm run build`
7. `pnpm audit --audit-level=high`
8. `pnpm peers check` + `pnpm permissions` (registo do estado de supply-chain no log do job)
9. smoke test do build dentro do job: `next start` em `127.0.0.1:3100` com stdout para ficheiro,
   depois `GET /` (tem de ser 200), `GET /api/health` (200 _ou_ 503 `config_invalid`, porque em CI não
   existem segredos de produção — o fail-fast é o resultado esperado) e verificação dos 5 cabeçalhos
   de segurança + ausência de `x-powered-by`. **Bloqueante.**
10. varrimento de segredos com heurística nativa (`git grep` de padrões de credencial + verificação de
    que `.gitignore` cobre `.env*`). **Bloqueante.** `gitleaks` com versão pinada entra com a decisão
    B-09, porque é uma ação de terceiros e num repositório privado a licença exige validação.

Ainda não incluídos, com razão documentada: Lighthouse CI (QG-18), Playwright (QG-17), testes de
integração com Postgres (QG-14/15 — precisam de serviço de BD), coverage thresholds, deploy.
Nota da primeira execução: o GitHub avisa que `ubuntu-latest` migra para Ubuntu 26 (19/10/2026);
quando existir produção, fixa-se a imagem em vez de usar label. Branch protection em `main` continua
pendente (B-01) — o CI corre, mas nada bloqueia hoje um merge sem CI verde.

---

## 7. Estratégia de deploy (a executar na Fase 1, não agora)

1. Pré-requisito de conta: decisão B-02 (Vercel Pro vs Cloudflare vs VPS) tomada por um humano.
2. Ligar o repositório ao host, **com build comandado pela pipeline de qualidade** (`pnpm run verify`
   tem de ser verde no PR; o host só faz `install + build`).
3. Definir variáveis no host (não no repo), começando pelas do bloco ATIVO do `.env.example`.
4. Ativar `DATABASE_URL` + primeiro `db push`/migração **com plano de rollback escrito**.
5. Verificar post-deploy com o mesmo checklist do §8; registar resultados em `QUALITY-GATES.md`.
6. Só depois ativar preview deployments para PRs (e relembrar: cada preview conta para os limites).

---

## 8. Verificações pós-deploy (checklist reutilizável)

```bash
# 1. Vitalidade e ausência de dados internos
curl -sS https://<host>/api/health            # esperado: {"status":"ok","service":"velora","phase":"0",…}
# 2. Cabeçalhos de segurança presentes e `x-powered-by` ausente
curl -sSI https://<host>/ | grep -iE 'x-content-type|referrer|x-frame|permissions-policy|cross-origin-opener|x-powered-by'
# 3. Sem indexação prematura
curl -sSI https://<host>/robots.txt -o /dev/null -w '%{http_code}\n'
# 4. O build do commit X é o que está servido (NEXT_PUBLIC_GIT_SHA no /api/health = SHA do deploy)
# 5. Smoke de isolamento (quando existir F1): pedido autenticado do tenant A por recurso do tenant B → 404/403
```

Em desenvolvimento local a mesma verificação é executável (foi-o: ver `QUALITY-GATES.md` §4, QG-07).

---

## 9. Cópias de segurança e restauro (requisitos; execução na Fase 1)

| Ambiente  | Fonte                  | Método                                                                 | Frequência                 | Teste de restauro                                                       |
| --------- | ---------------------- | ---------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------- |
| dev local | Postgres local         | `pg_dump`                                                              | manual                     | n/a (não é dado real)                                                   |
| preview   | Neon (free)            | snapshot/restauro do plano (~6 h de histórico, 1 snapshot)             | antes de demos importantes | n/a — **não usar para dados reais**                                     |
| produção  | Neon pago ou self-host | dump lógico diário + WAL archiving para PITR quando o plano o permitir | diária, no mínimo          | **mensal**, com resultado registado no repo (`docs/RUNBOOK.md` a criar) |

RPO/RTO alvo, restrições de exposição de backups, e o facto de os free tiers não cumprirem um RPO de
15 min estão descritos em `SECURITY.md` §12. Backup sem restauro testado não é backup — por isso o
teste é gate, não intenção.

---

## 10. Decisões pendentes desta área

| ID   | Decisão                                                       | Estado                                    | Dono                       |
| ---- | ------------------------------------------------------------- | ----------------------------------------- | -------------------------- |
| B-01 | Criar/usar repo `velora` privado (vs atual `velora-` público) | pendente                                  | dono da conta GitHub       |
| B-02 | Alojamento para uso comercial (Vercel Pro / Cloudflare / VPS) | pendente, necessário antes do beta        | dono do produto            |
| B-03 | Fornecedor de PostgreSQL (Neon / Supabase / self-host)        | adiado para F1, decisão a registar em ADR | tech lead                  |
| B-04 | Abordagem de autenticação (Auth.js próprio vs serviço)        | adiado para F1                            | tech lead                  |
| B-05 | Orçamento aprovado para IA (que provedor, quanto/mês)         | bloqueado pelo requisito de 0 €           | dono do produto            |
| B-06 | Domínio e marca (`.pt`/`.com`/`.eu`)                          | pendente                                  | dono do produto            |
| B-07 | Regiões de dados (EEE) e escolha de subcontratados            | pendente, com base legal a validar        | dono do produto + jurídico |
