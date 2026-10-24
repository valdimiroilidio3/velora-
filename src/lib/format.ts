/**
 * Formatação de dados apresentados ao utilizador.
 * Tudo via `Intl`: a internacionalização da Fase 1 muda o `locale` de entrada,
 * nunca os chamadores. Locale por omissão = `pt-PT` (mercado inicial do produto).
 */

const DEFAULT_LOCALE = "pt-PT";

const formatters = new Map<string, Intl.DateTimeFormat>();

function dateTimeFormat(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    formatters.set(key, formatter);
  }
  return formatter;
}

export function formatDate(value: string | Date, locale: string = DEFAULT_LOCALE): string {
  return dateTimeFormat(locale, { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
}

export function formatDateTime(value: string | Date, locale: string = DEFAULT_LOCALE): string {
  return dateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

/** Tempo relativo curto, para listas ("há 3 dias"). */
export function formatRelative(
  value: string | Date,
  locale: string = DEFAULT_LOCALE,
  now: Date = new Date(),
): string {
  const then = new Date(value);
  const seconds = Math.round((now.getTime() - then.getTime()) / 1000);
  const table: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
  for (const [unit, unitSeconds] of table) {
    if (Math.abs(seconds) >= unitSeconds) {
      return formatter.format(-Math.round(seconds / unitSeconds), unit);
    }
  }
  return formatter.format(-seconds, "second");
}

export function formatArea(squareMeters: number, locale: string = DEFAULT_LOCALE): string {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(squareMeters)} m²`;
}

export function formatAreaRange(from: number, to: number, locale: string = DEFAULT_LOCALE): string {
  return from === to ? formatArea(from, locale) : `${formatArea(from, locale)} – ${formatArea(to, locale)}`;
}

export function formatPrice(amount: number | null, locale: string = DEFAULT_LOCALE): string {
  if (amount === null) {
    return "Sob consulta";
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value: number, locale: string = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(value);
}

/** Iniciais para o avatar do utilizador demonstrativo (sem fotografia real). */
export function initials(name: string): string {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0)?.toUpperCase() ?? "")
    .join("");
}
