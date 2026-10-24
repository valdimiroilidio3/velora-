# FASE 4 — realismo arquitetónico: auditoria inicial, decisões e estado

**Estado do documento:** fase **em curso**. Este ficheiro é o registo do que foi auditado, do que já
foi implementado e verificado, e do que continua por entregar. Nada aqui está "concluído" sem um
comando executado ou um teste que o afirme; o que não pode ser medido neste ambiente está marcado
como manual ou pendente.

---

## 1. Diagnóstico do estado à entrada da Fase 4

Executado antes de tocar em qualquer ficheiro, com os comandos do repositório.

| Verificação                                                      | Resultado                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Branch                                                           | `arena/5051ef25-velora` @ `17bf321`; `main` intacta em `74a9cf2`; 20 commits de trabalho próprio, **sem merge**                                                                                                                                                                                 |
| Estado funcional à entrada                                       | `pnpm run verify` **exit 0** — 30 ficheiros / 300 testes, `tsc` 0 erros, ESLint 0 problemas, Prettier limpo, build OK (13 rotas), orçamento dentro dos limites                                                                                                                                  |
| CI à entrada                                                     | run **40121347982** `sucesso` (Fase 3) — ver `QUALITY-GATES.md` §4.7                                                                                                                                                                                                                            |
| Stack confirmada (lida em `package.json`/lockfile, não assumida) | Next **16.4.3** (App Router, Turbopack) · React **19.3.1** · TypeScript **5.9.3** com `strict` + `noUncheckedIndexedAccess` · Tailwind **4.3.3** · `three` **0.186.1** + `@types/three` **0.186.0** · Vitest **5.0.5** com dois projetos (`node`, `dom`/jsdom) · pnpm **12.15.0** · Node **22** |
| Motor 3D existente                                               | `src/three/**` (11 módulos de domínio puro + 8 de motor) e `src/components/editor/**` — **reutilizado, não reescrito**. A cena de volume da Fase 2 (`components/scene/`) continua na rota `/app/cena`                                                                                           |
| Backend/persistência                                             | **não existe**. `src/lib/env.ts` lê configuração; nenhuma BD, nenhuma rota de escrita, nenhum `localStorage` de projeto                                                                                                                                                                         |
| Erros pré-existentes                                             | **nenhum** por abrir; os portões PENDENTES/BLOQUEADOS estão documentados em `QUALITY-GATES.md` §2 e §4.6 (QG-17, QG-18, QG-19 pendentes; QG-14/15 bloqueados sem PostgreSQL)                                                                                                                    |

**Bloqueios de ambiente que condicionam esta fase** (todos já conhecidos, aqui reafirmados porque
mudam decisões de engenharia):

- **sem GPU, sem browser, sem ecrã** ⇒ nenhuma afirmação sobre aspeto, FPS ou _quality look_ é
  possível a partir daqui;
- **sem acesso a repositórios de assets** (only `github.com`, `cdn` de pacotes npm e registos
  python são permitidos; `polyhaven`/`ambientcg`/`figma` não) ⇒ texturas e HDRI **não podem** vir de
  _URLs externos_;
- **vercel.com inalcançável** ⇒ limites de plano e _deploy_ continuam por verificar (B-01/B-02 em
  `DEPLOYMENT.md`);
- **repositório público** ⇒ nada de segredos, nada de chaves de terceiros, nada de dados reais.

## 2. Decisões tomadas nesta fase (e porquê)

### 2.1 Recursos gráficos procedurais em vez de ficheiros

`ADR 0007`. Superfícies (albedo, rugosidade, normais) e o céu do _environment_ são **gerados por
aritmética determinística** em `src/three/surfaces.ts` e `src/three/lighting-presets.ts`, e
materializados em `DataTexture` no browser. Motivos: não há _fetch_ nem licença a gerir, o gerador é
testável em Node (11 asserções, incluindo a **periodicidade exata** que faz o `repeat` não mostrar
emenda), o _bundle_ não cresce (medido: zero bytes no `first-load`), e a resolução é uma **variável
de qualidade** (0 / 256 / 512 px) em vez de uma decisão tomada por um artista há três anos.

O que isto não é: não é PBR capturado, não há mapas de curvatura/oclusão nem _bake_ de luz. A escala
física é respeitada (`tileMeters` por acabamento, repetição derivada da mediana dos painéis) — que é
justamente o que se perde quando alguém cola uma textura com UV 0..1.

### 2.2 Ambiente _IBL_ sem HDRI

`PMREMGenerator` sobre um equiretangular gerado a partir do _preset_ de luz (128×64). À noite o
ambiente é escuro e frio, ao fim de tarde quente; há um _blob_ solar para que os realces tenham
direção. Em `leve` não há ambiente; se o `renderer` injetado não for GL (testes), degrada para o
mapa cru em vez de rebentar. Os materiais mate recebem `envMapIntensity` baixa por curva de
rugosidade, para o betão não ganhar brilho metálico.

### 2.3 Luz como dado de domínio

Quatro _presets_ (`manhã`, `meio-dia`, `fim de tarde`, `noite`) vivem em `src/three/lighting-presets.ts`
como **números**: azimute/elevação do sol, cores, intensidades, exposição de _tone mapping_,
`envIntensity`, sombras, e se os interiores acendem. O motor lê e move luzes reais; o convénio de
direção está em testes (norte = −Z, +Y em cima, nascente = +X). Isto existe porque o pedido proíbe
_presets_ que mudam só a cor de um botão.

### 2.4 Edição de acabamento com recusa explicada

A matriz `MATERIAL_PERMISSIONS` (10 categorias → conjuntos de materiais permitidos) vive no domínio.
O painel de propriedades oferece **só** essa lista; o terreno e a plataforma não oferecem nada e
dizem porquê. A escrita é `withMaterial`, que devolve `{ applied, rejected }` e **não** reconstrói
geometria (o `RenderPlan` muda a chave de material; o `SceneManager` troca a referência).

### 2.5 Histórico real ou nada

`undo`/`redo` só existem porque cada escrita aplicável empurra o documento anterior para uma pilha
limitada (`HISTORY_LIMIT = 40`), com `future` invalidado ao escrever. Escrever depois de anular não
pode manter dois futuros. A visibilidade entra no histórico mas **não** conta como edição, porque é
navegação. Carregar outro projeto limpa as pilhas (o `undo` não atravessa edifícios).

### 2.6 O que a auditoria disse que não ia mudar de estratégia

Mantém-se `three` imperativo e R3F recusado (`ADR 0006` §1): a Fase 4 não introduziu um caso novo
que o justifique — o trabalho continua a ser cíclos de vida explícitos e um laço de arrasto onde um
reconciliador React não deve estar. **Uma** estratégia de renderização no repositório, como sempre.

## 3. Implementado e verificado até agora

| Área                    | Ficheiros                                                                                                              | Verificação                                                                                                                                                                                                                                                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Superfícies procedurais | `src/three/surfaces.ts`, `src/three/engine/surfaces.ts`                                                                | `surfaces.test.ts` (11: determinismo, sementes, periodicidade do ruído, costura invisível, faixa de albedo/rugosidade, normal neutra com `bump: 0`, tiling físico, bytes) + `engine/surfaces.test.ts` (6: `leve` sem mapas, cache por material, `setQuality` liberta, `dispose` liberta os 3 mapas, escala por mediana) |
| Presets de luz + céu    | `src/three/lighting-presets.ts`, `src/three/engine/lighting.ts`, `src/three/engine/environment.ts`                     | `lighting-presets.test.ts` (7) e `engine/materials-lighting.test.ts` (8: direção/cor/intensidade mudam, _no-op_ no mesmo preset, noite sem sombras, `dispose` tira as 3 luzes, curva de `envMapIntensity`, brilho noturno só nos materiais declarados, `refresh` do tema não apaga a noite)                             |
| Materiais com mapa      | `src/three/engine/materials.ts`                                                                                        | mapa + `roughnessMap` + `normalMap` anexados por chave de material, `needsUpdate` no gancho certo, texturas **emprestadas** (quem liberta é o palco)                                                                                                                                                                    |
| Acabamento editável     | `src/three/model.ts` (`withMaterial`), `src/three/materials.ts` (matriz), `src/components/editor/properties-panel.tsx` | `material-permissions.test.ts` (10) incluindo ida e volta pela serialização                                                                                                                                                                                                                                             |
| Histórico               | `src/components/editor/editor-store.ts`, `editor-toolbar.tsx`                                                          | `editor-history.test.ts` (9)                                                                                                                                                                                                                                                                                            |
| Pipeline de cor         | `scene-manager.ts` (`applyExposure`, `setTint`)                                                                        | `ACESFilmicToneMapping` + exposição do preset, `*Tint*` do céu multiplicado sobre o token `--canvas` (o tema continua a ser a única paleta)                                                                                                                                                                             |
| Estado global           | `viewport.ts` (`setLightingPreset`, qualidade → mapas/ambiente)                                                        | suites de DOM do motor (`viewport.dom.test.ts`, `scene-manager.dom.test.ts`) continuam verdes com o pipeline novo                                                                                                                                                                                                       |
| Fronteira de bundle     | —                                                                                                                      | QG-22 (5 asserções) e `pnpm run budget`: `three` 135,1 kB **só** em diferido, partilhado 129 kB/150, total 406,8 kB/520                                                                                                                                                                                                 |

Totais da suite: **36 ficheiros / 351 testes**, todos verdes; `typecheck`, `lint` (0 avisos),
`format:check`, `build` e `budget` idem. A evidência por portão está em `QUALITY-GATES.md` §4.8.

## 4. O que ainda não está feito (e o que bloqueia)

| Pedido da Fase 4                                                                         | Estado                                                           | Nota honesta                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vegetação, caminhos, mobiliário urbano com _instancing_/LOD                              | **por fazer**                                                    | exige novos tipos de geometria no documento (hoje `box/wall/plate/panel/stairs`) e um _path_ `InstancedMesh` no `SceneManager`; é o próximo bloco de trabalho                                                                          |
| Edifício parametrizado (pisos, alturas, recuos, modulo de janelas, materiais de fachada) | **por fazer**                                                    | o gerador já é determinístico a partir de `SceneSeed`; falta expor parâmetros com limites validados e preservar ids/seleção na reconstrução                                                                                            |
| Câmera ortográfica, indicador de eixos, grelha configurável                              | **por fazer**                                                    | `CameraController` só conhece `PerspectiveCamera`; a troca de tipo tem de preservar enquadramento e limites                                                                                                                            |
| Guardas, caixilharia, perfis, varandas com laje + guarda                                 | **por fazer** (hoje: 1 porta de entrada por volume, sem guardas) | documented como limite do modelo de demonstração em `ARCHITECTURE.md` §8                                                                                                                                                               |
| Persistência local versionada (guardar/reabrir)                                          | **por fazer**                                                    | `serialize.ts` já dá o envelope `{format, version, document}` validado; falta o _storage_ (com cota/erros), o "estado de gravação" e a recusa de versões incompatíveis. Sem backend, isto é **por browser**, e a UI tem de dizê-lo     |
| Modo de apresentação comercial limpa                                                     | **por fazer**                                                    | as entidades comerciais (unidades, disponível/reservado/vendido) têm de ser derivados de dados de demonstração tipados, não inventados no ecrã                                                                                         |
| Dashboard com composição visual mais rica + miniaturas reais da cena                     | **por fazer**                                                    | uma miniatura "da própria cena" exige render — em browser; o mecanismo possível aqui é capturar o _canvas_ na apresentação e guardá-lo com o projeto, não produzir PNGs neste sandbox                                                  |
| Importação glTF/GLB                                                                      | **por fazer** (avaliação, não implementação às cegas)            | `GLTFLoader` + `DRACOLoader` são addons do próprio `three` (zero pacotes novos), mas _parser_ de ficheiro de terceiro é superfície de ataque: precisa de _worker_, _timeout_, limites de primitivas e _dispose_ antes de ser anunciado |
| Aspeto real, coerência visual, desempenho por dispositivo                                | **PENDENTE de humano**                                           | `MANUAL-3D-TESTS.md` §1–§7 (casos M1–M6) e QG-19. Nenhuma frase desta fase afirma qualidade visual                                                                                                                                     |

## 5. Como executar o que existe

```bash
pnpm install
pnpm run verify          # peers → typecheck → lint → format → test → build → budget
pnpm run dev -H 0.0.0.0  # depois abrir /app/modelo?projeto=mares-do-casal
```

No editor: `Luz` (4 _presets_) e `Qualidade` na barra superior; `Anular`/`Refazer` ao lado; o
`Acabamento` no painel de propriedades só aparece para as categorias que o aceitam. Sem WebGL, as
três superfícies de estado (árvore, propriedades, histórico) continuam a funcionar e o editor di-lo.
