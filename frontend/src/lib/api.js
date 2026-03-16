const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '');
const BACKEND_BASE_URL = (import.meta.env.VITE_BACKEND_BASE_URL || BASE_URL.replace(/\/api$/, '')).replace(/\/$/, '');

async function request(path, { method = 'GET', token, body, signal } = {}) {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal
  });

  const raw = await response.text();
  let data = null;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Request failed');
  }

  return data;
}

export const authApi = {
  login(credentials) {
    return request('/auth/login', {
      method: 'POST',
      body: credentials
    });
  },

  register(payload) {
    return request('/auth/register', {
      method: 'POST',
      body: payload
    });
  },

  googleAuth(idToken) {
    return request('/auth/google', {
      method: 'POST',
      body: { idToken }
    });
  },

  getGoogleOAuthUrl(redirectPath = '/auth/google/callback') {
    const redirectUrl = new URL(redirectPath, window.location.origin);
    return `${BACKEND_BASE_URL}/auth/google?redirect=${encodeURIComponent(redirectUrl.toString())}`;
  }
};

export const inboxApi = {
  getInboxScan(userId) {
    const url = new URL(`${BACKEND_BASE_URL}/scan`);
    if (userId) {
      url.searchParams.set('userId', userId);
    }

    return fetch(url.toString()).then(async (response) => {
      const raw = await response.text();
      const data = raw ? JSON.parse(raw) : null;

      if (!response.ok) {
        throw new Error(data?.error || 'Unable to load inbox');
      }

      return data;
    });
  }
};

export const threatApi = {
  analyze({ token, payload, inputType }) {
    return request('/threats/analyze', {
      method: 'POST',
      token,
      body: {
        ...payload,
        inputType
      }
    });
  },

  quickAnalyze({ token, payload, inputType }) {
    return request('/threats/quick-analyze', {
      method: 'POST',
      token,
      body: {
        ...payload,
        inputType
      }
    });
  },

  suiteAnalyze({ token, formData }) {
    return fetch(`${BASE_URL}/threats/suite-analyze`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    }).then(async (response) => {
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    });
  },

  liveScreenAnalyze({ token, payload }) {
    return request('/threats/live-screen-analyze', {
      method: 'POST',
      token,
      body: payload
    });
  }
};

export const analyticsApi = {
  getAnalytics(token) {
    return request('/analytics', { token });
  },

  getTrends(token) {
    return request('/analytics/trends', { token });
  },

  getThreatTypes(token) {
    return request('/analytics/threat-types', { token });
  },

  getAlerts(token) {
    return request('/alerts', { token });
  },

  getScans(token, { page = 1, limit = 20 } = {}) {
    return request(`/scans?page=${page}&limit=${limit}`, { token });
  },

  getScanById(token, scanId) {
    return request(`/scans/${scanId}`, { token });
  }
};

export { BASE_URL as API_BASE_URL, BACKEND_BASE_URL };
