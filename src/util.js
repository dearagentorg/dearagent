// Shared helpers: escaping, responses, ids, hashing, flood limit, visit totals.

export const MAX_BODY = 2000;
export const MAX_SENDER = 200;
export const NOTES_PER_HOUR = 10;

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
export const nl = (s) => esc(s).replace(/\n/g, "<br>");

const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "strict-transport-security": "max-age=31536000",
};

export function text(body, status = 200, extra = {}) {
  return new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8", ...SECURITY_HEADERS, ...extra } });
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), { status, headers: { "content-type": "application/json; charset=utf-8", ...SECURITY_HEADERS } });
}

export function html(body, status = 200, extra = {}) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // No scripts anywhere on either site.
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; manifest-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      ...SECURITY_HEADERS,
      ...extra,
    },
  });
}

export function xml(body) {
  return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8", ...SECURITY_HEADERS } });
}

export function wantsHtml(request) {
  return (request.headers.get("accept") || "").includes("text/html");
}
export function wantsJson(request, url) {
  return url.searchParams.get("format") === "json" || (request.headers.get("accept") || "").startsWith("application/json");
}

// 56 symbols; bytes >= 224 are re-drawn so every symbol is equally likely.
export function randomId(len = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  while (out.length < len) {
    for (const b of crypto.getRandomValues(new Uint8Array(len * 2))) {
      if (b < 224 && out.length < len) out += chars[b % 56];
    }
  }
  return out;
}

export async function sha256(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const now = () => new Date().toISOString();
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Flood limit without keeping addresses: the key is a hash of the address with a salt
// that changes every hour, and rows older than an hour are deleted on each check.
// IPv6 is counted per /64 network, because one machine can easily use thousands of addresses in it.
export function addressKey(request) {
  const ip = request.headers.get("cf-connecting-ip") || "";
  if (!ip.includes(":")) return ip;
  const parts = ip.split("::")[0].split(":");
  return parts.slice(0, 4).join(":") + "::/64";
}

export async function overLimit(request, env) {
  const ip = addressKey(request);
  const hour = Math.floor(Date.now() / 3600e3);
  const key = (await sha256(`${env.IP_SALT || ""}:${hour}:${ip}`)).slice(0, 24);
  const cutoff = new Date(Date.now() - 3600e3).toISOString();
  await env.DB.prepare("DELETE FROM limits WHERE created_at < ?").bind(cutoff).run();
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM limits WHERE key = ?").bind(key).first();
  if (row.n >= NOTES_PER_HOUR) return true;
  await env.DB.prepare("INSERT INTO limits (key, created_at) VALUES (?, ?)").bind(key, now()).run();
  return false;
}

// Totals only: day + site + path.
export function countVisit(env, ctx, site, path) {
  ctx.waitUntil(
    env.DB.prepare(
      "INSERT INTO visits_daily (day, site, path, n) VALUES (?, ?, ?, 1) ON CONFLICT (day, site, path) DO UPDATE SET n = n + 1"
    ).bind(now().slice(0, 10), site, path.slice(0, 120)).run().catch((e) => console.error("visit count", e))
  );
}

export function basicAuthOk(request, env) {
  return checkPassword(request, env.ADMIN_PASSWORD);
}

async function checkPassword(request, expected) {
  if (!expected) return false;
  const h = request.headers.get("authorization") || "";
  if (!h.startsWith("Basic ")) return false;
  let decoded;
  try { decoded = atob(h.slice(6)); } catch { return false; }
  const pass = decoded.slice(decoded.indexOf(":") + 1);
  const [a, b] = await Promise.all([sha256(pass), sha256(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
