// =====================================================================
// src/controllers/brands.controller.ts
// GET /v1/brands
// GET /v1/brands/:slug
// GET /v1/brands/:slug/errors
// =====================================================================

import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import { supabase } from "../lib/supabase.js";
import { ok } from "../lib/response.js";
import type { Locale } from "../types/request-endpoints.types.js";

const db = supabase as any;

function resolveLocale(raw: string | undefined): Locale {
  return raw === "en" ? "en" : "es";
}

export async function listBrands(c: Context) {
  const { data, error } = await db
    .from("brands")
    .select("id, name, slug, logo_url")
    .order("name");

  if (error) throw new HTTPException(500, { message: error.message });

  return c.json(ok({ brands: data ?? [] }));
}

export async function getBrandBySlug(c: Context) {
  const slug = c.req.param("slug");

  const { data, error } = await db
    .from("brands")
    .select("id, name, slug, logo_url")
    .eq("slug", slug)
    .single();

  if (error || !data) throw new HTTPException(404, { message: "Marca no encontrada" });

  return c.json(ok({ brand: data }));
}

export async function listErrorsByBrand(c: Context) {
  const slug = c.req.param("slug");
  const locale = resolveLocale(c.req.query("locale"));
  const cursor = c.req.query("cursor");
  const limit = Math.min(Number(c.req.query("limit") ?? 20), 100);

  const { data: brand, error: brandErr } = await db
    .from("brands")
    .select("id, name, slug, logo_url")
    .eq("slug", slug)
    .single();

  if (brandErr || !brand) throw new HTTPException(404, { message: "Marca no encontrada" });

  let query = db
    .from("error_codes")
    .select("id, error_code, model, slug_es, slug_en, metadata_seo, updated_at")
    .eq("brand_id", brand.id)
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("updated_at", cursor);
  }

  const { data, error } = await query;
  if (error) throw new HTTPException(500, { message: error.message });

  const items = (data ?? []).slice(0, limit).map((row: any) => {
    const seo = (row.metadata_seo ?? {}) as Record<string, any>;
    const seoLocale = seo[locale] ?? seo["es"] ?? {};

    return {
      id: row.id,
      errorCode: row.error_code,
      model: row.model,
      slug: locale === "es" ? row.slug_es : row.slug_en,
      title: seoLocale.title ?? null,
      updatedAt: row.updated_at,
    };
  });

  const hasMore = (data ?? []).length > limit;
  const nextCursor = hasMore ? items[items.length - 1]?.updatedAt : null;

  return c.json(ok({ brand, items }, { hasMore, nextCursor, limit }));
}
