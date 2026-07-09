// =====================================================================
// src/routes/search.route.ts
// Ejemplo de uso real: llama al RPC search_errors (seed.sql) y devuelve
// la forma definida en SearchResponse (request-endpoints.types.ts).
// =====================================================================

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { supabase } from "../lib/supabase.js";

export const searchRoute = new Hono().get("/", async (c) => {
  const query = c.req.query("q");
  const locale = c.req.query("locale") === "en" ? "en" : "es";
  const limit = Number(c.req.query("limit") ?? 20);

  if (!query || query.trim().length < 2) {
    throw new HTTPException(400, { message: "El parámetro 'q' es requerido (mínimo 2 caracteres)" });
  }

  const startedAt = Date.now();

  const { data, error } = await supabase.rpc("search_errors", {
    p_query: query,
    p_locale: locale,
    p_limit: limit,
  } as unknown as undefined);

  if (error) {
    throw new HTTPException(500, { message: `Error en búsqueda: ${error.message}` });
  }

  return c.json({
    query,
    locale,
    results: data ?? [],
    tookMs: Date.now() - startedAt,
  });
});
