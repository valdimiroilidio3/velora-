/**
 * Catálogo de textos de *chrome* (navegação, ações, estados, erros).
 *
 * Fronteira de i18n: o conteúdo editorial (landing, copy de produto) fica em prosa
 * no próprio componente porque ainda vai ser reescrito; o que é estrutural e repetido
 * passa por aqui para que a Fase 1 só precise de acrescentar locales a este módulo,
 * sem procurar strings dentro de JSX. Ver docs/ARCHITECTURE.md §10.
 */

export const pt = {
  brand: {
    name: "VELORA",
    tagline: "Projeto, apresentação e comercialização de empreendimentos",
  },
  actions: {
    open: "Abrir projeto",
    openProject: "Abrir",
    signIn: "Entrar na aplicação",
    tryDemo: "Ver a aplicação de demonstração",
    back: "Voltar",
    reset: "Repor",
    clearFilters: "Limpar filtros",
    clearSearch: "Limpar a pesquisa",
    close: "Fechar",
    openMenu: "Abrir menu de navegação",
    closeMenu: "Fechar menu de navegação",
    skipToContent: "Saltar para o conteúdo",
    copyRef: "Copiar referência",
    copyRefDone: "Referência copiada",
    viewPlan: "Ver planta",
    view3d: "Ver em 3D",
    apply: "Aplicar",
    submit: "Continuar",
  },
  nav: {
    section: "Navegação principal",
    overview: "Visão geral",
    projects: "Projetos",
    scene: "Cena arquitetónica",
    preferences: "Preferências",
    unavailable: "Indisponível nesta fase",
    groupProduct: "Produto",
    groupWorkspace: "Espaço de trabalho",
    groupPipeline: "Integrações",
  },
  status: {
    draft: "Rascunho",
    in_review: "Em revisão",
    published: "Publicado",
    archived: "Arquivado",
  },
  statusHint: {
    draft: "Modelo e informação comercial em construção.",
    in_review: "A aguardar validação interna antes de publicar.",
    published: "Disponível para partilha e visita guiada.",
    archived: "Fora de circulação; mantém histórico e versões.",
  },
  unavailableReason: {
    ai: "Geração por IA: Fase 3",
    bim: "Motor BIM e edição geométrica: Fase 2–3",
    leads: "Gestão de leads: Fase 5",
    billing: "Planos e pagamentos: Fase 5",
    members: "Membros e papéis: Fase 1",
    uploads: "Carregamento de plantas: Fase 2",
  },
  projects: {
    title: "Projetos",
    description: "Lista de demonstração com pesquisa, filtro e ordenação a funcionar sobre dados locais.",
    searchLabel: "Pesquisar por nome, localidade, código ou tipologia",
    searchPlaceholder: "Por exemplo: Marés, Porto, T3, DEMO-03",
    filterLabel: "Filtrar por estado",
    allStatuses: "Todos os estados",
    sortLabel: "Ordenar por",
    sort: {
      updated: "Última atualização",
      name: "Nome",
      availability: "Mais frações livres",
      price: "Preço base",
    },
    resultsCount: (count: number) => `${count} ${count === 1 ? "projeto" : "projetos"}`,
    empty: {
      withFilters: "Nenhum projeto corresponde à pesquisa e aos filtros.",
      noData: "Ainda não há projetos nesta conta.",
      noDataHint: "Os projetos aparecem aqui quando criares um empreendimento a partir de material de venda.",
    },
    columns: {
      development: "Empreendimento",
      location: "Localização",
      status: "Estado",
      updated: "Atualizado",
      availability: "Mais frações livres",
      price: "Preço base",
    },
  },
  forms: {
    required: "obrigatório",
    optional: "opcional",
    errorSummary: (count: number) => `${count} ${count === 1 ? "campo por corrigir" : "campos por corrigir"}`,
    invalidEmail: "Introduz um endereço de e-mail válido.",
    tooShort: (min: number) => `Deve ter pelo menos ${min} caracteres.`,
    unknownField: "Valor não aceite por este campo.",
  },
  feedback: {
    preferencesSaved: "Preferências aplicadas neste navegador.",
    preferencesReset: "Preferências repostas nos valores de origem.",
    copyFailed: "O navegador bloqueou a área de transferência. Copia manualmente.",
    loading: "A carregar",
  },
  scene: {
    title: "Cena arquitetónica",
    loading: "A preparar o volume construtivo…",
    unsupported: {
      title: "Renderização 3D indisponível neste dispositivo",
      body: "O navegador não expôs um contexto WebGL utilizável, ou o render foi interrompido. A mesma informação está disponível na planta esquemática e na listagem de pisos.",
    },
    reduced: {
      title: "Movimento reduzido",
      body: "A cena renderiza apenas quando alteras o enquadramento, sem rotação automática.",
    },
    controls: {
      rotateLeft: "Rodar 15° para a esquerda",
      rotateRight: "Rodar 15° para a direita",
      tiltUp: "Levantar a câmara",
      tiltDown: "Baixar a câmara",
      zoomIn: "Aproximar",
      zoomOut: "Afastar",
      reset: "Repor enquadramento",
      plan: "Vista de planta",
      dragHint: "Arrasta para rodar · roda do rato ou pinça para aproximar",
    },
    legend: "Esquema volumétrico derivado dos dados de demonstração — não é um modelo BIM.",
    levelsHeading: "Composição de pisos",
    viewsLabel: "Modo de representação",
    view3dLabel: "Cena 3D",
    viewPlanLabel: "Planta e pisos",
    orbitLabel: "Rotação automática",
    orbitHint: "Desligada por omissão: nenhuma animação corre sozinha nesta aplicação.",
    statsLabel: (fps: number, triangles: number, calls: number) =>
      `${fps} fps · ${triangles.toLocaleString("pt-PT")} triângulos · ${calls} draw calls`,
    contextLost:
      "O contexto GPU foi interrompido (suspenção do sistema, troca de placa gráfica ou limite de memória). A cena foi substituída pela planta esquemática e pode recarregá-la.",
    reload: "Recarregar a cena",
    keyboardHint: "Com a cena focada, usa as setas para rodar e +/− para aproximar.",
  },
} as const;

export type UiStrings = typeof pt;

/**
 * Ponto único de acesso às strings. Quando existir i18n por rota, este `ui` passa a
 * ser resolvido pelo locale ativo; os chamadores não mudam.
 */
export const ui: UiStrings = pt;
