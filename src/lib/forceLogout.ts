import {
  clearAccessToken,
  clearUserId,
  getAccessToken,
} from "@/lib/authToken";
import { logout as nativeLogout } from "@/lib/navbarController";
import { revokeAccess } from "@/lib/userSession";

let logoutInProgress = false;

function logoutApiUrl(): string {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
  return `${base}/api/auth/logout`;
}

async function revokeServerToken(token: string): Promise<void> {
  try {
    await fetch(logoutApiUrl(), {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },

    });
    
    console.log("revokeServerToken----------------------------------");
    console.log("token", token);
  } catch {
    // continue local logout
  }
}

/**
 * Полный logout: revoke на сервере → очистка storage → native logout.
 * Гостевого режима нет.
 */
export function forceLogout(): void {
  if (typeof window === "undefined") return;
  if (logoutInProgress) return;

  logoutInProgress = true;
  const token = getAccessToken();

  const finish = () => {
    try {
      clearAccessToken();
      clearUserId();
      revokeAccess();
      nativeLogout();
    } finally {
      window.setTimeout(() => {
        logoutInProgress = false;
      }, 300);
    }
  };

  if (token) {
    void revokeServerToken(token).finally(finish);
    return;
  }

  finish();
}

export function requireAccessToken(): string {
  const token = getAccessToken();
  if (!token) {
    forceLogout();
    throw new Error("Unauthenticated");
  }
  return token;
}
