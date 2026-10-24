# ADR 0003 — Sistema de design em tokens num único ficheiro, tema por `data-*`, densidade por multiplicador

- **Estado**: Implementado
- **Data**: 2026-10-24
- **Impacto de fase**: Fase 2 (condiciona F3–F6)
- **Decisão tomada por**: agente técnico (Arena) no âmbito do pedido da Fase 2; revisão visual
  humana **pendente** (ver §6)

## 1. Contexto

O pedido da Fase 2 exigia uma identidade própria — "minimalismo arquitetónico contemporâneo,
layout editorial, paleta neutra sofisticada, animação elegante e rápida, sem gradientes, brilhos,
vidro ou transparências" — **e** um sistema reutilizável de tokens para cor, tipografia,
espaçamento, raio, sombra, larguras de contentor, transições e breakpoints, documentado e testado.

A Fase 0 tinha deixado um `globals.css` de 130 linhas com reset mínimo e nenhuma paleta. As
forças em conflito:

1. O repositório é público e o sandbox tem rede restringida a 4 hosts: **não foi possível obter
   binários de fonte** nem validar licenciamento tipográfico.
2. A licença da ferramenta (GSAP é "Standard no charge", não-OSI — ver `DEPENDENCIES.md` §3.5)
   exclui bibliotecas de animação proprietárias; e qualquer motor de animação é peso sem
   necessidade demonstrada nesta fase.
3. Tailwind v4 foi aceite na auditoria da Fase 2 (4.3.3, MIT) mas o seu modo `@theme` tem uma
   armadilha: utilitários `--color-*` só existem se declarados dentro de `@theme`; fora dele,
   `bg-surface` compila silenciosamente para nada.
4. Três preferências visuais foram pedidas (tema, densidade, movimento) e a experiência de
   produto precisa de _estados_ definidos (foco, selecção, carregamento, erro, vazio), não só de
   cores.

## 2. Decisão

1. **Fonte única**: `src/app/globals.css` é o único sítio onde um valor de design é escrito
   (128 tokens únicos: 45 na `:root` base, 37 substituições escuras, 56 mapeamentos em
   `@theme inline`, 24 no bloco `@theme` da escala tipográfica). Componentes
   escrevem utilities (`bg-surface`, `text-ink-muted`, `max-w-shell`); nenhuma classe arbitrária
   (`text-[13px]`, `border-[#ccc]`) é permitida em `src/**`.
2. **`@theme inline`** em vez de `@theme`: o `var()` é resolvido no ponto de uso, por isso um
   token que muda com `data-theme` muda os utilitários sem gerar classes condicionais nem
   re-render de JavaScript.
3. **Tema**: `data-theme="light|dark"` + `color-scheme` correspondente no `<html>`; o arranque é
   um `<script>` inline no `layout.tsx` **antes da pintura**, a ler a mesma chave
   (`velora.preferences.v1`) que o módulo de preferências — a paridade entre os dois é
   verificada por teste porque são dois leitores do mesmo dado.
4. **Densidade**: um multiplicador (`--density-step`, 1 → 0,82 em `[data-density="compact"]`)
   lido por `--space-card-y` e `--space-stack`. **Não** existem variantes `compact:` em
   componentes.
5. **Movimento**: `@media (prefers-reduced-motion: reduce)` **e** `html[data-motion="reduced"]`
   com o mesmo bloco; três `--ease-*` e durações fixas. Sem biblioteca de animação.
6. **Um único acento** (`#0f4f47` claro / `#6fc0b1` escuro) para ação; os quatro tons semânticos
   são escuros no tema claro e claros no escuro, sempre com variante `-soft` para fundo.
7. **Dois tokens nascidos de medições, não de estética** — e é isto que torna a decisão
   verificável:
   - `--line-control` (`#7b8087` / `#8a9096`): a fronteira de um controlo de formulário tem de
     atingir 3:1 (WCAG 1.4.11). Partilhar o `--line-strong` decorativo (1,88:1) deixava os campos
     invisíveis para uma parte dos utilizadores.
   - `--ink-faint` passa a **não-texto**: a 2,62:1 sobre `--surface` não pode servir texto; 22
     utilizações como texto foram promovidas para `--ink-muted`, e `--ink-muted` foi escurecido até
     `#63676d` para que o seu pior caso (`--canvas-sunken`) fosse ≥ 4,5:1.
8. **Tipografia com famílias de sistema** (`--font-display` serifada, `--font-sans`, `--font-mono`)
   porque não há binários nem licenciamento verificáveis aqui; os nomes são tokens, para que a
   Fase 3 substitua por `next/font/local` alterando um bloco.
9. **Contrato automatizado**: `src/app/design-tokens.test.ts` (31 asserções, portão QG-21) verifica
   existência de tokens, pares light/dark, rácios de contraste calculados pela fórmula WCAG,
   ausência de `text-ink-faint` em `src/**`, e as proibições de gradiente/`background-image`
   fora de `.blueprint-grid`.

## 3. Alternativas consideradas

| Alternativa                                                   | Porque não                                                                                                                                                                                                      |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CSS Modules por componente                                    | tokens teriam de ser reimportados 40 vezes; o tema e a densidade deixariam de ser uma mudança de ficheiro                                                                                                       |
| Tailwind com `tailwind.config.ts` (v3)                        | o projeto é v4; a config JS está no caminho de remoção e duplicaria a definição de tokens                                                                                                                       |
| `next-themes` (2,3 kB)                                        | resolve um problema que já está resolvido por 12 linhas de arranque inline + um store próprio; adiciona um fornecedor de estado                                                                                 |
| CSS `light-dark()` nativo                                     | elegante, mas o `color-scheme` teria de ser escrito **antes** da hidratação em `<html>`, exatamente onde o arranque inline já decide — trocar um por outro não ganhava nada e perdia o `color-scheme` explícito |
| Design tokens em JSON gerado (tokens-studio/Style Dictionary) | um compilador no pipeline para 95 valores; o ganho aparece com equipas multi-plataforma, não com uma app Next                                                                                                   |
| `cva`/`tailwind-merge` para variantes                         | `buttonClass()` é uma função de 20 linhas sem dependências; `clsx` cobre o resto. Ver `DEPENDENCIES.md` §2                                                                                                      |
| Webfont self-hosted "de reserva"                              | um binário commitizado sem licença verificada é pior do que uma família de sistema documentada — é o tipo de risco que a Fase 0 passou a vida a remover                                                         |

## 4. Consequências

- **Positivas, medidas**: 20 pares de texto verificados a ≥ 4,5:1 **e** ≥ 3:1 para componentes,
  nos dois temas, por cálculo a partir do próprio CSS (pior caso de texto medido: 4,74:1 de
  `--ink-muted` sobre `--canvas-sunken`; borda de controlo: 3,62:1 no pior caso); a troca de
  tema/densidade/movimento não toca em componentes (o `theme-toggle` só escreve no store); CSS do
  produto = 453 linhas num ficheiro; `grep` de utilitários arbitrários (`text-[`, `bg-[#`,
  `border-[#`) em `src/**` → 0 ocorrências.
- **Aceites**: a tipografia é de sistema, portanto a imagem da marca depende do SO do utilizador
  até à Fase 3; a densidade compacta é um multiplicador global, não um controlo por vista; sem
  biblioteca de animação, gestos sofisticados ficam fora do âmbito desta fase.
- **Travado sem ADR novo**: um segundo acento (o QG-21 fixa `--accent` por valor literal);
  comunicar estado só por cor; alargar a escala de raios ou o número de níveis de sombra (ambos
  são asserções no mesmo teste); introduzir um gerador de tokens. O que fica **fora** do portão e
  passa a critério de revisão: token declarado sem consumo.

## 5. Verificação (comandos executados — 2026-10-24)

| Verificação                   | Comando                                                                         | Resultado                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Contrato de tokens/contraste  | `pnpm exec vitest run src/app/design-tokens.test.ts`                            | **31/31**                                                                  |
| Estados de componentes        | `pnpm exec vitest run --project dom src/components/ui/primitives.test.tsx`      | **14/14**                                                                  |
| Acessibilidade automatizada   | `pnpm run test:a11y` (axe-core em `src/app/accessibility.test.tsx`)             | **3/3** com `heading-order` ativo (a violação real foi corrigida na fonte) |
| Tipos/lint/format/build       | `pnpm run verify`                                                               | 0 erros; 14 ficheiros de teste, 153 testes; build com 10 rotas             |
| Preferências sem _flash_      | `src/lib/preferences.test.ts` "o arranque inline e o módulo lêem a mesma chave" | passa                                                                      |
| Contraste medido, não alegado | asserções `expect(contrast(...))` no QG-21                                      | 11 rácios documentados em `DESIGN-SYSTEM.md` §3.1                          |

## 6. O que fica por provar

Este sandbox **não tem browser**: nenhum screenshot foi visto por um humano, nenhuma medição
_on-screen_ de contraste (a 200 % de zoom, por exemplo) foi feita. Os números acima são cálculo
sobre os valores hexadecimais e DOM em jsdom. A revisão visual humana é gate de saída da fase
(`QUALITY-GATES.md` §QG-16/QG-18), não algo que esta ADR possa declarar cumprido.

## 7. Reversão

`globals.css` é um ficheiro: reverter é repor a versão anterior e remover o mapeamento `@theme`.
O custo real está nos consumidores — ~40 ficheiros usam utilities derivadas dos tokens; a substituição
por outro sistema (ex.: CSS Modules) seria reescrever cada `className`, sem perda de dados (nada é
persistido além das três preferências em `localStorage`).
