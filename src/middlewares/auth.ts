// =====================================================================
// src/middlewares/auth.ts
// Middlewares de autenticación para rutas admin e ingest.
// =====================================================================

import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";

import { supabase } from "../lib/supabase.js";
import { env } from "../config/env.js";

export const requireAdmin: MiddlewareHandler = async (c, next) => {
  const authorization = c.req.header("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new HTTPException(401, { message: "Se requiere token de autorización" });
  }

  const token = authorization.slice(7);

  // Bypass para desarrollo local sin Supabase Auth
  if (!env.isProduction && env.adminDevToken && token === env.adminDevToken) {
    c.set("userId", "dev-admin");
    await next();
    return;
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new HTTPException(401, { message: "Token inválido o expirado" });
  }

  const role = data.user.app_metadata?.["role"] as string | undefined;
  if (role !== "admin") {
    throw new HTTPException(403, { message: "Acceso restringido a administradores" });
  }

  c.set("userId", data.user.id);
  await next();
};

export const requireIngestKey: MiddlewareHandler = async (c, next) => {
  const key = c.req.header("X-Ingest-Key");
  if (!key || key !== env.ingestApiKey) {
    throw new HTTPException(401, { message: "X-Ingest-Key inválida o ausente" });
  }
  await next();
};
