import { NextResponse } from "next/server";
import { EnvValidationError, getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

type HealthPayload = {
  status: "ok" | "config_invalid";
  service: "velora";
  phase: "0";
  environment: string;
  buildSha: string | null;
  database: "not_configured";
  uptimeSeconds: number;
};

/**
 * Verificação de vitalidade para desenvolvimento e alojamento.
 * Não expõe valores de configuração, versões de pacotes nem pormenores internos.
 * A validação de ambiente é executada aqui (pedido), não em tempo de build.
 */
export async function GET(): Promise<NextResponse<HealthPayload>> {
  const uptimeSeconds = Math.round(process.uptime());

  try {
    const env = getServerEnv();
    return NextResponse.json({
      status: "ok",
      service: "velora",
      phase: "0",
      environment: env.NODE_ENV,
      buildSha: env.NEXT_PUBLIC_GIT_SHA ?? null,
      database: "not_configured",
      uptimeSeconds,
    });
  } catch (error) {
    if (error instanceof EnvValidationError) {
      return NextResponse.json(
        {
          status: "config_invalid",
          service: "velora",
          phase: "0",
          environment: "unknown",
          buildSha: null,
          database: "not_configured",
          uptimeSeconds,
        },
        { status: 503 },
      );
    }
    throw error;
  }
}
