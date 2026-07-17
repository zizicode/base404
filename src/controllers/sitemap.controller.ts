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
import { env } from "../config/env.js";
import type { Locale } from "../types/request-endpoints.types.js";

const db = supabase as any;

function baseUrl(): string {
  return env.publicSiteUrl;
}

function resolveLocale(raw: string | undefined): Locale {
  return raw === "en" ? "en" : "es";
}

function nowIso(): string {
  return new Date().toISOString();
}

function buildLoc(path: string): string {
  const prefix = baseUrl();
  return path.startsWith("/") ? `${prefix}${path}` : `${prefix}/${path}`;
}

interface SitemapUrl {
  loc: string;
  lastModified?: string;
  changeFrequency?: string;
  priority?: number;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildUrlsetXml(urls: SitemapUrl[]): string {
  const urlTags = urls
    .map((url) => {
      const lastmod = url.lastModified ? `\n    <lastmod>${escapeXml(url.lastModified)}</lastmod>` : "";
      const changefreq = url.changeFrequency ? `\n    <changefreq>${escapeXml(url.changeFrequency)}</changefreq>` : "";
      const priority = url.priority !== undefined ? `\n    <priority>${url.priority.toFixed(1)}</priority>` : "";
      return `  <url>\n    <loc>${escapeXml(url.loc)}</loc>${lastmod}${changefreq}${priority}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlTags}\n</urlset>`;
}

function xmlResponse(c: Context, xml: string, extraHeaders?: Record<string, string>) {
  return c.text(xml, 200, {
    "Content-Type": "application/xml; charset=utf-8",
    ...extraHeaders,
  });
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
  const rows = (data ?? []).slice(0, limit);
  const urls = rows.map((row: any) => ({
    loc: buildLoc(`${locale}/error/${row[slugField]}`),
    lastModified: row.updated_at,
  }));

  const hasMore = (data ?? []).length > limit;
  const nextCursor = hasMore ? urls[urls.length - 1]?.lastModified : null;

  return xmlResponse(c, buildUrlsetXml(urls), {
    "X-Sitemap-Has-More": String(hasMore),
    ...(nextCursor ? { "X-Sitemap-Next-Cursor": nextCursor } : {}),
  });
}

// ------------------------------------------------------------------
// GET /v1/sitemap/main?locale=es|en|all
// ------------------------------------------------------------------
export async function getSitemapMain(c: Context) {
  const rawLocale = c.req.query("locale");
  const requestedLocales: Locale[] = rawLocale === "all" ? ["es", "en"] : [resolveLocale(rawLocale)];
  const lastModified = nowIso();

  const routes: Record<Locale, Array<{ path: string; priority: number; changeFrequency: "daily" | "weekly" }>> = {
    es: [
      { path: "es", priority: 1.0, changeFrequency: "daily" },
      { path: "es/marcas", priority: 0.8, changeFrequency: "weekly" },
      { path: "es/categorias", priority: 0.8, changeFrequency: "weekly" },
    ],
    en: [
      { path: "en", priority: 1.0, changeFrequency: "daily" },
      { path: "en/marcas", priority: 0.8, changeFrequency: "weekly" },
      { path: "en/categorias", priority: 0.8, changeFrequency: "weekly" },
    ],
  };

  const urls = requestedLocales.flatMap((locale) =>
    routes[locale].map((route) => ({
      loc: buildLoc(route.path),
      lastModified,
      priority: route.priority,
      changeFrequency: route.changeFrequency,
    }))
  );

  return xmlResponse(c, buildUrlsetXml(urls));
}

// ------------------------------------------------------------------
// GET /v1/sitemap/errors?locale=es|en&limit=5000
// ------------------------------------------------------------------
export async function getSitemapErrors(c: Context) {
  const locale = resolveLocale(c.req.query("locale"));
  const cursor = c.req.query("cursor");
  const limit = Math.min(Number(c.req.query("limit") ?? 5000), 5000);
  const slugField = locale === "es" ? "slug_es" : "slug_en";

  let query = db
    .from("error_codes")
    .select(`id, ${slugField}, updated_at`)
    .eq("status", "published")
    .eq("is_indexable", true)
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
  const urls = rows.map((row: any) => ({
    loc: buildLoc(`${locale}/error/${row[slugField]}`),
    lastModified: row.updated_at,
    priority: 0.9,
    changeFrequency: "weekly" as const,
  }));

  const hasMore = (data ?? []).length > limit;
  const last = urls[urls.length - 1];
  const nextCursor = hasMore && last ? `${last.lastModified}|${rows[rows.length - 1]?.id}` : null;

  return xmlResponse(c, buildUrlsetXml(urls), {
    "X-Sitemap-Has-More": String(hasMore),
    ...(nextCursor ? { "X-Sitemap-Next-Cursor": nextCursor } : {}),
  });
}

// ------------------------------------------------------------------
// GET /v1/sitemap/brands?locale=es|en
// ------------------------------------------------------------------
export async function getSitemapBrands(c: Context) {
  const locale = resolveLocale(c.req.query("locale"));

  const { data, error } = await db
    .from("brands")
    .select("slug, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new HTTPException(500, { message: error.message });

  const urls = (data ?? []).map((row: any) => ({
    loc: buildLoc(`${locale}/marcas/${row.slug}`),
    lastModified: row.created_at,
    priority: 0.7,
    changeFrequency: "weekly" as const,
  }));

  return xmlResponse(c, buildUrlsetXml(urls));
}

// ------------------------------------------------------------------
// GET /v1/sitemap/categories?locale=es|en
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

  const urls = (data ?? []).map((row: any) => ({
    loc: buildLoc(`${locale}/categorias/${row[slugField]}`),
    lastModified: row.created_at,
    priority: 0.7,
    changeFrequency: "weekly" as const,
  }));

  return xmlResponse(c, buildUrlsetXml(urls));
}
