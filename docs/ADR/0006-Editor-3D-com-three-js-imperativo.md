# ADR-0006 — Editor 3D com `three.js` imperativo, R3F recusado

- **Estado:** Aceite
- **Data:** 2026-10-24
- **Fase:** 3 (motor 3D e editor de modelo)
- **Relacionado:** `docs/ADR/0004-camada-3d.md` (Fase 2, cena de volume), `docs/ARCHITECTURE.md` §3.2 e §8, `docs/DESIGN-SYSTEM.md` (tokens que o palco lê), `docs/MANUAL-3D-TESTS.md`

## Contexto

A Fase 3 pediu a fundação funcional de um editor 3D: palco com órbita controlada, seleção por
clique, hierarquia sincronizada, propriedades, transformações com regras, e um modelo de dados
tipado separado dos objetos de renderização. Três decisões técnicas estavam em aberto e têm de
ficar registadas porque são caras de reverter:

1. **Biblioteca e estilo de integração**: `three.js` imperativo vs. React Three Fiber (R3F) + drei.
2. **Dono do estado geométrico**: o documento de cena vs. a cena do `three`.
3. **Como é que uma dependência de ~135 kB gzip entra na aplicação** sem pesar em rotas que não têm
   3D e sem correr no servidor.

## Decisão

### 1. `three.js` imperativo; R3F e drei recusados nesta fase

O motor vive em `src/three/` e não sabe o que é React. A única peça que conhece os dois é
`src/components/editor/viewport-3d.tsx`, que cria o motor num `useEffect` e o destrói no `cleanup`.

R3F foi **avaliado e recusado**, não por preferência estética:

- o editor precisa de ciclos de vida explícitos (contexto perdido, `dispose` de geometrias e
  materiais, suspensão de renderização fora do ecrã). Em R3F, esses ciclos ficam dependentes do
  reconciliador e do `useFrame`, o que torna o `dispose` difícil de _afirmar_ em teste;
- a re-renderização de componentes React por mudança de estado é exatamente o padrão de custo que
  este editor não pode ter (arrastar um gizmo são 60 atualizações por segundo);
- R3F + drei são ~3 pacotes e um modelo mental novo, para uma superfície em que o trabalho é
  imperativo por natureza (`Object3D`, `Raycaster`, `TransformControls`);
- a Fase 2 já tinha decidido `three` imperativo para a cena de volume (ADR-0004), e manter **uma**
  estratégia de renderização no repositório foi requisito explícito do pedido.

Drei foi recusado porque os seus ganhos concretos neste produto (controles, `useGLTF`,
`Html`, `OrbitControls`) cabem em ~350 linhas de código nosso, com os limites que o produto exige
(clamps de distância/polar/pan derivados dos _bounds_ do lote, que os _defaults_ do drei não dão).

Se uma Fase 4 justificar R3F — por exemplo, se a UI de propriedades passar a viver _dentro_ do
cenário — a fronteira a preservar é a mesma: o motor continua puro e o R3F passa a ser só uma
camada de montagem.

### 2. O documento de cena é a fonte de verdade; a cena é uma projeção

```
documento (src/three/model.ts)
   → buildRenderPlan (src/three/render-plan.ts)      // plano determinístico, sem three
      → SceneManager.sync (engine/scene-manager.ts) // Object3D, geometrias, materiais
         ← gizmo / painel / árvore                  // TODOS escrevem por `withTransform`
```

- o documento (`SceneDocument`) é imutável, tipado, serializável e **não importa `three`**;
- o `RenderPlan` é a única coisa que o renderer lê; cada primitiva tem dimensão **nominal** e a
  transformação (posição/rotação/escala) vive no `Object3D` do grupo do elemento. É isso que permite
  ao gizmo escrever `group.position` e ao documento receber exatamente o mesmo número, sem
  reconstruir geometria durante um arrasto;
- a escrita passa por `withTransform`, que aplica as regras de `edit-rules` (o que é movível,
  rodável, escalável), o passo de _snapping_ e os limites de `materials.ts`, e devolve
  `{ applied, rejected }`. Recusa é um resultado, não uma exceção — a UI mostra o motivo;
- visibilidade de categoria e de elemento também é escrita no documento. Não existe uma
  visibilidade "da cena": `buildRenderPlan(document, onlyVisible)` é o que faz o elemento
  desaparecer do plano, e portanto do `sync`.

Consequência prática e testada: **não há transformações temporárias**. O que está no ecrã é o que
está no documento. Não há persistência — a edição vive na página e na sessão, e isso está dito na
UI, não escondido num _snackbar_.

### 3. Fronteira de carregamento: `three` só pela porta do palco

- a rota `/app/modelo` é dinâmica no Next e o palco entra com
  `dynamic(() => import("./viewport-3d"), { ssr: false })` — o servidor não tem canvas nem GPU, por
  isso nada do motor é avaliado no SSR;
- os dados, a árvore, o painel e as regras **são** renderizados no servidor: o modelo de
  demonstração é gerado por aritmética determinística, logo o HTML e o primeiro _render_ do browser
  dizem o mesmo;
- consequência não óbvia: as etiquetas das vistas de câmera têm de viver fora do módulo que constrói
  o `OrbitControls`. Nasceram em `engine/camera-controller.ts` e o `EditorToolbar` importou-as — o
  resultado medido foi 54 kB de `three` no _first-load_ de uma rota. Foram movidas para
  `src/three/view-presets.ts` (camada pura) e o motor reexporta-as;
- a regra é um teste, não uma convenção: `src/three/boundary.test.ts` varre `src/components/**` e
  `src/app/**` e falha se algum módulo importar `three`, `three/*` ou `@/three/engine/**` em runtime
  — exceto as duas portas nomeadas, que o mesmo teste verifica estarem atrás de
  `dynamic(…, { ssr: false })`.

Medição depois da correção (`next build` + `<script>` do HTML servido por `next start`):

| Superfície                                      | gzip       | `three` |
| ----------------------------------------------- | ---------- | ------- |
| primeiro _load_ de `/app/modelo` (12 _scripts_) | 214 kB     | 0 kB    |
| _chunk_ diferido do `three`                     | 135,1 kB   | sim     |
| rotas pré-renderizadas (pior caso)              | 205,4 kB   | 0 kB    |
| _chunk_ partilhado                              | 129 kB/150 | —       |

## Alternativas consideradas

| Alternativa                                                | Por que não                                                                                                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React Three Fiber + drei                                   | Reconciliador no caminho mais quente do editor; `dispose` e suspensão de render difíceis de afirmar; 3 pacotes novos para ganho marginal neste produto. |
| `three` + estado no `Canvas` do R3F com Zustand            | Resolveria o estado partilhado, mas manteria o reconciliador no laço de arrasto e trocaria um motor testável em Node por hooks.                         |
| Scene graph como fonte de verdade (o documento é derivado) | Perderia serialização, validação e teste em Node; e o `dispose` de um `Object3D` mutável não é reversível.                                              |
| Estado de seleção no `Viewport3D` (React state)            | A árvore e o painel precisariam da mesma verdade: duas fontes, ou _props_ atravessadas com re-render global a cada _hover_.                             |
| CSS-in-JS para as cores do palco                           | O sistema de design tem uma única fonte de tokens; o motor lê `--scene-*` por `readToken`, injetado — `three` não conhece o DOM.                        |

## Consequências

**Positivas**

- o motor é testável em Node (18 testes de ciclo de vida, _framing_, seleção, _snapping_ do gizmo e
  contadores, sem GPU) e o ciclo de destruição é afirmável: `dispose()` liberta geometrias, remove
  _listeners_, cancela o `rAF` e liberta o contexto;
- zero dependências novas nesta fase (`three@0.186.1` e `@types/three` já vinham da Fase 2);
- as rotas sem 3D não pagam o `three`; as rotas com 3D pagam-no em diferido;
- as regras de edição vivem num único módulo, partilhado pelo gizmo, pelo painel e pela serialização.

**Custos e limites (todos assumidos e documentados)**

- dois "mundos" (React e `three`) com uma costura a manter à mão: o motor é atualizado por efeitos
  que reagem a `{document, selection, tool, viewCommand, theme, quality}`;
- o antialias é escolhido no arranque do palco: mudar de qualidade a quente ajusta sombras e
  resolução, não reconstrói o `WebGLRenderer` (reconstruir deitaria fora a câmera do utilizador);
- `EdgesGeometry` por realce: contornos de seleção têm custo de CPU em malhas grandes; aceitamos
  porque o realce é por elemento, não por cena;
- **nada disto foi medido num browser**: não há GPU nem browser neste ambiente. FPS, tempo até
  interatividade e comportamento de _pinch/zoom_ em telemóvel estão em `docs/MANUAL-3D-TESTS.md` e
  o portão QG-19 continua PENDENTE;
- sem IFC, sem persistência, sem colaboração, sem física. As fronteiras existem
  (`serialize.ts`, `model-loader.ts` com recusa explícita de formatos não suportados), as
  capacidades não.
