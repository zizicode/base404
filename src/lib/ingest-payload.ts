import type { AiContentVideo } from "../types/database.types.js";

interface IngestVideoLike {
  title: string;
  youtubeId?: string;
  youtube_id?: string;
  language: string;
}

export function normalizeVideos(videos: IngestVideoLike[] | undefined): AiContentVideo[] {
  if (!Array.isArray(videos)) {
    return [];
  }

  return videos
    .filter((video): video is IngestVideoLike => Boolean(video))
    .map((video) => ({
      title: video.title,
      youtube_id: video.youtube_id ?? video.youtubeId ?? "",
      language: video.language,
    }));
}

export function buildLocalizedAiContent(gen: {
  content: {
    summary: string;
    markdownSolutions: string;
    causes: string[];
    stepsHowTo: Array<{ step: number; title: string; description: string; imageUrl: string | null }>;
    faqs: Array<{ question: string; answer: string }>;
    relatedErrorSlugs: string[];
    videos?: IngestVideoLike[];
  };
}) {
  return {
    summary: gen.content.summary,
    markdown_solutions: gen.content.markdownSolutions,
    causes: gen.content.causes,
    steps_howto: gen.content.stepsHowTo.map((s) => ({
      step: s.step,
      title: s.title,
      description: s.description,
      image_url: s.imageUrl,
    })),
    faqs: gen.content.faqs,
    related_error_slugs: gen.content.relatedErrorSlugs,
    videos: normalizeVideos(gen.content.videos),
  };
}
