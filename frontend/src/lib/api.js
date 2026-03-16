const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '');

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
  }
};

export const threatApi = {
  analyze({ token, input, inputType }) {
    return request('/threats/analyze', {
      method: 'POST',
      token,
      body: {
        input,
        inputType
      }
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
  }
};

export { BASE_URL as API_BASE_URL };