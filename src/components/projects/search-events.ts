/**
 * Contrato de eventos locais do toolbar de projetos.
 *
 * O `Link` que limpa filtros é renderizado no servidor; o campo de pesquisa é um componente de
 * cliente com valor no DOM. Em vez de subir esse valor a um contexto global (estado partilhado
 * sem necessidade), publicamos um evento nomeado: é o único ponto em que os dois falam, e está
 * documentado aqui.
 */
export const SEARCH_CLEAR_EVENT = "velora:search-clear";

export function dispatchSearchClear(): void {
  if (typeof document === "undefined") {
    return;
  }
  document.dispatchEvent(new Event(SEARCH_CLEAR_EVENT));
}
