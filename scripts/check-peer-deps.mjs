#!/usr/bin/env node
/**
 * Portão de dependências de pares com lista de exceções nomeada.
 *
 * `pnpm peers check` é binário: ou limpo, ou falha. A nossa situação real precisa de uma
 * terceira saída — o ESLint 10 é a única linha mantida (a 9.x está marcada como fim de
 * suporte no registo público), mas os plugins que o `eslint-config-next` traz por dentro
 * ainda declaram `peerDependencies.eslint` com teto `^9`. Esse teto é um limite *deles*,
 * não um defeito nosso, e não o podemos resolver sem voltar a uma versão sem manutenção.
 *
 * O portão falha nos dois sentidos: achados sem exceção (novo risco) e exceções que já não
 * correspondem a nada (dívida obsoleta, que passaria a escondê-lo).
 */
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

/**
 * Exceções aceites. `parent` é o pacote que declara o par, `peer` o par em conflito,
 * `until` diz o que tem de acontecer para a exceção desaparecer.
 */
export const ALLOWLIST = [
  {
    parent: "eslint-plugin-import",
    peer: "eslint",
    reason:
      "O plugin usa a API pública estável de `Linter`/`Rule`; o range não foi alargado a ^10 por falta de teste do autor, não por incompatibilidade conhecida.",
    until: "eslint-plugin-import declarar peer range com ^10 (rastrear em docs/DEPENDENCIES.md).",
  },
  {
    parent: "eslint-plugin-jsx-a11y",
    peer: "eslint",
    reason:
      "Regras declaradas em formato compatível com as duas linhas; o range do pacote é que está desatualizado.",
    until: "eslint-plugin-jsx-a11y declarar peer range com ^10.",
  },
  {
    parent: "eslint-plugin-react",
    peer: "eslint",
    reason: "As regras usadas pelo config do Next existem em ambas as linhas; idem quanto ao range.",
    until: "eslint-plugin-react declarar peer range com ^10.",
  },
];

function collectFindings(json) {
  const findings = [];
  for (const [importer, report] of Object.entries(json ?? {})) {
    for (const [peer, entries] of Object.entries(report.bad ?? {})) {
      for (const entry of entries) {
        const chain = (entry.parents ?? []).map((parent) => `${parent.name}@${parent.version}`);
        // O último elo é o pacote que declara o par; os anteriores são o caminho até ele.
        const parent = (entry.parents ?? []).at(-1)?.name ?? "(desconhecido)";
        findings.push({
          kind: "unmet",
          importer,
          peer,
          parent,
          chain,
          wantedRange: entry.wantedRange,
          foundVersion: entry.foundVersion,
          optional: entry.optional === true,
        });
      }
    }
    for (const [peer, parents] of Object.entries(report.missing ?? {})) {
      for (const parent of parents ?? ["(raiz)"]) {
        findings.push({
          kind: "missing",
          importer,
          peer,
          parent: typeof parent === "string" ? parent : parent.name,
        });
      }
    }
    for (const conflict of report.conflicts ?? []) {
      findings.push({
        kind: "conflict",
        importer,
        peer: "(conflito)",
        parent: conflict?.name ?? "(desconhecido)",
      });
    }
  }
  return findings;
}

function isAllowed(finding) {
  if (finding.kind !== "unmet" || finding.optional) {
    return false;
  }
  return ALLOWLIST.some((rule) => rule.parent === finding.parent && rule.peer === finding.peer);
}

export function evaluatePeerDependencies(json) {
  const findings = collectFindings(json);
  const accepted = findings.filter(isAllowed);
  const unexpected = findings.filter((finding) => !isAllowed(finding));
  // Obsoleta = a exceção já não corresponde a nenhum achado: o risco desapareceu ou o nome
  // mudou; nos dois casos a linha tem de sair da lista.
  const stale = ALLOWLIST.filter(
    (rule) => !findings.some((finding) => finding.parent === rule.parent && finding.peer === rule.peer),
  );
  return { findings, accepted, unexpected, stale };
}

function format(finding) {
  if (finding.kind !== "unmet") {
    return `  ✕ ${finding.importer}: par "${finding.peer}" ${finding.kind} em ${finding.parent}`;
  }
  return `  ✕ ${finding.importer}: ${finding.parent} pede ${finding.peer}@${finding.wantedRange}, instalado ${finding.foundVersion} (cadeia: ${finding.chain.join(" → ")})`;
}

function readPeersReport() {
  try {
    return { raw: execFileSync("pnpm", ["peers", "check", "--json"], { encoding: "utf8" }), exitCode: 0 };
  } catch (error) {
    // O pnpm sai com código != 0 quando há achados: o JSON continua a ser a fonte do relatório.
    if (typeof error?.stdout === "string" && error.stdout.trim().length > 0) {
      return { raw: error.stdout, exitCode: error.status ?? 1 };
    }
    throw error;
  }
}

export function main() {
  const { raw } = readPeersReport();
  const json = raw.trim().length === 0 ? {} : JSON.parse(raw);
  const { findings, accepted, unexpected, stale } = evaluatePeerDependencies(json);

  if (unexpected.length === 0 && stale.length === 0) {
    console.log(
      `peer-dependencies: ${findings.length} achado(s), ${accepted.length} coberto(s) por exceção nomeada, 0 inesperados.`,
    );
    if (findings.length === 0) {
      console.log("peer-dependencies: sem achados — a lista de exceções está a ser usada em vazio.");
    }
    return 0;
  }

  if (unexpected.length > 0) {
    console.error("peer-dependencies: achados sem exceção registada:");
    for (const finding of unexpected) {
      console.error(format(finding));
    }
  }
  if (stale.length > 0) {
    console.error("peer-dependencies: exceções obsoletas (remover de scripts/check-peer-deps.mjs):");
    for (const rule of stale) {
      console.error(`  ! ${rule.parent} → ${rule.peer}: ${rule.until}`);
    }
  }
  console.error("Contexto e política: docs/DEPENDENCIES.md §Pares de dependência.");
  return 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exit(main());
}
