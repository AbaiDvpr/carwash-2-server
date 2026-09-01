import { postToNative } from "./nativeBridge";

export type NavbarScreen = "map" | "history" | "qr" | "chatbot" | "profile";

/** Экраны с URL в WebView. `qr` — только нативный экран во Flutter. */
export type WebNavbarScreen = Exclude<NavbarScreen, "qr">;

export const NAVBAR_ROUTES: Record<WebNavbarScreen, string> = {
  map: "/",
  history: "/profile/history",
  chatbot: "/chatbot",
  profile: "/profile",
};

type RouterLike = {
  push: (href: string) => void;
};

export type NavigateOptions = {
  /** true — полный переход с перезагрузкой, false — SPA без refresh */
  refresh?: boolean;
  router?: RouterLike;
  /**
   * URL внутри WebView вкладки (например /profile/abonements).
   * Flutter: вместе со screen открывает этот path.
   */
  path?: string;
};

function resolveOptions(options?: NavigateOptions | RouterLike): NavigateOptions {
  if (!options) return {};
  if ("push" in options) return { router: options };
  return options;
}

function isWebScreen(screen: NavbarScreen): screen is WebNavbarScreen {
  return screen !== "qr";
}

function navigateWeb(href: string, { refresh = false, router }: NavigateOptions): void {
  if (typeof window === "undefined") return;

  if (refresh) {
    window.location.assign(href);
    return;
  }

  if (router) {
    router.push(href);
    return;
  }

  window.location.assign(href);
}

/**
 * Flutter: action "navigate", screen, refresh (optional), path (optional)
 *
 * screen: map | history | qr | chatbot | profile
 * path: подпуть WebView, напр. "/profile/abonements"
 * qr — только нативный экран во Flutter
 *
 * В приложении (есть bridge): только postMessage — Flutter сам переключает вкладку navbar.
 * Не делаем router.push внутри текущей вкладки (иначе профиль откроется «на main»).
 * В браузере без bridge — обычный переход по URL (path или маршрут screen).
 */
export function navigateNavbar(
  screen: NavbarScreen,
  options?: NavigateOptions | RouterLike
): boolean {
  const resolved = resolveOptions(options);
  const refresh = resolved.refresh ?? false;
  const path = resolved.path?.trim() || undefined;

  const sent = postToNative({
    action: "navigate",
    screen,
    refresh,
    ...(path ? { path } : {}),
  });

  if (!sent && isWebScreen(screen)) {
    navigateWeb(path ?? NAVBAR_ROUTES[screen], resolved);
  }

  return sent;
}

/**
 * Открыть страницу внутри вкладки профиля через Flutter (или SPA в браузере).
 * Пример: navigateProfilePath("/profile/abonements/buy")
 */
export function navigateProfilePath(
  path: string,
  options?: Omit<NavigateOptions, "path"> | RouterLike,
): boolean {
  const resolved = resolveOptions(options);
  return navigateNavbar("profile", { ...resolved, path });
}

/**
 * Переключить Flutter navbar на карту (и опционально открыть path).
 * Пример: navigateMapPath("/?id=3&type=ev")
 */
export function navigateMapPath(
  path?: string,
  options?: Omit<NavigateOptions, "path"> | RouterLike,
): boolean {
  const resolved = resolveOptions(options);
  return navigateNavbar("map", {
    ...resolved,
    ...(path?.trim() ? { path: path.trim() } : {}),
  });
}

/**
 * Flutter: action "logout"
 * Нативный экран авторизации, веб-страницы нет
 */
export function logout(): boolean {
  return postToNative({
    action: "logout",
  });
}
