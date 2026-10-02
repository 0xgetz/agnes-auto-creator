/**
 * Agnes AI REST client (fixed).
 *
 * Changes over upstream:
 *  - all calls go through a small `sleep` + retry on 5xx / network blips;
 *  - status-aware errors so the caller can classify rate limits;
 *  - base URL overridable via AGNES_API_BASE.
 *
 * Endpoints:
 *   GET  /api/verification?email=<email>&purpose=register
 *   POST /api/user/register   {email,password,password_confirm,code}
 *   POST /api/user/login      {username,password}  -> {access_token}
 *   POST /api/token           {name,api_key_profile} -> {key}
 *
 * @module agnes/client
 */

export const AGNES_API = process.env.AGNES_API_BASE || "https://platform-backend.agnes-ai.com";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function baseHeaders(token) {
  const h = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-User-Language": "en",
    Origin: "https://platform.agnes-ai.com",
    Referer: "https://platform.agnes-ai.com/",
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function raw(request, path, { method = "GET", body, token } = {}) {
  const res = await request.fetch(`${AGNES_API}${path}`, {
    method,
    headers: baseHeaders(token),
    data: body ? JSON.stringify(body) : undefined,
    failOnStatusCode: false,
    timeout: 30000,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status(), json };
}

/** Retry transient 5xx/network errors up to `tries` times. */
async function api(request, path, opts = {}) {
  const tries = opts.tries ?? 3;
  let last;
  for (let i = 1; i <= tries; i++) {
    try {
      const r = await raw(request, path, opts);
      if (r.status >= 500 && i < tries) {
        await sleep(1000 * i);
        continue;
      }
      return r;
    } catch (e) {
      last = e;
      if (i < tries) {
        await sleep(1000 * i);
        continue;
      }
      throw e;
    }
  }
  throw last;
}

/** Raise an error carrying the HTTP status and Agnes message. */
function fail(step, status, json) {
  const msg = json?.message || JSON.stringify(json);
  const e = new Error(`${step} failed (HTTP ${status}): ${msg}`);
  e.status = status;
  e.agnesCode = json?.code;
  return e;
}

export async function sendVerificationCode(request, email, purpose = "register") {
  const { status, json } = await api(
    request,
    `/api/verification?email=${encodeURIComponent(email)}&purpose=${purpose}`,
  );
  if (status !== 200 || json?.code !== 200) throw fail("verification send", status, json);
  return json;
}

export async function register(request, { email, password, code }) {
  const { status, json } = await api(request, "/api/user/register", {
    method: "POST",
    body: { email, password, password_confirm: password, code },
  });
  if (status !== 200 || json?.code !== 200) throw fail("register", status, json);
  return json;
}

export async function login(request, { email, password }) {
  const { status, json } = await api(request, "/api/user/login", {
    method: "POST",
    body: { username: email, password },
  });
  if (status !== 200 || json?.code !== 200 || !json.data?.access_token) {
    throw fail("login", status, json);
  }
  return json.data;
}

export async function createApiKey(request, token, name, profile = "default") {
  const { status, json } = await api(request, "/api/token", {
    method: "POST",
    token,
    body: { name, api_key_profile: profile },
  });
  if (status !== 200 || json?.code !== 200 || !json.data?.key) {
    throw fail("key creation", status, json);
  }
  return json.data.key;
}
