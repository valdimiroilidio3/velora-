/**
 * DADOS DE DEMONSTRAÇÃO — não são dados de clientes.
 *
 * Nada aqui vem de um sistema real: nomes, datas, áreas, preços e estados são
 * inventados para exercitar a interface. Toda a superfície que consome este módulo
 * mostra `DemoBadge`. A persistência real (e o isolamento por organização) entra na
 * Fase 1 através de `src/server` + `src/db`; este módulo é substituído por um
 * repositório com o mesmo tipo (`DemoProject` → `Project`), sem tocar nos componentes.
 *
 * Ver docs/ARCHITECTURE.md §3.3 e docs/DATA-MODEL.md §3.5–3.8.
 */

export const DEMO_NOTICE =
  "Conteúdo de demonstração. Nomes, datas, áreas e preços são fictícios e não representam empreendimentos, clientes ou stock reais." as const;

export type ProjectStatus = "draft" | "in_review" | "published" | "archived";

export interface DemoTypology {
  readonly code: string;
  readonly bedrooms: number;
  readonly bathrooms: number;
  readonly areaM2: number;
  readonly units: number;
  readonly available: number;
  readonly priceEur: number | null;
}

/** Parâmetros do volume construtivo. Única fonte das duas projeções (SVG e WebGL). */
export interface SceneSeed {
  readonly floors: number;
  readonly podiumFloors: number;
  readonly wings: number;
  readonly bayWidthM: number;
  readonly depthM: number;
  readonly floorHeightM: number;
  readonly setbackFloors: number;
  readonly setbackInsetM: number;
  readonly courtyardWidthM: number;
  readonly orientationDeg: number;
}

export interface DemoProject {
  readonly id: string;
  readonly code: string;
  readonly slug: string;
  readonly name: string;
  readonly subtitle: string;
  readonly developer: string;
  readonly city: string;
  readonly region: string;
  readonly country: string;
  readonly status: ProjectStatus;
  readonly updatedAt: string;
  readonly completionQuarter: string;
  readonly summary: string;
  readonly typologies: readonly DemoTypology[];
  readonly priceFromEur: number | null;
  readonly areaFromM2: number;
  readonly areaToM2: number;
  readonly versions: number;
  readonly isDemo: true;
  readonly scene: SceneSeed;
}

const units = (typologies: readonly DemoTypology[]) =>
  typologies.reduce((total, item) => total + item.units, 0);
const available = (typologies: readonly DemoTypology[]) =>
  typologies.reduce((total, item) => total + item.available, 0);

/** Marca cada registo como demonstração no próprio tipo — não é possível "esquecer" a origem. */
function project(input: Omit<DemoProject, "isDemo">): DemoProject {
  return { ...input, isDemo: true };
}

export const demoProjects: readonly DemoProject[] = [
  project({
    id: "prj_mares",
    code: "DEMO-01",
    slug: "mares-do-casal",
    name: "Marés do Casal",
    subtitle: "Reabilitação de quarteirão com 3 volumes novos",
    developer: "Promontório Demo, Lda.",
    city: "Porto",
    region: "Norte",
    country: "PT",
    status: "published",
    updatedAt: "2026-10-19T15:20:00Z",
    completionQuarter: "2028 · T2",
    summary:
      "Empreendimento de demonstração com dois edifícios de esquina e um volume recuado sobre pódio, orientado a vista de rio. Apresenta tipologias T1 a T4 com varanda corrida a sul.",
    priceFromEur: 348_000,
    areaFromM2: 54,
    areaToM2: 156,
    versions: 7,
    typologies: [
      { code: "T1", bedrooms: 1, bathrooms: 1, areaM2: 54, units: 6, available: 1, priceEur: 348_000 },
      { code: "T2", bedrooms: 2, bathrooms: 2, areaM2: 78, units: 18, available: 5, priceEur: 452_000 },
      { code: "T3", bedrooms: 3, bathrooms: 2, areaM2: 112, units: 12, available: 4, priceEur: 638_000 },
      { code: "T4", bedrooms: 4, bathrooms: 3, areaM2: 156, units: 4, available: 2, priceEur: 895_000 },
    ],
    scene: {
      floors: 6,
      podiumFloors: 1,
      wings: 3,
      bayWidthM: 7.2,
      depthM: 13.5,
      floorHeightM: 3.05,
      setbackFloors: 1,
      setbackInsetM: 2.4,
      courtyardWidthM: 9,
      orientationDeg: 24,
    },
  }),
  project({
    id: "prj_pateo",
    code: "DEMO-02",
    slug: "patio-da-alameda",
    name: "Pátio da Alameda",
    subtitle: "Pátio fechado com jardim interior comum",
    developer: "Promontório Demo, Lda.",
    city: "Lisboa",
    region: "Lisboa e Vale do Tejo",
    country: "PT",
    status: "in_review",
    updatedAt: "2026-10-22T09:05:00Z",
    completionQuarter: "2029 · T1",
    summary:
      "Demonstração de organismo em U em volta de um pátio arborizado, com fachada contínua de vãos estreitos e cobertura técnica recuada. Estado de revisão aplica-se a preços e a duas tipologias.",
    priceFromEur: 415_000,
    areaFromM2: 47,
    areaToM2: 134,
    versions: 4,
    typologies: [
      { code: "T0", bedrooms: 0, bathrooms: 1, areaM2: 47, units: 8, available: 3, priceEur: 415_000 },
      { code: "T1", bedrooms: 1, bathrooms: 1, areaM2: 62, units: 14, available: 6, priceEur: 498_000 },
      { code: "T2", bedrooms: 2, bathrooms: 2, areaM2: 84, units: 16, available: 7, priceEur: 655_000 },
      { code: "T3", bedrooms: 3, bathrooms: 2, areaM2: 134, units: 5, available: 5, priceEur: null },
    ],
    scene: {
      floors: 5,
      podiumFloors: 1,
      wings: 3,
      bayWidthM: 6.4,
      depthM: 12,
      floorHeightM: 2.95,
      setbackFloors: 0,
      setbackInsetM: 0,
      courtyardWidthM: 18,
      orientationDeg: -12,
    },
  }),
  project({
    id: "prj_colinas",
    code: "DEMO-03",
    slug: "colinas-terraco",
    name: "Colinas Terraço",
    subtitle: "Edifício em socalcos sobre terreno em declive",
    developer: "Atlas Demo Imobiliária",
    city: "Coimbra",
    region: "Centro",
    country: "PT",
    status: "draft",
    updatedAt: "2026-10-24T07:48:00Z",
    completionQuarter: "2030 · T3",
    summary:
      "Estudo demonstrativo de implantação em 4 socalcos, com acesso viário inferior e terraços contínuos em cada recuo. Ainda sem tabela de preços fechada.",
    priceFromEur: null,
    areaFromM2: 68,
    areaToM2: 172,
    versions: 2,
    typologies: [
      { code: "T2", bedrooms: 2, bathrooms: 2, areaM2: 68, units: 10, available: 10, priceEur: null },
      { code: "T3", bedrooms: 3, bathrooms: 2, areaM2: 104, units: 12, available: 12, priceEur: null },
      { code: "T4", bedrooms: 4, bathrooms: 3, areaM2: 172, units: 4, available: 4, priceEur: null },
    ],
    scene: {
      floors: 4,
      podiumFloors: 2,
      wings: 4,
      bayWidthM: 8,
      depthM: 11.5,
      floorHeightM: 3.1,
      setbackFloors: 2,
      setbackInsetM: 3.2,
      courtyardWidthM: 6,
      orientationDeg: 42,
    },
  }),
  project({
    id: "prj_ribeira",
    code: "DEMO-04",
    slug: "ribeira-norte",
    name: "Ribeira Norte",
    subtitle: "Uso misto: comércio em cave e habitação acima",
    developer: "Demópolis Studio",
    city: "Braga",
    region: "Norte",
    country: "PT",
    status: "published",
    updatedAt: "2026-10-11T11:30:00Z",
    completionQuarter: "2027 · T4",
    summary:
      "Empreendimento de exemplo com dois pisos de atividade à frente e torre residencial recuada a sul. Inclui frações comerciais autonomizadas na tabela de disponibilidade.",
    priceFromEur: 289_000,
    areaFromM2: 41,
    areaToM2: 128,
    versions: 11,
    typologies: [
      { code: "T0", bedrooms: 0, bathrooms: 1, areaM2: 41, units: 9, available: 2, priceEur: 289_000 },
      { code: "T1", bedrooms: 1, bathrooms: 1, areaM2: 58, units: 15, available: 4, priceEur: 344_000 },
      { code: "T2", bedrooms: 2, bathrooms: 1, areaM2: 74, units: 20, available: 9, priceEur: 421_000 },
      { code: "T3", bedrooms: 3, bathrooms: 2, areaM2: 128, units: 6, available: 1, priceEur: 592_000 },
    ],
    scene: {
      floors: 8,
      podiumFloors: 2,
      wings: 2,
      bayWidthM: 7,
      depthM: 15,
      floorHeightM: 3.2,
      setbackFloors: 2,
      setbackInsetM: 4,
      courtyardWidthM: 10,
      orientationDeg: -35,
    },
  }),
  project({
    id: "prj_luz",
    code: "DEMO-05",
    slug: "casa-da-luz",
    name: "Casa da Luz",
    subtitle: "Moradias geminadas em banda, 2 pisos + recuado",
    developer: "Atlas Demo Imobiliária",
    city: "Aveiro",
    region: "Centro",
    country: "PT",
    status: "archived",
    updatedAt: "2026-06-30T16:00:00Z",
    completionQuarter: "2026 · T1",
    summary:
      "Arquivado para demonstração de estado terminal: mantém versões, histórico e partilhas revogadas. Não aparece nas listagens por omissão do filtro.",
    priceFromEur: 232_000,
    areaFromM2: 96,
    areaToM2: 148,
    versions: 19,
    typologies: [
      { code: "T3", bedrooms: 3, bathrooms: 2, areaM2: 96, units: 8, available: 0, priceEur: 232_000 },
      { code: "T4", bedrooms: 4, bathrooms: 3, areaM2: 148, units: 4, available: 0, priceEur: 298_000 },
    ],
    scene: {
      floors: 3,
      podiumFloors: 0,
      wings: 6,
      bayWidthM: 6.2,
      depthM: 10,
      floorHeightM: 2.9,
      setbackFloors: 1,
      setbackInsetM: 1.8,
      courtyardWidthM: 4,
      orientationDeg: 8,
    },
  }),
  project({
    id: "prj_pinhais",
    code: "DEMO-06",
    slug: "pinhais-parque",
    name: "Pinhais do Parque",
    subtitle: "Condomínio de 4 blocos com percurso drenante",
    developer: "Demópolis Studio",
    city: "Setúbal",
    region: "Lisboa e Vale do Tejo",
    country: "PT",
    status: "draft",
    updatedAt: "2026-10-21T13:12:00Z",
    completionQuarter: "2031 · T1",
    summary:
      "Fase inicial de estudo: quatro blocos iguais com pátio partilhado e um percurso de águas pluviais desenhado. A informação comercial está por preencher.",
    priceFromEur: 265_000,
    areaFromM2: 52,
    areaToM2: 118,
    versions: 1,
    typologies: [
      { code: "T1", bedrooms: 1, bathrooms: 1, areaM2: 52, units: 12, available: 12, priceEur: 265_000 },
      { code: "T2", bedrooms: 2, bathrooms: 1, areaM2: 69, units: 24, available: 23, priceEur: 318_000 },
      { code: "T3", bedrooms: 3, bathrooms: 2, areaM2: 94, units: 12, available: 12, priceEur: 402_000 },
      { code: "T4", bedrooms: 4, bathrooms: 2, areaM2: 118, units: 4, available: 4, priceEur: null },
    ],
    scene: {
      floors: 4,
      podiumFloors: 0,
      wings: 4,
      bayWidthM: 7.6,
      depthM: 12.8,
      floorHeightM: 3,
      setbackFloors: 0,
      setbackInsetM: 0,
      courtyardWidthM: 24,
      orientationDeg: 65,
    },
  }),
];

export const demoUser = {
  name: "Ana Duarte",
  email: "ana.duarte@example.invalid",
  organization: "Demo Imóveis · espaço de demonstração",
  role: "editor",
} as const;

/** Total de frações e disponíveis — derivados, não repetidos à mão. */
export function projectUnitTotals(project: DemoProject): { total: number; available: number } {
  return { total: units(project.typologies), available: available(project.typologies) };
}
