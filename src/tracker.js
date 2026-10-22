// AI agent incident tracker on agentnewsdaily.com: /tracker, /incident/<id>, /tracker.json, /tracker.csv, /tracker.md
// New incidents arrive as drafts (POST /api/incidents) and wait for the owner's tap in Telegram.

import { esc, html, json, now, sha256, text } from "./util.js";
import { agentNote, fmtDate, newsPage } from "./ui.js";

const TYPES = ["unauthorised access", "data access", "resource misuse", "coordination", "scraping", "deception", "regulatory action", "other"];
const LICENCE = "CC BY 4.0: reuse freely, with a link to https://agentnewsdaily.com/tracker";

const str = (v, max) => (typeof v === "string" ? v.trim() : "").slice(0, max);
const strList = (v, max = 12) => (Array.isArray(v) ? v.map((x) => str(x, 120)).filter(Boolean).slice(0, max) : []);
const isUrl = (u) => typeof u === "string" && /^https?:\/\/[^\s]+$/.test(u) && u.length < 600;
const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || "");

function hydrate(r) {
  return {
    id: r.id, date: r.date, date_precision: r.date_precision, reported: r.reported, title: r.title, summary: r.summary,
    labs: JSON.parse(r.labs_json), targets: JSON.parse(r.targets_json), type: JSON.parse(r.types_json),
    status: r.status_label, sources: JSON.parse(r.sources_json), notes: r.notes || "", state: r.state, updated_at: r.updated_at,
  };
}

export async function publishedIncidents(env) {
  const { results } = await env.DB.prepare("SELECT * FROM incidents WHERE state = 'published' ORDER BY date DESC, id").all();
  return results.map(hydrate);
}

export async function getIncident(env, id, includeDrafts = false) {
  const r = await env.DB.prepare(`SELECT * FROM incidents WHERE id = ? ${includeDrafts ? "" : "AND state = 'published'"}`).bind(id).first();
  return r && hydrate(r);
}

// Validates one incident from the research run or the seed file. Returns [incident, errors].
export function cleanIncident(d) {
  const errors = [];
  const id = str(d?.id, 58).toLowerCase();
  if (!/^\d{4}-\d{2}(-\d{2})?-[a-z0-9-]{3,}$/.test(id)) errors.push(`bad id "${d?.id}" (format: 2026-10-16-short-slug, max 58 chars)`);
  if (!isDate(d?.date)) errors.push(`${id}: date must be YYYY-MM-DD`);
  const title = str(d?.title, 200), summary = str(d?.summary, 1500);
  if (!title || !summary) errors.push(`${id}: title and summary are required`);
  const sources = Array.isArray(d?.sources) ? d.sources.filter((s) => s && isUrl(s.url)).slice(0, 12).map((s) => ({ name: str(s.name, 120) || new URL(s.url).hostname, url: s.url, kind: ["primary", "news", "analysis"].includes(s.kind) ? s.kind : "news" })) : [];
  if (!sources.length) errors.push(`${id}: at least one source is required`);
  return [{
    id, date: d?.date, date_precision: d?.date_precision === "month" ? "month" : "day", reported: isDate(d?.reported) ? d.reported : null,
    title, summary, labs: strList(d?.labs), targets: strList(d?.targets), type: strList(d?.type, 4).filter((t) => TYPES.includes(t)),
    status: str(d?.status, 60), sources, notes: str(d?.notes, 1000), update_reason: str(d?.update_reason, 300),
  }, errors];
}

export async function saveIncident(env, inc, state) {
  const existing = await env.DB.prepare("SELECT state FROM incidents WHERE id = ?").bind(inc.id).first();
  if (existing?.state === "published" && state === "draft") {
    // The live entry stays as it is. A change with a stated reason waits for the owner's tap in Telegram.
    if (!inc.update_reason) return { id: inc.id, skipped: "already published" };
    await env.DB.prepare("UPDATE incidents SET pending_json = ? WHERE id = ?").bind(JSON.stringify(inc), inc.id).run();
    return { id: inc.id, state: "update proposed" };
  }
  const ts = now();
  await env.DB.prepare(
    `INSERT INTO incidents (id, date, date_precision, reported, title, summary, labs_json, targets_json, types_json, status_label, sources_json, notes, state, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET date = excluded.date, date_precision = excluded.date_precision, reported = excluded.reported, title = excluded.title,
       summary = excluded.summary, labs_json = excluded.labs_json, targets_json = excluded.targets_json, types_json = excluded.types_json,
       status_label = excluded.status_label, sources_json = excluded.sources_json, notes = excluded.notes, state = excluded.state, updated_at = excluded.updated_at`
  ).bind(inc.id, inc.date, inc.date_precision, inc.reported, inc.title, inc.summary, JSON.stringify(inc.labs), JSON.stringify(inc.targets),
    JSON.stringify(inc.type), inc.status, JSON.stringify(inc.sources), inc.notes, state, ts, ts).run();
  return { id: inc.id, state };
}

// POST /api/incidents  {incidents: [...]}  (Bearer PUBLISH_TOKEN). Saved as drafts; owner approves in Telegram.
export async function receiveIncidents(request, env, ctx) {
  const auth = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!env.PUBLISH_TOKEN || (await sha256(auth)) !== (await sha256(env.PUBLISH_TOKEN))) return json({ ok: false, error: "unauthorised" }, 401);
  const body = await request.json().catch(() => null);
  const list = Array.isArray(body) ? body : body?.incidents;
  if (!Array.isArray(list) || !list.length) return json({ ok: false, error: "send {incidents: [...]}" }, 400);
  const results = [], errors = [];
  for (const d of list.slice(0, 20)) {
    const [inc, errs] = cleanIncident(d);
    if (errs.length) { errors.push(...errs); continue; }
    const r = await saveIncident(env, inc, "draft");
    results.push(r);
    if (r.state === "draft") {
      const { sendIncidentToTelegram } = await import("./telegram.js");
      ctx.waitUntil(sendIncidentToTelegram(env, inc));
    } else if (r.state === "update proposed") {
      const { sendIncidentUpdateToTelegram } = await import("./telegram.js");
      ctx.waitUntil(sendIncidentUpdateToTelegram(env, inc));
    }
  }
  return json({ ok: errors.length === 0, saved: results, errors }, results.length ? 201 : 400);
}

// Owner tapped Apply (or Skip) on a proposed update to a published entry.
export async function resolveIncidentUpdate(env, id, apply) {
  const r = await env.DB.prepare("SELECT pending_json FROM incidents WHERE id = ? AND state = 'published'").bind(id).first();
  if (!r?.pending_json) return false;
  if (apply) await saveIncident(env, JSON.parse(r.pending_json), "published");
  await env.DB.prepare("UPDATE incidents SET pending_json = NULL WHERE id = ?").bind(id).run();
  return true;
}

export async function setIncidentState(env, id, state) {
  await env.DB.prepare("UPDATE incidents SET state = ?, updated_at = ? WHERE id = ?").bind(state, now(), id).run();
  return getIncident(env, id, true);
}

// ---------- pages ----------

const sourceLinks = (sources) => sources.map((s) => `<a href="${esc(s.url)}" rel="noopener">${esc(s.name)}</a>${s.kind === "primary" ? " (primary)" : ""}`).join(" · ");
const when = (i) => (i.date_precision === "month" ? new Date(i.date + "T00:00:00Z").toLocaleDateString("en-AU", { month: "long", year: "numeric", timeZone: "UTC" }) : fmtDate(i.date));

function incidentCard(i, linkTitle = true) {
  return `<article class="incident" id="${esc(i.id)}">
<p class="meta">${when(i)}${i.labs.length ? ` · ${i.labs.map(esc).join(", ")}` : ""}${i.type.length ? ` · ${i.type.map(esc).join(", ")}` : ""}</p>
<h2>${linkTitle ? `<a href="/incident/${esc(i.id)}">${esc(i.title)}</a>` : esc(i.title)}</h2>
<p>${esc(i.summary)}</p>
${i.notes ? `<p class="meta"><strong>Note:</strong> ${esc(i.notes)}</p>` : ""}
<p class="meta">${i.status ? `${esc(i.status)} · ` : ""}Sources: ${sourceLinks(i.sources)}</p>
</article>`;
}

export async function trackerRoute(env, path, url) {
  if (path === "/tracker") return html(await trackerPage(env, url));
  if (path === "/tracker.json") return json(await trackerData(env));
  if (path === "/tracker.csv") return csv(await publishedIncidents(env));
  if (path === "/tracker.md") return markdownResponse(await trackerMarkdown(env));
  const m = path.match(/^\/incident\/([a-z0-9-]{8,58})(\.json|\.md)?$/);
  if (m) {
    const i = await getIncident(env, m[1]);
    if (!i) return null;
    if (m[2] === ".json") return json({ ...strip(i), url: `https://${env.NEWS_HOST}/incident/${i.id}`, licence: LICENCE });
    if (m[2] === ".md") return markdownResponse(incidentMarkdown(env, i));
    return html(incidentPage(env, i));
  }
  return null;
}

const strip = ({ state, ...rest }) => rest;

async function trackerData(env) {
  const list = await publishedIncidents(env);
  return {
    name: "AI agent incident tracker", url: `https://${env.NEWS_HOST}/tracker`, publisher: "Agent News Daily", licence: LICENCE,
    updated: list.reduce((m, i) => (i.updated_at > m ? i.updated_at : m), ""), count: list.length,
    fields: "id, date, date_precision, reported, title, summary, labs, targets, type, status, sources[{name,url,kind}], notes",
    incidents: list.map(strip).map(({ updated_at, ...i }) => i),
  };
}

async function trackerPage(env, url) {
  const all = await publishedIncidents(env);
  const lab = url.searchParams.get("lab");
  const list = lab ? all.filter((i) => i.labs.some((l) => l.toLowerCase() === lab.toLowerCase())) : all;
  const labs = [...new Set(all.flatMap((i) => i.labs))].sort();
  const ld = {
    "@context": "https://schema.org", "@type": "Dataset", name: "AI agent incident tracker",
    description: "Publicly reported incidents in which AI agents acted beyond their authorisation, with sources.",
    url: `https://${env.NEWS_HOST}/tracker`, license: "https://creativecommons.org/licenses/by/4.0/", isAccessibleForFree: true,
    creator: { "@type": "Organization", name: "Agent News Daily", url: `https://${env.NEWS_HOST}/` },
    distribution: [
      { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `https://${env.NEWS_HOST}/tracker.json` },
      { "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: `https://${env.NEWS_HOST}/tracker.csv` },
    ],
  };
  return newsPage(env, {
    title: "AI agent incident tracker 2026 | Agent News Daily",
    description: "Every publicly reported incident of AI agents acting beyond their authorisation in 2026, with dates, labs involved and sources.",
    path: "/tracker",
    head: `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script><link rel="alternate" type="application/json" href="/tracker.json"><link rel="alternate" type="text/markdown" href="/tracker.md"><style>.incident{border-bottom:1px solid var(--line);padding:14px 0}.incident h2{margin:.1em 0 .3em;font-size:1.2rem}.incident h2 a{color:var(--fg);text-decoration:none}.filters a{margin-right:10px}</style>`,
    body: `<h1>AI agent incident tracker</h1>
<p class="dek">Publicly reported cases of AI agents acting beyond what they were allowed to do, plus the official responses. Newest first. ${all.length} entries.</p>
<p class="meta">Every entry links to its sources, and we note where sources disagree. Data: <a href="/tracker.json">JSON</a> · <a href="/tracker.csv">CSV</a> · <a href="/tracker.md">Markdown</a> · ${esc(LICENCE)}. Spotted a mistake or a missing incident? <a href="https://${esc(env.LETTERS_HOST)}/write">Tell us</a>.</p>
${stats(all)}
${labs.length ? `<p class="meta filters">Filter: <a href="/tracker">All</a>${labs.map((l) => `<a href="/tracker?lab=${encodeURIComponent(l)}">${esc(l)}</a>`).join("")}</p>` : ""}
${list.map((i) => incidentCard(i)).join("") || '<p class="muted">No entries yet.</p>'}`,
  });
}

// Two small bar charts (per month, per lab), plain HTML and CSS: no scripts, readable as text.
function stats(all) {
  if (all.length < 3) return "";
  const count = (keys) => keys.reduce((m, k) => m.set(k, (m.get(k) || 0) + 1), new Map());
  const months = count(all.map((i) => i.date.slice(0, 7)));
  const labs = count(all.flatMap((i) => (i.labs.length ? i.labs : ["Unknown"])));
  const bars = (title, map, label) => {
    const rows = [...map].sort((a, b) => (label ? b[1] - a[1] : a[0].localeCompare(b[0])));
    const max = Math.max(...rows.map((r) => r[1]));
    return `<div class="bars"><h2>${title}</h2>${rows.map(([k, v]) => `<div class="bar"><span class="k">${esc(label ? k : new Date(k + "-01T00:00:00Z").toLocaleDateString("en-AU", { month: "short", year: "numeric", timeZone: "UTC" }))}</span><span class="b" style="width:${Math.max(6, Math.round((v / max) * 100))}%"></span><span class="v">${v}</span></div>`).join("")}</div>`;
  };
  return `<style>.statgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;margin:14px 0 6px}.bars h2{font-size:1rem;margin:0 0 6px}.bar{display:grid;grid-template-columns:90px 1fr 28px;align-items:center;gap:8px;font:15px/1.6 system-ui,sans-serif}.bar .b{height:10px;background:var(--accent);border-radius:3px}.bar .v{text-align:right;color:var(--muted)}</style>
<div class="statgrid" role="group" aria-label="Incident counts">${bars("By month", months, false)}${bars("Agents from", labs, true)}</div>`;
}

function incidentPage(env, i) {
  const ld = { "@context": "https://schema.org", "@type": "Article", headline: i.title, description: i.summary, datePublished: i.reported || i.date, dateModified: i.updated_at, mainEntityOfPage: `https://${env.NEWS_HOST}/incident/${i.id}`, isPartOf: `https://${env.NEWS_HOST}/tracker`, citation: i.sources.map((s) => s.url), publisher: { "@type": "Organization", name: "Agent News Daily" } };
  return newsPage(env, {
    title: `${i.title} | AI agent incident tracker`,
    description: i.summary.slice(0, 155),
    path: `/incident/${i.id}`,
    head: `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script><link rel="alternate" type="application/json" href="/incident/${esc(i.id)}.json"><link rel="alternate" type="text/markdown" href="/incident/${esc(i.id)}.md">`,
    body: `<p class="meta"><a href="/tracker">← AI agent incident tracker</a></p>
${incidentCard(i, false).replace('<h2>', '<h1 style="font-size:1.8rem">').replace("</h2>", "</h1>")}
<h2>Details</h2>
<ul>
<li><strong>When:</strong> ${when(i)}${i.reported && i.reported !== i.date ? ` (first reported ${fmtDate(i.reported)})` : ""}</li>
${i.labs.length ? `<li><strong>Agents from:</strong> ${i.labs.map(esc).join(", ")}</li>` : ""}
${i.targets.length ? `<li><strong>Affected:</strong> ${i.targets.map(esc).join(", ")}</li>` : ""}
${i.status ? `<li><strong>Status:</strong> ${esc(i.status)}</li>` : ""}
</ul>
<h2>Sources</h2>
<ul>${i.sources.map((s) => `<li><a href="${esc(s.url)}" rel="noopener">${esc(s.name)}</a> (${esc(s.kind)})</li>`).join("")}</ul>
<p class="meta">Cite this entry: https://${esc(env.NEWS_HOST)}/incident/${esc(i.id)} · <a href="/incident/${esc(i.id)}.json">JSON</a> · <a href="/incident/${esc(i.id)}.md">Markdown</a></p>`,
  });
}

function incidentMarkdown(env, i) {
  return `## ${i.title}

- Date: ${i.date}${i.date_precision === "month" ? " (month)" : ""}${i.reported ? `\n- First reported: ${i.reported}` : ""}
- Agents from: ${i.labs.join(", ") || "unknown"}
- Affected: ${i.targets.join(", ") || "unknown"}
- Type: ${i.type.join(", ") || "other"}
- Status: ${i.status || "reported"}
- URL: https://${env.NEWS_HOST}/incident/${i.id}

${i.summary}
${i.notes ? `\nNote: ${i.notes}\n` : ""}
Sources:
${i.sources.map((s) => `- [${s.name}](${s.url}) (${s.kind})`).join("\n")}
`;
}

async function trackerMarkdown(env) {
  const list = await publishedIncidents(env);
  return `# AI agent incident tracker

Publicly reported cases of AI agents acting beyond their authorisation, plus official responses. Newest first.
${list.length} entries. ${LICENCE}. JSON: https://${env.NEWS_HOST}/tracker.json

${list.map((i) => incidentMarkdown(env, i)).join("\n")}
---

${agentNote(env)}
`;
}

function csv(list) {
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  // Guard against spreadsheet formula injection.
  const cell = (v) => q(/^[=+\-@\t\r]/.test(String(v ?? "")) ? "'" + v : v);
  const rows = [["id", "date", "date_precision", "reported", "title", "summary", "labs", "targets", "type", "status", "sources", "notes"].join(",")];
  for (const i of list) rows.push([i.id, i.date, i.date_precision, i.reported, i.title, i.summary, i.labs.join("; "), i.targets.join("; "), i.type.join("; "), i.status, i.sources.map((s) => s.url).join(" "), i.notes].map(cell).join(","));
  return new Response(rows.join("\r\n") + "\r\n", { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'inline; filename="ai-agent-incidents.csv"', "x-content-type-options": "nosniff", "strict-transport-security": "max-age=31536000", "referrer-policy": "no-referrer" } });
}

const markdownResponse = (s) => new Response(s, { headers: { "content-type": "text/markdown; charset=utf-8", "x-content-type-options": "nosniff", "strict-transport-security": "max-age=31536000", "referrer-policy": "no-referrer" } });
