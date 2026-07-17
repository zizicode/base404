// =====================================================================
// src/controllers/admin/errors.admin.controller.ts
// GET    /v1/admin/errors
// GET    /v1/admin/errors/:id
// PATCH  /v1/admin/errors/:id
// POST   /v1/admin/errors/:id/publish
// POST   /v1/admin/errors/:id/archive
// POST   /v1/admin/errors/:id/flag
// DELETE /v1/admin/errors/:id
// =====================================================================

import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import { supabase } from "../../lib/supabase.js";
import { ok } from "../../lib/response.js";
import type { AdminDashboardRequest } from "../../types/request-endpoints.types.js";

const db = supabase as any;

export async function listAdminErrors(c: Context) {
  const params: AdminDashboardRequest = {
    minQualityScore: c.req.query("min_quality") ? Number(c.req.query("min_quality")) : undefined,
    onlyUnindexed: c.req.query("only_unindexed") === "true" ? true : undefined,
    status: (c.req.query("status") as AdminDashboardRequest["status"]) ?? undefined,
    missingLocale: (c.req.query("missing_locale") as AdminDashboardRequest["missingLocale"]) ?? undefined,
    hasVideo: c.req.query("has_video") === "true" ? true : c.req.query("has_video") === "false" ? false : undefined,
    limit: Math.min(Number(c.req.query("limit") ?? 50), 200),
    offset: Number(c.req.query("offset") ?? 0),
  };

  const { data, error } = await db.rpc("admin_dashboard_errors", {
    p_min_quality: params.minQualityScore ?? null,
    p_only_unindexed: params.onlyUnindexed ?? false,
    p_status: params.status ?? null,
    p_missing_locale: params.missingLocale ?? null,
    p_has_video: params.hasVideo ?? null,
    p_limit: params.limit,
    p_offset: params.offset,
  });

  if (error) throw new HTTPException(500, { message: error.message });

  const rows = (data ?? []).map((r: any) => ({
    id: r.id,
    slugEs: r.slug_es,
    slugEn: r.slug_en,
    errorCode: r.error_code,
    model: r.model,
    status: r.status,
    qualityScoreEs: r.quality_score_es,
    qualityScoreEn: r.quality_score_en,
    localesGenerated: r.locales_generated,
    isIndexable: r.is_indexable,
    viewsEs: r.views_es,
    viewsEn: r.views_en,
    updatedAt: r.updated_at,
  }));

  return c.json(ok({ rows }, { limit: params.limit!, offset: params.offset! }));
}

export async function getAdminErrorById(c: Context) {
  const id = Number(c.req.param("id"));

  const { data, error } = await db
    .from("error_codes")
    .select("*, brands(*), categories(*)")
    .eq("id", id)
    .single();

  if (error || !data) throw new HTTPException(404, { message: "Código de error no encontrado" });

  return c.json(ok({ error: data }));
}

export async function patchAdminError(c: Context) {
  const id = Number(c.req.param("id"));

  let body: Record<string, unknown>;
  try {
    body = await c.req.json<Record<string, unknown>>();
  } catch (err) {
    throw new HTTPException(400, { message: "Cuerpo de la petición no es JSON válido" });
  }

  const { data, error } = await db
    .from("error_codes")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new HTTPException(500, { message: error.message });

  return c.json(ok({ error: data }));
}

export async function publishError(c: Context) {
  const id = Number(c.req.param("id"));

  const { data, error } = await db
    .from("error_codes")
    .update({ status: "published", is_indexable: true })
    .eq("id", id)
    .select("id, status")
    .single();

  if (error) throw new HTTPException(500, { message: error.message });

  return c.json(ok(data));
}

export async function archiveError(c: Context) {
  const id = Number(c.req.param("id"));

  const { data, error } = await db
    .from("error_codes")
    .update({ status: "archived", is_indexable: false })
    .eq("id", id)
    .select("id, status")
    .single();

  if (error) throw new HTTPException(500, { message: error.message });

  return c.json(ok(data));
}

export async function flagError(c: Context) {
  const id = Number(c.req.param("id"));

  const { data, error } = await db
    .from("error_codes")
    .update({ status: "flagged" })
    .eq("id", id)
    .select("id, status")
    .single();

  if (error) throw new HTTPException(500, { message: error.message });

  return c.json(ok(data));
}

export async function deleteError(c: Context) {
  const id = Number(c.req.param("id"));

  const { error } = await db.from("error_codes").delete().eq("id", id);

  if (error) throw new HTTPException(500, { message: error.message });

  return c.json(ok({ deleted: true, id }));
}
