// =====================================================================
// src/controllers/admin/ingest.admin.controller.ts
// POST /v1/admin/ingest
// POST /v1/admin/ingest/bulk
// POST /v1/admin/ingest/:id/regenerate
// =====================================================================

import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import { supabase } from "../../lib/supabase.js";
import { ok } from "../../lib/response.js";
import { buildLocalizedAiContent } from "../../lib/ingest-payload.js";
import type { AiIngestionPayload, Locale } from "../../types/request-endpoints.types.js";

const db = supabase as any;

async function upsertPayload(payload: AiIngestionPayload): Promise<{ id: number; slug_es: string | null; slug_en: string | null; locales_generated: Locale[]; status: string }> {
  const { data: brand, error: brandErr } = await db
    .from("brands")
    .select("id")
    .eq("slug", payload.brandSlug)
    .single();

  if (brandErr || !brand) throw new HTTPException(422, { message: `Marca no encontrada: ${payload.brandSlug}` });

  const { data: category, error: catErr } = await db
    .from("categories")
    .select("id")
    .or(`slug_es.eq.${payload.categorySlug},slug_en.eq.${payload.categorySlug}`)
    .single();

  if (catErr || !category) throw new HTTPException(422, { message: `Categoría no encontrada: ${payload.categorySlug}` });

  const aiContent: Record<string, any> = {};
  const metadataSeo: Record<string, any> = {};
  const aiMetrics: Record<string, any> = {};

  for (const [locale, gen] of Object.entries(payload.generations)) {
    if (!gen) continue;
    aiContent[locale] = buildLocalizedAiContent(gen);
    metadataSeo[locale] = {
      title: gen.seo.title,
      meta_description: gen.seo.metaDescription,
      canonical_url: gen.seo.canonicalUrl,
      og: gen.seo.og,
      schema_types: gen.seo.schemaTypes,
      schema_json_ld: gen.seo.schemaJsonLd,
      robots: gen.seo.robots ?? "index, follow",
    };
    aiMetrics[locale] = {
      model_used: gen.metrics.modelUsed,
      prompt_version: gen.metrics.promptVersion,
      quality_score: gen.metrics.qualityScore,
      token_cost: gen.metrics.tokenCost,
      generated_at: gen.metrics.generatedAt,
      regenerated_count: 0,
    };
  }

  const upsertData: Record<string, any> = {
    brand_id: brand.id,
    category_id: category.id,
    error_code: payload.errorCode,
    model: payload.model,
    ai_content: aiContent,
    metadata_seo: metadataSeo,
    ai_metrics: aiMetrics,
  };

  if (payload.embedding) upsertData["embedding"] = payload.embedding;
  if (payload.requestPublish) {
    upsertData["status"] = "published";
    upsertData["is_indexable"] = true;
  }

  const { data, error } = await db
    .from("error_codes")
    .upsert(upsertData, { onConflict: "brand_id,category_id,error_code,model" })
    .select("id, slug_es, slug_en, locales_generated, status")
    .single();

  if (error) throw new HTTPException(500, { message: error.message });

  return data;
}

export async function ingestSingle(c: Context) {
  const payload = await c.req.json<AiIngestionPayload>();

  const result = await upsertPayload(payload);

  return c.json(ok({
    id: result.id,
    slugEs: result.slug_es,
    slugEn: result.slug_en,
    localesGenerated: result.locales_generated,
    status: result.status,
  }), 201);
}

export async function ingestBulk(c: Context) {
  const payloads = await c.req.json<AiIngestionPayload[]>();

  if (!Array.isArray(payloads) || payloads.length === 0) {
    throw new HTTPException(400, { message: "Se esperaba un array de payloads" });
  }

  let inserted = 0;
  let updated = 0;
  const failed: Array<{ index: number; error: string }> = [];

  for (let i = 0; i < payloads.length; i++) {
    try {
      const result = await upsertPayload(payloads[i]!);
      if (result) inserted++;
    } catch (err: any) {
      failed.push({ index: i, error: err?.message ?? "Error desconocido" });
    }
  }

  return c.json(ok({ inserted, updated, failed }), 201);
}

export async function regenerate(c: Context) {
  const id = Number(c.req.param("id"));
  const locale = (c.req.query("locale") === "en" ? "en" : "es") as Locale;

  const { data: row, error: findErr } = await db
    .from("error_codes")
    .select("id, ai_metrics")
    .eq("id", id)
    .single();

  if (findErr || !row) throw new HTTPException(404, { message: "Código de error no encontrado" });

  const metrics = (row.ai_metrics ?? {}) as Record<string, any>;
  const current = metrics[locale] ?? {};
  metrics[locale] = { ...current, regenerated_count: (current.regenerated_count ?? 0) + 1 };

  await db.from("error_codes").update({ ai_metrics: metrics, status: "draft" }).eq("id", id);

  return c.json(ok({ queued: true, id, locale }));
}
