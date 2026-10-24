# VELORA — Sistema de design (Fase 2)

> Referência do **como se desenha** no VELORA. Os tokens vivem num único ficheiro
> (`src/app/globals.css`); este documento explica o que cada um significa, onde pode ser usado e
> que contrato o testa. As decisões estão em `docs/ADR/0003-design-system.md`; a arquitetura de
> código em `docs/ARCHITECTURE.md` §3; o que foi medido em `docs/QUALITY-GATES.md` §4.3.

Estado: **implementado e medido** para cor, tipografia, espaçamento, raio, sombra, movimento,
estados de foco/selecção/carregamento/erro/vazio e acessibilidade das superfícies criadas na
Fase 2. Nada neste ficheiro descreve componentes ainda inexistentes.

---

## 1. O que o sistema tem de comunicar

| Leitura desejada         | Como é produzida                                                                                                                                              | Onde se prova                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Precisão arquitetónica   | Malha de desenho (`blueprint-grid`) como textura; traços de 1 px; números tabulares; planta vetorial a pares de linhas; rótulos em maiúsculas pequenas        | `plan-drawing.tsx`, `.tabular`, `.label-caps` |
| Tecnologia 3D            | Superfície própria para cena com paleta plana dedicada (`--scene-*`), leitura de métricas em monoespaçado, cena sempre acompanhada de alternativa não-gráfica | `scene-stage.tsx`, `scene-fallback.tsx`       |
| Sofisticação imobiliária | Serifada display para títulos, medida de prosa limitada (`--prose-max`), um único acento, muito espaço em branco, sombras de 1.º nível quase invisíveis       | `@theme` `--font-display`, `--shadow-e1`      |

O que é **rejeitado por contrato**, não por gosto: gradientes, brilhos (`glow`), vidro/translucidez
decorativa, animação perpétua, números "arredondados" em blocos de estatística, ícones sem rótulo
como única indicação de ação, e qualquer estilo que dependa de `window` durante a renderização.

Referências usadas como estudo: produtos de ferramenta de precisão e publicações editoriais de
arquitetura — só para **hierarquia, ritmo e contenção**, nunca para copiar superfícies.

---

## 2. Fonte única de tokens

Regra estrutural: **nenhum valor literal fora de `globals.css`** — 128 tokens únicos (45 na
`:root` base + 37 substituições no tema escuro, 56 mapeamentos em `@theme inline` + 24 no bloco da
escala tipográfica). Componentes compõem utilities do
Tailwind v4 derivadas do bloco `@theme`; o bloco `@theme inline` resolve `var()` no ponto de uso,
o que é o que permite que um `bg-surface` mude com o tema sem re-render nem classe condicional.

| Grupo              | Tokens                                                                                                                  | Nota                                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Superfícies        | `--canvas`, `--canvas-sunken`, `--surface`, `--surface-raised`, `--surface-inverse`                                     | `--surface-raised` = `--surface` no tema claro por decisão: elevação é comunicada por sombra, não por cor |
| Tinta              | `--ink`, `--ink-secondary`, `--ink-muted`, `--ink-faint`, `--ink-on-accent`, `--ink-on-inverse`                         | `--ink-faint` **nunca** texto (ver §3.2)                                                                  |
| Traços             | `--line`, `--line-strong`, `--line-control`, `--line-inverse`                                                           | só `--line-control` tem de atingir 3:1 (ver §3.3)                                                         |
| Acento             | `--accent`, `--accent-hover`, `--accent-active`, `--accent-soft`, `--accent-ink`                                        | um único acento saturado no produto                                                                       |
| Estado             | `--success`, `--warning`, `--danger`, `--info` + variantes `-soft`                                                      | tom escuro no claro, claro no escuro                                                                      |
| Cena 3D            | `--scene-bg`, `--scene-mass`, `--scene-podium`, `--scene-mass-lit`, `--scene-glazing`, `--scene-line`, `--scene-ground` | lidos pelo WebGL a partir do CSS — a cena obedece ao tema                                                 |
| Geometria          | `--shell-max`, `--rail-width`, `--header-height`, `--prose-max`, `--tap-min`                                            | larguras de contentor são tokens, não `max-w-*` arbitrários                                               |
| Ritmo              | `--density-step`, `--space-card-y`, `--space-stack`                                                                     | ver §5                                                                                                    |
| Raio               | `--radius-xs                                                                                                            | sm                                                                                                        | md  | lg  | xl` = 2 / 3 / 5 / 8 / 12 px | raios pequenos: o produto é uma ferramenta |
| Sombra             | `--shadow-e1`, `--e2`, `--e3`                                                                                           | três níveis, nada intermédio                                                                              |
| Movimento          | `--ease-quart-out`, `--ease-quart-in-out`, `--ease-soft` + durações fixas (0,16 s / 0,32 s / 1,6 s)                     | ver §7                                                                                                    |
| Escala tipográfica | `--text-2xs … --text-6xl` com `line-height` e `letter-spacing` por grau                                                 | ver §4                                                                                                    |
| Breakpoints        | extras `--breakpoint-xs` (30 rem) e `--breakpoint-3xl` (120 rem) sobre `sm…2xl` do Tailwind                             | 360 px → ecrã largo testado por inspeção de layout, não por screenshot                                    |

O portão **QG-21** (`src/app/design-tokens.test.ts`, 31 asserções) verifica a parte medível:
20 pares de texto a ≥ 4,5:1 nos dois temas, os limiares de 3:1 de foco, borda de controlo e
seleção, a ausência de `text-ink-faint` em `src/**`, e as restrições de identidade de §6–§7
(nenhum gradiente fora da malha, três níveis de sombra, raios dentro de 2–12 px, movimento curto
com atalho de redução, um único acento). O que o portão **não** verifica: se cada token é
consumido por alguém — isso continua a ser revisão de PR.

---

## 3. Cor

### 3.1 Tabela de contraste medida

Rácios calculados a partir dos valores hexadecimais acima pela fórmula WCAG (reluminância),
executados como teste automatizado (`design-tokens.test.ts`) e não estimados "à vista".

| Par (light)                       | Razão    | Limiar | Uso                                              |
| --------------------------------- | -------- | ------ | ------------------------------------------------ |
| `--ink` / `--canvas`              | 16,17 :1 | 4,5    | corpo de texto                                   |
| `--ink` / `--surface`             | 17,62 :1 | 4,5    | texto em cartões                                 |
| `--ink-secondary` / `--surface`   | 10,01 :1 | 4,5    | metadados fortes, subtítulos                     |
| `--ink-muted` / `--surface`       | 5,64 :1  | 4,5    | rótulos, legendas, texto de apoio                |
| `--ink-muted` / `--canvas`        | 5,18 :1  | 4,5    | idem, fora de superfícies                        |
| `--ink-muted` / `--canvas-sunken` | 4,74 :1  | 4,5    | texto em `surface-quiet` (o pior caso permitido) |
| `--accent` / `--surface`          | 9,34 :1  | 4,5    | ligação, texto de botão                          |
| `--focus` / `--canvas`            | 8,57 :1  | 3,0    | anel de foco                                     |
| `--line-control` / `--surface`    | 3,94 :1  | 3,0    | contorno de campo de formulário                  |
| `--line-control` / `--canvas`     | 3,62 :1  | 3,0    | idem                                             |
| `--line-strong` / `--canvas`      | 1,88 :1  | —      | **não-texto**: divisores/traços decorativos      |

| Par (dark)                      | Razão    |
| ------------------------------- | -------- |
| `--ink` / `--canvas`            | 16,26 :1 |
| `--ink-secondary` / `--surface` | 9,81 :1  |
| `--ink-muted` / `--surface`     | 6,18 :1  |
| `--line-control` / `--surface`  | 5,52 :1  |
| `--line-control` / `--canvas`   | 5,95 :1  |

### 3.2 Regra `--ink-faint`

`--ink-faint` (3,02 :1 sobre `--surface` no claro) **não pode servir texto**. Existe para
`skeleton`, marcas de grelha e ícones decorativos. O teste QG-21 varre `src/**` e falha se
`text-ink-faint` aparecer em qualquer ficheiro de aplicação; os 22 locais que o usavam como texto
foram promovidos a `--ink-muted` na Fase 2, o que obriga a escurecer `--ink-muted` de
`#767b81` para `#63676d` (4,74 :1 no pior caso) para que o novo mínimo fosse real.

### 3.3 Regra `--line-control`

WCAG 1.4.11 exige 3:1 para fronteira de componente interactivo. Um divisor pode ser ténue;
**um campo não pode**. Por isso existe um token próprio para contornos de controlo
(`--line-control`), usado em `field.tsx`, `radio-cards.tsx`, `live-search-field.tsx`,
`live-select-field.tsx`, `preferences-form.tsx`, `access-form.tsx` e `button.tsx` (variante
`secondary`/`ghost`). O erro de contraste que isto corrige foi **detectado pela varredura**, não
por um revisor: antes havia um único `--line-strong` a fazer os dois papéis, e os campos ficavam a
1,88 :1.

### 3.4 Tema

`data-theme="light|dark"` no `<html>`, determinado por `--sistema|light|dark` nas preferências;
`color-scheme` acompanha a escolha para que `input[type=date]`, scrollbar e autofill não sejam
pintados contra ela. O arranque é feito por um `<script>` inline no `layout.tsx` antes da pintura
(sem "flash"), lendo a mesma chave de armazenamento que o módulo — a paridade é verificada por
teste. Não existe terceira variante (nem "alto contraste" separado): o tema escuro **é** a
variante de baixo brilho, e os limiares acima já são os do pior caso.

---

## 4. Tipografia

| Grau        | Tamanho / entrelinha    | Uso                                                  |
| ----------- | ----------------------- | ---------------------------------------------------- |
| `2xs`       | 11 px / 1,45 · +0,06 em | `.label-caps` (rótulos de secção, contadores)        |
| `xs`        | 12 px / 1,5 · +0,02 em  | metadados de tabela, legendas, estado                |
| `sm`        | 13 px / 1,55            | corpo de controlos, textos de cartões densos         |
| `base`      | 15 px / 1,6             | corpo de página, formulários                         |
| `lg`        | 17 px / 1,55            | introdução de landing, resumo                        |
| `xl`        | 20 px / 1,4             | h2 de secção                                         |
| `2xl`       | 24 px / 1,3             | h1 de página                                         |
| `3xl`–`4xl` | 30 / 38 px              | título de landing e de detalhe de projeto            |
| `5xl`–`6xl` | 48 / 60 px              | reservados a statement de marca; usados uma vez cada |

Famílias: `--font-display` (serifada de sistema), `--font-sans` (UI), `--font-mono` (medidas,
referências, métricas da cena). **São famílias de sistema por limitação verificada do ambiente de
construção** — não foi possível obter binários de fonte nem validar licenciamento a partir deste
sandbox. Os nomes estão tokenizados precisamente para que a Fase 3 os substitua por
`next/font/local` alterando **um** bloco em `globals.css`, sem tocar em componentes.

Regras: `text-wrap: balance` em títulos, `text-wrap: pretty` em parágrafos, `font-variant-numeric:
tabular-nums` (`.tabular`) em qualquer número lido como dado (áreas, datas, contadores, fps),
`text-2xs` só em maiúsculas com entrelinha maior, e nenhum texto abaixo de 11 px.

---

## 5. Espaçamento, densidade e larguras

| Token               | Valor                  | Papel                                                                       |
| ------------------- | ---------------------- | --------------------------------------------------------------------------- |
| `--shell-max`       | 90 rem (1440 px)       | contentor máximo do produto e da landing                                    |
| `--container-shell` | → `--shell-max`        | utilitário `max-w-shell`                                                    |
| `--rail-width`      | 15,5 rem (248 px)      | barra lateral fixa no desktop                                               |
| `--header-height`   | 3,5 rem (56 px)        | cabeçalho contextual                                                        |
| `--prose-max`       | 42 rem (672 px)        | medida de leitura (`.prose-block`)                                          |
| `--tap-min`         | 2,75 rem (44 px)       | alvo tátil mínimo; usado em `Button size="lg"` e nos controlos do cabeçalho |
| `--density-step`    | 1 (0,82 em compacto)   | multiplicador único do ritmo                                                |
| `--space-card-y`    | `calc(1,15rem × step)` | padding vertical de cartões/linhas                                          |
| `--space-stack`     | `calc(1,5rem × step)`  | espaçamento entre blocos de página                                          |

A densidade é escolhida em `/app/preferencias` e persiste como `[data-density="compact"]` no
`<html>`. Uma única variável alterna as duas densidades: **não existem variantes `compact:` em
componentes**, o que impede que a preferência 1 (espaço) e a preferência 2 (tema) se estraguem
mutuamente. As larguras de contentor são tokens para que a mesma leitura de "medida de desenho"
sirva landing, listas e detalhe.

---

## 6. Raio, sombra e traço

| Nível                       | Uso                                                             | Valor                  |
| --------------------------- | --------------------------------------------------------------- | ---------------------- |
| `--radius-xs`               | anel de foco, chips de fase                                     | 2 px                   |
| `--radius-sm`               | esquinas internas, `skeleton`, botões pequenos                  | 3 px                   |
| `--radius-md`               | campos, botões, salto do skip link                              | 5 px                   |
| `--radius-lg`               | cartões, `surface-quiet`, painéis                               | 8 px                   |
| `--radius-xl`               | moldura da cena 3D e modais futuros                             | 12 px                  |
| `--shadow-e1`               | cartão em repouso                                               | 1 px + 3 px, α ≤ 0,05  |
| `--shadow-e2`               | popover, menu, cartão em hover                                  | 2 px + 16 px, α ≤ 0,10 |
| `--shadow-e3`               | cena, sobreposição, estado de erro                              | 4 px + 40 px, α ≤ 0,18 |
| traço 1 px `--line`         | divisor, contorno de cartão                                     | —                      |
| traço 1 px `--line-strong`  | contorno "destacado", malha                                     | não-texto              |
| traço 1 px `--line-control` | contorno de controlo                                            | 3:1 obrigatório        |
| `@utility hairline-b`       | linha inferior de secção sem ocupar espaço (`inset box-shadow`) | —                      |

Nada de contornos de 2 px, nada de bordes coloridos em cartões, nada de sombra "colorida". A
hierarquia de elevação é: plano (canvas) → cartão (`e1`) → flutuante (`e2`) → palco (`e3`).

---

## 7. Movimento

| Momento                                  | Movimento                                                                  | Duração / easing                                     |
| ---------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------- |
| Foco, hover, selecção, tema, densidade   | transição de cor/fundo; nenhum deslocamento                                | 0,15 s `--ease-quart-out`                            |
| Entrada de conteúdo montado (`.rise-in`) | 6 px de subida + opacidade, **uma vez**                                    | 0,32 s `--ease-quart-out`                            |
| Carregamento (`skeleton`)                | pulsação de opacidade 0,55 → 1                                             | 1,6 s `--ease-soft`, infinita enquanto dura o estado |
| Skip link                                | translação de entrada                                                      | 0,16 s `--ease-quart-out`                            |
| Cena 3D                                  | interpolação de órbita/zoom até ao alvo (não é contínua: render-on-demand) | ~0,5 s `--ease-quart-in-out`                         |

Contrato de redução: `@media (prefers-reduced-motion: reduce)` **e** `html[data-motion="reduced"]`
(desativam animações e transições para 0,001 ms e `scroll-behavior: auto`). O modo reduzido manual
existe porque a órbita automática da cena e a pulsação do `skeleton` são as duas únicas coisas que
um utilizador pode querer cortar sem alterar o SO. Consequência funcional verificada: com movimento
reduzido a rotação automática é **desligada** (não apenas acelerada) e a cena usa a vista isométrica
inicial — ver `ADR-0004` §Consequências.

Não existem: parallax, scroll-jacking, animação em loop de ícones, contadores animados, transições
de página orquestradas.

---

## 8. Ícones

Lucide React, 1,61,0 (ISC). Regras do sistema: `size-4` (16 px) em linha com texto de 13–15 px,
`size-5` (20 px) em controlos do cabeçalho e alvos táteis; `strokeWidth` por omissão; cor =
`currentColor` herdada do texto (nunca cor própria); decoração a par de rótulo de texto;
`aria-hidden="true"` quando o texto ao lado já nomeia o alvo. O único ícone sem texto é o
`ThemeToggle`, que tem `aria-label` + `title` e usa dois glifos trocados por CSS
(`.icon-when-light`/`.icon-when-dark`) para não haver estado de JavaScript nem _mismatch_ de
hidratação.

Nenhum mapa de ícones é exportado a partir de dados (`config/nav.ts` guarda uma chave simbólica —
`overview`, `projects`, `scene`, … — e o `AppNav` resolve-a; assim o catálogo de dados não depende
da biblioteca de ícones).

---

## 9. Inventário de componentes

`src/components/ui/**` — primitivas **de apresentação**: recebem conteúdo, não conhecem dados nem
rotas. Toda a componente da lista abaixo tem teste no projecto `dom` do Vitest
(`src/components/ui/primitives.test.tsx`, 14 casos).

| Componente                 | Props relevantes                                  | Variantes/estados                                                                         | Onde é usada                                                                         |
| -------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `Button`                   | `variant`, `size`, `type`, `icon`                 | `primary` `secondary` `ghost` `danger`; `sm` `md` `lg`; `disabled` real e `aria-disabled` | toda a UI; `buttonClass()` exportada para que `<Link>` e `<a>` tenham o mesmo estilo |
| `Field`                    | `label`, `hint`, `error`, `required`, render-prop | normal · `focus-visible` · `aria-invalid` · `disabled` · `required`                       | formulários (`/acesso`, preferências, toolbar)                                       |
| `RadioCards`               | `name`, `value`, `options[]`, `onChange`          | `aria-checked`, `disabled` por opção, teclado ←→                                          | selector de vista, tema, densidade, movimento                                        |
| `StatusPill`               | `status`                                          | `draft` `review` `published` `archived` — ponto de cor **e** rótulo                       | cartões e linhas de projeto                                                          |
| `DemoBadge` / `DemoNotice` | —                                                 | fixo                                                                                      | **todas** as superfícies com dados de demonstração                                   |
| `Alert`                    | `tone`, `children`, `action`                      | `info` `success` `warning` `danger`; `role=status/alert`                                  | erros de validação, avisos de contexto                                               |
| `EmptyState`               | `title`, `description`, `icon`, `action`          | —                                                                                         | lista de projetos sem resultados, páginas de fase                                    |
| `Skeleton`                 | `lines`, `shape`                                  | pulsação controlada por `@media`                                                          | `loading.tsx` de `/app` e `/app/projetos`                                            |
| `Toast`                    | `ToastProvider` + `useToast`                      | auto-descarta em 5 s, máx. 3, botão de fecho, `role=status`                               | acções de formulário (copiar referência, preferências)                               |

LAYOUT (`src/components/layout/**`): `AppShell` (grelha + `main#conteudo`), `AppNav` (`next/link`,
`aria-current="page"`, itens de fase seguintes como `aria-disabled` com rótulo de fase), `AppHeader`
(título contextual + acções + preferências), `PageHeader`, `PublicChrome` (cabeçalho/rodapé público),
`ThemeToggle`, `PreferencesEffects`/`PreferencesForm`.

PROJECTOS (`src/components/projects/**`): `ProjectCard`, `ProjectRow`, `ProjectToolbar`,
`LiveSearchField` (debounce 180 ms, Esc limpa, evento `velora:search-clear`), `LiveSelectField`,
`ClearFiltersButton`, `CopyReferenceButton`, `PlanDrawing` (planta SVG derivada da mesma geometria
da cena).

CENA (`src/components/scene/**`): ver `ADR-0004`.

Regra de dependência: `ui` → nada; `layout`/`projects`/`scene` → `ui` + `lib` + `demo` + `config` +
`i18n`; rotas → tudo. Uma componente `ui` que precise de dados deixa de ser `ui`.

---

## 10. Estados

| Estado             | Implementação                                                                   | Contrato                                                                                      |
| ------------------ | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Foco               | `:focus-visible` global: `outline: 2px solid var(--focus); outline-offset: 2px` | visível em **todos** os alvos, sem remover outline de rato; ordem de tabulação = ordem visual |
| Selecção           | `::selection` com `--accent-soft`/`--accent-ink`                                | legível nos dois temas; usado para "números copiáveis"                                        |
| Carregamento       | `loading.tsx` por segmento + `Skeleton`; nunca spinner de ecrã inteiro          | a estrutura da página mantém-se; nenhum layout shift medido manualmente                       |
| Erro               | `error.tsx` por segmento + `Alert tone="danger"` com acção de repetir           | mensagem diz **o que** falhou e **o que fazer**; sem stack trace para o utilizador            |
| Vazio              | `EmptyState` com acção de limpar filtros                                        | distinguir "sem dados" de "sem resultados" (a lista de projetos tem os dois)                  |
| Não encontrado     | `not-found.tsx` em `/` e em `/app` (com navegação de volta)                     | 404 real de rota, não página decorativa                                                       |
| Sucesso            | `Toast` (`useToast`) com texto e acção opcionais                                | não bloqueia; desaparece sozinho                                                              |
| Indisponível (GPU) | `SceneFallback` seleccionável                                                   | ver `ADR-0004` §Decisão                                                                       |

---

## 11. Acessibilidade (contrato executável)

1. `<html lang="pt">`, landmarks: um `<main>`, `<nav aria-label>`, `<header>`, skip link como
   primeiro elemento focável (`.skip-link` visível a teclado).
2. Ordem de títulos sem saltos. A varredura com `axe-core` apanhou uma violação real nesta fase:
   `h1 → h3` na lista de projetos; a lista passou a ter o seu `h2` de secção (a página
   comprimida é `h1 → h2 → h3`).
3. Formulários: `<label>` ligado por `id` (via render-prop do `Field`), `aria-describedby` para
   dica e erro, `aria-invalid`, `aria-required`, erros anunciados com `role="alert"`.
4. Estado nunca comunicado só por cor: `StatusPill` = ponto + texto; `DemoBadge` = texto; foco =
   outline + offset; gráfico de planta = contorno e rótulos.
5. Alvos táteis ≥ 44 px (`--tap-min`) em controlos de cabeçalho e em todas as acções primárias.
6. Teclado: Tab/Shift+Tab (sem armadilhas), Enter/Espaço em botões, ←→ em `RadioCards`, Esc no
   campo de pesquisa, grupo de vistas da cena navegável por teclado com órbita/dolly limitados.
7. Movimento: respeitado o SO e a preferência manual (§7).
8. Zoom: layout não usa `vw` para texto; a 200 % não há corte de rótulos (verificação por
   inspecção do CSS: nenhuma largura fixa em texto).

Ferramenta: `axe-core` 4,14,0 a correr no projecto `dom` do Vitest
(`src/app/accessibility.test.tsx`) sobre as superfícies compostas (cartão de projeto, cena
de fallback, estados de formulário). Três regras desactivadas, cada uma com razão escrita no
ficheiro: `color-contrast` (as cores de texto são garantidas pelo contrato QG-21, não pelo DOM
de teste), `landmark-one-main` e `region` (fragmentos montados fora do `AppShell`).

**Limitação honesta:** nada foi validado com leitor de ecrã real nem com utilizador humano; e
nenhum screenshot foi visto — este ambiente não tem browser. As cores foram medidas por cálculo, a
tipografia por CSS, e o comportamento por testes.

---

## 12. Como se adiciona ou altera um token

1. Escrever em `globals.css` (`:root` / `[data-theme="dark"]`) e mapear no `@theme inline`.
2. Actualizar a tabela de contraste do §3.1 com os números **medidos** — o teste QG-21 recalcula-os a partir do CSS e falha se algum par cair abaixo do limiar.
3. Adicionar a asserção correspondente a `src/app/design-tokens.test.ts`.
4. Se a alteração muda uma regra de produto (novo acento, nova família de fontes, novo nível de
   sombra), escrever ADR — o §9 de `DEVELOPMENT-WORKFLOW.md` é o que torna isto obrigatório.

O caminho proibido é o inverso: "arranjar" um teste a baixar o limiar de contraste. Nenhum limiar
foi tocado na Fase 2 — o que mudou foram os valores de cor.

---

## 13. Lacunas e próxima camada

| Lacuna                                   | Porquê                                                                             | Fecha em                   |
| ---------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------- |
| Famílias de sistema, não webfonts        | sem acesso a binários/licenciamento neste sandbox                                  | Fase 3 (`next/font/local`) |
| Nenhum teste visual automatizado         | sem browser; decisão deliberada de não adicionar Playwright agora (QG-17 pendente) | Fase 3                     |
| Tokens de gráficos (dados)               | não há gráficos de dados na Fase 2                                                 | Fase 4                     |
| Tema de alto contraste dedicado          | limiares actuais já são os do pior caso; adiar até haver pedido                    | Fase 5                     |
| Componentes de tabela de edição / modais | não há objeto a desenhar                                                           | Fase 3–4                   |

---

## 14. O editor 3D no sistema (Fase 3)

O editor de modelo (`/app/modelo`, `src/components/editor/**`) foi desenhado com a regra do §12
aplicada ao contrário: **zero tokens novos**. Uma segunda linguagem visual num ecrã que já tem uma
seria pior do que um ecrã feio, por isso o que o editor pede ao sistema já lá estava.

| Superfície                                    | Como usa o sistema                                                                                                                                                                                                                                                                | O que não faz                                                                           |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Palco                                         | o fundo, a grelha e as cores dos materiais vêm dos tokens `--scene-*`, lidos em `read-token.ts` e **injetados** no motor: `three` nunca chama `getComputedStyle`, por isso continua testável em Node com cores fixas                                                              | nenhum gradiente, nenhum brilho de marca dentro do canvas                               |
| Barra de ferramentas                          | `Button` com `variant`/`size` do sistema, `aria-pressed` nas ferramentas, `role="toolbar"`                                                                                                                                                                                        | botões desenhados à mão dentro do palco                                                 |
| `aria-label` por nó (`"… — N de M visíveis"`) |
| Propriedades                                  | `Field` (com `*` + texto para leitor de ecrã), `inputMode="decimal"` com vírgula `pt-PT`, `StatusPill` para o estado da seleção, `Alert` para recusas                                                                                                                             | `type="number"`: o browser rejeita `"3,45"` e a vírgula do locale perdia-se em silêncio |
| Estado                                        | `.surface-card` no rodapé com `StatusPill` (palco ativo / a preparar / vetor sem WebGL), `N elementos · M visíveis`, os contadores reais do palco quando existem, `X edições nesta sessão`, a seleção ativa, a convenção de unidades e o `DemoBadge` — todas as strings em `i18n` | cartões flutuantes por cima do modelo, números sem origem                               |
| Estados de erro                               | sem WebGL → cartão de alternativa não-gráfica com árvore e painel funcionais; contexto perdido → aviso com `Recarregar o palco`                                                                                                                                                   | spinner eterno, mensagem técnica crua, página em branco                                 |

Regras que a Fase 3 tornou necessárias e que passam a estar no contrato:

- **o palco é o foco visual**: num ecrã estreito os painéis passam para debaixo do canvas em vez de
  o cobrirem, e o `_layout_` não usa `position: fixed` sobre o modelo;
- **indicadores discretos**: o HUD usa `text-2xs` + `tabular` e vive no rodapé da superfície, não em
- **indicadores discretos**: o HUD usa `text-2xs` + `tabular` e vive no rodapé da superfície, não em
  cartões flutuantes sobre o modelo — e escreve "sem contagens de GPU" quando não há palco, em vez de
  mostrar zeros inventados;
- **nada de número bonito**: toda a numeração do editor vem de `Intl`/`units.ts` com unidades
  explícitas; o editor não mostra "1 250" sem um `m` ao lado;
- **o _reduced motion_ chega ao motor, não só ao CSS**: `reducedMotion` entra na montagem do palco e
  desliga a animação de câmera (as vistas enquadram em vez de interpolar). A **qualidade** é outra
  decisão e não duplica nada: `tierFor(preferência, isConstrainedDevice())` sobre a preferência única
  da aplicação (`lib/preferences`) — em dispositivo limitado resolve para `leve` (sem sombras, 1×, sem
  antialias), exatamente como a cena de volume da Fase 2;
  para `leve` e desliga a animação de câmera; é um pedido do sistema, não uma escolha estética;
- o `axe-core` da QG-16 passou a correr sobre o editor (`src/app/accessibility.test.tsx`) e apanhou
  duas coisas reais antes do primeiro _commit_: um contentor rolável com `role="tree"` sem
  `tabIndex` (inacessível por teclado) e um `<li>` de truncagem dentro da árvore que não pertencia à
  estrutura (`role="presentation"` adicionado).
