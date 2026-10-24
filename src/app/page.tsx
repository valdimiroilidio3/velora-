const STACK = [
  ["Next.js 16.4.3 (App Router)", "framework de aplicação e rotas"],
  ["TypeScript 5.9.3 (strict)", "tipagem estrita em todo o código"],
  ["pnpm 12.15.0 (via Corepack)", "gestão de dependências reproduzível"],
  ["ESLint 10 + eslint-config-next", "lint com regras do framework"],
  ["Vitest 5.0.5", "testes unitários de lógica de fundação"],
  ["Vercel (por verificar)", "alojamento alvo — ainda sem deploy"],
] as const;

const PENDENTES = [
  "Autenticação e sessões (Fase 1)",
  "PostgreSQL, ORM e migrações (Fase 1)",
  "Isolamento multi-tenant testado (Fase 1)",
  "Editor de construção e modelação BIM (Fases 2–3)",
  "Camada 3D com Three.js (Fase 3+)",
  "Geração por IA a partir de texto/imagens (Fase 3+)",
  "Visitas guiadas e experiências cinematográficas (Fase 4+)",
  "Leads, planos comerciais e pagamentos (Fase 5+)",
  "Internacionalização completa (Fase 1+, estrutura a definir)",
] as const;

export default function HomePage() {
  return (
    <main id="conteudo" className="shell">
      <header>
        <p className="eyebrow">Fase 0 · Fundação técnica</p>
        <h1>VELORA</h1>
        <p className="lede">
          Plataforma SaaS internacional para criar, apresentar e comercializar empreendimentos imobiliários
          com recurso a IA, modelação BIM progressiva e experiências 3D interativas no navegador.
        </p>
      </header>

      <section aria-labelledby="estado">
        <h2 id="estado">Estado real do projeto</h2>
        <p>
          Nesta fase não existe qualquer módulo funcional. Está preparada a base reproduzível: configuração,
          validação de ambiente, ferramentas de qualidade e documentação de arquitetura, segurança e custos.
          Nenhuma dependência de serviço externo é necessária para executar localmente.
        </p>
      </section>

      <section aria-labelledby="stack">
        <h2 id="stack">Base técnica instalada e verificada</h2>
        <ul>
          {STACK.map(([name, role]) => (
            <li key={name}>
              <strong>{name}</strong> — {role}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="pendentes">
        <h2 id="pendentes">Ainda não implementado</h2>
        <ul>
          {PENDENTES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <footer>
        <p>
          Documentação de referência em <code>docs/</code>: PRODUCT-SPEC, ARCHITECTURE, DATA-MODEL, SECURITY,
          QUALITY-GATES, DEPENDENCIES, DEPLOYMENT, DEVELOPMENT-WORKFLOW e registos de decisão em{" "}
          <code>docs/ADR/</code>.
        </p>
      </footer>
    </main>
  );
}
