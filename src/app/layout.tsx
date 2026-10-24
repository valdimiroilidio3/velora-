import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const SITE_NAME = "VELORA";

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} — Fundação técnica (Fase 0)`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "VELORA: plataforma internacional de criação, apresentação e comercialização de empreendimentos imobiliários com IA, BIM progressivo e experiências 3D. Estado atual: fundação técnica.",
  applicationName: SITE_NAME,
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d1117",
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="pt">
      <body>
        <a className="skip-link" href="#conteudo">
          Saltar para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
