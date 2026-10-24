# ADR-0007 — Recursos gráficos procedurais, sem _assets_ externos nem URLs frágeis

- **Estado:** Aceite
- **Data:** 2026-10-24
- **Fase:** 4 (realismo de materiais, luz e ambiente)
- **Relacionado:** `ADR 0006` (motor imperativo), `docs/FASE-4-REALISMO.md`, `docs/MANUAL-3D-TESTS.md` §7

## Contexto

A Fase 4 pediu materiais PBR credíveis, reflexos coerentes, sombras e contexto — com duas condições
do próprio pedido e do produto a puxarem em direções opostas:

1. a aplicação **não pode depender de URLs frágeis** para recursos essenciais; e
2. o repositório é **público**, sem serviço pago, sem _bucket_ de _assets_, e este ambiente não tem
   GPU nem browser para validar o aspeto de coisa nenhuma.

As rotas normais para "realismo no browser" são: descarregar texturas/HDRI de um CDN, juntar um
pacote de _assets_ ao repositório, ou pedir ao utilizador que carregue os seus ficheiros. As três
têm o mesmo problema estrutural: transformam o produto numa dependência de terceiros — licença,
disponibilidade, orçamento e _bundle_ — exatamente no sítio onde o produto ainda não tem clientes.

## Decisão

**Gerar tudo no cliente, por aritmética determinística, e tratar a resolução como definição de
qualidade.**

- `src/three/surfaces.ts` (puro, sem `three`): para cada acabamento (`concrete`, `plaster`, `glass`,
  `metal`, `wood`, `stone`, `grass`, `paving`, `membrane`) uma definição com **`tileMeters` físico**,
  faixa de rugosidade, amplitude de relevo e _streaking_; e um gerador de ruído de valor com
  **período inteiro** por oitava, que produz albedo, rugosidade e um mapa de normais por diferenças
  centrais do campo de altura. O albedo é **cinzento-claro com variação**, nunca cor: o `color` do
  material continua a vir do token CSS `--scene-*`, que o _shader_ multiplica — é o que impede o
  motor de se tornar a segunda paleta do projeto (`ADR 0003`).
- `src/three/lighting-presets.ts`: o céu do _environment_ é um equiretangular 128×64 derivado do
  _preset_ de luz (gradiente zénite→horizonte→solo + _blob_ solar). O motor pré-filtra com
  `PMREMGenerator`; se não houver `WebGLRenderer` (testes) ou se a qualidade for `leve`, degrada —
  primeiro para o mapa cru, depois para nada.
- Nada entra no _bundle_: o `pnpm run budget` mede o mesmo `three` de sempre (135,1 kB) em **um**
  _chunk_ diferido e o custo de textura é **tempo de CPU no browser**, não _bytes_ descarregados.
- Custo de memória é **declarado, não ignorado**: 3 mapas RGBA por material (256 px em `equilibrada`,
  512 px em `alta`, zero em `leve`), com `surfaceBytes()` a dar o número e o `dispose()` do palco a
  libertar os três por material (o teste conta as chamadas).

## Alternativas consideradas

| Alternativa                                                       | Por que não                                                                                                                                                                     |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Texturas/HDRI de um CDN (`@pmndrs/assets`, Poly Haven)            | Ligaria o produto à disponibilidade e à licença de terceiros, precisaria de _download_ no arranque do editor e de _persistence_ de _cache_; em sandbox nem sequer é verificável |
| _Assets_ no repositório (PNG/.hdr em `public/`)                   | Cada 4K _set_ PBR são dezenas de MB num repositório público, revisão ineficaz, e o _cache_ do browser a decidir o que o utilizador vê                                           |
| Gerar com `<canvas>` 2D (`fillRect`/gradientes) e `CanvasTexture` | Não é testável em Node sem _polyfill_, depende de _font hinting_/anti-aliasing do motor de _compositing_, e não pode produzir o mapa de normais a partir da altura              |
| Materiais só com `roughness`/`metalness`, sem mapas               | foi o estado da Fase 3: correto mas liso — a auditoria da Fase 4 identificou-o como o limite de realismo mais barato de ultrapassar                                             |
| `MeshPhysicalMaterial` + _clearcoat_/_sheen_ em tudo              | dobro de _shader_ por _pixel_ para um ganho que não pode ser medido aqui; mantido para o vidro se um dia houver medição que o justifique                                        |

## Consequências

**Positivas**

- o gerador tem **teste unitário em Node** (11 casos), incluindo a propriedade que uma textura mal
  escolhida costuma violar: `valueNoise(0) === valueNoise(1)` ⇒ `repeat` 20× sem emenda visível;
- zero dependências novas, zero chaves, zero decisões de licenciamento a registar em `DEPENDENCIES.md`;
- a _degradação_ é um _path_ de código e não um _fallback_ decorativo: `leve` sem mapas é a mesma
  cena, mais simples, com o orçamento a dizê-lo;
- trocar um acabamento ou uma escala de _tiling_ passa a ser uma mudança de dados revista em _diff_,
  não um ficheiro binário.

**Custos e limites (assumidos)**

- um mapa procedural **não** tem a variação de um _scanned material_: não há poros reais, nem
  sujidade dirigida por _curvature_, nem _albedo_ medido;
- o `tiling` é por **material** (mediana dos painéis), não por elemento — dois painéis de 2 m e 8 m
  do mesmo material partilham a escala de repetição. Torná-lo por elemento exige UVs ou
  `InstancedMesh` com _per-instance_ attributes, o que está planeado mas não é desta fase;
- o custo de geração é _síncrono_ no arranque do palco (~milissegundos por material a 256 px); se a
  cena crescer, isso tem de passar para um `worker` — já anotado como dívida;
- **nada do aspeto foi validado visualmente**: a única evidência possível aqui é matemática e
  estatística. `MANUAL-3D-TESTS.md` §7 (M1–M6) é obrigatório antes de qualquer afirmação sobre
  qualidade de render.
