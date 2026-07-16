import type { AppStore } from "./index";

let store: AppStore | null = null;

export function setAppStore(next: AppStore): void {
  store = next;
}

export function getAppStore(): AppStore | null {
  return store;
}
