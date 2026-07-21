import { apiFetch } from "@/lib/api";

export type Translation = {
  id: number;
  key: string;
  group: string;
  ruValue: string;
  enValue: string;
  kkValue: string;
};

type TranslationsResponse = {
  total: number;
  translations: Translation[];
};

/** Все строки перевода (ru / en / kk). */
export async function fetchTranslations(): Promise<Translation[]> {
  const data = await apiFetch<TranslationsResponse>("/api/translations");
  return data.translations;
}