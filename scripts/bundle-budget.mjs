#!/usr/bin/env node
/**
 * Orçamento de peso de cliente, medido sobre o output real do `next build`.
 *
 * Porque é um script e não uma expectativa anotada no `next.config.ts`: o que queremos
 * vigiar é uma decisão de arquitetura — o `three` (135 kB gzip) só pode chegar ao
 * navegador de quem abre a vista 3D. Um orçamento que meça por rota é a única forma de
 * isso ser uma verificação e não uma promessa.
 *
 * Mede gzip real dos chunks, por três recortes:
 *   shared      — `rootMainFiles` do build-manifest (tudo o que qualquer rota paga)
 *   first-load  — scripts listados no HTML pré-renderizado de cada rota estática
 *   total       — todos os chunks de cliente gerados
 * Uma rota dinâmica (usa `searchParams`) não tem HTML pré-renderizado; é coberta pelo
 * recorte `shared` e pela rota irmã pré-renderizada mais pesada.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const NEXT_DIR = ".next";
const LIMITS = { sharedKb: 150, firstLoadKb: 240, totalKb: 520 };
/** Assinatura do `three` dentro de um chunk: aparece no código do renderer, não no nosso. */
const HEAVY_MARKERS = [{ name: "three", marker: "WebGLRenderer", budgetOnlyFor: "lazy" }];

const KB = (bytes) => Math.round((bytes / 1024) * 10) / 10;

function gzipSizeOf(reference) {
  const relativePath = reference.replace(/^\/_next\//, "").replace(/^\.next\//, "");
  const absolute = join(NEXT_DIR, relativePath);
  if (!existsSync(absolute)) {
    throw new Error(`chunk referenciado mas em falta: ${relativePath}`);
  }
  return gzipSync(readFileSync(absolute)).length;
}

function readJson(path) {
  return JSON.parse(readFileSync(join(NEXT_DIR, path), "utf8"));
}

function walkHtml(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkHtml(path));
    } else if (entry.name.endsWith(".html")) {
      out.push(path);
    }
  }
  return out;
}

function clientChunks() {
  const dir = join(NEXT_DIR, "static", "chunks");
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir)
    .filter((name) => name.endsWith(".js"))
    .map((name) => join("static", "chunks", name));
}

export function measure() {
  const manifest = readJson("build-manifest.json");
  const sharedFiles = manifest.rootMainFiles ?? [];
  const sharedBytes = sharedFiles.reduce((total, file) => total + gzipSizeOf(file), 0);

  const appDir = join(NEXT_DIR, "server", "app");
  const routes = existsSync(appDir)
    ? walkHtml(appDir).map((htmlPath) => {
        const html = readFileSync(htmlPath, "utf8");
        const scripts = [
          ...new Set([...html.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map((match) => match[1])),
        ];
        const bytes = scripts.reduce((total, script) => total + gzipSizeOf(script), 0);
        return {
          route:
            relative(appDir, htmlPath)
              .replace(/\\/g, "/")
              .replace(/\.html$/, "") || "index",
          scripts,
          bytes,
        };
      })
    : [];

  const chunks = clientChunks();
  const totalBytes = chunks.reduce((total, chunk) => total + gzipSizeOf(chunk), 0);

  const heavy = {};
  for (const marker of HEAVY_MARKERS) {
    const files = chunks.filter((chunk) =>
      readFileSync(join(NEXT_DIR, chunk), "utf8").includes(marker.marker),
    );
    const inShared = files.some((file) => sharedFiles.includes(file));
    const routeHits = routes.filter((route) =>
      route.scripts.some((script) => files.includes(script.replace(/^\/_next\//, ""))),
    );
    heavy[marker.name] = {
      files,
      bytes: files.reduce((total, file) => total + gzipSizeOf(join(NEXT_DIR, file)), 0),
      inShared,
      routes: routeHits.map((route) => route.route),
    };
  }

  return {
    shared: { bytes: sharedBytes, files: sharedFiles.length },
    routes: routes.sort((a, b) => b.bytes - a.bytes),
    total: { bytes: totalBytes, files: chunks.length },
    heavy,
  };
}

export function evaluate(result, limits) {
  const violations = [];
  if (KB(result.shared.bytes) > limits.sharedKb) {
    violations.push(
      `JS partilhado (rootMainFiles) em ${KB(result.shared.bytes)} kB > limite ${limits.sharedKb} kB`,
    );
  }
  for (const route of result.routes) {
    if (KB(route.bytes) > limits.firstLoadKb) {
      violations.push(
        `first-load de /${route.route.replace(/\.html$/, "")} em ${KB(route.bytes)} kB > limite ${limits.firstLoadKb} kB`,
      );
    }
  }
  if (KB(result.total.bytes) > limits.totalKb) {
    violations.push(
      `total de chunks de cliente em ${KB(result.total.bytes)} kB > limite ${limits.totalKb} kB`,
    );
  }
  for (const [name, info] of Object.entries(result.heavy)) {
    if (info.inShared) {
      violations.push(`${name} está no bundle partilhado: todas as rotas pagariam por ele`);
    }
    if (info.routes.length > 0) {
      violations.push(`${name} carregado no first-load de: ${info.routes.join(", ")} (deve ser diferido)`);
    }
  }
  return violations;
}

export function main(argv = process.argv.slice(2)) {
  const asJson = argv.includes("--json");
  if (!existsSync(join(NEXT_DIR, "build-manifest.json"))) {
    console.error(`Sem ${NEXT_DIR}/build-manifest.json — correr \`pnpm run build\` antes deste portão.`);
    return 1;
  }

  const limits = { ...LIMITS };
  for (const arg of argv) {
    const match = /^--(shared|first-load|total)-kb=(\d+)$/.exec(arg);
    if (match) {
      const key = match[1] === "first-load" ? "firstLoadKb" : `${match[1]}Kb`;
      limits[key] = Number(match[2]);
    }
  }

  const result = measure();
  const violations = evaluate(result, limits);

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          limits,
          sharedKb: KB(result.shared.bytes),
          totalKb: KB(result.total.bytes),
          routes: result.routes.map((route) => ({
            route: route.route,
            firstLoadKb: KB(route.bytes),
            scripts: route.scripts.length,
          })),
          heavy: Object.fromEntries(
            Object.entries(result.heavy).map(([name, info]) => [
              name,
              { kb: KB(info.bytes), files: info.files.length, inShared: info.inShared, routes: info.routes },
            ]),
          ),
          violations,
        },
        null,
        2,
      ),
    );
  } else {
    console.log("Orçamento de cliente (gzip medido no output de build)");
    console.log(
      `  partilhado  ${String(KB(result.shared.bytes)).padStart(7)} kB / ${limits.sharedKb} kB  (${result.shared.files} chunks)`,
    );
    console.log(
      `  total       ${String(KB(result.total.bytes)).padStart(7)} kB / ${limits.totalKb} kB  (${result.total.files} chunks)`,
    );
    console.log("  por rota (first-load):");
    for (const route of result.routes) {
      const over = KB(route.bytes) > limits.firstLoadKb ? "  ✕" : "  ✓";
      console.log(
        `    ${over} /${route.route.replace(/\.html$/, "") || "index"}`.padEnd(46) +
          `${String(KB(route.bytes)).padStart(7)} kB  ${route.scripts.length} scripts`,
      );
    }
    for (const [name, info] of Object.entries(result.heavy)) {
      console.log(
        `  diferido: ${name.padEnd(8)} ${String(KB(info.bytes)).padStart(7)} kB em ${info.files} chunk(s), ` +
          `partilhado=${info.inShared}, rotas-iniciais=${info.routes.length === 0 ? "nenhuma" : info.routes.join(", ")}`,
      );
    }
  }

  if (violations.length > 0) {
    console.error("\nOrçamento ultrapassado:");
    for (const violation of violations) {
      console.error(`  ✕ ${violation}`);
    }
    console.error(
      "Opções: reduzir o que entra no primeiro pintado, ou justificar a alteração em docs/DEPENDENCIES.md.",
    );
    return 1;
  }
  if (!asJson) {
    console.log("\nDentro do orçamento.");
  }
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exit(main());
}
