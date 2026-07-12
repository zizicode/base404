// =====================================================================
// src/routes/v1/admin.route.ts
// Rutas admin bajo /v1/admin (requieren JWT de admin)
// =====================================================================

import { Hono } from "hono";

import { requireAdmin } from "../../middlewares/auth.js";
import {
  listAdminErrors,
  getAdminErrorById,
  patchAdminError,
  publishError,
  archiveError,
  flagError,
  deleteError,
} from "../../controllers/admin/errors.admin.controller.js";
import {
  ingestSingle,
  ingestBulk,
  regenerate,
} from "../../controllers/admin/ingest.admin.controller.js";
import {
  adminListBrands,
  adminCreateBrand,
  adminPatchBrand,
  adminDeleteBrand,
  adminListCategories,
  adminCreateCategory,
  adminPatchCategory,
  adminDeleteCategory,
} from "../../controllers/admin/catalog.admin.controller.js";
import {
  statsOverview,
  statsMissingTranslations,
} from "../../controllers/admin/stats.admin.controller.js";

export const adminRoute = new Hono();

adminRoute.use("*", requireAdmin);

// Errors management
adminRoute.get("/errors", listAdminErrors);
adminRoute.get("/errors/:id", getAdminErrorById);
adminRoute.patch("/errors/:id", patchAdminError);
adminRoute.post("/errors/:id/publish", publishError);
adminRoute.post("/errors/:id/archive", archiveError);
adminRoute.post("/errors/:id/flag", flagError);
adminRoute.delete("/errors/:id", deleteError);

// Ingest (también acepta ingest key como alternativa al JWT)
adminRoute.post("/ingest", ingestSingle);
adminRoute.post("/ingest/bulk", ingestBulk);
adminRoute.post("/ingest/:id/regenerate", regenerate);

// Catalog
adminRoute.get("/brands", adminListBrands);
adminRoute.post("/brands", adminCreateBrand);
adminRoute.patch("/brands/:id", adminPatchBrand);
adminRoute.delete("/brands/:id", adminDeleteBrand);

adminRoute.get("/categories", adminListCategories);
adminRoute.post("/categories", adminCreateCategory);
adminRoute.patch("/categories/:id", adminPatchCategory);
adminRoute.delete("/categories/:id", adminDeleteCategory);

// Stats
adminRoute.get("/stats/overview", statsOverview);
adminRoute.get("/stats/missing-translations", statsMissingTranslations);
