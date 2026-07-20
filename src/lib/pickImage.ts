import {
  hasNativeBridge,
  postToNative,
  subscribeNativeMessage,
} from "./nativeBridge";

const PICK_TIMEOUT_MS = 60_000;

/**
 * Flutter WebView:
 *   Web → Native: { "action": "pick_image", "request_id": "..." }
 *   Native → Web: window.CarWashNativeReceive(JSON.stringify({
 *     "action": "image",
 *     "request_id": "...",
 *     "data_url": "data:image/jpeg;base64,...."
 *   }))
 *   или ошибка: { "action": "image", "request_id": "...", "error": "cancelled" }
 *
 * В браузере — скрытый <input type="file" accept="image/*">.
 */
export function pickImage(): Promise<string> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("no_window"));
  }

  if (hasNativeBridge()) {
    return pickFromNative();
  }

  return pickFromFileInput();
}

function pickFromFileInput(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.style.display = "none";
    document.body.appendChild(input);

    const cleanup = () => {
      input.remove();
    };

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        cleanup();
        reject(new Error("cancelled"));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        cleanup();
        resolve(String(reader.result));
      };
      reader.onerror = () => {
        cleanup();
        reject(new Error("read_failed"));
      };
      reader.readAsDataURL(file);
    };

    input.oncancel = () => {
      cleanup();
      reject(new Error("cancelled"));
    };

    input.click();
  });
}

function pickFromNative(): Promise<string> {
  return new Promise((resolve, reject) => {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      unsubscribe();
      fn();
    };

    const unsubscribe = subscribeNativeMessage((payload) => {
      if (payload.action !== "image") return;
      if (payload.request_id != null && String(payload.request_id) !== requestId) {
        return;
      }

      if (payload.error) {
        finish(() => reject(new Error(String(payload.error))));
        return;
      }

      const dataUrl =
        typeof payload.data_url === "string"
          ? payload.data_url
          : typeof payload.base64 === "string"
            ? payload.base64.startsWith("data:")
              ? payload.base64
              : `data:image/jpeg;base64,${payload.base64}`
            : null;

      if (!dataUrl) {
        finish(() => reject(new Error("invalid_image")));
        return;
      }

      finish(() => resolve(dataUrl));
    });

    const timeoutId = window.setTimeout(() => {
      finish(() => reject(new Error("timeout")));
    }, PICK_TIMEOUT_MS);

    const sent = postToNative({
      action: "pick_image",
      request_id: requestId,
    });

    if (!sent) {
      finish(() => {
        pickFromFileInput().then(resolve, reject);
      });
    }
  });
}
