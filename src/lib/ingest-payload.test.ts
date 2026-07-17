import test from "node:test";
import assert from "node:assert/strict";

import { buildLocalizedAiContent } from "./ingest-payload.js";

test("buildLocalizedAiContent preserves videos with database field names", () => {
  const result = buildLocalizedAiContent({
    content: {
      summary: "Resumen",
      markdownSolutions: "Solución",
      causes: ["Causa"],
      stepsHowTo: [],
      faqs: [],
      relatedErrorSlugs: [],
      videos: [{ title: "Eso mismo", youtubeId: "Ru6y242RMAE", language: "es" }],
    },
  } as any);

  assert.deepEqual(result.videos, [
    {
      title: "Eso mismo",
      youtube_id: "Ru6y242RMAE",
      language: "es",
    },
  ]);
});
