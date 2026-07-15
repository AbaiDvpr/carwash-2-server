import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type AppState = {
  /** Версия приложения — всегда 1.0.0 (тестовый пример Redux) */
  version: string;
  /** Показать ссылки навигации в header (тестовый переключатель из профиля) */
  showHeaderNav: boolean;
};

const initialState: AppState = {
  version: "1.0.0",
  showHeaderNav: false,
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
  },
});

export const { toggleHeaderNav, setHeaderNav } = appSlice.actions;
export default appSlice.reducer;
