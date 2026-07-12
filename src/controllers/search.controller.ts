// =====================================================================
// src/controllers/search.controller.ts
// GET /v1/search  — búsqueda principal por niveles: errores > marcas > categorías
// GET /v1/search/suggest — autocomplete liviano
// =====================================================================

import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import { supabase } from "../lib/supabase.js";
import { ok } from "../lib/response.js";
import type { Locale, SearchResultItem } from "../types/request-endpoints.types.js";
import type { SearchErrorsRpcRow } from "../types/database.types.js";

const db = supabase as any;

function resolveLocale(raw: string | undefined): Locale {
  return raw === "en" ? "en" : "es";
}

async function searchByErrorCode(q: string, locale: Locale, limit: number) {
  const cleanQ = q.replace(/[-\s]/g, "");
  const patterns = [q, cleanQ].filter((p, i, arr) => arr.indexOf(p) === i);
  const conditions = patterns.map((p) => `error_code.ilike.%${p}%`).join(",");

  const { data, error } = await db
    .from("error_codes")
    .select(`
      id,
      error_code,
      model,
      slug_es,
      slug_en,
      metadata_seo,
      brands:brand_id ( name, slug ),
      categories:category_id ( name_es, name_en, slug_es, slug_en )
    `)
    .or(conditions)
    .limit(limit);

  if (error || !data) {
    console.error("[searchByErrorCode]", error);
    return [];
  }

  return (data as any[]).map((row) => {
    const brand = row.brands as { name: string; slug: string } | null;
    const category = row.categories as { name_es: string; name_en: string; slug_es: string; slug_en: string } | null;
    const seo = (row.metadata_seo ?? {}) as Record<string, any>;
    const seoLocale = seo[locale] ?? seo["es"] ?? {};
    const slug = locale === "en" ? row.slug_en : row.slug_es;

    return {
      id: row.id,
      slug: slug ?? row.slug_es ?? row.slug_en ?? "",
      errorCode: row.error_code,
      model: row.model,
      brandName: brand?.name ?? "",
      categoryName: (locale === "en" ? category?.name_en : category?.name_es) ?? "",
      title: seoLocale.title ?? "",
      similarity: 1,
    };
  });
}

async function searchBrands(q: string, limit: number) {
  const pattern = `%${q}%`;
  const { data, error } = await db
    .from("brands")
    .select("id, name, slug, logo_url")
    .or(`name.ilike.${pattern},slug.ilike.${pattern}`)
    .order("name")
    .limit(limit);

  if (error || !data) {
    console.error("[searchBrands]", error);
    return [];
  }

  return (data as any[]).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logo_url,
  }));
}

async function searchCategories(q: string, locale: Locale, limit: number) {
  const pattern = `%${q}%`;
  const nameField = locale === "en" ? "name_en" : "name_es";
  const slugField = locale === "en" ? "slug_en" : "slug_es";

  const { data, error } = await db
    .from("categories")
    .select("id, name_es, name_en, slug_es, slug_en, device_type, icon")
    .or(`${nameField}.ilike.${pattern},${slugField}.ilike.${pattern},name_es.ilike.${pattern},name_en.ilike.${pattern},slug_es.ilike.${pattern},slug_en.ilike.${pattern}`)
    .order(nameField)
    .limit(limit);

  if (error || !data) {
    console.error("[searchCategories]", error);
    return [];
  }

  return (data as any[]).map((row) => ({
    id: row.id,
    name: locale === "en" ? row.name_en : row.name_es,
    slug: locale === "en" ? row.slug_en : row.slug_es,
    deviceType: row.device_type,
    icon: row.icon,
  }));
}

async function searchByCatalog(
  q: string | undefined,
  brandSlug: string | undefined,
  categorySlug: string | undefined,
  locale: Locale,
  limit: number,
) {
  let query = db
    .from("error_codes")
    .select(`
      id,
      error_code,
      model,
      slug_es,
      slug_en,
      metadata_seo,
      status,
      brands:brand_id ( name, slug ),
      categories:category_id ( name_es, name_en, slug_es, slug_en )
    `);

  if (brandSlug) {
    query = query.eq("brands.slug", brandSlug);
  }

  if (categorySlug) {
    query = query.or(`categories.slug_es.eq.${categorySlug},categories.slug_en.eq.${categorySlug}`);
  }

  if (q && q.trim().length >= 2) {
    const cleanQ = q.replace(/[-\s]/g, "");
    const patterns = [q, cleanQ].filter((p, i, arr) => arr.indexOf(p) === i);
    const conditions = patterns.map((p) => `error_code.ilike.%${p}%`).join(",");
    query = query.or(conditions);
  }

  const { data, error } = await query.limit(limit);

  if (error || !data) {
    console.error("[searchByCatalog]", error);
    return [];
  }

  return (data as any[]).map((row) => {
    const brand = row.brands as { name: string; slug: string } | null;
    const category = row.categories as { name_es: string; name_en: string; slug_es: string; slug_en: string } | null;
    const seo = (row.metadata_seo ?? {}) as Record<string, any>;
    const seoLocale = seo[locale] ?? seo["es"] ?? {};
    const slug = locale === "en" ? row.slug_en : row.slug_es;

    return {
      id: row.id,
      slug: slug ?? row.slug_es ?? row.slug_en ?? "",
      errorCode: row.error_code,
      model: row.model,
      brandName: brand?.name ?? "",
      categoryName: (locale === "en" ? category?.name_en : category?.name_es) ?? "",
      title: seoLocale.title ?? "",
      similarity: 1,
    };
  });
}

export async function searchErrors(c: Context) {
  const qRaw = c.req.query("q");
  const q = qRaw && qRaw.trim().length >= 2 ? qRaw.trim() : undefined;
  const locale = resolveLocale(c.req.query("locale"));
  const limit = Math.min(Number(c.req.query("limit") ?? 20), 50);
  const catalogLimit = Math.min(Number(c.req.query("catalogLimit") ?? 6), 20);
  const brandSlug = c.req.query("brand")?.trim();
  const categorySlug = c.req.query("category")?.trim();

  if (!q && !brandSlug && !categorySlug) {
    throw new HTTPException(400, { message: "Se requiere al menos 'q', 'brand' o 'category'" });
  }

  const startedAt = Date.now();
  let errors: SearchResultItem[] = [];

  if (brandSlug || categorySlug) {
    // Búsqueda filtrada por marca/categoría (con o sin q)
    errors = await searchByCatalog(q, brandSlug, categorySlug, locale, limit);
  }

  if (q && errors.length < limit) {
    // 1) Errores por código exacto
    const codeMatches = await searchByErrorCode(q, locale, limit);

    // 2) Errores por contenido vía RPC
    const { data, error } = await supabase.rpc("search_errors", {
      p_query: q,
      p_locale: locale,
      p_limit: limit,
    } as unknown as undefined);

    if (error) throw new HTTPException(500, { message: error.message });

    const rpcRows = (data as unknown as SearchErrorsRpcRow[] ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      errorCode: row.error_code,
      model: row.model,
      brandName: row.brand_name,
      categoryName: row.category_name,
      title: row.title,
      similarity: row.similarity,
    }));

    // Merge y deduplicar
    const seenErrors = new Set<number>(errors.map((e) => e.id));
    for (const row of [...codeMatches, ...rpcRows]) {
      if (!seenErrors.has(row.id)) {
        seenErrors.add(row.id);
        errors.push(row);
      }
    }
  }

  // Marcas y categorías en paralelo (solo cuando hay q)
  const [brands, categories] = await Promise.all([
    q ? searchBrands(q, catalogLimit) : [],
    q ? searchCategories(q, locale, catalogLimit) : [],
  ]);

  return c.json(ok({
    query: q ?? "",
    locale,
    errors: errors.slice(0, limit),
    brands,
    categories,
    tookMs: Date.now() - startedAt,
  }));
}

export async function suggestErrors(c: Context) {
  const q = c.req.query("q");
  const locale = resolveLocale(c.req.query("locale"));

  if (!q || q.trim().length < 2) {
    throw new HTTPException(400, { message: "El parámetro 'q' es requerido (mínimo 2 caracteres)" });
  }

  const startedAt = Date.now();

  const { data, error } = await supabase.rpc("search_errors", {
    p_query: q,
    p_locale: locale,
    p_limit: 8,
  } as unknown as undefined);

  if (error) throw new HTTPException(500, { message: error.message });

  const suggestRows = data as unknown as SearchErrorsRpcRow[];
  const results = (suggestRows ?? []).map((row) => ({
    slug: row.slug,
    errorCode: row.error_code,
    title: row.title,
    brandName: row.brand_name,
  }));

  return c.json(ok({ query: q, locale, results, tookMs: Date.now() - startedAt }));
}
