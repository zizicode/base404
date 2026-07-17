// =====================================================================
// src/types/admin-frontend.types.ts
// Tipado completo para el frontend del panel de administración.
// Consume los endpoints bajo /v1/admin.
// =====================================================================

/** Respuesta envelope unificada de la API */
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

export type Locale = "es" | "en";
export type ErrorCodeStatus = "draft" | "published" | "archived" | "flagged";

// ------------------------------------------------------------------
// Catálogo
// ------------------------------------------------------------------

export interface Brand {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
}

export interface Category {
  id: number;
  name_es: string;
  name_en: string;
  slug_es: string;
  slug_en: string;
  device_type: string | null;
  icon: string | null;
  brand_id: number | null;
  created_at: string;
}

// ------------------------------------------------------------------
// Contenido localizado (ai_content, metadata_seo, ai_metrics)
// ------------------------------------------------------------------

export interface HowToStep {
  step: number;
  title: string;
  description: string;
  image_url: string | null;
}

export interface Faq {
  question: string;
  answer: string;
}

export interface AiContentVideo {
  title: string;
  youtube_id: string;
  language: string;
}

export interface AiContentLocalized {
  summary: string;
  markdown_solutions: string;
  causes: string[];
  steps_howto: HowToStep[];
  faqs: Faq[];
  related_error_slugs: string[];
  videos: AiContentVideo[];
}

export type AiContent = Partial<Record<Locale, AiContentLocalized>>;

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

export type MetadataSeo = Partial<Record<Locale, MetadataSeoLocalized>>;

export interface AiMetricsLocalized {
  model_used: string;
  prompt_version: string;
  quality_score: number;
  token_cost: number;
  generated_at: string;
  regenerated_count: number;
}

export type AiMetrics = Partial<Record<Locale, AiMetricsLocalized>>;

export interface UserEngagementLocalized {
  views: number;
  helpful_votes: number;
  unhelpful_votes: number;
  report_count: number;
  last_viewed_at?: string;
}

export type UserEngagement = Partial<Record<Locale, UserEngagementLocalized>>;

// ------------------------------------------------------------------
// Error completo (vista admin)
// ------------------------------------------------------------------

export interface AdminError {
  id: number;
  brand_id: number;
  category_id: number;
  error_code: string;
  model: string | null;
  slug_es: string | null;
  slug_en: string | null;
  locales_generated: Locale[];
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

  // Joins con brands/categories (según select del endpoint GET /v1/admin/errors/:id)
  brands?: Brand | null;
  categories?: Category | null;
}

// ------------------------------------------------------------------
// Dashboard
// ------------------------------------------------------------------

export interface AdminDashboardRow {
  id: number;
  slugEs: string | null;
  slugEn: string | null;
  errorCode: string;
  model: string | null;
  status: ErrorCodeStatus;
  qualityScoreEs: number | null;
  qualityScoreEn: number | null;
  localesGenerated: Locale[];
  hasVideo: boolean;
  isIndexable: boolean;
  viewsEs: number;
  viewsEn: number;
  updatedAt: string;
}

export interface AdminDashboardParams {
  min_quality?: number;
  only_unindexed?: "true" | "false";
  status?: ErrorCodeStatus;
  missing_locale?: Locale;
  has_video?: "true" | "false";
  limit?: number;
  offset?: number;
}

export interface AdminDashboardResponse {
  rows: AdminDashboardRow[];
  limit: number;
  offset: number;
}

// ------------------------------------------------------------------
// Stats
// ------------------------------------------------------------------

export interface AdminStatsOverview {
  total: number;
  indexable: number;
  byStatus: Record<ErrorCodeStatus, number>;
  publishedPct: number;
}

export interface AdminMissingTranslationsResponse {
  missingLocale: Locale;
  rows: AdminDashboardRow[];
}

// ------------------------------------------------------------------
// Ingesta de IA
// ------------------------------------------------------------------

export interface LocalizedGeneration {
  seo: MetadataSeoLocalized;
  content: AiContentLocalized;
  metrics: AiMetricsLocalized;
}

export interface AiIngestionPayload {
  brandSlug: string;
  categorySlug: string;
  errorCode: string;
  model: string | null;
  generations: Partial<Record<Locale, LocalizedGeneration>>;
  embedding?: number[];
  requestPublish?: boolean;
}

export interface AiIngestionResponse {
  id: number;
  slugEs: string | null;
  slugEn: string | null;
  localesGenerated: Locale[];
  status: ErrorCodeStatus;
}

export interface AiIngestionBulkResponse {
  inserted: number;
  updated: number;
  failed: Array<{ index: number; error: string }>;
}

// ------------------------------------------------------------------
// Importación manual JSON desde el dashboard
// ------------------------------------------------------------------
// Estructura idéntica a la que genera la IA, pero nombrada para usar
// directamente en forms de carga/importación del admin.
// ------------------------------------------------------------------

/** Contenido + SEO + métricas de UN idioma dentro del JSON a importar */
export interface ErrorImportLocale {
  seo: MetadataSeoLocalized;
  content: AiContentLocalized;
  metrics: AiMetricsLocalized;
}

/** Payload individual para importar un error desde JSON */
export interface ErrorImportPayload {
  brandSlug: string;
  categorySlug: string;
  errorCode: string;
  model: string | null;
  generations: Partial<Record<Locale, ErrorImportLocale>>;
  embedding?: number[];
  requestPublish?: boolean;
}

/** Array de payloads: el JSON que se sube al dashboard para importar en batch */
export type ErrorImportBatch = ErrorImportPayload[];

/** Respuesta de importar un solo error */
export interface ErrorImportResponse {
  id: number;
  slugEs: string | null;
  slugEn: string | null;
  localesGenerated: Locale[];
  status: ErrorCodeStatus;
}

/** Respuesta de importar un batch */
export interface ErrorImportBatchResponse {
  inserted: number;
  updated: number;
  failed: Array<{ index: number; error: string }>;
}

/**
 * Ejemplo de JSON válido para importar manualmente:
 *
 * ```json
 * [
 *   {
 *     "brandSlug": "samsung",
 *     "categorySlug": "lavadoras",
 *     "errorCode": "1E",
 *     "model": "WF45T6000AW",
 *     "requestPublish": true,
 *     "generations": {
 *       "es": {
 *         "seo": {
 *           "title": "Error 1E en lavadora Samsung: causas y soluciones",
 *           "metaDescription": "Resuelve el error 1E de tu lavadora Samsung...",
 *           "canonicalUrl": "https://vimovies.com/es/error-1e-lavadora-samsung",
 *           "og": { "title": "Error 1E Samsung", "description": "...", "image": "https://..." },
 *           "schemaTypes": ["TechArticle", "FAQPage", "HowTo"],
 *           "schemaJsonLd": {},
 *           "robots": "index, follow"
 *         },
 *         "content": {
 *           "summary": "El error 1E indica problema de drenaje...",
 *           "markdownSolutions": "## Solución\n1. Revisa la manguera...",
 *           "causes": ["Manguera obstruida", "Bomba de drenaje dañada"],
 *           "stepsHowTo": [
 *             { "step": 1, "title": "Apagar la lavadora", "description": "...", "imageUrl": null }
 *           ],
 *           "faqs": [{ "question": "¿Puedo repararlo yo?", "answer": "Sí, si..." }],
 *           "relatedErrorSlugs": ["error-4c-lavadora-samsung"],
 *           "videos": [{ "title": "Cómo reparar error 1E", "youtubeId": "Ru6y242RMAE", "language": "es" }]
 *         },
 *         "metrics": {
 *           "modelUsed": "gemini-1.5-flash",
 *           "promptVersion": "v2",
 *           "qualityScore": 92,
 *           "tokenCost": 0.004,
 *           "generatedAt": "2026-07-15T00:00:00.000Z",
 *           "regeneratedCount": 0
 *         }
 *       }
 *     }
 *   }
 * ]
 * ```
 */

// ------------------------------------------------------------------
// Request/Response por endpoint admin
// ------------------------------------------------------------------

// GET /v1/admin/errors
export type ListAdminErrorsRequest = AdminDashboardParams;
export type ListAdminErrorsResponse = ApiResponse<AdminDashboardResponse>;

// GET /v1/admin/errors/:id
export type GetAdminErrorResponse = ApiResponse<{ error: AdminError }>;

// PATCH /v1/admin/errors/:id
export type PatchAdminErrorRequest = Partial<AdminError>;
export type PatchAdminErrorResponse = ApiResponse<{ error: AdminError }>;

// POST /v1/admin/errors/:id/publish | archive | flag
export type ChangeStatusResponse = ApiResponse<{ id: number; status: ErrorCodeStatus }>;

// DELETE /v1/admin/errors/:id
export type DeleteErrorResponse = ApiResponse<{ deleted: true; id: number }>;

// POST /v1/admin/ingest
export type IngestSingleRequest = AiIngestionPayload;
export type IngestSingleResponse = ApiResponse<AiIngestionResponse>;

// POST /v1/admin/ingest/bulk
export type IngestBulkRequest = AiIngestionPayload[];
export type IngestBulkResponse = ApiResponse<AiIngestionBulkResponse>;

// POST /v1/admin/ingest/:id/regenerate?locale=es
export type RegenerateResponse = ApiResponse<{ queued: true; id: number; locale: Locale }>;

// GET /v1/admin/brands
export type ListBrandsResponse = ApiResponse<{ brands: Brand[] }>;

// POST /v1/admin/brands
export type CreateBrandRequest = Omit<Brand, "id" | "created_at">;
export type CreateBrandResponse = ApiResponse<{ brand: Brand }>;

// PATCH /v1/admin/brands/:id
export type PatchBrandRequest = Partial<Omit<Brand, "id" | "created_at">>;
export type PatchBrandResponse = ApiResponse<{ brand: Brand }>;

// DELETE /v1/admin/brands/:id
export type DeleteBrandResponse = ApiResponse<{ deleted: true; id: number }>;

// GET /v1/admin/categories
export type ListCategoriesResponse = ApiResponse<{ categories: Category[] }>;

// POST /v1/admin/categories
export type CreateCategoryRequest = Omit<Category, "id" | "created_at">;
export type CreateCategoryResponse = ApiResponse<{ category: Category }>;

// PATCH /v1/admin/categories/:id
export type PatchCategoryRequest = Partial<Omit<Category, "id" | "created_at">>;
export type PatchCategoryResponse = ApiResponse<{ category: Category }>;

// DELETE /v1/admin/categories/:id
export type DeleteCategoryResponse = ApiResponse<{ deleted: true; id: number }>;

// GET /v1/admin/stats/overview
export type StatsOverviewResponse = ApiResponse<AdminStatsOverview>;

// GET /v1/admin/stats/missing-translations?locale=es
export type StatsMissingTranslationsResponse = ApiResponse<AdminMissingTranslationsResponse>;

// ------------------------------------------------------------------
// Cliente admin (mapa de endpoints para fetch/axios/tanstack)
// ------------------------------------------------------------------

export interface AdminApiClient {
  "GET /admin/errors": { request: ListAdminErrorsRequest; response: ListAdminErrorsResponse };
  "GET /admin/errors/:id": { request: { id: number }; response: GetAdminErrorResponse };
  "PATCH /admin/errors/:id": { request: { id: number; body: PatchAdminErrorRequest }; response: PatchAdminErrorResponse };
  "POST /admin/errors/:id/publish": { request: { id: number }; response: ChangeStatusResponse };
  "POST /admin/errors/:id/archive": { request: { id: number }; response: ChangeStatusResponse };
  "POST /admin/errors/:id/flag": { request: { id: number }; response: ChangeStatusResponse };
  "DELETE /admin/errors/:id": { request: { id: number }; response: DeleteErrorResponse };

  "POST /admin/ingest": { request: IngestSingleRequest; response: IngestSingleResponse };
  "POST /admin/ingest/bulk": { request: IngestBulkRequest; response: IngestBulkResponse };
  "POST /admin/ingest/:id/regenerate": { request: { id: number; locale?: Locale }; response: RegenerateResponse };

  "GET /admin/brands": { request: undefined; response: ListBrandsResponse };
  "POST /admin/brands": { request: CreateBrandRequest; response: CreateBrandResponse };
  "PATCH /admin/brands/:id": { request: { id: number; body: PatchBrandRequest }; response: PatchBrandResponse };
  "DELETE /admin/brands/:id": { request: { id: number }; response: DeleteBrandResponse };

  "GET /admin/categories": { request: undefined; response: ListCategoriesResponse };
  "POST /admin/categories": { request: CreateCategoryRequest; response: CreateCategoryResponse };
  "PATCH /admin/categories/:id": { request: { id: number; body: PatchCategoryRequest }; response: PatchCategoryResponse };
  "DELETE /admin/categories/:id": { request: { id: number }; response: DeleteCategoryResponse };

  "GET /admin/stats/overview": { request: undefined; response: StatsOverviewResponse };
  "GET /admin/stats/missing-translations": { request: { locale?: Locale }; response: StatsMissingTranslationsResponse };
}
