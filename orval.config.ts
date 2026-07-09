// =====================================================================
// orval.config.ts
// Genera un cliente tipado (fetch/axios) a partir de un spec OpenAPI.
// Aún no hay spec real: agrega uno en ./openapi.yaml (o apunta a la URL
// de tu servidor una vez expongas /openapi.json, p.ej. con
// @hono/zod-openapi) y corre: pnpm generate:api
// =====================================================================

import { defineConfig } from "orval";

export default defineConfig({
  errorCodesApi: {
    input: {
      target: "./openapi.yaml",
    },
    output: {
      mode: "tags-split",
      target: "./src/types/generated/api.ts",
      client: "axios",
      httpClient: "axios",
      clean: true,
    },
  },
});
