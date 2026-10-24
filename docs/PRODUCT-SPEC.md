# VELORA — Especificação de Produto (Fase 0; estado da Fase 2 em §7.1.1 e §10)

> Âmbito: visão, utilizadores, jornadas, âmbito futuro, restrições e critérios de sucesso.
> Este documento **não** especifica ecrãs nem implementa módulos. Cada afirmação está marcada como
> **[Aprovado]** (base de trabalho desta fase), **[Hipótese]** (carece de validação) ou
> **[Em aberto]** (precisa de decisão humana).

---

## 1. Visão

O VELORA permite que uma imobiliária ou promotor **crie, edite, apresente e comercialize**
empreendimentos imobiliários num único fluxo de trabalho: geração assistida por IA a partir de texto,
imagens, plantas e ficheiros; modelação com capacidades BIM progressivas; visualização 3D em tempo real
no navegador; experiências cinematográficas e visitas guiadas partilháveis; e gestão de leads até à
conversão.

Proposta de valor em uma frase: **transformar material disperso de venda (PDFs, plantas, renders
avulsos) num ativo digital interativo, versionado e comercial — sem equipa 3D dedicada.**

**[Aprovado]** A aposta differentiate é a continuidade entre _modelo de negócio_ (leads, versões,
planos) e _modelo geométrico_ (cena, elementos construtivos) na mesma plataforma, com isolamento por
organização.

---

## 2. Utilizadores

| Persona                             | Quem é                                               | Trabalho a terminar                                              | Sucesso mede-se por                     |
| ----------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------- |
| **Agente/Promotor "Ana"**           | equipa comercial de imobiliária média (5–40 pessoas) | publicar um empreendimento apresentável em horas, não semanas    | tempo do upload ao link partilhável     |
| **Arquiteto/Modelador "Rui"**       | técnico interno ou parceiro de projeto               | transformar planta em modelo coerente e editável, manter versões | % de alterações aceites sem re-trabalho |
| **Gestor de marketing "Sofia"**     | marca e distribuição                                 | gerar materiais e visitas para campanha, medir engajamento       | leads qualificados por campanha         |
| **Diretor/Gestor de conta "Marco"** | dono do negócio                                      | controlar o que é publicado, preços e acesso de equipas          | zero incidentes de exposição indevida   |
| **Comprador/Visitante "Clara"**     | cliente final, mobile-first                          | perceber o imóvel à distância, reservar visita                   | pedidos de contacto por visita          |
| **Suporte/Operação (nós)**          | equipa VELORA                                        | diagnosticar sem aceder a dados de clientes além do mínimo       | tempo de diagnóstico, acessos auditados |

**[Hipótese]** a persona primária de aquisição é a **Ana** (agente com prazo comercial), não o
arquiteto. Se esta hipótese falhar, o peso do produto desloca-se do "publicar rápido" para o
"modelar bem" — o que muda a ordem das fases. Validação: 10 entrevistas a agentes + 1 teste de fluxo
com material real, antes de fechar a Fase 2.

---

## 3. Jornadas principais (nível produto)

1. **Do briefing à primeira cena.** [Aprovado] Texto/imagens/planta → rascunho de empreendimento com
   volumetria, tipologias e materiais base → editor abre em < 20 s. Critério de qualidade: o resultado é
   editável, não um render morto.
2. **Refinar e versionar.** [Aprovado] Edição de elementos (paredes/vãos/materiais), comparação com a
   versão anterior, publicação de uma nova versão imutável.
3. **Apresentar ao comprador.** [Aprovado] Link de partilha com visita guiada/cinemática, opções de
   privacidade e expiração, funcional em browser de smartphone médio de gama.
4. **Converter.** [Aprovado] Pedido de contacto na visita → lead na organização → notificação ao
   responsável → estado atualizado.
5. **Gerir a carteira.** [Aprovado] Lista de empreendimentos, estado, disponibilidade por tipologia,
   desempenho de cada partilha.
6. **Pagar e ativar.** [Aprovado] Plano por projeto/organização; **ativação inicial manual** (sem
   passarel) com registo de pagamento e auditoria. Substituição por cobrança automática é decisão
   posterior.
7. **Colaborar com segurança.** [Aprovado] Convites por papel, acessos por organização, nada de um
   membro ver dados de outra organização (requisito estrutural, `SECURITY.md` §3).

Jornadas **[Em aberto]** (fora do âmbito aprovado; não estimar nem desenhar ainda): integração com
CRM externo, assinatura de proposta/contrato, marketplace de terceiros, API pública, white-label,
módulo de gestão de obra.

---

## 4. Âmbito

### 4.1 Dentro da direção de produto (ordem prevista)

| Fase     | Entrega                                                                                                                                             |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 (esta) | fundação técnica, documentação, gates, decisões                                                                                                     |
| 1        | identidade/sessão, organizações/membros/convites, RLS + isolamento verificado, estrutura i18n, `resource` com upload controlado, casca do dashboard |
| 2        | gestão de empreendimentos/tipologias, editor de construção (2D/3D base), materiais, versionamento                                                   |
| 3        | geração por IA (texto/imagem/planta), pipeline de geometria, camadas BIM progressivas                                                               |
| 4        | visualização avançada, iluminação cinematográfica, visitas guiadas, partilhas públicas                                                              |
| 5        | leads, pedidos de contacto, notificações, planos + ativação manual                                                                                  |
| 6        | polimento comercial: onboarding, faturação real, observabilidade a sério, hardening                                                                 |

(Fases e ordem são **[Hipótese]** de planeamento — o que está **[Aprovado]** é o conteúdo da Fase 0 e
a existência de gates entre fases.)

### 4.2 Fora de âmbito (não é "para já", é fora)

- CAD paramétrico de especialidade e compatibilização de disciplinas (estruturas/AVAC).
- Fotorrealismo offline/render em servidor com GPU dedicada.
- Modelos de IA treinados por nós a partir de dados de clientes (a Fase 0 não prevê treino próprio).
- App iOS/Android nativas.
- Realidade virtual/AR imersiva (avaliar só depois da Fase 4).
- Autodeclaração de conformidade legal de documentação de venda (o VELORA apresenta, não certifica).

---

## 5. Requisitos aprovados (Fase 0 → produto)

| ID   | Requisito                                                                       | Onde é verificado                                                                              |
| ---- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| R-01 | SaaS multi-tenant com isolamento estrutural por organização                     | `SECURITY.md` §3 + QG-15 (pendente)                                                            |
| R-02 | Criação assistida por IA a partir de texto, imagens, plantas e ficheiros        | `DATA-MODEL.md` §3.10 (Fase 3)                                                                 |
| R-03 | Edifícios com interiores e exteriores, edição tipo construtor + BIM progressivo | Fase 2 entregou volumetria + planta SVG; edição continua em F3 (`ADR 0004`)                    |
| R-04 | Visualização 3D em tempo real no navegador, sem plugin                          | ✅ implementado na Fase 2 (`/app/cena`, `/app/projetos/[slug]`); QG-19 espera dispositivo real |
| R-05 | Experiências cinematográficas e visitas guiadas partilháveis                    | F4, `share_link`/`visit_session`                                                               |
| R-06 | Gestão de empreendimentos, leads e pedidos de contacto                          | F5                                                                                             |
| R-07 | Espaços privados por organização com papéis                                     | F1                                                                                             |
| R-08 | Planos por projeto com ativação manual inicial                                  | F5, `DATA-MODEL.md` §3.13                                                                      |
| R-09 | i18n completa (UI + conteúdo)                                                   | `ARCHITECTURE.md` §10                                                                          |
| R-10 | Interface web responsiva e experiência profissional                             | QG-16 (axe, desde a F2) + QG-18 (pendente, sem browser)                                        |
| R-11 | Segurança, testes, desempenho e acessibilidade adequados a produto comercial    | `QUALITY-GATES.md`                                                                             |
| R-12 | Orçamento inicial 0 € e sem dependência de serviços pagos sem decisão explícita | `DEPLOYMENT.md`                                                                                |

---

## 6. Restrições aprovadas

1. **Orçamento inicial 0 €.** Nada de subscrições, cartões ou ativação de serviços pagos nesta fase —
   e a Fase 0 **não** ativa nenhum.
2. Ferramentas gratuitas primeiro, **sem assumir que são gratuitas para sempre**: limites e planos
   registados com data de verificação (`DEPLOYMENT.md` §2).
3. Sem chaves de API, credenciais ou dados pessoais reais no repositório (verificado em QG-12).
4. Nada é declarado implementado sem evidência executada (ver `QUALITY-GATES.md` §4).
5. Sem arquitetura antecipada: complexidade só entra com necessidade demonstrada
   (`ARCHITECTURE.md` §9).
6. O repositório pretendido é `velora`, **privado**. Estado real encontrado: `valdimiroilidio3/velora-`,
   **público** — divergência registada como bloqueio B-01 (`DEPLOYMENT.md` §4, relatório final).

---

## 7. Critérios de sucesso

### 7.1 Da Fase 0 (o que se fecha aqui)

- Repositório identificado e acessível; documentação de arquitetura/segurança/dados/qualidade/custos
  criada e coerente; comandos aplicáveis executados com resultado registado; zero módulos funcionais
  fora do âmbito. Verificados em `QUALITY-GATES.md` §4 — critérios 1 a 10 da matriz de aceitação do
  pedido.

### 7.1.1 Da Fase 2 (aplicação-base, sistema de design e experiência visual)

Critérios de aceitação do pedido da Fase 2 e estado real, cada um com o comando que o sustenta
(evidência completa em `QUALITY-GATES.md` §4.3):

| #   | Critério                                        | Estado                    | Evidência                                                                                                                             |
| --- | ----------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Estrutura de rotas definida                     | ✅                        | 10 rotas no manifesto da build; 12 páginas pré-renderizadas                                                                           |
| 2   | Sistema de design reutilizável e documentado    | ✅                        | `DESIGN-SYSTEM.md` + 128 tokens em `globals.css` + QG-21 (31 asserções)                                                               |
| 3   | Navegação e interacções a funcionar             | ✅                        | `next/link` + `aria-current`; filtros por URL com estado reversível; testes de projeto 12/12                                          |
| 4   | Vistas principais responsivas                   | ✅ (parcial: sem browser) | breakpoints + contentores em tokens; verificação por inspeção de CSS, não por medição                                                 |
| 5   | Dados de demonstração claramente rotulados      | ✅                        | `DemoBadge`/`DemoNotice` em todas as superfícies; `isDemo` no tipo; 6 projetos fictícios com `DEMO-0x`                                |
| 6   | 3D com gestão de falha e libertação de recursos | ✅ (parcial: sem GPU)     | `dispose()` + `forceContextLoss()` + `webglcontextlost` → alternativa não-gráfica; `useSyncExternalStore` com `"unknown"` no servidor |
| 7   | typecheck / lint / testes / build executados    | ✅                        | `pnpm run verify` exit 0; 153 testes; build sem erros                                                                                 |
| 8   | Sem segredos no repositório                     | ✅                        | QG-12; nenhum valor de ambiente novo foi preciso                                                                                      |
| 9   | Nenhum serviço de produção simulado             | ✅                        | `/acesso` valida e **não** cria sessão; sem persistência além de `localStorage`; sem chamadas de rede                                 |
| 10  | Relatório separa real / demo / pendente         | ✅                        | este §7.1.1, `§10` abaixo, e a secção "Limitações" do relatório da fase                                                               |

### 7.2 Do produto (métricas a validar com utilizadores reais; **[Hipótese]** até haver tráfego)

| Dimensão               | Métrica                                          | Alvo inicial                       |
| ---------------------- | ------------------------------------------------ | ---------------------------------- |
| Velocidade de criação  | tempo de material bruto → link de partilha       | mediana < 30 min na Fase 4         |
| Usabilidade do gerador | % de gerações aceites sem re-modelação manual    | > 40 %                             |
| Editor                 | tarefas completadas sem ajuda em sessão de teste | > 8/10                             |
| Visualização           | TTI do link público em 4G / smartphone médio     | < 3 s até cena interativa          |
| Comercial              | pedidos de contacto por 100 visitas únicas       | > 3 (a validar)                    |
| Confiança              | incidentes de acesso entre organizações          | **0**, com teste QG-15 em CI       |
| Custo                  | custo de IA por projeto publicado                | < €5 (teto configurável por plano) |
| Sustentabilidade       | custo de infra com 0 clientes                    | €0                                 |

### 7.3 Critérios de "pronto para vender"

i18n em pelo menos PT+EN com conteúdo; isolamento entre tenants testado; backups com restauro testado;
política de privacidade e DPA com fornecedores; plano de preços com ativação manual e faturação
possível; termos de uso aprovados por aconselhamento jurídico externo (**[Em aberto]**: não é
trabalho de engenharia decidir bases legais).

---

## 8. Riscos de produto

| #   | Risco                                                                             | Mitigação                                                                                               |
| --- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| P1  | A expectativa do utilizador é "render final", a nossa entrega é "modelo editável" | definir o estado de resultado esperado no gerador (QA automático de cena)                               |
| P2  | Custo de IA explode com sucesso                                                   | teto por organização, cache de resultados, medição por tentativa (`generation_attempt.actual_cost_eur`) |
| P3  | 3D no browser abaixo do esperado em hardware real                                 | orçamento QG-19 + degradação explícita de qualidade, decisão adiada até haver 3D real                   |
| P4  | Dados de entrada (plantas) são caóticos                                           | a Fase 3 tem de começar com uma categoria controlada (ex.: planta em PDF vetorial)                      |
| P5  | Mercado exige faturação/contratos locais                                          | Fase 5 com faturação simples; não construir ERP                                                         |
| P6  | Concorrência de ferramentas de visualização genéricas                             | o diferencial tem de ser o fluxo comercial (F1/F5), não o render                                        |
| P7  | Uma conta Vercel Hobby ser incompatível com uso comercial                         | **descoberto nesta fase** — ver `DEPLOYMENT.md` §2.1; decisão B-02 antes de público comercial           |

---

## 9. Perguntas a responder por humanos antes de fechar o âmbito

1. O produto é da marca "VELORA" como SaaS público ou ferramenta interna de uma equipa que vende a
   clientes? (muda i18n, preços, suporte)
2. Qual o mercado legal inicial além de Portugal (UE/UK/Angola/Brasil?) — afeta retenção, moeda,
   IVA/faturação e idioma(s) prioritário(s).
3. Os planos são por **organização**, por **projeto** ou híbridos? O texto de Fase 0 fala em "planos
   baseados em projetos".
4. A ativação manual é temporária (até existir passarel) ou é o modelo de cobrança dos primeiros 6 meses?
5. Que material real temos para testar o pipeline (plantas/IFC/fotografias licenciadas para uso)?
6. O repositório deve passar a privado com o custo de 2 000 min/mês de Actions ou mantemos público?
   (ver `DEPLOYMENT.md` §2.1/§4)
7. Existe servidor/equipa para self-hosting se um free tier mudar de preço?

---

## 10. Estado por superfície (Depois da Fase 2)

Legenda — **Real**: comportamento implementado e testado · **Demo**: dados/estado fictício rotulado ·
**Pendente**: fronteira preparada, implementação em fase seguinte.

| Superfície             | O que faz                                                                                         | Real                                                                       | Demo                                                 | Pendente                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------- |
| `/` (landing)          | Posicionamento, maquete hero em SVG, estados de marca                                             | tipografia/tokens, `PlanDrawing`, navegação                                | projetos e números mostrados                         | fotografia real, copy final                             |
| `/acesso`              | Formulário com validação de cliente, estados de erro, aviso de que não há autenticação            | validação com Zod (`lib/access-validation.ts`), foco de erro, `role=alert` | conta "demo" aceite (ana.duarte@example.invalid)     | sessão, cookies, MFA, recuperação de palavra-passe (F1) |
| `/app`                 | Visão geral com contadores derivados dos dados demo e lista de próximos passos por fase           | agregações em `demo/query.ts`                                              | os dados em si                                       | KPIs reais, atividade, tarefas                          |
| `/app/projetos`        | Lista/grelha, pesquisa com debounce, filtros por cidade/estado/ordenação, estados vazio e de erro | URL como estado (funciona sem JS), 6 projetos, `aria-live`                 | localização, preços, estados                         | paginação de servidor, permissões, edição               |
| `/app/projetos/[slug]` | Ficha com resumo, tipologias, áreas, versões demo, planta SVG e cena 3D                           | pré-render por slug (6 páginas), cópia de referência                       | medidas e datas                                      | upload de plantas, materiais, Partilhar (F4)            |
| `/app/cena`            | Palco 3D com presets de vista, órbita limitada, métricas de render e alternativa não-gráfica      | `three@0.186.1`, WebGL gate, `dispose()`, contexto perdido → fallback      | volumetria derivada de `SceneSeed`                   | seleção, edição, materiais PBR, LOD (F3)                |
| `/app/preferencias`    | Tema, densidade e movimento, com mapa do estado das rotas                                         | persistência em `localStorage` + arranque sem flash                        | o mapa de estado (reflete o repo, não um utilizador) | preferências por conta (F1, com autenticação)           |
| 404 / erro             | Páginas de estado para raiz e para o shell                                                        | navegação de volta, tom sem alarmismo                                      | —                                                    | relatório de erros (F4)                                 |
