// =====================================================================
// src/routes/v1/public.route.ts
// Rutas públicas bajo /v1 (sin autenticación)
// =====================================================================

import { Hono } from "hono";

import { searchErrors, suggestErrors } from "../../controllers/search.controller.js";
import {
  listPublicErrors,
  getErrorBySlug,
  getRelatedErrors,
  trackView,
  castVote,
  reportError,
} from "../../controllers/errors.controller.js";
import { listBrands, getBrandBySlug, listErrorsByBrand } from "../../controllers/brands.controller.js";
import {
  listCategories,
  getCategoryBySlug,
  listErrorsByCategory,
  listErrorsByCategoryAndBrand,
} from "../../controllers/categories.controller.js";
import {
  getSitemapEntries,
  getSitemapMain,
  getSitemapErrors,
  getSitemapBrands,
  getSitemapCategories,
} from "../../controllers/sitemap.controller.js";
import { publicStats } from "../../controllers/stats.controller.js";

export const publicRoute = new Hono();

// Search
publicRoute.get("/search", searchErrors);
publicRoute.get("/search/suggest", suggestErrors);

// Errors
publicRoute.get("/errors", listPublicErrors);
publicRoute.get("/errors/:slug", getErrorBySlug);
publicRoute.get("/errors/:slug/related", getRelatedErrors);
publicRoute.post("/errors/:slug/view", trackView);
publicRoute.post("/errors/:slug/vote", castVote);
publicRoute.post("/errors/:slug/report", reportError);

// Brands
publicRoute.get("/brands", listBrands);
publicRoute.get("/brands/:slug", getBrandBySlug);
publicRoute.get("/brands/:slug/errors", listErrorsByBrand);

// Categories
publicRoute.get("/categories", listCategories);
publicRoute.get("/categories/:slug", getCategoryBySlug);
publicRoute.get("/categories/:slug/errors", listErrorsByCategory);
publicRoute.get(
  "/categories/:categorySlug/brands/:brandSlug/errors",
  listErrorsByCategoryAndBrand,
);

// Sitemap
publicRoute.get("/sitemap-entries", getSitemapEntries);
publicRoute.get("/sitemap/main", getSitemapMain);
publicRoute.get("/sitemap/errors", getSitemapErrors);
publicRoute.get("/sitemap/brands", getSitemapBrands);
publicRoute.get("/sitemap/categories", getSitemapCategories);

// Stats
publicRoute.get("/stats", publicStats);
