import { configureStore } from "@reduxjs/toolkit";
import appReducer from "./slices/appSlice";
import i18nReducer from "./slices/i18nSlice";
import variablesReducer from "./slices/variablesSlice";

export const makeStore = () =>
  configureStore({
    reducer: {
      app: appReducer,
      i18n: i18nReducer,
      variables: variablesReducer,
    },
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
