// =====================================================================
// database.types.ts (v2 — bilingüe ES/EN)
// Mapeo estricto del esquema Postgres/Supabase definido en seed.sql.
// Cada JSONB de contenido ahora es un Record<Locale, T> parcial, y
// `categories` gana slug_es/slug_en/name_es/name_en.
// =====================================================================

export type Locale = "es" | "en";

/** Objeto locale-aware genérico: puede tener "es", "en", ambos, o ninguno
 *  (fila recién creada aún sin contenido generado). */
export type LocalizedRecord<T> = Partial<Record<Locale, T>>;

// ---------------------------------------------------------------------
// 1. FORMAS INTERNAS POR LOCALE (dentro de cada JSONB)
// ---------------------------------------------------------------------

export interface MetadataSeoLocalized {
  title: string;
  meta_description: string;
  canonical_url: string;
  og: {
    title: string;
    description: string;
    image: string;
  };
  schema_types: Array<"TechArticle" | "FAQPage" | "HowTo" | "Product" | "VideoObject">;
  schema_json_ld: Record<string, unknown>;
  robots: string;
}

/** metadata_seo completo tal como se guarda en la columna: { "es"?: {...}, "en"?: {...} } */
export type MetadataSeo = LocalizedRecord<MetadataSeoLocalized>;

export interface AiContentStep {
  step: number;
  title: string;
  description: string;
  image_url: string | null;
}

export interface AiContentFaq {
  question: string;
  answer: string;
}

export interface AiContentVideo {
  title: string;
  /** Solo el ID del video de YouTube (ej: "dQw4w9WgXcQ"), no la URL completa.
   *  El frontend construye el embed: https://www.youtube.com/embed/{youtube_id} */
  youtube_id: string;
  /** Idioma HABLADO del video (código ISO 639-1: "es","en","ko",...).
   *  INDEPENDIENTE del locale contenedor: un artículo "es" puede embeber
   *  el único video disponible, que esté en "en". */
  language: string;
}

export interface AiContentLocalized {
  summary: string;
  markdown_solutions: string;
  causes: string[];
  steps_howto: AiContentStep[];
  faqs: AiContentFaq[];
  /** slugs relacionados EN EL MISMO IDIOMA (related_error_slugs de "en" apunta a slug_en de otras filas) */
  related_error_slugs: string[];
  videos: AiContentVideo[];
}

export type AiContent = LocalizedRecord<AiContentLocalized>;

export interface AiMetricsLocalized {
  model_used: string;
  prompt_version: string;
  /** 0-100 */
  quality_score: number;
  token_cost: number;
  generated_at: string; // ISO 8601
  regenerated_count: number;
}

export type AiMetrics = LocalizedRecord<AiMetricsLocalized>;

export interface UserEngagementLocalized {
  views: number;
  helpful_votes: number;
  unhelpful_votes: number;
  report_count: number;
  last_viewed_at?: string;
}

export type UserEngagement = LocalizedRecord<UserEngagementLocalized>;

// ---------------------------------------------------------------------
// 2. STATUS ENUM
// ---------------------------------------------------------------------

export type ErrorCodeStatus = "draft" | "published" | "archived" | "flagged";

// ---------------------------------------------------------------------
// 3. FILAS DE TABLA (Row / Insert / Update)
// ---------------------------------------------------------------------

export interface BrandRow {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
}

export type BrandInsert = Omit<BrandRow, "id" | "created_at"> &
  Partial<Pick<BrandRow, "id" | "created_at">>;
export type BrandUpdate = Partial<BrandInsert>;

export interface CategoryRow {
  id: number;
  name_es: string;
  name_en: string;
  slug_es: string;
  slug_en: string;
  device_type: string | null;
  icon: string | null;
  created_at: string;
}

export type CategoryInsert = Omit<CategoryRow, "id" | "created_at"> &
  Partial<Pick<CategoryRow, "id" | "created_at">>;
export type CategoryUpdate = Partial<CategoryInsert>;

export interface ErrorCodeRow {
  id: number;
  brand_id: number;
  category_id: number;
  error_code: string;
  model: string | null;

  /** Nullable de forma independiente: una fila puede tener solo "es" o solo "en" */
  slug_es: string | null;
  slug_en: string | null;

  /** Mantenido por trigger a partir de las claves presentes en ai_content */
  locales_generated: Locale[];

  /** Mantenido por trigger: true si algún locale trae al menos 1 video */
  has_video: boolean;

  status: ErrorCodeStatus;
  is_indexable: boolean;

  metadata_seo: MetadataSeo;
  ai_content: AiContent;
  ai_metrics: AiMetrics;
  user_engagement: UserEngagement;

  embedding: number[] | null;

  created_at: string;
  updated_at: string;
}

/**
 * Insert: slug_es/slug_en se autogeneran vía trigger si se omiten (siempre
 * que ai_content traiga la clave "es"/"en" correspondiente). locales_generated
 * también es autogenerado — no debe enviarse manualmente.
 */
export type ErrorCodeInsert = Omit<
  ErrorCodeRow,
  | "id"
  | "slug_es"
  | "slug_en"
  | "locales_generated"
  | "has_video"
  | "status"
  | "is_indexable"
  | "metadata_seo"
  | "ai_content"
  | "ai_metrics"
  | "user_engagement"
  | "embedding"
  | "created_at"
  | "updated_at"
> &
  Partial<{
    id: number;
    slug_es: string | null;
    slug_en: string | null;
    has_video: boolean;
    status: ErrorCodeStatus;
    is_indexable: boolean;
    metadata_seo: MetadataSeo;
    ai_content: AiContent;
    ai_metrics: AiMetrics;
    user_engagement: UserEngagement;
    embedding: number[] | null;
    created_at: string;
    updated_at: string;
  }>;

export type ErrorCodeUpdate = Partial<ErrorCodeInsert>;

// ---------------------------------------------------------------------
// 4. TIPOS DE RETORNO DE LAS FUNCIONES RPC (seed.sql)
// ---------------------------------------------------------------------

export interface SearchErrorsRpcRow {
  id: number;
  slug: string; // ya resuelto según p_locale
  error_code: string;
  model: string | null;
  brand_name: string;
  category_name: string; // ya resuelto según p_locale
  title: string | null;
  similarity: number;
}

export interface AdminDashboardErrorsRpcRow {
  id: number;
  slug_es: string | null;
  slug_en: string | null;
  error_code: string;
  model: string | null;
  status: ErrorCodeStatus;
  quality_score_es: number | null;
  quality_score_en: number | null;
  locales_generated: Locale[];
  has_video: boolean;
  is_indexable: boolean;
  views_es: number;
  views_en: number;
  updated_at: string;
}

// ---------------------------------------------------------------------
// 5. DEFINICIÓN "Database" ESTILO SUPABASE
// ---------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      brands: {
        Row: BrandRow;
        Insert: BrandInsert;
        Update: BrandUpdate;
      };
      categories: {
        Row: CategoryRow;
        Insert: CategoryInsert;
        Update: CategoryUpdate;
      };
      error_codes: {
        Row: ErrorCodeRow;
        Insert: ErrorCodeInsert;
        Update: ErrorCodeUpdate;
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_errors: {
        Args: { p_query: string; p_locale?: Locale; p_limit?: number };
        Returns: SearchErrorsRpcRow[];
      };
      admin_dashboard_errors: {
        Args: {
          p_min_quality?: number | null;
          p_only_unindexed?: boolean;
          p_status?: ErrorCodeStatus | null;
          p_missing_locale?: Locale | null;
          p_has_video?: boolean | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: AdminDashboardErrorsRpcRow[];
      };
    };
    Enums: {
      error_code_status: ErrorCodeStatus;
      locale: Locale;
    };
  };
}
