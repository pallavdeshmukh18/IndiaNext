import { NativeModules, Platform } from "react-native";

const PRODUCTION_BACKEND_BASE_URL = "https://indianext.onrender.com";

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function getMetroHost() {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location.hostname;
  }

  const scriptURL = NativeModules.SourceCode?.scriptURL;

  if (!scriptURL) {
    return null;
  }

  try {
    return new URL(scriptURL).hostname;
  } catch (_error) {
    return null;
  }
}

function resolveBackendBaseUrl() {
  const explicitBaseUrl = trimTrailingSlash(process.env.EXPO_PUBLIC_API_URL || "");

  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/api$/, "");
  }

  const isDevelopment = typeof __DEV__ !== "undefined" && __DEV__;

  if (!isDevelopment) {
    return PRODUCTION_BACKEND_BASE_URL;
  }

  const host = getMetroHost();

  if (host) {
    return `http://${host}:8000`;
  }

  return "http://localhost:8000";
}

export const BACKEND_BASE_URL = resolveBackendBaseUrl();
export const API_BASE_URL = `${BACKEND_BASE_URL}/api`;

export class ApiError extends Error {
  constructor(message, status, payload = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function parseResponse(response) {
  const raw = await response.text();

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (_error) {
    return raw;
  }
}

async function request(url, { method = "GET", token, body, headers } = {}) {
  const requestHeaders = {
    Accept: "application/json",
    ...headers,
  };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  if (body && !isFormData && !requestHeaders["Content-Type"]) {
    requestHeaders["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    const message =
      payload?.error ||
      payload?.message ||
      (typeof payload === "string" && payload) ||
      "Request failed";

    throw new ApiError(message, response.status, payload);
  }

  return payload;
}

export function isUnauthorizedError(error) {
  return error instanceof ApiError && error.status === 401;
}

export const authApi = {
  login(credentials) {
    return request(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      body: credentials,
    });
  },

  register(payload) {
    return request(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      body: payload,
    });
  },
};

export const inboxApi = {
  getInboxScan({ userId, email, maxResults } = {}) {
    const url = new URL(`${BACKEND_BASE_URL}/scan`);

    if (email) {
      url.searchParams.set("email", email);
    } else if (userId) {
      url.searchParams.set("userId", userId);
    }

    if (maxResults) {
      url.searchParams.set("maxResults", String(maxResults));
    }

    return request(url.toString());
  },
};

export const threatApi = {
  analyze({ token, payload, inputType }) {
    return request(`${API_BASE_URL}/threats/analyze`, {
      method: "POST",
      token,
      body: {
        ...payload,
        inputType,
      },
    });
  },

  quickAnalyze({ token, payload, inputType }) {
    return request(`${API_BASE_URL}/threats/quick-analyze`, {
      method: "POST",
      token,
      body: {
        ...payload,
        inputType,
      },
    });
  },

  suiteAnalyze({ token, formData }) {
    return request(`${API_BASE_URL}/threats/suite-analyze`, {
      method: "POST",
      token,
      body: formData,
    });
  },

  liveScreenAnalyze({ token, payload }) {
    return request(`${API_BASE_URL}/threats/live-screen-analyze`, {
      method: "POST",
      token,
      body: payload,
    });
  },
};

export const analyticsApi = {
  getAnalytics(token) {
    return request(`${API_BASE_URL}/analytics`, { token });
  },

  getTrends(token) {
    return request(`${API_BASE_URL}/analytics/trends`, { token });
  },

  getThreatTypes(token) {
    return request(`${API_BASE_URL}/analytics/threat-types`, { token });
  },

  getAlerts(token) {
    return request(`${API_BASE_URL}/alerts`, { token });
  },

  getScans(token, { page = 1, limit = 20 } = {}) {
    return request(`${API_BASE_URL}/scans?page=${page}&limit=${limit}`, { token });
  },

  getScanById(token, scanId) {
    return request(`${API_BASE_URL}/scans/${scanId}`, { token });
  },
};