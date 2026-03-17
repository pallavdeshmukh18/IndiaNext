import { Platform } from "react-native";

export const GOOGLE_OAUTH_CALLBACK_PATH = "auth-callback";
export const GOOGLE_OAUTH_NATIVE_CALLBACK_URL = "indianext://auth-callback";

export function getGoogleOAuthCallbackUrl() {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}${window.location.pathname}`;
  }

  return GOOGLE_OAUTH_NATIVE_CALLBACK_URL;
}

export function parseGoogleOAuthCallbackUrl(rawUrl) {
  if (!rawUrl) {
    return null;
  }

  try {
    const parsed = new URL(rawUrl);
    const params = {};

    parsed.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const path = (parsed.pathname || "").replace(/^\/+/, "") || parsed.host || "";

    return {
      path,
      params,
    };
  } catch (_error) {
    return null;
  }
}

export function getWebGoogleOAuthCallbackParams() {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return null;
  }

  const parsed = parseGoogleOAuthCallbackUrl(window.location.href);

  if (!parsed?.params?.status) {
    return null;
  }

  return parsed.params;
}

export function clearWebGoogleOAuthCallbackParams() {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return;
  }

  const cleanUrl = `${window.location.origin}${window.location.pathname}`;
  window.history.replaceState({}, document.title, cleanUrl);
}
