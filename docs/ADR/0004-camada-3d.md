# ADR 0004 — Camada 3D: `three.js` com volumetria procedural, render sob procura e alternativa não-gráfica de primeira classe

- **Estado**: Implementado (medição de desempenho em dispositivo real: pendente)
- **Data**: 2026-10-24
- **Impacto de fase**: Fase 2 (condiciona F3–F4)
- **Decisão tomada por**: agente técnico (Arena) no âmbito do pedido da Fase 2; o pedido limitava
  explicitamente o âmbito a "uma área 3D deliberadamente limitada, estável e optimizada"

## 1. Contexto

A Fase 2 pedia uma demonstração visual de capacidade 3D **sem** abrir as portas das fases
seguintes: nada de editor de geometria, nada de regras BIM, nada de importação de plantas, nada de
materiais avançados, nada de IA. Em simultâneo, quatro requisitos não-funcionais apertavam ali:
libertação de recursos GPU no desmontar, comportamento quando não há WebGL, limites em dispositivo
móvel, alternativa visual quando a cena não pode correr — e o budget gate (QG-20) não aceita que
`three` entre no bundle partilhado.

O repositório não tinha nada de 3D, e o contexto de produto é sensível: **uma maquete volumétrica
não é um modelo BIM**. Uma camada 3D que se pareça com um motor de BIM mas não tenha dados de
construção é o modo mais rápido de perder a confiança de um promotor. A decisão tinha de ser
estética **e** epistemológica: o que mostramos é volumetria derivada de um seed declarado, e isso
tem de estar escrito na interface.

## 2. Decisão

1. **Biblioteca**: `three@0.186.1` (MIT) com `@types/three@0.186.0`. Nenhum motor comercial, nenhum
   motor de jogo, nenhuma dependência de ficheiros externos — **zero carregadores** (`GLTFLoader`,
   `DRACOLoader`, `FBXLoader` não são importados) e zero modelos no repositório.
2. **Uma única fonte de geometria**: `src/demo/massing.ts` recebe o `SceneSeed` de cada projeto
   demo e produz um `Massing` (níveis, caixas, pés-direitos, recuos, área do terreno, altura total).
   **A cena WebGL e a alternativa gráfica consomem o mesmo `Massing`** — `toPlanLevels()` deriva os
   contornos por piso do mesmo objeto que alimenta os `BoxGeometry`. Não há segunda descrição
   geométrica para desincronizar, e isso é asserção de teste: `massing.test.ts` exige o mesmo número
   de contornos por piso que de caixas por nível, para os 6 projetos.
3. **Fronteira do contexto**: `src/components/scene/volume-scene.ts` é uma função de imperativos
   (`createVolumeScene(canvas, container, massing, options) → VolumeScene`), não um componente
   React. React nunca é dono do loop de animação; o fecho devolvido por `createVolumeScene` é dono
   de `requestAnimationFrame`, do `ResizeObserver`, do `IntersectionObserver`, dos listeners e da
   cena, e é chamado no cleanup do `useEffect`.
4. **Libertação explícita** (requisito do pedido): `dispose()` percorre a cena a chamar
   `geometry.dispose()` e `material.dispose()`, faz `renderer.dispose()` e
   `renderer.forceContextLoss()` em `try/catch`, cancela o `rAF`, desliga os dois observadores e
   remove os listeners. É chamado no desmontar **e** no evento `webglcontextlost`, que também troca
   para a alternativa não-gráfica.
5. **WebGL é uma pergunta, não uma suposição**: `src/lib/webgl.ts` devolve
   `"supported" | "unavailable" | "unknown"`; `use-webgl-support.ts` expõe-na com
   `useSyncExternalStore` (snapshot do servidor = `"unknown"`) porque React 19 proíbe
   `setState` dentro do corpo de um `useEffect`. O `<canvas>` só é montado com `"supported"`, via
   `next/dynamic` com `ssr: false` (`scene-stage.tsx`) — assim o `three` não entra no bundle
   partilhado nem no HTML do servidor.
6. **Alternativa de primeira classe, não mensagem de erro**: `scene-fallback.tsx` mostra a planta
   vetorial por piso (`PlanDrawing`), a tabela de níveis com pés-direitos e a descrição textual
   ("N pisos · X,Y m de altura"). É **seleccionável pelo utilizador** a qualquer momento, além de
   automática quando não há WebGL, quando o contexto se perde ou quando `prefers-reduced-motion`
   está ativo com qualidade baixa.
7. **Câmera limitada, nunca livre**: órbita com `pitch` entre 0,08 e 1,32 rad (4,6°–75,6°),
   distância entre 1,7× e 8× o raio do terreno; quatro presets nomeados
   (`norte/nascente`, `alçado sul`, `facha poente`, `vista de planta`) que também definem a
   distância; passo de órbita `π/12`, de elevação `π/24`, de dolly ×1,18. Sem `OrbitControls`:
   o `three` que carregamos é o nosso subconjunto, e as barreiras são comportamento testável —
   os quatro botões de vista são `<Button>` reais e o grupo é navegável por teclado.
8. **Custo controlado**: render sob procura com amortecimento (para de marcar frames quando a
   velocidade angular cai abaixo de 5e-4), pausa quando o palco sai do viewport
   (`IntersectionObserver`), `setPixelRatio(min(DPR, 1,25))` por omissão e `2` apenas quando a
   qualidade é `detailed` **e** `isConstrainedDevice()` é falso, `powerPreference: "high-performance"`
   só nesse modo, `antialias` desligado em dispositivo limitado, névoa e `GridHelper` dimensionados
   pelo raio do sítio. Órbita automática está **desligada por omissão** e indisponível com movimento
   reduzido (`setReducedMotion`).
9. **A cena obedece ao sistema de design**: as cores de material são lidas de `--scene-*` com
   `getComputedStyle` (`readColor`, com fallback), e `syncTheme()` é chamado quando o tema muda —
   não existe uma paleta paralela "de 3D" escondida no JavaScript.
10. **Leitura de desempenho visível**: `onStats` devolve fps, triângulos e `drawCalls` por
    `renderer.info.render`; o palco mostra-os em monoespaçado. Um utilizador pode assim ver o custo
    do que está a ver — e nós temos um número para o QG-19 quando chegar a hora de medir por
    dispositivo.
11. **Selo de natureza do dado**: a vista 3D e o palco dizem explicitamente que é maquete
    volumétrica de demonstração, com o aviso `DemoNotice` da origem dos dados.

## 3. Alternativas consideradas

| Alternativa                          | Porque não                                                                                                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@react-three/fiber` + `drei`        | abstrai o ciclo de vida que este pedido exige **provar** (dispose, context loss); +2 pacotes e +~40 kB para um palco com uma geometria                   |
| `model-viewer` (custom element)      | ótimo para GLB fotografado; pressupõe modelos externos e não dá controlo de contexto nem fallback textual                                                |
| Babylon.js                           | mais completo (e a sua licença é MIT), mas o footprint e a superfície de API são para um motor, não para uma volumetria de 6 caixas por projeto          |
| CSS 3D / `transform: preserve-3d`    | zero dependências, mas sem iluminação, sem medidas reais, sem `drawCalls` para orçamentar — não serve como prova de capacidade                           |
| Canvas 2D isométrico desenhado à mão | leve; descarta WebGL e a pergunta "o que acontece quando o contexto se perde" desaparece do produto, que era justamente o que o pedido pedia para tratar |
| Carregar um GLTF de exemplo          | qualquer ficheiro é um ativo a licenciar e a manter; a Fase 4 tratará de formatos reais com dados reais                                                  |

## 4. Consequências

- **Positivas, medidas**: `three` fica num chunk diferido de **134,5 kB gzip** que não está no
  bundle partilhado nem em nenhuma rota de entrada (`scripts/bundle-budget.mjs`:
  `partilhado=false, rotas-iniciais=nenhuma`); as 6 páginas de detalhe de projeto são
  pré-renderizadas com palco e têm first-load de 202,5 kB cada, dentro do limite de 240 kB; 11 + 4 testes
  cobrem geometria e alternativa gráfica; nenhum ficheiro binário de modelo no repositório.
- **Aceites**: a volumetria é retangular por construção — não há coberturas inclinadas, varandas ou
  pilares; o `pitch` limitado significa que não se consegue ver "por baixo" nem em prumo; sem
  `OrbitControls` não há pan nem inércia de rato contínua; um `MeshStandardMaterial` simples é
  visualmente pobre comparado com um renderizador de produção (deliberado).
- **Travado sem ADR novo**: editar geometria na interface; importar plantas ou IFC; materiais PBR
  com texturas externas; animação de câmera dirigida por scroll; cenas simultâneas na mesma página;
  usar a cena como fonte de verdade de dados (a cena lê o seed, nunca o inverso).

## 5. Verificação (comandos executados — 2026-10-24)

| Verificação                             | Comando                                                                           | Resultado                                                                               |
| --------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Geometria determinística                | `pnpm exec vitest run src/demo/massing.test.ts`                                   | **11/11** (alturas, recuos, raio, contornos por piso = caixas por nível nos 6 projetos) |
| Alternativa gráfica                     | `pnpm exec vitest run --project dom src/components/scene/scene-fallback.test.tsx` | **4/4** (tabela de níveis, planta, texto de resumo, ausência de canvas)                 |
| `three` não é partilhado nem antecipado | `pnpm run budget`                                                                 | `diferido: three 134,5 kB · partilhado=false · rotas-iniciais=nenhuma`                  |
| Bundle partilhado                       | `pnpm run budget`                                                                 | 128,9 kB / 150 kB (limites: first-load 240 kB, total 520 kB)                            |
| Tipos + lint do código imperativo       | `pnpm run typecheck` · `pnpm run lint`                                            | 0 erros, 0 avisos                                                                       |
| Fronteira de suporte WebGL              | `src/lib/webgl.test.ts`                                                           | **3/3** — em ambiente sem DOM devolve `unknown`, nunca `unavailable` fingido            |

**Não** foi possível medir FPS, tempo até interatividade nem memória GPU: o sandbox não tem browser
nem GPU. QG-19 continua **PENDENTE** com este motivo escrito, e é o instrumento (readout de fps +
triângulos + draw calls no próprio palco) que permitirá medi-lo num dispositivo real.

## 6. Reversão

A camada é substituível por construção: `volume-scene.ts` não é importado por rotas (só
`scene-stage.tsx` o faz, e só através de `next/dynamic`), e o contrato `Massing` vive em
`src/demo/massing.ts`. Retirar o WebGL = apagar `scene-stage.tsx`/`scene-view.tsx`/`volume-scene.ts`
e fixar `SceneFallback` — a planta e a tabela de níveis continuam a ser o produto, o que é
exatamente a razão de serem uma vista seleccionável e não um estado de erro.
