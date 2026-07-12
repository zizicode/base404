// =====================================================================
// src/controllers/stats.controller.ts
// GET /v1/stats — estadísticas públicas para el frontend
// =====================================================================

import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import { supabase } from "../lib/supabase.js";
import { ok } from "../lib/response.js";

const db = supabase as any;

export async function publicStats(c: Context) {
  const { count: totalErrors, error: errorsErr } = await db
    .from("error_codes")
    .select("*", { count: "exact", head: true })
    .eq("status", "published");

  if (errorsErr) throw new HTTPException(500, { message: errorsErr.message });

  const { count: totalBrands, error: brandsErr } = await db
    .from("brands")
    .select("*", { count: "exact", head: true });

  if (brandsErr) throw new HTTPException(500, { message: brandsErr.message });

  const { count: totalCategories, error: categoriesErr } = await db
    .from("categories")
    .select("*", { count: "exact", head: true });

  if (categoriesErr) throw new HTTPException(500, { message: categoriesErr.message });

  return c.json(ok({
    errors: totalErrors ?? 0,
    brands: totalBrands ?? 0,
    categories: totalCategories ?? 0,
  }));
}
