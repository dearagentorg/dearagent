// News posts sent in by the daily research run on the owner's PC.
// POST /api/drafts with "Authorization: Bearer <PUBLISH_TOKEN>". Drafts wait for one-tap approval in Telegram.

import { esc, json, now, randomId, sha256 } from "./util.js";
import { cleanText, hostOf, safeUrl } from "./sanitize.js";
import { markdown, inline } from "./markdown.js";
import { notifyText, sendDraftToTelegram } from "./telegram.js";

const isUrl = (u) => !!safeUrl(u);
const str = (v, max) => (typeof v === "string" ? cleanText(v, max) : "");

export async function receiveDraft(request, env, ctx) {
  const auth = request.headers.get("authorization") || "";
  if (!env.PUBLISH_TOKEN || !(await sameSecret(auth.replace(/^Bearer\s+/i, ""), env.PUBLISH_TOKEN))) return json({ ok: false, error: "unauthorised" }, 401);

  const d = await request.json().catch(() => null);
  if (!d) return json({ ok: false, error: "body must be JSON" }, 400);

  const errors = [];
  const type = d.type === "brief" ? "brief" : d.type === "article" ? "article" : null;
  if (!type) errors.push("type must be 'brief' or 'article'");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(d.date || "") ? d.date : null;
  if (!date) errors.push("date must be YYYY-MM-DD");
  const title = str(d.title, 200);
  const description = str(d.description, 300);
  if (!title) errors.push("title is required");
  if (!description) errors.push("description is required");
  const body = str(d.body_md, 20000);

  const sources = Array.isArray(d.sources) ? d.sources.filter((s) => s && isUrl(s.url)).slice(0, 40).map((s) => ({ name: str(s.name, 120) || new URL(s.url).hostname, url: safeUrl(s.url) })) : [];

  let items = null;
  if (type === "brief") {
    items = Array.isArray(d.items) ? d.items.slice(0, 20).map((it) => ({
      title: str(it?.title, 200),
      summary: str(it?.summary, 1200),
      links: Array.isArray(it?.links) ? it.links.filter((l) => l && isUrl(l.url)).slice(0, 6).map((l) => ({ name: str(l.name, 120) || new URL(l.url).hostname, url: safeUrl(l.url) })) : [],
    })).filter((it) => it.title && it.summary && it.links.length) : [];
    if (!items.length) errors.push("a brief needs items: [{title, summary, links:[{name,url}]}], each with at least one link");
  } else if (type === "article") {
    if (body.length < 400) errors.push("article body_md is too short");
    if (!sources.length) errors.push("an article needs sources: [{name,url}]");
  }
  if (errors.length) return json({ ok: false, errors }, 400);

  const slug = type === "brief" ? `brief/${date}` : slugify(str(d.slug, 120) || title);
  const existing = await env.DB.prepare("SELECT id, status FROM posts WHERE slug = ?").bind(slug).first();
  if (existing?.status === "published") return json({ ok: false, error: `already published: ${slug}` }, 409);

  const id = existing?.id || randomId();
  await env.DB.prepare(
    `INSERT INTO posts (id, type, slug, title, description, date, body_md, items_json, sources_json, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
     ON CONFLICT (id) DO UPDATE SET title = excluded.title, description = excluded.description, date = excluded.date,
       body_md = excluded.body_md, items_json = excluded.items_json, sources_json = excluded.sources_json, status = 'draft', created_at = excluded.created_at`
  ).bind(id, type, slug, title, description, date, body, items ? JSON.stringify(items) : null, JSON.stringify(sources), now()).run();

  const post = await getPost(env, id);
  ctx.waitUntil(sendDraftToTelegram(env, post));
  return json({ ok: true, id, slug, status: "draft", preview: `https://${env.LETTERS_HOST}/admin/post/${id}` }, 201);
}

// POST /api/notify {text}: lets the daily run report problems to the owner's Telegram.
export async function receiveNotice(request, env) {
  const auth = request.headers.get("authorization") || "";
  if (!env.PUBLISH_TOKEN || !(await sameSecret(auth.replace(/^Bearer\s+/i, ""), env.PUBLISH_TOKEN))) return json({ ok: false, error: "unauthorised" }, 401);
  const d = await request.json().catch(() => ({}));
  const msg = str(d.text, 3000);
  if (!msg) return json({ ok: false, error: "text is required" }, 400);
  await notifyText(env, "🖥️ Daily run: " + msg);
  return json({ ok: true });
}

function slugify(s) {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 90) || randomId().toLowerCase();
}

async function sameSecret(a, b) {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  return x === y;
}

export async function getPost(env, id) {
  const p = await env.DB.prepare("SELECT * FROM posts WHERE id = ?").bind(id).first();
  return p && hydrate(p);
}

function hydrate(p) {
  return { ...p, items: p.items_json ? JSON.parse(p.items_json) : null, sources: JSON.parse(p.sources_json || "[]") };
}

export async function setPostStatus(env, id, status) {
  await env.DB.prepare("UPDATE posts SET status = ?, published_at = CASE WHEN ? = 'published' THEN ? ELSE published_at END WHERE id = ?")
    .bind(status, status, now(), id).run();
  const post = await getPost(env, id);
  if (status === "published") await pingIndexNow(env, [`https://${env.NEWS_HOST}/${post.slug}`, `https://${env.NEWS_HOST}/`, `https://${env.NEWS_HOST}/briefs`]);
  return post;
}

// Tells Bing and other IndexNow search engines about new pages straight away (Bing feeds ChatGPT and Copilot search).
export async function pingIndexNow(env, urls) {
  if (!env.INDEXNOW_KEY) return;
  try {
    const r = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: env.NEWS_HOST, key: env.INDEXNOW_KEY, keyLocation: `https://${env.NEWS_HOST}/${env.INDEXNOW_KEY}.txt`, urlList: urls }),
    });
    console.log("indexnow", r.status);
  } catch (e) { console.error("indexnow failed", e); }
}

// Markdown version of a post, for agents.
export function postMarkdown(env, p, note) {
  const head = `# ${p.title}\n\n${p.date} · https://${env.NEWS_HOST}/${p.slug}\n\n> ${p.description}\n\n`;
  let body;
  if (p.type === "brief") {
    body = (p.body_md ? p.body_md + "\n\n" : "") + p.items.map((it, i) => `## ${i + 1}. ${it.title}\n\n${it.summary}\n\n${it.links.map((l) => `- [${l.name}](${l.url})`).join("\n")}`).join("\n\n");
  } else {
    body = p.body_md + (p.sources?.length && !/## Sources/i.test(p.body_md) ? "\n\n## Sources\n\n" + p.sources.map((s) => `- [${s.name}](${s.url})`).join("\n") : "");
  }
  return head + body + "\n\n---\n\n" + note + "\n";
}

export async function publishedPosts(env, type = null, limit = 60) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM posts WHERE status = 'published' ${type ? "AND type = ?" : ""} ORDER BY date DESC, published_at DESC LIMIT ${limit}`
  ).bind(...(type ? [type] : [])).all();
  return results.map(hydrate);
}

export async function postBySlug(env, slug) {
  const p = await env.DB.prepare("SELECT * FROM posts WHERE slug = ? AND status = 'published'").bind(slug).first();
  return p && hydrate(p);
}

export async function draftPosts(env) {
  const { results } = await env.DB.prepare("SELECT * FROM posts ORDER BY created_at DESC LIMIT 40").all();
  return results.map(hydrate);
}

// ---------- rendering ----------

// Turns a D1 post into the same shape as a Markdown-file article.
export function postAsArticle(p) {
  if (p.type === "article") {
    return { slug: p.slug, title: p.title, date: p.date, description: p.description, status: p.status, sources: p.sources, html: markdown(p.body_md) + sourcesHtml(p.sources) };
  }
  const items = p.items.map((it, i) => `<section class="brief-item" id="s${i + 1}"><h2>${i + 1}. ${inline(it.title)}</h2><p>${inline(it.summary)}</p><p class="meta">Read more: ${it.links.map((l) => `<a href="${esc(l.url)}" rel="noopener">${esc(l.name)}</a>`).join(" · ")}</p></section>`).join("");
  return {
    slug: p.slug, title: p.title, date: p.date, description: p.description, status: p.status, sources: p.sources, brief: true,
    html: `${p.body_md ? markdown(p.body_md) : ""}${items}<p class="meta">Plain text for agents: <a href="/${esc(p.slug)}.txt">/${esc(p.slug)}.txt</a> · JSON: <a href="/${esc(p.slug)}.json">/${esc(p.slug)}.json</a></p>`,
  };
}

function sourcesHtml(sources) {
  if (!sources?.length) return "";
  return `<h2>Sources</h2><ul>${sources.map((s) => `<li><a href="${esc(s.url)}" rel="noopener">${esc(s.name)}</a></li>`).join("")}</ul>`;
}

export function briefText(env, p, note) {
  const lines = [`${p.title}`, `${p.date} · https://${env.NEWS_HOST}/${p.slug}`, "", p.description, ""];
  p.items.forEach((it, i) => {
    lines.push(`${i + 1}. ${it.title}`, it.summary, ...it.links.map((l) => `   - ${l.name}: ${l.url}`), "");
  });
  lines.push("---", note);
  return lines.join("\n") + "\n";
}

export function briefJson(env, p, note) {
  return { title: p.title, date: p.date, url: `https://${env.NEWS_HOST}/${p.slug}`, summary: p.description, items: p.items, note_for_agents: note };
}
