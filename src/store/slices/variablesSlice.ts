import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/**
 * App variables (documents, support contacts).
 *
 * Документы поддержки (политика / оферта) — меняй URL здесь:
 *   frontend/src/store/slices/variablesSlice.ts → initialState.documents
 */
export type DocumentVariable = {
  id: string;
  title: string;
  /** Внешняя ссылка; пустая строка = без перехода */
  url: string;
};

/** Контакт поддержки / мессенджера */
export type SupportContactVariable = {
  title: string;
  hint: string;
  url: string;
};

type VariablesState = {
  documents: DocumentVariable[];
  support: {
    telegram: SupportContactVariable;
    whatsapp: SupportContactVariable;
  };
};

const initialState: VariablesState = {
  // ── Документы (Профиль → Поддержка) ─────────────────────────────────────
  // Быстро поменять ссылки: правь только поле `url` ниже.
  documents: [
    {
      id: "privacy",
      title: "Политика конфиденциальности",
      url: "https://masnaget.digital/hipoint/privacy-policy.html",
    },
    {
      id: "offer",
      title: "Публичная оферта",
      url: "https://masnaget.digital/hipoint/public-offer.html",
    },
  ],
  support: {
    telegram: {
      title: "Telegram",
      hint: "@carwash_support",
      url: "https://t.me/carwash_support",
    },
    whatsapp: {
      title: "WhatsApp",
      hint: "Написать в чат",
      url: "https://wa.me/77001234567",
    },
  },
};

const variablesSlice = createSlice({
  name: "variables",
  initialState,
  reducers: {
    setDocuments(state, action: PayloadAction<DocumentVariable[]>) {
      state.documents = action.payload;
    },
    setDocument(
      state,
      action: PayloadAction<{ id: string; patch: Partial<Omit<DocumentVariable, "id">> }>,
    ) {
      const item = state.documents.find((doc) => doc.id === action.payload.id);
      if (!item) return;
      Object.assign(item, action.payload.patch);
    },
    setSupportContact(
      state,
      action: PayloadAction<{
        channel: keyof VariablesState["support"];
        patch: Partial<SupportContactVariable>;
      }>,
    ) {
      Object.assign(state.support[action.payload.channel], action.payload.patch);
    },
  },
});

export const { setDocuments, setDocument, setSupportContact } = variablesSlice.actions;
export default variablesSlice.reducer;
