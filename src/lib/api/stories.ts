import { apiFetch, apiUrl } from "@/lib/api";

export type StoryLang = "ru" | "en" | "kz";

export type StoryDto = {
  id: number;
  code: string;
  label_ru: string | null;
  label_en: string | null;
  label_kz: string | null;
  title_ru: string | null;
  title_en: string | null;
  title_kz: string | null;
  text_ru: string | null;
  text_en: string | null;
  text_kz: string | null;
  accent: string;
  ru_photo: string | null;
  en_photo: string | null;
  kz_photo: string | null;
  viewed: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

export type StoriesResponse = {
  total: number;
  stories: StoryDto[];
};

export function fetchStories(): Promise<StoryDto[]> {
  return apiFetch<StoriesResponse>("/api/stories").then((r) => r.stories);
}

export function markStoryViewed(id: number): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/api/stories/${id}/view`, {
    method: "POST",
  });
}

function pickLocalized(
  values: Record<StoryLang, string | null | undefined>,
  lang: StoryLang,
): string {
  const order: StoryLang[] =
    lang === "en"
      ? ["en", "ru", "kz"]
      : lang === "kz"
        ? ["kz", "ru", "en"]
        : ["ru", "en", "kz"];

  for (const key of order) {
    const value = values[key];
    if (value) return value;
  }
  return "";
}

export function pickStoryLabel(
  story: Pick<StoryDto, "label_ru" | "label_en" | "label_kz">,
  lang: StoryLang = "ru",
): string {
  return pickLocalized(
    { ru: story.label_ru, en: story.label_en, kz: story.label_kz },
    lang,
  );
}

export function pickStoryTitle(
  story: Pick<StoryDto, "title_ru" | "title_en" | "title_kz">,
  lang: StoryLang = "ru",
): string {
  return pickLocalized(
    { ru: story.title_ru, en: story.title_en, kz: story.title_kz },
    lang,
  );
}

export function pickStoryText(
  story: Pick<StoryDto, "text_ru" | "text_en" | "text_kz">,
  lang: StoryLang = "ru",
): string {
  return pickLocalized(
    { ru: story.text_ru, en: story.text_en, kz: story.text_kz },
    lang,
  );
}

/** Абсолютный URL медиа с бэка (NEXT_PUBLIC_API_URL). */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return apiUrl(path.startsWith("/") ? path : `/${path}`);
}

/** Фон сториса по языку. */
export function pickStoryPhoto(
  story: Pick<StoryDto, "ru_photo" | "en_photo" | "kz_photo">,
  lang: StoryLang = "ru",
): string | null {
  let path: string | null = null;
  if (lang === "en") path = story.en_photo || story.ru_photo || story.kz_photo;
  else if (lang === "kz") path = story.kz_photo || story.ru_photo || story.en_photo;
  else path = story.ru_photo || story.en_photo || story.kz_photo;

  return resolveMediaUrl(path);
}
