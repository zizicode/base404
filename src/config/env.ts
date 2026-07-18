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
  ingestApiKey: string;
  /** URL pública del sitio para sitemaps y canónicas. Default: https://vimovies.com */
  publicSiteUrl: string;
  /** Token opcional para bypass de admin en desarrollo local (nunca en producción) */
  adminDevToken?: string;
}

/** Incluye la variante con/sin www de cada origen configurado. */
function expandCorsOrigins(origins: string[]): string[] {
  const expanded = new Set<string>();

  for (const base of origins) {
    expanded.add(base);

    try {
      const url = new URL(base);
      const altHost = url.hostname.startsWith("www.")
        ? url.hostname.slice(4)
        : `www.${url.hostname}`;
      const port = url.port ? `:${url.port}` : "";
      expanded.add(`${url.protocol}//${altHost}${port}`);
    } catch {
      // Entrada mal formada: se conserva solo el valor literal.
    }
  }

  return [...expanded];
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
    corsOrigins: expandCorsOrigins(
      (process.env.CORS_ORIGIN ?? "")
        .split(",")
        .map((origin: string) => origin.trim())
        .filter(Boolean),
    ),
    logLevel: (process.env.LOG_LEVEL as EnvConfig["logLevel"]) ?? "info",
    isProduction: nodeEnv === "production",
    ingestApiKey: required("INGEST_API_KEY"),
    publicSiteUrl: (process.env.PUBLIC_SITE_URL ?? "https://vimovies.com").replace(/\/$/, ""),
    adminDevToken: process.env.ADMIN_DEV_TOKEN?.trim() || undefined,
  };
}

/** Config singleton — se evalúa una vez al importar este módulo por primera vez. */
export const env: EnvConfig = buildEnv();
