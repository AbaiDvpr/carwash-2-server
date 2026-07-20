import { apiUrl, ApiError, getApiBaseUrl } from "@/lib/api";
import type { AuthUser } from "@/lib/api/auth";
import { getAccessToken } from "@/lib/authToken";
import { cacheUserProfile } from "@/lib/userSession";

type PhotoResponse = {
  message: string;
  photo_url: string | null;
  user: AuthUser;
};

/** Абсолютный URL для /storage/... или внешний http(s). */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalized}`;
}

async function parseJson(response: Response, path: string): Promise<PhotoResponse> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) {
    throw new ApiError(response.status, path, body);
  }
  return body as PhotoResponse;
}

export async function uploadUserPhoto(file: Blob, filename = "avatar.jpg"): Promise<AuthUser> {
  const token = getAccessToken();
  if (!token) {
    throw new ApiError(401, "/api/auth/photo", { message: "Unauthenticated." });
  }

  const form = new FormData();
  form.append("photo", file, filename);

  const response = await fetch(apiUrl("/api/auth/photo"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  const data = await parseJson(response, "/api/auth/photo");
  cacheUserProfile(data.user);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("user-profile-updated"));
  }
  return data.user;
}

export async function deleteUserPhoto(): Promise<AuthUser> {
  const token = getAccessToken();
  if (!token) {
    throw new ApiError(401, "/api/auth/photo", { message: "Unauthenticated." });
  }

  const response = await fetch(apiUrl("/api/auth/photo"), {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await parseJson(response, "/api/auth/photo");
  cacheUserProfile(data.user);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("user-profile-updated"));
  }
  return data.user;
}
