// =====================================================================
// src/controllers/admin/stats.admin.controller.ts
// GET /v1/admin/stats/overview
// GET /v1/admin/stats/missing-translations
// =====================================================================

import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import { supabase } from "../../lib/supabase.js";
import { ok } from "../../lib/response.js";

const db = supabase as any;

export async function statsOverview(c: Context) {
  const { data: byStatus, error: statusErr } = await db
    .from("error_codes")
    .select("status, is_indexable")
    .order("status");

  if (statusErr) throw new HTTPException(500, { message: statusErr.message });

  const counts: Record<string, number> = {};
  let indexable = 0;
  for (const row of byStatus ?? []) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
    if (row.is_indexable) indexable++;
  }

  const total = (byStatus ?? []).length;

  return c.json(ok({
    total,
    indexable,
    byStatus: counts,
    publishedPct: total > 0 ? Math.round(((counts["published"] ?? 0) / total) * 100) : 0,
  }));
}

export async function statsMissingTranslations(c: Context) {
  const locale = c.req.query("locale") === "en" ? "en" : "es";
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);

  const { data, error } = await db.rpc("admin_dashboard_errors", {
    p_min_quality: null,
    p_only_unindexed: false,
    p_status: null,
    p_missing_locale: locale,
    p_limit: limit,
    p_offset: 0,
  });

  if (error) throw new HTTPException(500, { message: error.message });

  const rows = (data ?? []).map((r: any) => ({
    id: r.id,
    errorCode: r.error_code,
    slugEs: r.slug_es,
    slugEn: r.slug_en,
    status: r.status,
    localesGenerated: r.locales_generated,
    updatedAt: r.updated_at,
  }));

  return c.json(ok({ missingLocale: locale, rows }, { limit }));
}
