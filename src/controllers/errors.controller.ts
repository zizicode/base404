// =====================================================================
// src/controllers/errors.controller.ts
// GET  /v1/errors            (públicos: popular | recent)
// GET  /v1/errors/:slug
// GET  /v1/errors/:slug/related
// POST /v1/errors/:slug/view
// POST /v1/errors/:slug/vote
// POST /v1/errors/:slug/report
// =====================================================================

import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import { supabase } from "../lib/supabase.js";
import { ok } from "../lib/response.js";
import type { Locale, HreflangAlternate } from "../types/request-endpoints.types.js";

const db = supabase as any;

function resolveLocale(raw: string | undefined): Locale {
  return raw === "en" ? "en" : "es";
}

export async function listPublicErrors(c: Context) {
  const locale = resolveLocale(c.req.query("locale"));
  const sort = c.req.query("sort") ?? "recent";
  const cursor = c.req.query("cursor");
  const limit = Math.min(Number(c.req.query("limit") ?? 20), 100);

  if (sort !== "recent" && sort !== "popular") {
    throw new HTTPException(400, { message: "sort debe ser 'recent' o 'popular'" });
  }

  let query = db
    .from("error_codes")
    .select("id, error_code, model, slug_es, slug_en, metadata_seo, updated_at, user_engagement")
    .eq("status", "published");

  if (sort === "popular") {
    // Ordena por vistas del locale solicitado (JSONB -> locale ->> views)
    query = query.order(`user_engagement->${locale}->>views`, { ascending: false, nullsFirst: false });
  } else {
    query = query.order("updated_at", { ascending: false });
  }

  if (cursor) {
    const [cursorValue, cursorId] = cursor.split("|");
    if (sort === "recent") {
      query = query.or(`updated_at.lt.${cursorValue},and(updated_at.eq.${cursorValue},id.lt.${cursorId})`);
    } else {
      const views = Number(cursorValue);
      query = query.or(`user_engagement->${locale}->>views.lt.${views},and(user_engagement->${locale}->>views.eq.${views},id.lt.${cursorId})`);
    }
  }

  const { data, error } = await query.limit(limit + 1);
  if (error) throw new HTTPException(500, { message: error.message });

  const items = (data ?? []).slice(0, limit).map((row: any) => {
    const seo = (row.metadata_seo ?? {}) as Record<string, any>;
    const seoLocale = seo[locale] ?? seo["es"] ?? {};
    const engagement = (row.user_engagement ?? {}) as Record<string, any>;
    const views = engagement[locale]?.views ?? 0;

    return {
      id: row.id,
      errorCode: row.error_code,
      model: row.model,
      slug: locale === "es" ? row.slug_es : row.slug_en,
      title: seoLocale.title ?? null,
      views,
      updatedAt: row.updated_at,
    };
  });

  const hasMore = (data ?? []).length > limit;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last
    ? sort === "recent"
      ? `${last.updatedAt}|${last.id}`
      : `${last.views}|${last.id}`
    : null;

  return c.json(ok({ items }, { hasMore, nextCursor, limit, sort }));
}

export async function getErrorBySlug(c: Context) {
  const slug = c.req.param("slug");
  const locale = resolveLocale(c.req.query("locale"));

  const { data: rows, error } = await db
    .from("error_codes")
    .select("*, brands(*), categories(*)")
    .or(`slug_es.eq.${slug},slug_en.eq.${slug}`)
    .eq("status", "published")
    .limit(1);

  if (error) throw new HTTPException(500, { message: error.message });
  if (!rows || rows.length === 0) throw new HTTPException(404, { message: "Código de error no encontrado" });

  const row = rows[0];
  const aiContent = row.ai_content?.[locale];
  const metaSeo = row.metadata_seo?.[locale];
  const engagement = row.user_engagement?.[locale];

  if (!aiContent || !metaSeo) {
    throw new HTTPException(404, { message: `Contenido en '${locale}' no disponible para este error` });
  }

  const hreflangAlternates: HreflangAlternate[] = (row.locales_generated ?? []).map((loc: Locale) => ({
    locale: loc,
    url: `/v1/errors/${loc === "es" ? row.slug_es : row.slug_en}?locale=${loc}`,
  }));

  const relatedSlugs: string[] = aiContent.related_error_slugs ?? [];
  let relatedErrors: any[] = [];

  if (relatedSlugs.length > 0) {
    const { data: related } = await db
      .from("error_codes")
      .select("slug_es, slug_en, error_code, ai_content, brands(name), categories(name_es, name_en)")
      .in(locale === "es" ? "slug_es" : "slug_en", relatedSlugs)
      .eq("status", "published")
      .limit(6);

    if (related) {
      relatedErrors = related.map((r: any) => ({
        slug: (locale === "es" ? r.slug_es : r.slug_en) ?? "",
        errorCode: r.error_code,
        title: r.ai_content?.[locale]?.summary?.slice(0, 80) ?? null,
        brandName: r.brands?.name ?? "",
        categoryName: locale === "es" ? (r.categories?.name_es ?? "") : (r.categories?.name_en ?? ""),
      }));
    }
  }

  return c.json(ok({
    id: row.id,
    slug,
    locale,
    errorCode: row.error_code,
    model: row.model ?? null,
    brand: {
      name: row.brands.name,
      slug: row.brands.slug,
      logoUrl: row.brands.logo_url ?? null,
    },
    category: {
      name: locale === "es" ? row.categories.name_es : row.categories.name_en,
      slug: locale === "es" ? row.categories.slug_es : row.categories.slug_en,
    },
    seo: {
      title: metaSeo.title,
      metaDescription: metaSeo.meta_description,
      canonicalUrl: metaSeo.canonical_url,
      og: metaSeo.og,
      schemaJsonLd: metaSeo.schema_json_ld,
      robots: metaSeo.robots,
    },
    hreflangAlternates,
    content: {
      summary: aiContent.summary,
      markdownSolutions: aiContent.markdown_solutions,
      causes: aiContent.causes ?? [],
      stepsHowTo: (aiContent.steps_howto ?? []).map((s: any) => ({
        step: s.step,
        title: s.title,
        description: s.description,
        imageUrl: s.image_url ?? null,
      })),
      faqs: aiContent.faqs ?? [],
      videos: [],
    },
    hasVideo: false,
    engagement: {
      views: engagement?.views ?? 0,
      helpfulVotes: engagement?.helpful_votes ?? 0,
      unhelpfulVotes: engagement?.unhelpful_votes ?? 0,
    },
    relatedErrors,
    isIndexable: row.is_indexable,
    status: row.status,
    updatedAt: row.updated_at,
  }));
}

export async function getRelatedErrors(c: Context) {
  const slug = c.req.param("slug");
  const locale = resolveLocale(c.req.query("locale"));
  const limit = Math.min(Number(c.req.query("limit") ?? 6), 12);

  const { data: base, error: baseErr } = await db
    .from("error_codes")
    .select("ai_content")
    .or(`slug_es.eq.${slug},slug_en.eq.${slug}`)
    .single();

  if (baseErr || !base) throw new HTTPException(404, { message: "Código de error no encontrado" });

  const relatedSlugs: string[] = base.ai_content?.[locale]?.related_error_slugs ?? [];

  if (relatedSlugs.length === 0) return c.json(ok({ related: [] }));

  const { data: related, error } = await db
    .from("error_codes")
    .select("slug_es, slug_en, error_code, ai_content, brands(name), categories(name_es, name_en)")
    .in(locale === "es" ? "slug_es" : "slug_en", relatedSlugs)
    .eq("status", "published")
    .limit(limit);

  if (error) throw new HTTPException(500, { message: error.message });

  const items = (related ?? []).map((r: any) => ({
    slug: (locale === "es" ? r.slug_es : r.slug_en) ?? "",
    errorCode: r.error_code,
    title: r.ai_content?.[locale]?.summary?.slice(0, 80) ?? null,
    brandName: r.brands?.name ?? "",
    categoryName: locale === "es" ? (r.categories?.name_es ?? "") : (r.categories?.name_en ?? ""),
  }));

  return c.json(ok({ related: items }));
}

export async function trackView(c: Context) {
  const slug = c.req.param("slug");
  const locale = resolveLocale(c.req.query("locale"));

  const { data: row, error: findErr } = await db
    .from("error_codes")
    .select("id, user_engagement")
    .or(`slug_es.eq.${slug},slug_en.eq.${slug}`)
    .single();

  if (findErr || !row) throw new HTTPException(404, { message: "Código de error no encontrado" });

  const engagement = (row.user_engagement ?? {}) as Record<string, any>;
  const current = engagement[locale] ?? { views: 0, helpful_votes: 0, unhelpful_votes: 0, report_count: 0 };
  engagement[locale] = { ...current, views: current.views + 1, last_viewed_at: new Date().toISOString() };

  await db.from("error_codes").update({ user_engagement: engagement }).eq("id", row.id);

  return c.json(ok({ tracked: true }));
}

export async function castVote(c: Context) {
  const slug = c.req.param("slug");
  const body = await c.req.json<{ locale?: string; helpful?: boolean }>();
  const locale = resolveLocale(body.locale);
  const helpful = body.helpful !== false;

  const { data: row, error: findErr } = await db
    .from("error_codes")
    .select("id, user_engagement")
    .or(`slug_es.eq.${slug},slug_en.eq.${slug}`)
    .single();

  if (findErr || !row) throw new HTTPException(404, { message: "Código de error no encontrado" });

  const engagement = (row.user_engagement ?? {}) as Record<string, any>;
  const current = engagement[locale] ?? { views: 0, helpful_votes: 0, unhelpful_votes: 0, report_count: 0 };

  engagement[locale] = {
    ...current,
    helpful_votes: helpful ? current.helpful_votes + 1 : current.helpful_votes,
    unhelpful_votes: !helpful ? current.unhelpful_votes + 1 : current.unhelpful_votes,
  };

  await db.from("error_codes").update({ user_engagement: engagement }).eq("id", row.id);

  return c.json(ok({ voted: true, helpful }));
}

export async function reportError(c: Context) {
  const slug = c.req.param("slug");
  const body = await c.req.json<{ locale?: string; reason?: string }>().catch(() => ({}));
  const locale = resolveLocale((body as any).locale);

  const { data: row, error: findErr } = await db
    .from("error_codes")
    .select("id, user_engagement")
    .or(`slug_es.eq.${slug},slug_en.eq.${slug}`)
    .single();

  if (findErr || !row) throw new HTTPException(404, { message: "Código de error no encontrado" });

  const engagement = (row.user_engagement ?? {}) as Record<string, any>;
  const current = engagement[locale] ?? { views: 0, helpful_votes: 0, unhelpful_votes: 0, report_count: 0 };
  engagement[locale] = { ...current, report_count: current.report_count + 1 };

  const update: Record<string, any> = { user_engagement: engagement };
  if (current.report_count + 1 >= 5) update["status"] = "flagged";

  await db.from("error_codes").update(update).eq("id", row.id);

  return c.json(ok({ reported: true }));
}
