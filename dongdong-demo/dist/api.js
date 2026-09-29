(() => {
  const SUPABASE_URL = 'https://citabymarkmfkyoscvft.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_8rX9kw0vCILyKXwIcbtvFg_17VEIPe5';
  const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
  const SESSION_KEY = 'dongdong.session.v1';
  const DEVICE_KEY = 'dongdong.device.v1';

  class ApiError extends Error {
    constructor(status, body) {
      super(body?.message || `HTTP ${status}`);
      this.status = status;
      this.code = body?.code;
      this.details = body?.details;
    }
  }

  const readJson = (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch (_) { return null; } };
  const writeJson = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} };

  function deviceKey() {
    let key = localStorage.getItem(DEVICE_KEY);
    if (!key) {
      key = crypto.randomUUID?.() || `web-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
      try { localStorage.setItem(DEVICE_KEY, key); } catch (_) {}
    }
    return key;
  }

  async function request(url, { method = 'GET', body, token, timeoutMs = 20000 } = {}) {
    const headers = { apikey: PUBLISHABLE_KEY };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new ApiError(response.status, data);
      return data;
    } catch (error) {
      if (error?.name === 'AbortError') {
        const timeout = new Error('请求超时');
        timeout.name = 'TimeoutError';
        throw timeout;
      }
      throw error;
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function createGuestSession() {
    const data = await request(`${FUNCTIONS_URL}/guest-sessions`, {
      method: 'POST',
      body: {
        platform: 'web',
        device_key: deviceKey(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai',
        locale: navigator.language || 'zh-CN'
      }
    });
    const session = { accessToken: data.access_token, refreshToken: data.refresh_token, userId: data.user.id };
    writeJson(SESSION_KEY, session);
    return session;
  }

  async function refreshSession(session) {
    if (!session?.refreshToken) return null;
    try {
      const data = await request(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        body: { refresh_token: session.refreshToken }
      });
      const next = { accessToken: data.access_token, refreshToken: data.refresh_token, userId: data.user?.id || session.userId };
      writeJson(SESSION_KEY, next);
      return next;
    } catch (_) {
      return null;
    }
  }

  async function ensureSession() {
    return readJson(SESSION_KEY) || createGuestSession();
  }

  async function authed(path, options = {}) {
    let session = await ensureSession();
    try {
      return await request(`${FUNCTIONS_URL}/${path}`, { ...options, token: session.accessToken });
    } catch (error) {
      if (error.status !== 401) throw error;
      session = (await refreshSession(session)) || (await createGuestSession());
      return request(`${FUNCTIONS_URL}/${path}`, { ...options, token: session.accessToken });
    }
  }

  async function listActions() {
    const select = [
      'code', 'name', 'primary_body_part', 'duration_sec', 'screen_cue', 'steps',
      'action_type', 'scenes', 'focus_areas', 'limit_knee', 'limit_back',
      'limit_neck', 'limit_wrist', 'source'
    ].join(',');
    const url = `${SUPABASE_URL}/rest/v1/exercise_actions?select=${select}&status=neq.archived&order=code.asc`;
    let session = await ensureSession();
    try {
      return await request(url, { token: session.accessToken });
    } catch (error) {
      if (error.status !== 401) throw error;
      session = (await refreshSession(session)) || (await createGuestSession());
      return request(url, { token: session.accessToken });
    }
  }

  window.dongdongApi = {
    ApiError,
    hasSession: () => Boolean(readJson(SESSION_KEY)),
    ensureSession,
    getMe: () => authed('me'),
    submitOnboarding: (payload) => authed('me-onboarding', { method: 'PUT', body: payload }),
    listActions,
    community: () => authed('community'),
    communityAct: (body) => authed('community', { method: 'POST', body }),
    clearSession: () => { try { localStorage.removeItem(SESSION_KEY); localStorage.removeItem(DEVICE_KEY); } catch (_) {} }
  };
})();
