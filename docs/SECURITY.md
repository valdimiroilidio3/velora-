# VELORA — Segurança desde a fundação

> O VELORA é multi-tenant e vai conter informação comercial sensível de terceiros (plantas, preços,
> clientes potenciais). Este documento fixa as regras e **o que ainda não está provado**.
> Estado, a 2026-10-24: controlos de infra mínima implementados (§7) + política; **autenticação,
> autorização, RLS e testes de isolamento não existem** (§9). Nada neste documento deve ser lido
> como "o sistema está protegido".

---

## 1. Modelo de confiança e superfícies

| Superfície                                        | Quem a usa                 | Confiança                             | Controlo principal                                                          |
| ------------------------------------------------- | -------------------------- | ------------------------------------- | --------------------------------------------------------------------------- |
| Área autenticada (projetos, editor, leads)        | membros de uma organização | não confiável (browser do utilizador) | sessão + papel + RLS                                                        |
| Página pública de empreendimento / visita 3D      | compradores, concorrentes  | não confiável, anónima                | só leitura de recursos marcados públicos, sem dados internos                |
| API de partilha/embeds                            | terceiros                  | hostil                                | tokens com scope+validade, rate limit, sem credenciais do tenant            |
| Ingestão de ficheiros (plantas, imagens, IFC/GLB) | utilizadores autenticados  | **hostil por definição**              | §6                                                                          |
| Integrações de IA                                 | nossos adaptadores         | externa, paga                         | §8 — segredo nunca no cliente, limites de custo, dados enviados minimizados |
| Operadores/infra                                  | nós próprios               | privilegiada                          | princípio do menor privilégio, papéis separados, auditoria                  |

Assunção estrutural: **o cliente mente sobre a sua organização**. `organizationId` vindo de
query string, body, cabeçalho ou JWT editável é _entrada_, não _autoridade_.

---

## 2. Identidade e autenticação (plano Fase 1)

- Sessão de servidor com **cookie** `HttpOnly; Secure; SameSite=Lax`, nome com prefixo `__Host-`
  quando o domínio o permitir, duração de inatividade definida por `SESSION_IDLE_TTL_HOURS`
  (default 12 h, máx. 30 dias — validado por schema).
- Sem tokens no `localStorage` (XSS = roubo de conta) e sem JWT de longa duração como sessão.
- Rotação de segredo de sessão no login/logout/alteração de password; **invalidação server-side**
  por tabela de sessões (permite cortar acesso imediato — requisito real de um SaaS com despedimentos).
- Palavras-passe: `argon2id` (preferido, se o binding nativo se mostrar fiável) ou `bcryptjs` com
  fator ajustado ao hardware; política de comprimento mínimo (≥ 12) e verificação contra listas de
  credenciais comprometidas **sem** enviar a password completa (k-anonymity, ex.: Pwned Passwords range API).
- MFA: TOTP para papéis com poder de escrita desde a Fase 2; obrigatório para `owner`/`admin` quando
  houver pagamentos ou exportações em massa.
- Antiabuso de autenticação: limites por IP+identificador, backoff, bloqueio temporário, e-mail de
  aviso em novo dispositivo. Nunca "conta não existe" vs "password errada" — mesma resposta, mesmo tempo.
- Reset de password: token de uso único, validade ≤ 30 min, ligado ao hash da password atual,
  resposta idêntica exista ou não a conta, e **todas** as sessões terminadas após a alteração.

---

## 3. Autorização e isolamento por tenant

### 3.1 Modelo

- RBAC por organização, avaliado **no servidor**, em cada pedido, antes de qualquer acesso a dados.
- Papéis (_plano_, ver `DATA-MODEL.md` §5): `owner`, `admin`, `editor`, `viewer`, `lead_manager`,
  além de `client_viewer` (acesso a uma partilha específica, sem pertencer à organização).
- Não existe "superutilizador" de produto. Acesso de suporte, se vier a existir, é auditado,
  limitado no tempo e opt-in por organização — decisão em aberto (D-SEC-03).

### 3.2 Camadas de defesa (defesa em profundidade)

1. **Middleware de sessão**: resolve a sessão → identidade → organizações a que pertence. Nada de
   "tenant" vindo do URL sem verificação de pertença.
2. **Caso de uso** (`src/server`): recebe `ActorContext { userId, rolesByOrganization }` e
   `organizationId` **resolvido e verificado**, não extraído do pedido cru.
3. **Acesso a dados**: `withTenant(organizationId, tx)` abre transação, define o contexto do tenant e
   corre a query. Funções de repositório que não passem por aí são consideradas bug (a fazer valer
   por regra de lint/teste de arquitetura na Fase 1).
4. **Base de dados (RLS)**: mesmo que (3) falhe, o PostgreSQL devolve 0 linhas. Isto é _defesa_, não
   substituição da autorização.

### 3.3 RLS: como o contexto é validado (plano Fase 1)

```sql
-- 1. A aplicação usa um papel de base de dados SEM bypass.
CREATE ROLE velora_app LOGIN;               -- sem BYPASSRLS, sem ALTER TABLE, sem DDL

-- 2. A GUC só pode ser definida como "set local" dentro da transação da aplicação,
--    é custom (app.*) e não é redefinível pelo cliente se este usar conexão partilhada/pooled.
ALTER ROLE velora_app SET search_path = public;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;   -- inclui o dono da tabela

CREATE POLICY project_tenant_isolation ON projects
  USING  (organization_id = current_setting('app.organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.organization_id', true)::uuid);
```

```ts
// src/db/tenant.ts (plano) — forma correta de definir o contexto.
export async function withTenant<T>(organizationId: string, run: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    // SET LOCAL: dura apenas esta transação; `is_valid=true` permite falhar para 0 linhas se não for definido.
    await tx.execute(sql`SELECT set_config('app.organization_id', ${organizationId}, true)`);
    return run(tx);
  });
}
```

Regras não negociáveis do desenho:

1. `organizationId` vem **sempre** da sessão/permissão verificada, nunca do pedido do cliente.
2. Sem GUC definida ⇒ política com `current_setting(…, true)` produz `NULL` ⇒ `0` linhas
   (falha fechada, não "todas as linhas"). Uma query sem tenant tem de devolver vazio, não erro.
3. `WITH CHECK` obrigatório em todas as tabelas com RLS: impede escrever `organization_id` alheio.
4. Tabelas de junção/derivadas (`project_version_tags`, etc.) precisam de política própria ou de
   FK com `on delete cascade` + política na tabela pai validada por teste.
5. O papel de **migrações** é separado do papel de **aplicação** (DDL vs DML) e não é usado em runtime.
6. Pooled connections: `SET LOCAL` só dentro de transação + reset explícito no fim; se um dia
   aparecer `DEALLOCATE`/partilha de ligação, a política `FORCE` e o `set_config(…, true)` já limitam
   o dano. Sem transação ⇒ sem acesso a dados de tenant.
7. `search_path` fixo em papel/sessão (evita hijack de objeto por `search_path` mal definido).

### 3.4 Provas exigidas antes de dizermos que está isolado (QG-15)

Nada disto existe ainda. Fases seguintes só podem marcar "isolamento verificado" quando a suite
correr em CI contra PostgreSQL real:

1. Dois tenants com dados idênticos; cliente autenticado no tenant A tenta (a) ler, (b) listar,
   (c) atualizar, (d) apagar, (e) importar recurso, (f) partilhar por URL do tenant B. Todas esperam
   404/não-encontrado ou 403 conforme o caso, nunca dados.
2. Tentativa de _spoofing_: enviar `organizationId`/`X-Organization` forjado no body/URL/header — tem
   de ser ignorado ou rejeitado, e o resultado medido é "dados do tenant A".
3. Query sem GUC ⇒ 0 linhas. Query com GUC de outro tenant mas papel sem privilégio ⇒ 0 linhas.
4. `UPDATE`/`INSERT` com `organization_id` alheio ⇒ rejeição pela `WITH CHECK`.
5. Sessão revogada ⇒ acesso seguinte falha (a cache de sessão/RSC não pode sobreviver ao logout).
6. Teste de regressão de cache: chave de RSC/tags contém `org:` para evitar fuga entre tenants.
7. Cada teste **falha primeiro** quando o controlo é removido (prova de que o teste mede algo).

---

## 4. Proteção de segredos

- Só segredo real em ambiente de execução: painel do host de alojamento/secret manager. Nunca no
  repositório, nunca em `NEXT_PUBLIC_*`, nunca em ficheiros de log.
- Chaves por ambiente (dev/staging/prod) e por fornecedor com prefixo identificável; rotação
  documentada com data; revogação testada (a rotação que ninguém praticou não existe).
- `.gitignore` cobre `.env`, `.env.*` (com `!/.env.example`) — verificado com `git check-ignore` (§`QUALITY-GATES.md` QG-12).
- Varrimento em CI com `gitleaks` (job não-bloqueante até fixarmos versão); localmente o teste
  QG-11 garante que o `.env.example` não ganha valores reais.
- Erros de validação de env removem valores da mensagem (`parseEnv` substitui o texto entre aspas
  por `…` — implementado e testado).
- Fornecedores com chave de serviço (storage, IA, e-mail): scopes mínimos; **nunca** service-role key
  no cliente; chaves de upload são pré-assinadas, de curta duração e limitadas a um prefixo.
- Scripts de build de dependências bloqueados (`pnpm-workspace.yaml` → `allowBuilds:
{unrs-resolver: false}`), `pnpm permissions` como gate QG-10.

---

## 5. Validação de entradas

- Toda a fronteira HTTP valida com **Zod** (body, query, params, headers relevantes, multipart).
  A mesma schema serve de contrato ao cliente e é reutilizada no servidor — nunca confiar no que o
  cliente já validou.
- Tipos estritos: `noUncheckedIndexedAccess`, `useUnknownInCatchVariables`, `strict` ativos. Sem
  `as any`; `as` só com comentário de motivo.
- Normalizar antes de persistir (trim, lowercase para e-mails, remover caracteres de controlo);
  rejeitar campos desconhecidos onde houver significado de segurança.
- SQL: só via Drizzle/parâmetros vinculados. Interpolação de identificadores (nomes de coluna em
  ordenação dinâmica) só com lista fechada validada por schema.
- HTML/`dangerouslySetInnerHTML`: proibido por omissão; conteúdo rico de utilizador passa por
  sanitização com lista de tags permitida, e é renderizado como texto por padrão.
- Redirecionamentos: `allow-list` de destinos internos; nunca `redirect(param)` cru.
- URLs recebidas (webhooks, imports remotos): bloquear endereços privados/`localhost`, seguir no
  máximo 1 redirecionamento, timeout curto, limite de bytes — SSRF é o vetor clássico de "importar por URL".

---

## 6. Uploads e ficheiros (requisitos; implementação na Fase 2)

1. Upload por **URL pré-assinada** direto para o armazenamento de objetos (prefixo `org/{id}/…`), a
   aplicação valida e regista; o corpo nunca passa por uma função serverless com limite de 300 s /
   tamanho pequeno.
2. Limites por tipo: tamanho máximo (`AI_MAX_UPLOAD_MB`-like por categoria), dimensões máximas de
   imagem, contagem máxima por utilizador/dia, tamanho descomprimido de arquivos (ZIP bomb) e
   primitivas máximas em modelos 3D.
3. Validação por **conteúdo**, não por extensão nem por `Content-Type` enviado: magic bytes,
   `file_type` determinado por nós, `image/svg` tratado como executável (sanitizar ou rejeitar).
4. Metadados removidos por padrão (EXIF/GPS de fotografias de imóveis é dado pessoal e dado de
   localização); hash `sha256` + `ETag` registados; nome de ficheiro original nunca usado em path.
5. Servir de domínio/origem separado ou com `Content-Disposition` + `Cross-Origin-Resource-Policy`,
   nunca interpretar como HTML. Nenhum `Content-Security-Policy` frouxo no domínio da aplicação.
6. Partilha: tokens com expiração, revogáveis, sem `list` do bucket; bucket privado por omissão.
7. Antivírus de terceiros é pago → adiado; enquanto não existir, a postura é "formatos aceites
   estritos + render em sandbox/worker + nada é aberto por humanos na nossa equipa sem necessidade".

---

## 7. Controlos implementados nesta fase (verificados)

| Controlo                                                                                                                                                                                                                         | Onde                       | Evidência                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------- |
| Cabeçalhos: `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy` (câmera/microfone/geolocalização/browsing-topics desligados), `Cross-Origin-Opener-Policy: same-origin` | `next.config.ts`           | `curl -D -` no QG-07 devolveu os cinco; ausência de `x-powered-by`        |
| Sem telemetria do framework em CI                                                                                                                                                                                                | `.github/workflows/ci.yml` | `NEXT_TELEMETRY_DISABLED=1` no job                                        |
| `strict` + regras duras de TypeScript                                                                                                                                                                                            | `tsconfig.json`            | QG-02 verde                                                               |
| `no-console` (permite `warn`/`error`)                                                                                                                                                                                            | `eslint.config.mjs`        | QG-03 verde                                                               |
| Validação de env com falha-rápida e sem fuga de valores                                                                                                                                                                          | `src/lib/env.ts`           | testes "não inclui o valor inválido na mensagem" e "503 `config_invalid`" |
| Bloqueio de scripts de build de dependências                                                                                                                                                                                     | `pnpm-workspace.yaml`      | `pnpm permissions`                                                        |
| Lockfile com integridade + verificação de política de supply-chain do pnpm                                                                                                                                                       | `pnpm-lock.yaml`           | `✓ Lockfile passes supply-chain policies`                                 |
| Zero dependências com vulnerabilidades conhecidas                                                                                                                                                                                | `pnpm audit`               | QG-08                                                                     |
| `.gitignore` cobre `.env*`, armazenamento local, volumes de BD                                                                                                                                                                   | `.gitignore`               | `git check-ignore`                                                        |
| `robots: noindex` no shell atual (nada público para indexar)                                                                                                                                                                     | `src/app/layout.tsx`       | revisão de código                                                         |

### 7.1 Cabeçalhos por trás de um proxy

Os cabeçalhos acima vêm do `next.config.ts`; num _edge_ (Vercel/Cloudflare) podem ser sobrepostos ou
repetidos. Antes do 1.º lançamento: verificar com `curl -I` no domínio real e registar no PR. Falta
deliberadamente uma **CSP restritiva** — sem UI definida, uma CSP inventada dá falsa segurança e
quebra o editor 3D. Entrada no backlog com política-alvo: `default-src 'self'`; `script-src 'self'`
(sem `unsafe-inline`, com `nonce`); `img-src 'self' blob: data:` quando existir geometria; `connect-src
'self'` + origens de IA; `frame-ancestors 'none'`; `upgrade-insecure-requests` em produção.

---

## 8. Limites de pedidos e antiabuso

- Camadas: por IP (edge), por utilizador (sessão), por organização (cota de plano) e por operação cara
  (geração de IA, exportações). `RATE_LIMIT_WINDOW_MS`/`RATE_LIMIT_MAX_REQUESTS` já existem no schema.
- Contadores partilhados exigem armazenamento comum (Redis/KV): **in-memory não serve** com múltiplas
  instâncias serverless e não deve ser apresentado como rate limiting em produção.
- Endpoints caros têm de responder 429 com `Retry-After` e têm de **falar antes de consumir**: limite
  verificado antes do upload/chamada de IA, não depois.
- Custo de IA é o vetor de fatura inesperada do produto (Fase 3): teto por organização/mês, alerta,
  e corte automático; nada de "ilimitado" no plano inicial.
- Crawling de listagens públicas: `noindex` até existir decisão de SEO, rate limit anónimo, e URLs de
  partilha com tokens não-enumeráveis (UUID v4+), nunca sequencial.

---

## 9. O que ainda não existe (a lista honesta)

Sem qualquer implementação nesta fase, portanto sem qualquer alegação de proteção:

- [ ] Autenticação, sessões, MFA, reset de password.
- [ ] Autorização por papel e por organização; verificação de pertença.
- [ ] Persistência, migrações, RLS, políticas `WITH CHECK`.
- [ ] Suite QG-15 (isolamento entre tenants) e QG-14 (integração BD).
- [ ] CSRF em mutações (server actions/formulários) — precisa de existir mutação para ser testável.
- [ ] Rate limiting distribuído real.
- [ ] Pipeline de uploads (validação por conteúdo, remoção de EXIF, URLs pré-assinadas).
- [ ] Auditoria de ações (esquema definido em `DATA-MODEL.md`, sem tabela criada).
- [ ] Backups automáticos + teste de restauro; RPO/RTO acordados.
- [ ] CSP restritiva; headers de `Cross-Origin-Embedder/Resource-Policy` conforme necessidades do 3D.
- [ ] Análises SAST/DAST, test de penetração, verificação de licenças (QG-13).
- [ ] Política de retenção, processo de eliminação de dados, DPA com fornecedores (§11).

---

## 10. Registo de eventos e auditoria

- `audit_log` é **append-only** (sem `UPDATE`/`DELETE` para o papel da aplicação), com autor, ação,
  alvo, `organization_id`, `request_id`, `ip`, `user_agent`, resultado e metadados estruturados.
  Eventos mínimos desde a Fase 1: login/logout/falha, alteração de papel, convite, criação/eliminação
  de projeto, publicação, exportação, alteração de plano, acesso a leads, rotação de segredos,
  acesso via suporte.
- Nunca registar: conteúdo de pedidos com PII além do mínimo, tokens, passwords, chaves, ficheiros.
- Retenção alvo: 12 meses (a confirmar com a análise jurídica de §11) e acesso à auditoria apenas a
  `owner`/`admin` da organização + operadores autorizados, com o próprio acesso auditado.

---

## 11. Privacidade e requisitos legais (a validar, não é aconselhamento jurídico)

- Mercado alvo assumido pela Fase 0: **Portugal/UE** (utilizador está em Coimbra) ⇒ RGPD aplicável,
  ICP-ANS/RCN para comunicações eletrónicas a validar, e autoridade de controlo CNPD.
- Consequências técnicas concretas (Fase 1+): base legal para cada tratamento; registo de
  processamento; direitos de acesso/retificação/eliminação/portabilidade com prazo; minimização e
  limitação de finalidade; **consentimento explícito** para marketing; cookies não-essenciais só após
  consentimento; transferências fora do EEE (avaliar alojamento de dados UE na Vercel/Neon/R2 ou
  escolher fornecedores UE — decisão D-DEP-02 em `DEPLOYMENT.md`); avaliação de impacto se houver
  perfilização de leads; DPAs com todos os subcontratados; notificação de violação em 72 h.
- Leads de compradores são dados pessoais: acesso restrito por papel, exportação auditada, retenção
  definida por política, e "apagar cliente" tem de propagar-se a caches e backups (procedimento de
  _hard delete_ documentado — sem isto, "eliminação" é ilusão).
- IA + dados de clientes: verificar licença e termos de uso dos dados em cada fornecedor; registar
  modelos/provedores usados por geração para responder a pedidos de transparência; não enviar PII a
  provedores de IA sem base legal e sem contrato de processamento.

---

## 12. Cópias de segurança e recuperação (requisitos; execução na Fase 1)

| Item                         | Valor alvo                                          | Nota                                                                                                                                                             |
| ---------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frequência de snapshot da BD | diária + WAL/archive contínuo se o plano o permitir | Neon Free: janela de restauro ~6 h, 1 snapshot manual (ver `DEPLOYMENT.md` §2.2) — **insuficiente** para um SaaS comercial; é limitação conhecida, não invisível |
| Retenção                     | 30 dias                                             | a rever com a política de retenção legal                                                                                                                         |
| Cifragem em repouso          | obrigatória em produção                             | no plano pago/self-host                                                                                                                                          |
| Teste de restauro            | **mensal**, com resultado registado                 | um backup nunca restaurado não é backup                                                                                                                          |
| RPO                          | ≤ 24 h na Fase 1, ≤ 15 min em produção comercial    | alvo a confirmar                                                                                                                                                 |
| RTO                          | ≤ 4 h (Fase 1), ≤ 1 h (comercial)                   | inclui reposição de ambiente + verificação de isolamento                                                                                                         |
| Exposição pública de backups | proibida                                            | bucket privado, sem listagem, chaves separadas                                                                                                                   |

---

## 13. Ameaças prioritárias para este produto (ranked) e estado

| #   | Ameaça                                                         | Probabilidade/impacto | Estado da mitigação                                                        |
| --- | -------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------- |
| 1   | Acesso cruzado entre organizações (IDOR + cache partilhada)    | alta / crítico        | política definida (§3), **0 testes**                                       |
| 2   | Roubo de sessão (XSS, token em storage, CORS frouxo)           | média / crítico       | cookies HttpOnly + CSP planeados; sem UI hoje                              |
| 3   | Fatura inesperada de IA (cota, chaves, upload malicioso)       | alta / alto           | limites no schema, teto por organização ainda por criar                    |
| 4   | Ficheiros maliciosos (plantas/IFC/SVG) no pipeline de ingestão | média / alto          | requisitos do §6, nada implementado                                        |
| 5   | Escalada por convite/papel (`owner` indevido)                  | média / alto          | modelo de papéis por implementar + auditoria                               |
| 6   | Abuso de partilhas públicas (enumerabilidade, scraping)        | média / médio         | tokens não-enumeráveis no plano; sem listagem                              |
| 7   | Supply chain (pacote comprometido, `postinstall`)              | média / alto          | **mitigado parcialmente hoje**: bloqueio de build scripts, audit, lockfile |
| 8   | Segredo no repositório/`NEXT_PUBLIC_*`                         | média / alto          | **mitigado hoje**: `.gitignore`, QG-11/QG-12                               |
| 9   | DDoS/abuso de endpoints caros                                  | média / médio         | rate limiting por definir (8)                                              |
| 10  | Perda de dados (sem backup/teste de restauro)                  | baixa / crítico       | plano §12, execução Fase 1                                                 |
