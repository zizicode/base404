// =====================================================================
// src/lib/supabase.ts
// Cliente único de Supabase para el backend. Usa la SERVICE ROLE KEY
// (nunca la anon key aquí) porque este proceso corre server-side y
// necesita bypassear RLS para escribir (ingesta de IA, dashboard admin).
// =====================================================================

import { createClient } from "@supabase/supabase-js";

import { env } from "../config/env.js";
import type { Database } from "../types/database.types.js";

export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  db: {
    schema: "public",
  },
});
