import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AppLocale, I18nCatalog } from "@/lib/i18n/storage";
import {
  persistCatalog,
  persistLocale,
  readCatalogCache,
  readLocale,
} from "@/lib/i18n/storage";

export type I18nStatus = "idle" | "loading" | "ready" | "error";

type I18nState = {
  locale: AppLocale;
  catalog: I18nCatalog;
  status: I18nStatus;
  error: string | null;
};

function applyDocumentLang(locale: AppLocale): void {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale === "kz" ? "kk" : locale;
}

const initialState: I18nState = {
  locale: "ru",
  catalog: {},
  status: "idle",
  error: null,
};

const i18nSlice = createSlice({
  name: "i18n",
  initialState,
  reducers: {
    /** Подтянуть locale + catalog из localStorage (до/параллельно с API). */
    hydrateFromStorage(state) {
      const locale = readLocale();
      const catalog = readCatalogCache();
      state.locale = locale;
      if (catalog && Object.keys(catalog).length > 0) {
        state.catalog = catalog;
        state.status = "ready";
      }
      applyDocumentLang(locale);
    },
    setLocale(state, action: PayloadAction<AppLocale>) {
      state.locale = action.payload;
      persistLocale(action.payload);
      applyDocumentLang(action.payload);
    },
    setCatalog(state, action: PayloadAction<I18nCatalog>) {
      state.catalog = action.payload;
      state.status = "ready";
      state.error = null;
      persistCatalog(action.payload);
    },
    setI18nStatus(state, action: PayloadAction<I18nStatus>) {
      state.status = action.payload;
    },
    setI18nError(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.status = Object.keys(state.catalog).length > 0 ? "ready" : "error";
    },
  },
});

export const {
  hydrateFromStorage,
  setLocale,
  setCatalog,
  setI18nStatus,
  setI18nError,
} = i18nSlice.actions;
export default i18nSlice.reducer;
