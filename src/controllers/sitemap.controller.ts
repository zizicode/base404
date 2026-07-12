// =====================================================================
// src/controllers/sitemap.controller.ts
// GET /v1/sitemap-entries (legacy)
// GET /v1/sitemap/main
// GET /v1/sitemap/errors
// GET /v1/sitemap/brands
// GET /v1/sitemap/categories
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

function nowIso(): string {
  return new Date().toISOString();
}

// ------------------------------------------------------------------
// Legacy endpoint: GET /v1/sitemap-entries
// ------------------------------------------------------------------
export async function getSitemapEntries(c: Context) {
  const locale = resolveLocale(c.req.query("locale"));
  const cursor = c.req.query("cursor");
  const limit = Math.min(Number(c.req.query("limit") ?? 1000), 5000);

  let query = db
    .from("error_codes")
    .select(`${locale === "es" ? "slug_es" : "slug_en"}, updated_at`)
    .eq("status", "published")
    .eq("is_indexable", true)
    .not(locale === "es" ? "slug_es" : "slug_en", "is", null)
    .order("updated_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("updated_at", cursor);
  }

  const { data, error } = await query;
  if (error) throw new HTTPException(500, { message: error.message });

  const slugField = locale === "es" ? "slug_es" : "slug_en";
  const entries = (data ?? []).slice(0, limit).map((row: any) => ({
    slug: row[slugField],
    updatedAt: row.updated_at,
  }));

  const hasMore = (data ?? []).length > limit;
  const nextCursor = hasMore ? entries[entries.length - 1]?.updatedAt : null;

  return c.json(ok({ entries }, { hasMore, nextCursor, limit }));
}

// ------------------------------------------------------------------
// GET /v1/sitemap/main
// ------------------------------------------------------------------
export async function getSitemapMain(c: Context) {
  const locale = resolveLocale(c.req.query("locale"));
  const lastModified = nowIso();

  const routes = {
    es: [
      { slug: "", priority: 1.0, changeFrequency: "daily" },
      { slug: "buscar", priority: 0.5, changeFrequency: "weekly" },
      { slug: "marcas", priority: 0.8, changeFrequency: "weekly" },
      { slug: "categorias", priority: 0.8, changeFrequency: "weekly" },
    ],
    en: [
      { slug: "", priority: 1.0, changeFrequency: "daily" },
      { slug: "search", priority: 0.5, changeFrequency: "weekly" },
      { slug: "brands", priority: 0.8, changeFrequency: "weekly" },
      { slug: "categories", priority: 0.8, changeFrequency: "weekly" },
    ],
  } as const;

  const items = routes[locale].map((route) => ({
    ...route,
    lastModified,
    isReady: true,
  }));

  return c.json(ok({ items }));
}

// ------------------------------------------------------------------
// GET /v1/sitemap/errors
// ------------------------------------------------------------------
export async function getSitemapErrors(c: Context) {
  const locale = resolveLocale(c.req.query("locale"));
  const cursor = c.req.query("cursor");
  const limit = Math.min(Number(c.req.query("limit") ?? 100), 1000);
  const slugField = locale === "es" ? "slug_es" : "slug_en";

  let query = db
    .from("error_codes")
    .select(`id, ${slugField}, updated_at`)
    .eq("status", "published")
    .not(slugField, "is", null)
    .order("updated_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(limit + 1);

  if (cursor) {
    const [cursorValue, cursorId] = cursor.split("|");
    query = query.or(`updated_at.lt.${cursorValue},and(updated_at.eq.${cursorValue},id.gt.${cursorId})`);
  }

  const { data, error } = await query;
  if (error) throw new HTTPException(500, { message: error.message });

  const rows = (data ?? []).slice(0, limit);
  const items = rows.map((row: any) => ({
    slug: row[slugField],
    lastModified: row.updated_at,
    priority: 0.9,
    changeFrequency: "weekly" as const,
    isReady: true,
  }));

  const hasMore = (data ?? []).length > limit;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last ? `${last.lastModified}|${rows[rows.length - 1]?.id}` : null;

  return c.json(ok({ items }, { hasMore, nextCursor, limit }));
}

// ------------------------------------------------------------------
// GET /v1/sitemap/brands
// ------------------------------------------------------------------
export async function getSitemapBrands(c: Context) {
  const { data, error } = await db
    .from("brands")
    .select("slug, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new HTTPException(500, { message: error.message });

  const items = (data ?? []).map((row: any) => ({
    slug: row.slug,
    lastModified: row.created_at,
    priority: 0.7,
    changeFrequency: "weekly" as const,
    isReady: true,
  }));

  return c.json(ok({ items }));
}

// ------------------------------------------------------------------
// GET /v1/sitemap/categories
// ------------------------------------------------------------------
export async function getSitemapCategories(c: Context) {
  const locale = resolveLocale(c.req.query("locale"));
  const slugField = locale === "es" ? "slug_es" : "slug_en";

  const { data, error } = await db
    .from("categories")
    .select(`${slugField}, created_at`)
    .not(slugField, "is", null)
    .order("created_at", { ascending: false });

  if (error) throw new HTTPException(500, { message: error.message });

  const items = (data ?? []).map((row: any) => ({
    slug: row[slugField],
    lastModified: row.created_at,
    priority: 0.7,
    changeFrequency: "weekly" as const,
    isReady: true,
  }));

  return c.json(ok({ items }));
}
