# Testes manuais obrigatórios do motor 3D (Fase 3)

**Porque existe este documento:** neste ambiente (sandbox sem GPU, sem browser, sem ecrã) não há
como verificar nada do que é desenho. Todo o resto — modelo de dados, regras de edição, _snapping_,
sincronização de cena, libertação de recursos, estados de erro, acessibilidade das painéis — está
coberto por 300 testes automatizados. O que exige WebGL tem de ser verificado por uma pessoa, num
browser real, e nada disto pode ser declarado como passado sem essa execução.

Como correr: `pnpm install && pnpm run build && pnpm run start`, depois abrir
`http://localhost:3000/app/modelo`. Para os casos de dispositivo, usar um telemóvel real e um
portátil com GPU integrada e dedicada.

Registo de execução: preencher a última coluna ("resultado") com `OK`/`FALHA` + data + browser e
versão, e abrir _issue_ para cada `FALHA`. Um caso não executado fica `PENDENTE` — não `OK`.

## 1. Renderização e enquadramento

| #   | Passo                                                                 | Resultado esperado                                                                                                                       | Resultado |
| --- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| R1  | Abrir `/app/modelo`                                                   | Palco desenhado em < 1 s após o _mount_; edifício completo visível; terreno e plataforma visíveis; nada cortado pelas bordas             |           |
| R2  | Alternar as quatro vistas (Perspetiva / Superior / Frontal / Lateral) | O modelo cabe sempre inteiro; o nível de _zoom_ mantém-se; não há _jump_ de enquadramento                                                |           |
| R3  | Rodar com o rato até um polo                                          | A órbita **para** (ângulo polar limitado); não é possível ficar por baixo do terreno nem virar o mundo ao contrário                      |           |
| R4  | Fazer _scroll_ sobre o palco e depois fora dele                       | Sobre o palco: aproxima/afasta até ao limite do lote. Fora do palco (página): a página rola normalmente — o palco não captura o _scroll_ |           |
| R5  | _Pan_ com o botão direito (ou dois dedos) até ao limite               | O alvo do _pan_ não sai do lote; o modelo nunca desaparece de cena; `Repor` recupera a vista inicial                                     |           |
| R6  | Redimensionar a janela / girar o telemóvel                            | O _canvas_ acompanha sem esticar a imagem; o _pixel ratio_ não excede o teto da qualidade escolhida                                      |           |

## 2. Seleção, hierarquia e visibilidade

| #   | Passo                                                  | Resultado esperado                                                                                                                           | Resultado |
| --- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| S1  | Clicar numa parede                                     | O elemento ganha contorno de acento; o painel mostra nome, id, categoria, dimensões, posição, material; a árvore marca o nó como selecionado |           |
| S2  | Clicar no vazio (ou `Esc`)                             | Seleção limpa nos três sítios ao mesmo tempo                                                                                                 |           |
| S3  | `Shift`+clique em dois volumes                         | Seleção múltipla; as ferramentas de transformação ficam desativadas com explicação, sem estado estranho                                      |           |
| S4  | Clicar num degrau de uma escada                        | O elemento selecionado é **a escada**, não o degrau (1 `Object3D` = 1 elemento do documento)                                                 |           |
| S5  | Rodar a roda do rato sobre uma escada/laje com painéis | O _hover_ realça o volume certo, com contorno mais discreto que o de seleção                                                                 |           |
| S6  | Alternar o olho de uma categoria na árvore             | A categoria desaparece do palco **e** o contador do nó passa a `0 de N`; a barra de estado desce a contagem de visíveis                      |           |
| S7  | Ocultar um elemento e voltar a mostrar                 | O elemento reaparece exatamente onde estava (transformação preservada no documento)                                                          |           |
| S8  | Telemóvel: tocar num volume                            | Seleção por toque sem _double tap to zoom_ acidental; a área do _hit_ corresponde ao dedo, não ao cursor                                     |           |

## 3. Transformações e regras de edição

| #   | Passo                                                   | Resultado esperado                                                                                             | Resultado |
| --- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------- |
| T1  | Ferramenta Mover numa parede                            | Gizmo com duas setas (planta); a seta vertical não existe; arrastar produz movimento aos saltos de 0,1 m       |           |
| T2  | Ferramenta Rodar numa parede                            | Anel de rotação em Y; 5° por passo; o valor no painel coincide com o do ecrã                                   |           |
| T3  | Ferramenta Escalar numa parede estrutural               | A ferramenta não está disponível; a recusa está escrita no painel, com o motivo da regra                       |           |
| T4  | Escalar a espessura de uma laje                         | Só o eixo Y tem alça; a dimensão no painel muda; as arestas não estalam (geometria nominal + escala no objeto) |           |
| T5  | Arrastar um elemento para longe do lote                 | O deslocamento é limitado (40 m) e o valor aplicado é o limitado, não o tentado                                |           |
| T6  | Editar posição pelo painel com vírgula decimal (`3,45`) | Aceite, aplicado com _snapping_; `Aplicar` mostra o resultado e o contador de edições sobe 1                   |           |
| T7  | Tentar mover o terreno/plataforma                       | Nada acontece no palco **e** o painel diz que não é editável; o contador de edições não sobe                   |           |
| T8  | Recarregar a página depois de editar                    | As edições **desaparecem** (não há persistência); a UI diz isto antes de editar, não depois de perder trabalho |           |

## 4. Luz, material e legibilidade

| #   | Passo                                     | Resultado esperado                                                                                           | Resultado |
| --- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------- |
| L1  | Comparar tema claro/escuro                | O palco acompanha os tokens: fundo, grelha e cores de material mudam sem reconstruir materiais nem geometria |           |
| L2  | Procurar _banding_/serrilhado nas arestas | Antialias ativo na qualidade não-leve; arestas legíveis a 1× num ecrã 2×                                     |           |
| L3  | Olhar para as sombras                     | Sombra suave com resolução visível mas sem _acne_; nenhuma face preta por _bias_ incorreto                   |           |
| L4  | Vidros                                    | Transparentes sem artefactos de ordenação (o interior vê-se sem _z-fighting_)                                |           |

## 5. Recursos, erro e degradação

| #   | Passo                                                                           | Resultado esperado                                                                                                                  | Resultado |
| --- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------- |
| E1  | Navegar app → editor → app → editor, 10×                                        | Memória de _tabs_/`GPU memory` estável no fim da 10.ª entrada; sem _leak_ de geometrias/texturas                                    |           |
| E2  | Forçar perda de contexto (`chrome://gpu` → perder GPU, ou suspender o portátil) | Aparece o aviso de render interrompido; `Recarregar o palco` restaura; a árvore e o painel nunca deixaram de funcionar              |           |
| E3  | Navegador sem WebGL (desativar hardware acceleration)                           | O editor abre na variante sem palco, com a mensagem de que hierarquia e propriedades continuam a funcionar — não uma página de erro |           |
| E4  | Telemóvel antigo com qualidade "Automática"                                     | Qualidade resolvida para `leve` (sem sombras, 1×) e a cena continua utilizável; a linha de estado diz "qualidade leve"              |           |
| E5  | Aba em _background_ 60 s, voltar                                                | O contador de frames mostra que nada foi desenhado em _background_; ao voltar, o palco volta a desenhar no primeiro pedido          |           |
| E6  | Focar o palco e usar apenas teclado                                             | Setas orbitam, `+`/`−` aproximam, `f` enquadra a seleção, `Tab` percorre árvore e painel sem ficar preso no _canvas_                |           |
| E7  | Leitor de ecrã (NVDA/VoiceOver) na árvore                                       | Anuncia nível, contagem de visíveis e estado selecionado; as ações de olho são anunciadas como botões pressionáveis                 |           |

## 6. Desempenho (QG-19 — o que tem de ser medido, não afirmado)

A linha de estado do palco mostra `fps · ms · triângulos · draws · malhas` em contadores reais.
Registar em cada dispositivo, depois de R1–R5:

| Dispositivo / browser            | fps em órbita contínua | pior _frame_ (ms) | triângulos | _draws_ | memória GPU |
| -------------------------------- | ---------------------- | ----------------- | ---------- | ------- | ----------- |
| Desktop, Chrome (GPU dedicada)   |                        |                   |            |         |             |
| Desktop, Firefox (GPU integrada) |                        |                   |            |         |             |
| Safari, macOS                    |                        |                   |            |         |             |
| Android, Chrome                  |                        |                   |            |         |             |
| iOS, Safari                      |                        |                   |            |         |             |

Limiares de aceitação propostos (a confirmar por quem executa, antes de serem tratados como
contrato): ≥ 50 fps médios em órbita nos três primeiros; ≥ 30 fps em dispositivos móveis; pior
_frame_ < 50 ms; _draw calls_ ≤ 2× o número de categorias visíveis por piso (a cena usa um material
por chave, logo as _calls_ devem crescer com o número de grupos, não com o de elementos).

O que o instrumento já mede e o que não mede: `PerformanceMonitor` dá fps (média móvel), ms,
`calls`, triângulos, geometrias e _meshes_ por _frame_ real; **não** mede tempo até interatividade,
nem memória de GPU, nem custo de _upload_ de textura — esses continuam manuais.

## 7. Materiais, luz e ambiente (Fase 4)

Gerados proceduralmente no browser — por isso nada disto pode ser confirmado em Node.

| #   | Passo                                                          | Resultado esperado                                                                                                                                                                         | Resultado |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| M1  | Aproximar a câmera de uma parede até ao mínimo permitido       | Vê-se variação de tom e relevo no betão/reboco; a emenda do _tile_ não é visível nem forma grelha; a inclinação do _tiling_ não muda entre painéis vizinhos                                |           |
| M2  | Rodar o edifício com luz de meio-dia                           | Vidros e alumínios têm realce que **se move** com a câmera (reflexo do ambiente), fachadas mate não ganham brilho metálico                                                                 |           |
| M3  | Alternar os quatro _presets_ de luz                            | Manhã e fim de tarde projetam sombras em direções **opostas**; o meio-dia tem o sol alto e sombras curtas; à noite o céu escurece, as sombras desaparecem e os vãos do rés-do-chão acendem |           |
| M4  | Comparar qualidade `leve` ↔ `detalhada` no mesmo enquadramento | `leve` não tem mapas nem ambiente nem sombras; `detalhada` tem os três; a cena não fica _menos legível_ em nenhuma das duas                                                                |           |
| M5  | Trocar o acabamento de um painel no painel de propriedades     | A mudança é imediata, sem reconstruir a cena nem perder a seleção; o _Anular_ repõe o acabamento anterior e o contador de edições sobe só 1                                                |           |
| M6  | Medir custo real dos mapas                                     | Na linha de estado, `texturas` (via `renderer.info`) deve crescer com os 3 mapas por material usado e voltar à base ao mudar para `leve`                                                   |           |
