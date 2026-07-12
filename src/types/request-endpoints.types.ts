// =====================================================================
// request-endpoints.types.ts (v2 — bilingüe ES/EN)
// Contratos de comunicación Edge Functions (Hono/Supabase) <-> Frontend
// y del pipeline de ingesta de IA. Cada payload de contenido/SEO ahora
// se segmenta por locale para que la IA entregue el mismo material en
// dos versiones (título, resumen, pasos, FAQs, etc.) listas para insertar.
// =====================================================================

/** Locales soportados actualmente. Agregar uno nuevo NO requiere migración
 *  de esquema (solo una nueva clave en los JSONB), pero sí actualizar esta
 *  unión para mantener el tipado estricto en frontend/backend. */
export type Locale = "es" | "en";

// ---------------------------------------------------------------------
// 1. BUSCADOR (search_errors RPC)
// ---------------------------------------------------------------------

export interface SearchRequest {
  query: string;
  /** Idioma en el que se busca y se devuelven título/slug/nombre de categoría */
  locale: Locale;
  limit?: number;
  /** slug de marca para filtrar resultados */
  brand?: string;
  /** slug de categoría para filtrar resultados */
  category?: string;
}

export interface SearchResultItem {
  id: number;
  /** slug_es o slug_en, ya resuelto según el locale solicitado */
  slug: string;
  errorCode: string;
  model: string | null;
  brandName: string;
  /** name_es o name_en, ya resuelto según el locale solicitado */
  categoryName: string;
  title: string | null;
  similarity: number;
}

export interface SearchResponse {
  query: string;
  locale: Locale;
  results: SearchResultItem[];
  tookMs: number;
}

// ---------------------------------------------------------------------
// 2. PÁGINA DE ERROR (SSR) — payload exacto para el frontend
// ---------------------------------------------------------------------

export interface HowToStep {
  step: number;
  title: string;
  description: string;
  imageUrl: string | null;
}

export interface Faq {
  question: string;
  answer: string;
}

export interface VideoEmbed {
  title: string;
  youtubeId: string;
  /** Idioma HABLADO del video (ISO 639-1), independiente del locale de la página */
  language: string;
  /** Ya resuelto por el backend, listo para <iframe src={embedUrl}> */
  embedUrl: string;
  /** Thumbnail estándar de YouTube, útil para el módulo antes de reproducir */
  thumbnailUrl: string;
}

export interface OpenGraphData {
  title: string;
  description: string;
  image: string;
}

export interface SeoBlock {
  title: string;
  metaDescription: string;
  canonicalUrl: string;
  og: OpenGraphData;
  schemaJsonLd: Record<string, unknown>;
  robots: string;
}

/** URL alternativa en otro idioma, para <link rel="alternate" hreflang="..."> */
export interface HreflangAlternate {
  locale: Locale;
  url: string;
}

export interface RelatedError {
  slug: string;
  errorCode: string;
  title: string;
  brandName: string;
  categoryName: string;
}

export interface EngagementSnapshot {
  views: number;
  helpfulVotes: number;
  unhelpfulVotes: number;
}

/**
 * Payload completo que consume el SSR de la página de error, YA resuelto
 * para el locale solicitado (el backend extrae la clave correspondiente
 * de los JSONB bilingües antes de responder — el frontend nunca ve la
 * estructura {es,en} completa, solo la versión que necesita renderizar).
 */
export interface ErrorPageResponse {
  id: number;
  slug: string;
  locale: Locale;
  errorCode: string;
  model: string | null;
  brand: { name: string; slug: string; logoUrl: string | null };
  category: { name: string; slug: string };

  seo: SeoBlock;

  /** Alternativas de idioma disponibles para esta misma entidad de error
   *  (puede tener 1 o 2 elementos según cuántos locales estén generados) */
  hreflangAlternates: HreflangAlternate[];

  content: {
    summary: string;
    markdownSolutions: string;
    causes: string[];
    stepsHowTo: HowToStep[];
    faqs: Faq[];
    videos: VideoEmbed[];
  };

  /** true si `content.videos` tiene al menos un elemento; espeja error_codes.has_video */
  hasVideo: boolean;

  engagement: EngagementSnapshot;
  relatedErrors: RelatedError[];

  isIndexable: boolean;
  status: "draft" | "published" | "archived" | "flagged";
  updatedAt: string; // ISO 8601
}

// ---------------------------------------------------------------------
// 3. INGESTA DE IA — contrato estricto que el script/worker de IA
//    (Gemini) debe enviar al backend tras procesar un código de error.
// ---------------------------------------------------------------------

/** Contenido + SEO + métricas de UN idioma. La IA genera dos instancias
 *  de esta forma (una "es" y una "en") con el MISMO significado pero
 *  redactadas de forma nativa en cada idioma — no es traducción literal. */
export interface LocalizedGeneration {
  seo: {
    title: string;
    metaDescription: string;
    canonicalUrl: string;
    og: OpenGraphData;
    schemaTypes: Array<"TechArticle" | "FAQPage" | "HowTo" | "VideoObject">;
    schemaJsonLd: Record<string, unknown>;
    robots?: string;
  };
  content: {
    summary: string;
    markdownSolutions: string;
    causes: string[];
    stepsHowTo: HowToStep[];
    faqs: Faq[];
    relatedErrorSlugs: string[];
    /** Crudo tal como lo manda el worker: solo id + título + idioma.
     *  El backend deriva embedUrl/thumbnailUrl al momento de servir la página. */
    videos: Array<{ title: string; youtubeId: string; language: string }>;
  };
  metrics: {
    modelUsed: string;
    promptVersion: string;
    /** 0-100 */
    qualityScore: number;
    tokenCost: number;
    generatedAt: string; // ISO 8601
  };
}

export interface AiIngestionPayload {
  brandSlug: string;
  categorySlug: string; // slug agnóstico usado solo para resolver category_id (se acepta slug_es o slug_en)

  errorCode: string;
  model: string | null;

  /**
   * Uno o ambos locales en la misma llamada. Permite:
   *  - Ingesta simultánea (generar ES y EN de una vez), o
   *  - Ingesta incremental (mandar "es" primero, "en" en un job posterior
   *    de traducción/expansión sin tocar lo ya publicado en "es").
   */
  generations: Partial<Record<Locale, LocalizedGeneration>>;

  /** Embedding opcional (768 dims), agnóstico de idioma o por-locale según estrategia de RAG */
  embedding?: number[];

  requestPublish?: boolean;
}

export interface AiIngestionResponse {
  success: boolean;
  id: number;
  slugEs: string | null;
  slugEn: string | null;
  localesGenerated: Locale[];
  status: "draft" | "published" | "archived" | "flagged";
  error?: string;
}

// ---------------------------------------------------------------------
// 4. DASHBOARD ADMINISTRATIVO
// ---------------------------------------------------------------------

export interface AdminDashboardRequest {
  minQualityScore?: number;
  onlyUnindexed?: boolean;
  status?: "draft" | "published" | "archived" | "flagged";
  /** Filtra filas a las que AÚN les falta este idioma (para priorizar traducción) */
  missingLocale?: Locale;
  /** true = solo filas con video, false = solo filas sin video, undefined = todas */
  hasVideo?: boolean;
  limit?: number;
  offset?: number;
}

export interface AdminDashboardRow {
  id: number;
  slugEs: string | null;
  slugEn: string | null;
  errorCode: string;
  model: string | null;
  status: "draft" | "published" | "archived" | "flagged";
  qualityScoreEs: number | null;
  qualityScoreEn: number | null;
  localesGenerated: Locale[];
  hasVideo: boolean;
  isIndexable: boolean;
  viewsEs: number;
  viewsEn: number;
  updatedAt: string; // ISO 8601
}

export interface AdminDashboardResponse {
  rows: AdminDashboardRow[];
  limit: number;
  offset: number;
}
