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
  editor: {
    title: "Editor de modelo 3D",
    subtitle:
      "Motor de cena, seleção, hierarquia e transformações sobre um modelo volumétrico de demonstração.",
    notice:
      "Modelo procedural de demonstração: geometria coerente, não é projeto de execução nem modelo BIM validado.",
    scope: {
      title: "Onde isto corre",
      body: "As edições vivem nesta página e nesta sessão. Não há gravação, sincronização nem versão.",
    },
    toolsLabel: "Ferramenta",
    viewLabel: "Enquadramento",
    hierarchyLabel: "Hierarquia do modelo",
    propertiesLabel: "Propriedades",
    statusLabel: "Estado do palco",
    source: {
      label: "Modelo de demonstração",
      hint: "Seis volumetrias fictícias, geradas a partir dos dados de exemplo.",
    },
    loading: "A preparar o motor de cena…",
    noWebgl: {
      title: "Sem contexto WebGL: o editor continua utilizável",
      body: "A hierarquia, as propriedades e as ferramentas funcionam; só o palco 3D não é desenhado neste dispositivo.",
    },
    contextLost: "O contexto GPU foi interrompido. Recarrega o palco para continuar.",
    reload: "Recarregar o palco",
    selection: {
      empty: "Nada selecionado.",
      hint: "Clica num volume no palco ou escolhe um elemento na hierarquia.",
      multiple: (count: number) =>
        count === 1 ? "1 elemento selecionado" : `${count} elementos selecionados`,
      clear: "Limpar seleção",
      focus: "Enquadrar seleção",
    },
    tree: {
      expand: "Expandir",
      collapse: "Colapsar",
      show: "Mostrar categoria",
      hide: "Ocultar categoria",
      showElement: "Mostrar elemento",
      hideElement: "Ocultar elemento",
      empty: "Nenhum elemento visível nesta categoria.",
      truncated: (count: number) => `Demasiados elementos para listar: ${String(count)} por mostrar.`,
      note: "Um clique seleciona; o olho escreve a visibilidade no documento.",
    },
    properties: {
      position: "Posição (m)",
      rotation: "Rotação (°)",
      scale: "Escala",
      apply: "Aplicar",
      axes: { x: "X · nascente", y: "Y · cima", z: "Z · norte" },
      step: (m: number) => `passo de ${m.toFixed(2).replace(".", ",")} m`,
      locked: "Este elemento não é editável por regra.",
      thicknessNote: "Só a espessura pode ser escalada nesta categoria.",
      visibility: "Visível",
    },
    rejected: (reason: string) => `Não aplicado: ${reason}`,
    limits: (offset: number, min: number, max: number) =>
      `Deslocamento até ${offset} m; escala entre ${min}× e ${max}×.`,
    stats: (fps: number, triangles: number, calls: number, meshes: number) =>
      `${fps} fps · ${triangles.toLocaleString("pt-PT")} triângulos · ${calls} draw calls · ${meshes} malhas`,
    idle: "Palco em espera: desenha só quando mudas alguma coisa.",
    edits: (count: number) => (count === 1 ? "1 edição nesta sessão" : `${count} edições nesta sessão`),
    qualityLabel: "Qualidade de render",
    keyboardHint: "No palco: setas para orbitar, + e − para aproximar, Esc limpa a seleção.",
  },
} as const;

export type UiStrings = typeof pt;

/**
 * Ponto único de acesso às strings. Quando existir i18n por rota, este `ui` passa a
 * ser resolvido pelo locale ativo; os chamadores não mudam.
 */
export const ui: UiStrings = pt;
