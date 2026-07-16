import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type AuthErrorPayload = {
  /** Короткое описание причины */
  reason: string;
  /** Откуда вызвали (файл/функция) */
  source?: string;
  path?: string;
  status?: number;
  /** Сырой ответ API / доп. детали */
  detail?: string;
};

type AppState = {
  /** Версия приложения — всегда 1.0.0 (тестовый пример Redux) */
  version: string;
  /** Показать ссылки навигации в header (тестовый переключатель из профиля) */
  showHeaderNav: boolean;
  /**
   * Тестовая сборка: при auth-сбое не логаутим сразу,
   * а показываем error-блок с причиной и кнопкой «Выйти».
   */
  test_version: boolean;
  authError: AuthErrorPayload | null;
};

const initialState: AppState = {
  version: "1.0.0",
  showHeaderNav: false,
  test_version: true,
  authError: null,
};

const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    toggleHeaderNav(state) {
      state.showHeaderNav = !state.showHeaderNav;
    },
    setHeaderNav(state, action: PayloadAction<boolean>) {
      state.showHeaderNav = action.payload;
    },
    setTestVersion(state, action: PayloadAction<boolean>) {
      state.test_version = action.payload;
    },
    setAuthError(state, action: PayloadAction<AuthErrorPayload>) {
      state.authError = action.payload;
    },
    clearAuthError(state) {
      state.authError = null;
    },
  },
});

export const {
  toggleHeaderNav,
  setHeaderNav,
  setTestVersion,
  setAuthError,
  clearAuthError,
} = appSlice.actions;
export default appSlice.reducer;
