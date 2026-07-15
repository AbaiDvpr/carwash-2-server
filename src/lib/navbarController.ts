import { postToNative } from "./nativeBridge";

export type NavbarScreen = "map" | "history" | "qr" | "chatbot" | "profile";

/** Экраны с URL в WebView. `qr` — только нативный экран во Flutter. */
export type WebNavbarScreen = Exclude<NavbarScreen, "qr">;

export const NAVBAR_ROUTES: Record<WebNavbarScreen, string> = {
  map: "/",
  history: "/history",
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
 * Flutter: action "navigate", screen, refresh (optional)
 *
 * screen: map | history | qr | chatbot | profile
 * qr — нативный QR-сканер, веб-страницы нет
 *
 * @example navigateNavbar("map")
 * @example navigateNavbar("qr") // только Flutter
 * @example navigateNavbar("history", { refresh: true })
 */
export function navigateNavbar(
  screen: NavbarScreen,
  options?: NavigateOptions | RouterLike
): boolean {
  const resolved = resolveOptions(options);
  const refresh = resolved.refresh ?? false;

  const sent = postToNative({
    action: "navigate",
    screen,
    refresh,
  });

  if (!sent && isWebScreen(screen)) {
    navigateWeb(NAVBAR_ROUTES[screen], resolved);
  }

  return sent;
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
