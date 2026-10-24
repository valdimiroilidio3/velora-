# VELORA — Modelo de dados conceptual (Fase 0)

> **Nada aqui é esquema de produção**: não há migrações, não há ORM, não há base de dados neste
> repositório (verificado em `QUALITY-GATES.md`, QG-14 BLOQUEADO). Este documento fixa o vocabulário,
> as relações, a posse e as regras de acesso, para que a Fase 1 derive esquema em vez de o inventar.
> Nomes de tabela/coluna são candidatos, não compromissos; os campos listados são os que sustentam
> requisitos já escritos, não um desenho exaustivo.

---

## 1. Regras estruturais

1. **Organização é a raiz de posse.** Toda a tabela de negócio tem `organization_id NOT NULL` e RLS
   (`SECURITY.md` §3). Uma chave/URL que só dependa de `id` é um bug de segurança.
2. **Identidade separada de pertença.** Um utilizador existe uma vez; a relação com organizações é
   sempre por `organization_membership`. O mesmo humano pode pertencer a 3 imobiliárias e ter papéis
   diferentes em cada.
3. **Datas e estado explícitos.** `created_at`, `updated_at`, e `status` onde houver ciclo de vida.
   Nunca deduzir estado a partir de "existe um registo noutro lado".
4. **Auditoria por fora, não por trigger.** `audit_log` é uma tabela escrita pelo caso de uso (quem/agora),
   não por trigger invisível, para que o contexto de pedido (request_id, ip) chegue intacto.
5. **Soft delete só onde há valor legal** (leads, empreendimentos com contratos). O resto usa hard
   delete + `deleted_at` reservado a objetos com partilhas externas.
6. **Binários nunca na BD.** Ficheiros vivem em armazenamento de objetos; a BD guarda `resource`
   (chave, hash, tamanho, mime, estado de varrimento).
7. **i18n de conteúdo é dados.** Texto editável do utilizador (nome de empreendimento, descrição de
   venda) vive em tabelas `*_translation` com `locale`; texto de UI não vai para a BD.

---

## 2. Mapa conceptual

```
user ──< organization_membership >── organization ──< property_development ──< unit_type
              (role)                      │                   │
                                          │                   ├──< project ──< project_version ──< scene_revision
                                          │                   │        │            (draft/published/archived)
                                          │                   │        ├──< generation_job ──< generation_attempt
                                          │                   │        └──< resource (files, 3D assets)
                                          │                   ├──< lead ──< contact_request ──< lead_event
                                          │                   ├──< share_link (token, expiração)
                                          │                   └──< subscription ──< payment ──< activation
                                          └──< invite
              audit_log (append-only, referencia qualquer linha acima)
              webhooks / integration_credential / notification_preference
```

---

## 3. Entidades (mínimas, com decisões em aberto)

### 3.1 `user`

| Campo (candidato)                                         | Nota                                                                   |
| --------------------------------------------------------- | ---------------------------------------------------------------------- |
| `id`, `email` (citável, única), `password_hash`, `status` | `status`: `active`, `pending_verification`, `suspended`, `deactivated` |
| `locale`, `timezone`, `mfa_enabled`, `last_login_at`      |                                                                        |
| `created_at`, `updated_at`                                |                                                                        |

- Um `user` **não** tem `organization_id`: a pertença é sempre pela membership (regra 2).
- Decisão em aberto: conta pode existir sem convite (registo público) ou só por convite? Plano atual:
  ambos, com organização criada automaticamente no registo direto (D-PROD-04).

### 3.2 `organization`

- `id`, `name`, `slug` (únicos; slug no URL ⇒ política de nomes reservados), `country`, `vat_number`,
  `logo_resource_id`, `status` (`trial|active|suspended|closed`), `data_region` (UE/Não-UE),
  `settings` (JSONB com defaults explícitos, nunca "colunas elásticas" para dados consultados).
- Uma organização é o _tenant_. Não há "organização pessoal implícita" escondida: se o produto
  permitir conta individual, isso é uma organização `type=individual`, para que a regra de posse não
  tenha exceções.

### 3.3 `organization_membership`

- `organization_id`, `user_id`, `role`, `status` (`pending|active|revoked`), `invited_by`,
  `joined_at`, `revoked_at`.
- Único em `(organization_id, user_id)` — a remover membership não apaga o histórico de auditoria.
- `role` é **por organização** (não global): `owner`, `admin`, `editor`, `viewer`, `lead_manager`.

### 3.4 `invite`

- `organization_id`, `email`, `role`, `token_hash`, `expires_at`, `accepted_at`, `invited_by`.
- Nunca guardar o token em claro; validade curta (≤ 7 dias); reenvio substitui o anterior.

### 3.5 `property_development` (empreendimento)

- `id`, `organization_id`, `slug`, `title`, `status` (`draft|published|archived`), `location`
  (endereço + `lat/lon`), `typology` (residencial/comercial/misto), `promoter_name`,
  `pricing_from`, `currency`, `launch_date`, `completion_date`, `visibility` (`private|unlisted|public`).
- É a entidade comercial de longo prazo; pode agregar N `project`s (fases, plantas, ângulos de venda).
- Decisão em aberto: `development` ↔ `project` é 1:N (proposta aqui) ou 1:1? Assumimos 1:N porque
  "um empreendimento com várias fases" é caso real no mercado português (D-PROD-01).

### 3.6 `unit_type` (tipologia/fração-modelo)

- `property_development_id`, `code`, `name`, `typology` (T0…T5), `area_gross_m2`, `area_net_m2`,
  `bedrooms`, `bathrooms`, `floor_plan_resource_id`, `price_from`, `currency`, `availability_count`,
  `status` (`available|reserved|sold|withdrawn`).
- Estado de disponibilidade é **sensível comercialmente**: visível publicamente só quando o
  `property_development.visibility` o permitir e por escolha explícita do tenant.

### 3.7 `project` e `project_version`

- `project`: `organization_id`, `property_development_id`, `name`, `status`
  (`draft|in_review|published|archived`), `current_version_id`, `schema_version` (do formato de cena).
- `project_version`: `project_id`, `number` (incremental por projeto), `parent_version_id`,
  `scene_revision_id`, `change_summary`, `created_by`, `created_at`, `status`
  (`draft|published|archived`), `published_at`.
- **Publicar** = apontar `project.current_version_id` para uma versão congelada. A versão publicada é
  imutável: editar a público exige nova versão (regra de negócio, não técnica).
- Decisão em aberto: _branching_ de versões (ramificação não-linear) ou só linear + `parent`? Assumimos
  linear com `parent_version_id` reservado para "derivado de" (D-PROD-02).

### 3.8 `scene_revision` / `scene_node` (BIM progressivo)

- `scene_revision`: `project_version_id`, `payload` (JSONB versionado por `schema_version`),
  `content_hash`, `size_bytes`, `built_by_job_id`.
- Elementos construtivos (parede, laje, vão, divisão) são itens de `scene_node` com `element_id`
  estável, tipo, geometria de referência, parâmetros e metadados (material, espessuras).
- **Identidade persistente** de elemento é o requisito duro: IA, editor e exportações BIM têm de
  referir o mesmo elemento através de versões. Um UUID por elemento, nunca índice posicional.
- O payload binário pesado (meshes, texturas) fica em `resource`; a BD guarda a estrutura lógica.

### 3.9 `resource`

- `organization_id`, `owner_type`+`owner_id` (polimórfico controlado, ou tabela de junção por tipo),
  `kind` (`image|floor_plan|model|texture|export|avatar`), `storage_key`, `original_name`,
  `mime_type`, `size_bytes`, `sha256`, `width`, `height`, `scan_status`
  (`pending|clean|flagged|unsupported`), `visibility` (`private|shareable|public`), `created_by`,
  `deleted_at`.
- `sha256` + `(organization_id, sha256)` único permite deduplicação sem partilha entre tenants.
- Nunca guardar ficheiros fora do prefixo da organização (`org/{organization_id}/…`).

### 3.10 `generation_job` / `generation_attempt`

- `generation_job`: `organization_id`, `project_id`, `requested_by`, `kind` (`text_to_scene|image_to_model|
plan_to_bim|material_pass|…`), `input` (referências a `resource` + prompt estruturado, **sem PII
  desnecessária**), `status` (`queued|running|succeeded|failed|cancelled`), `model`, `provider`,
  `estimated_cost_eur`, `actual_cost_eur`, `tokens_in/out`, `error_code`, `started_at`, `finished_at`,
  `idempotency_key`.
- `generation_attempt`: tentativas (retry, fallback de modelo) com `job_id`, `provider_request_id`,
  `cost`, `status`, `log_excerpt` sanitizado.
- Contrato: `idempotency_key` por submissão (o utilizador carrega duas vezes, pagamos uma) e
  `actual_cost_eur` por organização — é o que sustenta teto de custo do `SECURITY.md` §8.
- Decisão em aberto: reter o prompt/output por quanto tempo? (direito ao esquecimento vs depuração).

### 3.11 `lead` / `contact_request` / `lead_event`

- `lead`: `organization_id`, `property_development_id`, `unit_type_id`, `project_version_id`,
  `name`, `email`, `phone`, `locale`, `consent_marketing_at`, `source`
  (`site|shared_link|visit|import`), `status` (`new|contacted|qualified|visiting|proposal|won|lost|
reactivated|gdpr_erased`), `assigned_to`, `first_seen_at`, `last_seen_at`.
- `contact_request`: a mensagem em si (`lead_id`, `message`, `attachments[]`, `ip`, `user_agent`,
  `honeypot`, `captcha_verified`); uma linha por pedido, N pedidos por lead.
- `lead_event`: `lead_id`, `type` (`viewed|requested|opened|replied|status_changed|exported|erased`),
  `at`, `actor_id` (nullable: evento anónimo de página pública).
- Dados pessoais ⇒ só `viewer` não lê contactos, `lead_manager`/`admin` sim; exportação é sempre
  auditada (regra de acesso §5).
- Prazo de retenção e "apagar e propagar" definidos em `SECURITY.md` §11.

### 3.12 `share_link` / `visit_session`

- `share_link`: `organization_id`, `property_development_id`/`project_version_id`, `token` (não
  enumerável), `mode` (`view|cinematic|guided`), `password_hash?`, `expires_at`, `allow_index`,
  `revoked_at`, `created_by`.
- `visit_session`: `share_link_id`, `visitor_id` (cookie first-party anónimo), `locale`,
  `events` (hotspots, tempo por divisão, dispositivos), `lead_id?` quando a visita gera contacto.
  Métrica de produto **sem** fingerprinting ilícito: verificar consentimento (§`SECURITY.md` §11).

### 3.13 `plan` / `subscription` / `payment` / `activation`

- `plan`: `code`, `limits` (JSONB: projetos, membros, storage, gerações/mês), `price_eur_month`, `active`.
- `subscription`: `organization_id`, `plan_id`, `status`
  (`trialing|active|past_due|manual_activation|paused|cancelled`), `seats`, `starts_at`, `renews_at`,
  `ends_at`, `manual_activated_by`, `manual_notes`.
- `payment`: `subscription_id`, `provider` (`manual|multibanco|mbway|stripe|invoice`), `amount`,
  `currency`, `status` (`pending|confirmed|failed|refunded`), `reference`, `paid_at`,
  `recorded_by`, `invoice_resource_id`.
- `activation`: `organization_id`, `subscription_id`, `action` (`activate|extend|downgrade|cancel`),
  `performed_by`, `evidence_resource_id`, `notes`, `created_at`.
- **Fase 5, ativação manual**: o produto tem de funcionar sem passarel — `payment.provider=manual` com
  registo por um `admin` humano e `activation` a torná-lo efetivo. Nenhum SDK de pagamento, nenhum
  cartão, nenhum segredo de passarel no repositório (restrição de Fase 0, §`PRODUCT-SPEC.md` §6).
- Consequência a aceitar: `payment` manual é _contabilidade paralela_ até existir faturação real; a
  substituição por faturação automática é um projeto com ADR próprio.

### 3.14 `audit_log`

- `organization_id?`, `actor_id?`, `actor_kind` (`user|system|support|integration`), `action`,
  `target_type`, `target_id`, `request_id`, `ip`, `user_agent`, `metadata` (JSONB pequeno), `at`.
- Append-only, sem `UPDATE`/`DELETE` para o papel da aplicação (política escrita em Fase 1).

### 3.15 Suporte

- `integration_credential` (`organization_id`, `provider`, `label`, `secret_ref`, `scopes`, `status`)
  — só referências ao secret manager/`S3_*` por organização, **nunca** o segredo.
- `webhook_endpoint` / `webhook_delivery` para integrações de terceiros (Fase 4+, com retries e
  assinatura HMAC).
- `notification_preference`, `saved_view`, `comment`, `task` — a definir com os módulos respetivos.

---

## 4. Relações (cardinalidade e efeito de remoção)

| Relação                                                 | Cardinalidade       | `on delete`                                                                                  |
| ------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------- |
| `user` ↔ `organization` (via `organization_membership`) | N:M                 | membership → `cascade`; `user` → `restrict` (apagar contas é processo, não efeito colateral) |
| `organization` → `property_development`                 | 1:N                 | `cascade` lógico, mas bloqueado por `status=closed` + retenção legal                         |
| `property_development` → `project`                      | 1:N                 | `restrict` (empreendimento com projetos não se apaga sem decisão)                            |
| `project` → `project_version`                           | 1:N                 | `cascade`                                                                                    |
| `project_version` → `scene_revision`                    | 1:1 (publicado) / N | `cascade`                                                                                    |
| `project` → `generation_job`                            | 1:N                 | `restrict` enquanto correr; depois `set null`                                                |
| `resource` → dono polimórfico                           | N:1                 | `restrict` se referenciado por versão publicada                                              |
| `property_development` → `unit_type`                    | 1:N                 | `cascade` (com auditoria)                                                                    |
| `property_development`/`project_version` → `lead`       | 1:N                 | `set null` no vínculo comercial; o `lead` pertence à organização, não ao produto             |
| `organization` → `subscription`                         | 1:1 (ativo)         | `restrict`                                                                                   |
| `share_link` → `visit_session`                          | 1:N                 | `cascade`                                                                                    |

---

## 5. Matriz de acesso (autorização por papel, a implementar na Fase 1)

Legenda: **L** ler · **E** editar · **P** publicar · **C** gerir contactos · **$** planos/pagamentos ·
**A** membros/papéis · — sem acesso · (T) só na sua organização.

| Ação                                  | owner | admin | editor | viewer | lead_manager | client_viewer (partilha)               |
| ------------------------------------- | ----- | ----- | ------ | ------ | ------------ | -------------------------------------- |
| Ver empreendimentos/projetos (T)      | L/E/P | L/E/P | L/E/P  | L      | L            | —                                      |
| Editar projeto/versão (rascunho)      | E     | E     | E      | —      | —            | —                                      |
| Publicar/despublicar                  | P     | P     | pedir  | —      | —            | —                                      |
| Gerar por IA (custos)                 | E     | E     | E      | —      | —            | —                                      |
| Carregar/apagar ficheiros             | E     | E     | E      | —      | —            | —                                      |
| Criar/revogar `share_link`            | E     | E     | E      | —      | —            | —                                      |
| Ver leads (PII)                       | C     | C     | —      | —      | C            | —                                      |
| Exportar leads                        | C     | C     | —      | —      | C            | —                                      |
| Gerir plano/pagamentos/ativação       | $     | $     | —      | —      | —            | —                                      |
| Convidar/remover membros, papéis      | A     | A     | —      | —      | —            | —                                      |
| Ver `audit_log`                       | sim   | sim   | não    | não    | não          | não                                    |
| Página pública / visita 3D partilhada | —     | —     | —      | —      | —            | L (só `visibility=public`/link válido) |

Regras de exceção: nenhum papel tem acesso **fora** da própria organização, independentemente do que o
URL diga; `client_viewer` só existe no contexto de um `share_link` válido e nunca acede a API de
leitura geral (`/api/**` exige sessão de membro).

---

## 6. Estados importantes (transições)

```
property_development:  draft → published → archived
project_version:       draft → in_review → published → archived
generation_job:        queued → running → succeeded | failed | cancelled   (retry = nova attempt)
lead:                  new → contacted → qualified → visiting → proposal → won | lost
                            ↘ reactivated (lost→qualified com nota)        ↘ gdpr_erased (terminal)
subscription:          trialing → active → past_due → active | suspended → cancelled
                     manual_activation → active (com `activation` registado)
resource:              pending → clean → ready | flagged | unsupported
organization:          active → suspended → closed (com retenção/legal)
```

Invariantes a testar na Fase 1: (a) `project.current_version_id` aponta sempre para versão
`published`; (b) versão `published` é imutável; (c) `lead.gdpr_erased` apaga campos pessoais e
mantém contagem agregada; (d) `generation_job` em `running` tem timeout e nunca fica pendurado;
(e) `subscription` sem `payment` confirmado não pode ter `status=active` exceto em `manual_activation`
explícita com `activation`.

---

## 7. Decisões de persistência (em aberto, com recomendação)

| ID        | Decisão                                                                                                               | Recomendação da Fase 0                                                                       | Pesos na balança                                                                                                                   |
| --------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| D-DATA-01 | Chaves: `uuid v7` para entidades novas, `bigserial` em tabelas de alto volume de inserção (`audit_log`, `lead_event`) | uuid v7 por padrão (ordenação temporal, sem enumerabilidade)                                 | v7 precisa de suporte na BD/extensão; sequências vazam volume em URLs                                                              |
| D-DATA-02 | Isolamento                                                                                                            | base partilhada, esquema partilhado, **RLS por organização**                                 | alternativa _database-per-tenant_: isolamento máximo, mas N migrações/N pools; _schema-per-tenant_ fica no meio e complica pooling |
| D-DATA-03 | Payload de cena                                                                                                       | JSONB na BD + binários em objeto storage                                                     | só objeto storage ⇒ sem consultas estruturais; só JSONB ⇒ incha a BD                                                               |
| D-DATA-04 | ORM/migrações                                                                                                         | Drizzle + `drizzle-kit`                                                                      | Prisma 7 (mais mágica, cliente gerado, `latest` atual é RC); Knex (SQL cru, sem tipos). ver `DEPENDENCIES.md` §3.4                 |
| D-DATA-05 | Migração com dados multi-tenant                                                                                       | sempre aditivo + `NOT VALID`/`VALIDATE` em 2 passos; sem `ALTER` bloqueante em tabela quente | planeado quando existir volume                                                                                                     |
| D-DATA-06 | `audit_log`                                                                                                           | tabela única por organização + partição mensal quando crescer                                | partição precoce é complexidade sem ganho                                                                                          |
| D-DATA-07 | Paginação                                                                                                             | keyset (`(created_at,id)`) em listas públicas, offset proibido                               | offset degrada e permite saltos inconsistentes                                                                                     |
| D-DATA-08 | Textos i18n                                                                                                           | tabelas `*_translation` com PK composta                                                      | JSONB por locale ⇒ difícil de consultar/índices                                                                                    |

---

## 8. Requisitos não-funcionais que o modelo tem de suportar

1. Toda a listagem pública é paginada por keyset e filtrável por `locale`/`typology`/`preço` sem
   varrimento de tabela (índice composto por organização + campo de filtro).
2. Carregar a estrutura de um projeto (sem binários) tem de caber num único pedido indexado:
   `project_version` → `scene_revision` (payload) e `resource` por hash.
3. A geração por IA é assíncrona por natureza: o modelo tem de poder sobreviver a restart do processo
   (`status` persistente + `idempotency_key`), porque a função serverless tem teto de 300 s.
4. Leads têm de ser exportáveis e apagáveis por organização (RGPD) sem tocar em métricas agregadas.
5. Ativação manual de plano tem de ser verificável por terceiros (quem, quando, evidência).
6. Nenhuma tabela pode exigir que a aplicação "lembre" de filtrar por organização: RLS + FK com
   `organization_id` na mesma tabela (não só no pai).

---

## 9. Checklist de Fase 1 (quando este documento deixa de ser "plano")

- [ ] Escolha de ORM/migrações registada em `ADR/0002` (D-DATA-04).
- [ ] Esquema inicial: `user`, `organization`, `organization_membership`, `invite`, `audit_log` + `resource` (mínimo para o primeiro upload controlado).
- [ ] `property_development`, `project`, `project_version` com RLS e `WITH CHECK`.
- [ ] Papéis e matriz do §5 com testes negativos (QG-15).
- [ ] Estratégia de índice + `EXPLAIN` de referência registado no PR (só se mede, não se promete).
- [ ] Política de retenção/eliminação materializada em migração (campos a apagar, não só "esconder").
- [ ] Modelo de versão/imutabilidade testado (invariantes do §6).

---

## 10. Modelo de cena da Fase 3 (em memória, não persistido)

Nada nesta secção está na base de dados — não há base de dados. O `SceneDocument`
(`src/three/model.ts`) existe para que a Fase 1 o possa persistir sem reescrever o editor, e é o
único objeto que o motor sabe ler. Está aqui porque "que campos existem e quem os posse" tem de ter
uma resposta escrita antes de existir esquema.

**Convenção (escrita no próprio documento, recusada se divergir):**

| Campo canónico   | Valor                                                                                              | Onde                          |
| ---------------- | -------------------------------------------------------------------------------------------------- | ----------------------------- |
| `convention`     | `velora.meters.y-up.v1`                                                                            | `units.ts:UNIT_CONVENTION_ID` |
| `upAxis`         | `Y`                                                                                                | `units.ts:UP_AXIS`            |
| `northAxis`      | `-Z`                                                                                               | `units.ts:NORTH_AXIS`         |
| `origin`         | "centroide do terreno, ao nível do solo acabado do piso 0"                                         | `units.ts:ORIGIN_DESCRIPTION` |
| `orientationDeg` | rotação do edifício face ao norte, em graus                                                        | por projeto                   |
| unidades         | metros, um decimal tratado como tal (`mm()` converte de milímetros apenas na fronteira do gerador) | `units.ts`                    |

`parseSceneDocument` falha se `schemaVersion !== 1`, se a `convention` for outra, se um elemento
referir um `levelId`/`materialId` inexistente ou se uma id não for única. É por isso que há um número
de versão no documento e no ficheiro JSON, e não um `default` tolerante.

**Entidades:** `SceneDocument` (1) → `SceneLevel` (N: `id`, `index`, `label`, `kind ∈ site|podium|typical|setback|roof`,
`elevationM`, `heightM`) → `SceneElement` (N). O elemento é o átomo editável:

| Campo        | Papel                                                                                                       | Nota de posse                                                                                                                                                            |
| ------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`         | `${levelId}.${category}.${n}`, estável e legível                                                            | não é aleatório de propósito: é a chave de seleção, da árvore e do `_sync_` da cena, e tem de sobreviver a reordenamentos                                                |
| `name`       | rótulo humano                                                                                               | gerado pelo construtor, editável no painel (só texto)                                                                                                                    |
| `category`   | 10 categorias fixas (`terrain, platform, slab, wall, partition, door, window, roof, circulation, interior`) | é a categoria que escolhe a **regra de edição** e o **material por omissão**; não é uma etiqueta livre                                                                   |
| `levelId`    | piso                                                                                                        | sobe/gra com a categoria na árvore                                                                                                                                       |
| `materialId` | 10 chaves de material (`ground, platform, slab, wall, partition, door, glazing, roof, core, furniture`)     | o material vive em `materials.ts` e lê tokens, não cores literais                                                                                                        |
| `geometry`   | `box \| wall \| plate \| panel \| stairs` com dimensões nominais em metros                                  | a geometria **nominal** vai para o `RenderPlan`; a transformação vive no objeto                                                                                          |
| `transform`  | `position: Vec3` (m, Y para cima), `rotationY` (graus, anti-horário visto de cima), `scale: Vec3`           | escrito **só** por `withTransform` → `resolveTransform` (regra + `snapping` + limites)                                                                                   |
| `visible`    | visibilidade do elemento                                                                                    | a visibilidade de categoria é derivada por `withCategoryVisibility`, nunca duplicada                                                                                     |
| `locked`     | terreno e plataforma recusam todas as ferramentas                                                           | campo explícito porque "bloqueado" é um estado de produto, não um acaso das regras                                                                                       |
| `structural` | marca o que é estrutura                                                                                     | usado pela regra para recusar escala de fachada; não é uma alegação de cálculo estrutural                                                                                |
| `demo`       | `{ generatedFrom, note }`                                                                                   | metadado de demonstração **dentro** do modelo: um documento importado de origem real teria de trazer outro marcador, e o editor recusa o selo de demo se ele não existir |

**Relações e invariantes que os testes afirmam** — `model.test.ts` (19 testes),
`demo-building.test.ts` (22), `serialize.test.ts` (14) e `render-plan.test.ts` (7):

- nenhum elemento órfão (`levelId` existe), nenhuma geometria com dimensão ≤ 0, nenhuma cota fora do
  sentido (a laje nunca fica abaixo da cota do piso), nenhuma id repetida;
- espessuras fixas no gerador — fachada 0,25 m, divisória 0,1 m, laje 0,28 m, painel envidraçado
  0,06 m, parapeito 0,90 m, porta 1,10 × 2,10 m — e pé-direito vindo do projeto de demonstração
  (2,90–3,20 m nos 6 edifícios). São números de maquete, registados em `demo-building.test.ts` para
  que uma mudança de proporção seja uma decisão e não um deslize;
- `buildRenderPlan(document)` é determinístico: o mesmo documento produz o mesmo plano (mesmas
  chaves, mesmas dimensões, mesma ordem), o que torna a cena testável em Node sem `three`.

**Fronteira com o modelo de construção (BIM):** o `SceneElement` é uma representação, não um elemento
de projeto. Não há `IfcWall`, não há classificação, não há quantidade de materiais, não há
propriedades Part 1/Part 11 e nenhuma superfície do produto afirma conformidade. Quando a Fase 4
trouxer IFC, o mapeamento entra por `model-loader.ts` (que hoje recusa todos os formatos que não o
JSON do próprio VELORA) e produz `SceneElement`s — o editor não muda.
