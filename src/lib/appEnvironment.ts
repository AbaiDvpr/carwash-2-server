import { hasNativeBridge } from "./nativeBridge";
import { getUserSource, MOBILE_SOURCE } from "./userSession";

export type AppEnvironment = {
  /** Есть JS-мост CarWashNative / CarWashApp */
  hasNativeBridge: boolean;
  /** localStorage.source === "mobile" */
  isMobileSource: boolean;
  /** Обе проверки пройдены — открыто в мобильном приложении */
  isMobileApp: boolean;
  /** Обычный браузер (ПК или мобильный) */
  isWebBrowser: boolean;
};

export function isMobileSource(): boolean {
  return getUserSource() === MOBILE_SOURCE;
}

export function readAppEnvironment(): AppEnvironment {
  const bridge = hasNativeBridge();
  const mobileSource = isMobileSource();

  return {
    hasNativeBridge: bridge,
    isMobileSource: mobileSource,
    isMobileApp: bridge && mobileSource,
    isWebBrowser: !(bridge && mobileSource),
  };
}

export { MOBILE_SOURCE } from "./userSession";
