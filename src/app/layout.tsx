import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { PreferencesEffects } from "@/components/layout/preferences-effects";
import { ToastProvider } from "@/components/ui/toast";
import { PREFERENCES_STORAGE_KEY, defaultPreferences } from "@/lib/preferences";

const SITE_NAME = "VELORA";

/**
 * Aplica tema/densidade/movimento antes da primeira pintura.
 *
 * É espelho de `applyPreferences` (mesmo contrato, mesmas chaves) escrito em JS puro
 * porque corre antes do bundle. O teste `preferences.test.ts` garante que as chaves e os
 * valores coincidem: assim os dois caminhos não podem divergir em silêncio.
 */
const BOOTSTRAP_SCRIPT = `(() => {
  const root = document.documentElement;
  const media = (query) => typeof window.matchMedia === "function" && window.matchMedia(query).matches;
  let saved = {};
  try {
    saved = JSON.parse(window.localStorage.getItem("${PREFERENCES_STORAGE_KEY}") || "{}") || {};
  } catch {
    saved = {};
  }
  const theme = saved.theme ?? "${defaultPreferences.theme}";
  const density = saved.density ?? "${defaultPreferences.density}";
  const motion = saved.motion ?? "${defaultPreferences.motion}";
  const resolved = theme === "system" ? (media("(prefers-color-scheme: dark)") ? "dark" : "light") : theme;
  const reduced = motion === "reduced" || (motion === "system" && media("(prefers-reduced-motion: reduce)"));
  root.dataset.theme = resolved;
  root.dataset.themeChoice = theme;
  root.dataset.density = density === "compact" ? "compact" : "comfortable";
  root.dataset.motion = reduced ? "reduced" : "full";
})();`;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: `${SITE_NAME} — projeto, apresentação e comercialização de empreendimentos`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "VELORA: base de produto com design system próprio, catálogo de demonstração e cena volumétrica em WebGL. Todo o conteúdo é fictício.",
  applicationName: SITE_NAME,
  // Sem publicação comercial nesta fase: indexar um protótipo seria publicar o que ainda muda.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f4f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0f0f" },
  ],
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="pt-PT" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOTSTRAP_SCRIPT }} />
      </head>
      <body className="bg-canvas text-ink">
        <a className="skip-link" href="#conteudo">
          Saltar para o conteúdo
        </a>
        <PreferencesEffects />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
