import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SESSION_KEY = "krypton.session";

// expo-secure-store has no web support; fall back to localStorage on web.
const store = {
  async getItemAsync(key) {
    if (Platform.OS === "web") {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async setItemAsync(key, value) {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  async deleteItemAsync(key) {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};

export function buildSession(authPayload = {}) {
  return {
    userId: authPayload.userId,
    name: authPayload.name || authPayload.email?.split("@")[0] || "Analyst",
    email: authPayload.email,
    authProvider: authPayload.authProvider || "local",
    avatar: authPayload.avatar || "",
    token: authPayload.token || null,
    gmailConnected: Boolean(authPayload.gmailConnected),
  };
}

export function isValidSession(session) {
  return Boolean(session?.token);
}

export async function loadSession() {
  try {
    const raw = await store.getItemAsync(SESSION_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return isValidSession(parsed) ? parsed : null;
  } catch (_error) {
    return null;
  }
}

export async function saveSession(session) {
  if (!isValidSession(session)) {
    await clearSession();
    return;
  }

  await store.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession() {
  await store.deleteItemAsync(SESSION_KEY);
}