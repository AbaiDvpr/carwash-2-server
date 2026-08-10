import { apiFetch } from "@/lib/api";
import type { AppLocale } from "@/lib/i18n/storage";

export type FaqCategory = "wash" | "ev" | "other";

export type FaqDto = {
  id: number;
  category: FaqCategory;
  question_ru: string;
  question_en: string | null;
  question_kz: string | null;
  answer_ru: string;
  answer_en: string | null;
  answer_kz: string | null;
  sort_order: number;
};

export type FaqItem = {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
};

type FaqsResponse = {
  total: number;
  faqs: FaqDto[];
};

export function fetchFaqs(category?: FaqCategory): Promise<FaqDto[]> {
  const query = category ? `?category=${category}` : "";
  return apiFetch<FaqsResponse>(`/api/faqs${query}`, {
    requireAuth: false,
  }).then((r) => r.faqs);
}

function pickLocalized(
  values: Record<"ru" | "en" | "kz", string | null | undefined>,
  lang: AppLocale,
): string {
  const order: Array<"ru" | "en" | "kz"> =
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

export function pickFaqQuestion(faq: FaqDto, lang: AppLocale = "ru"): string {
  return pickLocalized(
    { ru: faq.question_ru, en: faq.question_en, kz: faq.question_kz },
    lang,
  );
}

export function pickFaqAnswer(faq: FaqDto, lang: AppLocale = "ru"): string {
  return pickLocalized(
    { ru: faq.answer_ru, en: faq.answer_en, kz: faq.answer_kz },
    lang,
  );
}

export function localizeFaqs(faqs: FaqDto[], lang: AppLocale): FaqItem[] {
  return faqs
    .map((faq) => ({
      id: String(faq.id),
      category: faq.category,
      question: pickFaqQuestion(faq, lang),
      answer: pickFaqAnswer(faq, lang),
    }))
    .filter((item) => item.question && item.answer);
}
