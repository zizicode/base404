// =====================================================================
// src/controllers/admin/catalog.admin.controller.ts
// Brands CRUD: GET/POST /v1/admin/brands  PATCH/DELETE /v1/admin/brands/:id
// Categories CRUD: GET/POST /v1/admin/categories  PATCH/DELETE /v1/admin/categories/:id
// =====================================================================

import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import { supabase } from "../../lib/supabase.js";
import { ok } from "../../lib/response.js";

const db = supabase as any;

// ---- Brands ----

export async function adminListBrands(c: Context) {
  const { data, error } = await db.from("brands").select("*").order("name");
  if (error) throw new HTTPException(500, { message: error.message });
  return c.json(ok({ brands: data ?? [] }));
}

export async function adminCreateBrand(c: Context) {
  const body = await c.req.json<{ name: string; slug: string; logo_url?: string | null }>();
  const { data, error } = await db.from("brands").insert(body).select().single();
  if (error) throw new HTTPException(500, { message: error.message });
  return c.json(ok({ brand: data }), 201);
}

export async function adminPatchBrand(c: Context) {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<Record<string, unknown>>();
  const { data, error } = await db.from("brands").update(body).eq("id", id).select().single();
  if (error) throw new HTTPException(500, { message: error.message });
  return c.json(ok({ brand: data }));
}

export async function adminDeleteBrand(c: Context) {
  const id = Number(c.req.param("id"));
  const { error } = await db.from("brands").delete().eq("id", id);
  if (error) throw new HTTPException(500, { message: error.message });
  return c.json(ok({ deleted: true, id }));
}

// ---- Categories ----

export async function adminListCategories(c: Context) {
  const { data, error } = await db.from("categories").select("*").order("name_es");
  if (error) throw new HTTPException(500, { message: error.message });
  return c.json(ok({ categories: data ?? [] }));
}

export async function adminCreateCategory(c: Context) {
  const body = await c.req.json<{
    name_es: string;
    name_en: string;
    slug_es: string;
    slug_en: string;
    device_type?: string | null;
    icon?: string | null;
    brand_id?: number | null;
  }>();
  const { data, error } = await db.from("categories").insert(body).select().single();
  if (error) throw new HTTPException(500, { message: error.message });
  return c.json(ok({ category: data }), 201);
}

export async function adminPatchCategory(c: Context) {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<Record<string, unknown>>();
  const { data, error } = await db.from("categories").update(body).eq("id", id).select().single();
  if (error) throw new HTTPException(500, { message: error.message });
  return c.json(ok({ category: data }));
}

export async function adminDeleteCategory(c: Context) {
  const id = Number(c.req.param("id"));
  const { error } = await db.from("categories").delete().eq("id", id);
  if (error) throw new HTTPException(500, { message: error.message });
  return c.json(ok({ deleted: true, id }));
}
