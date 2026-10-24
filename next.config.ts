import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança aplicados a todas as rotas.
 * Deliberadamente conservadores: uma CSP restritiva só será introduzida quando
 * existir UI real (a política atual pode ser bloqueada na auditoria de Fase 1).
 * Ver docs/SECURITY.md → "Cabeçalhos HTTP e CSP".
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
] as const;

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders.map((header) => ({ ...header })) }];
  },
} satisfies NextConfig;

export default nextConfig;
