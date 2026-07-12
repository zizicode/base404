// =====================================================================
// src/controllers/categories.controller.ts
// GET /v1/categories
// GET /v1/categories/:slug
// GET /v1/categories/:slug/errors
// GET /v1/categories/:categorySlug/brands/:brandSlug/errors
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

export async function listCategories(c: Context) {
  const locale = resolveLocale(c.req.query("locale"));

  const { data, error } = await db.from("categories").select("id, name_es, name_en, slug_es, slug_en, device_type, icon").order("name_es");

  if (error) throw new HTTPException(500, { message: error.message });

  const categories = (data ?? []).map((cat: any) => ({
    id: cat.id,
    name: locale === "es" ? cat.name_es : cat.name_en,
    slug: locale === "es" ? cat.slug_es : cat.slug_en,
    deviceType: cat.device_type,
    icon: cat.icon,
  }));

  return c.json(ok({ categories }));
}

export async function getCategoryBySlug(c: Context) {
  const slug = c.req.param("slug");
  const locale = resolveLocale(c.req.query("locale"));

  const { data, error } = await db
    .from("categories")
    .select("id, name_es, name_en, slug_es, slug_en, device_type, icon")
    .or(`slug_es.eq.${slug},slug_en.eq.${slug}`)
    .single();

  if (error || !data) throw new HTTPException(404, { message: "Categoría no encontrada" });

  return c.json(ok({
    category: {
      id: data.id,
      name: locale === "es" ? data.name_es : data.name_en,
      slug: locale === "es" ? data.slug_es : data.slug_en,
      deviceType: data.device_type,
      icon: data.icon,
    },
  }));
}

export async function listErrorsByCategory(c: Context) {
  const slug = c.req.param("slug");
  const locale = resolveLocale(c.req.query("locale"));
  const cursor = c.req.query("cursor");
  const limit = Math.min(Number(c.req.query("limit") ?? 20), 100);

  const { data: category, error: catErr } = await db
    .from("categories")
    .select("id, name_es, name_en, slug_es, slug_en, device_type, icon")
    .or(`slug_es.eq.${slug},slug_en.eq.${slug}`)
    .single();

  if (catErr || !category) throw new HTTPException(404, { message: "Categoría no encontrada" });

  let query = db
    .from("error_codes")
    .select("id, error_code, model, slug_es, slug_en, metadata_seo, updated_at")
    .eq("category_id", category.id)
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

  return c.json(ok({ category, items }, { hasMore, nextCursor, limit }));
}

export async function listErrorsByCategoryAndBrand(c: Context) {
  const categorySlug = c.req.param("categorySlug");
  const brandSlug = c.req.param("brandSlug");
  const locale = resolveLocale(c.req.query("locale"));
  const cursor = c.req.query("cursor");
  const limit = Math.min(Number(c.req.query("limit") ?? 20), 100);

  const { data: brand, error: brandErr } = await db
    .from("brands")
    .select("id")
    .eq("slug", brandSlug)
    .single();

  if (brandErr || !brand) throw new HTTPException(404, { message: "Marca no encontrada" });

  const { data: category, error: catErr } = await db
    .from("categories")
    .select("id")
    .or(`slug_es.eq.${categorySlug},slug_en.eq.${categorySlug}`)
    .single();

  if (catErr || !category) throw new HTTPException(404, { message: "Categoría no encontrada" });

  let query = db
    .from("error_codes")
    .select("id, error_code, model, slug_es, slug_en, ai_content, updated_at")
    .eq("brand_id", brand.id)
    .eq("category_id", category.id)
    .eq("status", "published")
    .eq("is_indexable", true)
    .order("updated_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("updated_at", cursor);
  }

  const { data, error } = await query;
  if (error) throw new HTTPException(500, { message: error.message });

  const items = (data ?? []).slice(0, limit).map((row: any) => ({
    id: row.id,
    errorCode: row.error_code,
    model: row.model,
    slug: locale === "es" ? row.slug_es : row.slug_en,
    title: row.ai_content?.[locale]?.summary?.slice(0, 80) ?? null,
    updatedAt: row.updated_at,
  }));

  const hasMore = (data ?? []).length > limit;
  const nextCursor = hasMore ? items[items.length - 1]?.updatedAt : null;

  return c.json(ok({ items }, { hasMore, nextCursor, limit }));
}
