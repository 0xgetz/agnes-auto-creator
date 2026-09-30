/**
 * Agnes AI REST client.
 *
 * The Agnes platform backend is a plain JSON API. It is called through a
 * Playwright APIRequestContext so that TLS fingerprint and headers stay
 * browser-like and we never hit CORS limits.
 *
 * Endpoints (verified against the live platform):
 *   GET  /api/verification?email=<email>&purpose=register   -> email a code
 *   POST /api/user/register   {email,password,password_confirm,code}
 *   POST /api/user/login      {username,password}           -> {access_token}
 *   POST /api/token           {name,api_key_profile}        -> {key}
 *
 * @module agnes/client
 */

export const AGNES_API = "https://platform-backend.agnes-ai.com";

/** Default headers every Agnes request carries. */
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

/**
 * Thin JSON wrapper around the request context.
 * @param {import('playwright').APIRequestContext} request
 * @param {string} path
 * @param {{method?:string, body?:object, token?:string}} [opts]
 */
async function api(request, path, { method = "GET", body, token } = {}) {
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
    /* non-JSON body */
  }
  return { status: res.status(), json };
}

/** Ask Agnes to email a verification code for `purpose` (default register). */
export async function sendVerificationCode(request, email, purpose = "register") {
  const { status, json } = await api(
    request,
    `/api/verification?email=${encodeURIComponent(email)}&purpose=${purpose}`,
  );
  if (status !== 200 || json?.code !== 200) {
    throw new Error(`verification send failed (HTTP ${status}): ${JSON.stringify(json)}`);
  }
  return json;
}

/** Create the account. Requires the emailed verification `code`. */
export async function register(request, { email, password, code }) {
  const { status, json } = await api(request, "/api/user/register", {
    method: "POST",
    body: { email, password, password_confirm: password, code },
  });
  if (status !== 200 || json?.code !== 200) {
    throw new Error(`register failed (HTTP ${status}): ${JSON.stringify(json)}`);
  }
  return json;
}

/** Log in and return the session ({ access_token, token_type, user }). */
export async function login(request, { email, password }) {
  const { status, json } = await api(request, "/api/user/login", {
    method: "POST",
    body: { username: email, password },
  });
  if (status !== 200 || json?.code !== 200 || !json.data?.access_token) {
    throw new Error(`login failed (HTTP ${status}): ${JSON.stringify(json)}`);
  }
  return json.data;
}

/** Create a personal API key and return the `sk-...` secret. */
export async function createApiKey(request, token, name, profile = "default") {
  const { status, json } = await api(request, "/api/token", {
    method: "POST",
    token,
    body: { name, api_key_profile: profile },
  });
  if (status !== 200 || json?.code !== 200 || !json.data?.key) {
    throw new Error(`key creation failed (HTTP ${status}): ${JSON.stringify(json)}`);
  }
  return json.data.key;
}
