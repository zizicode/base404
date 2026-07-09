// =====================================================================
// src/config/env.ts
// Valida y tipa las variables de entorno una sola vez al arrancar.
// Falla rápido (fail-fast) si falta algo crítico, en vez de fallar
// silenciosamente en medio de una request.
// =====================================================================

interface EnvConfig {
  nodeEnv: "development" | "production" | "test";
  port: number;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  supabaseAnonKey: string;
  corsOrigins: string[];
  logLevel: "debug" | "info" | "warn" | "error";
  isProduction: boolean;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `[env] Falta la variable de entorno requerida: ${name}. ` +
        `Revisa tu .env.development o .env.production.`,
    );
  }
  return value;
}

function buildEnv(): EnvConfig {
  const nodeEnv = (process.env.NODE_ENV ?? "development") as EnvConfig["nodeEnv"];

  return {
    nodeEnv,
    port: Number(process.env.PORT ?? 3000),
    supabaseUrl: required("SUPABASE_URL"),
    supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
    supabaseAnonKey: required("SUPABASE_ANON_KEY"),
    corsOrigins: (process.env.CORS_ORIGIN ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    logLevel: (process.env.LOG_LEVEL as EnvConfig["logLevel"]) ?? "info",
    isProduction: nodeEnv === "production",
  };
}

/** Config singleton — se evalúa una vez al importar este módulo por primera vez. */
export const env: EnvConfig = buildEnv();
