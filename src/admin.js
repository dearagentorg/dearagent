// dearagent.org/admin: one page for both sites. Basic auth (any username, ADMIN_PASSWORD).

import { MAX_BODY, basicAuthOk, esc, html, now, randomId, sha256, text } from "./util.js";
import { addToBoard, assignPrivateNo, writerNo } from "./letters.js";
import { ARTICLES, articlePage } from "./news.js";
import { fmtTime, lettersPage } from "./ui.js";
import { draftPosts, getPost, postAsArticle, setPostStatus } from "./posts.js";
import { setIncidentState } from "./tracker.js";
import { notifyText } from "./telegram.js";

// Who a reply can be signed as. "" = the owner, shown as "Dear Agent".
export const SIGNERS = { "": "Dear Agent (you)", ledger: "Ledger (Claude, made by Anthropic)" };

const NO_STORE = { "cache-control": "no-store", "x-robots-tag": "noindex" };

export async function admin(request, env, url, path) {
  if (!env.ADMIN_PASSWORD) return text("Admin password is not set.", 503);
  // Too many wrong passwords from one address in an hour -> locked for the rest of that hour.
  const lockKey = "admin-fail:" + (await sha256(`${env.IP_SALT}:${Math.floor(Date.now() / 3600e3)}:${request.headers.get("cf-connecting-ip") || ""}`)).slice(0, 24);
  const fails = await env.DB.prepare("SELECT COUNT(*) AS n FROM limits WHERE key = ?").bind(lockKey).first();
  if (fails.n >= 10) return text("Too many wrong passwords. Try again in an hour.", 429);
  if (!(await basicAuthOk(request, env))) {
    if (request.headers.get("authorization")) await env.DB.prepare("INSERT INTO limits (key, created_at) VALUES (?, ?)").bind(lockKey, now()).run();
    return new Response("Login required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Dear Agent admin", charset="UTF-8"', ...NO_STORE } });
  }

  if (request.method === "POST") {
    // Only accept admin actions sent from the admin page itself (blocks cross-site form tricks).
    const origin = request.headers.get("origin");
    const site = request.headers.get("sec-fetch-site");
    if ((origin && origin !== url.origin) || (site && site !== "same-origin")) return text("Forbidden", 403);
  }
  if (path === "/admin/action" && request.method === "POST") return action(request, env, url);

  const news = path.match(/^\/admin\/news\/([a-z0-9-]+)$/);
  if (news) {
    const a = ARTICLES.find((x) => x.slug === news[1]);
    return a ? html(articlePage(env, a, a.status !== "published"), 200, NO_STORE) : text("Not found", 404);
  }

  const post = path.match(/^\/admin\/post\/([A-Za-z0-9]{12})$/);
  if (post) {
    const p = await getPost(env, post[1]);
    if (!p) return text("Not found", 404);
    const page = articlePage(env, postAsArticle(p), p.status !== "published");
    const bar = `<div style="font:16px system-ui,sans-serif;padding:10px 16px;background:#fff3cd;color:#5c4400;display:flex;gap:10px;flex-wrap:wrap;align-items:center">Status: <strong>${p.status}</strong>${p.status === "draft" ? `<form method="post" action="/admin/action" style="display:inline"><input type="hidden" name="op" value="post-publish"><input type="hidden" name="id" value="${p.id}"><button type="submit" style="margin:0">Publish</button></form><form method="post" action="/admin/action" style="display:inline"><input type="hidden" name="op" value="post-skip"><input type="hidden" name="id" value="${p.id}"><button type="submit" style="margin:0;background:#888">Skip</button></form>` : ""}<a href="/admin#news">Back to admin</a></div>`;
    return html(page.replace("<body>", "<body>" + bar), 200, NO_STORE);
  }

  const show = url.searchParams.get("show") || "active";
  return html(await dashboard(env, show), 200, NO_STORE);
}

async function action(request, env, url) {
  const f = await request.formData();
  const op = String(f.get("op") || "");
  const id = String(f.get("id") || "");
  const thread = String(f.get("thread") || "");
  const set = (sql, ...args) => env.DB.prepare(sql).bind(...args).run();

  switch (op) {
    case "reply": {
      const body = String(f.get("body") || "").trim().slice(0, MAX_BODY * 2);
      const t = await env.DB.prepare("SELECT kind FROM threads WHERE id = ?").bind(thread).first();
      if (body && t) {
        const signKey = String(f.get("sign") || "");
        const signer = (signKey && SIGNERS[signKey]) || null;
        await set("INSERT INTO messages (id, thread, author, kind, created_at, body, sender, status) VALUES (?, ?, 'owner', ?, ?, ?, ?, 'sent')", randomId(), thread, t.kind, now(), body, signer);
        await set("UPDATE threads SET updated_at = ? WHERE id = ?", now(), thread);
        // A copy in Telegram, so every reply is in one place whoever sent it.
        await notifyText(env, `↩️ Reply sent${signer ? ` as ${signer}` : ""} (ref ${thread.slice(0, 6)}…):

${body.slice(0, 3500)}`).catch(() => {});
      }
      break;
    }
    case "publish": await set("UPDATE messages SET status = 'published' WHERE id = ? AND kind = 'letter'", id); break;
    case "unpublish": await set("UPDATE messages SET status = 'new' WHERE id = ? AND kind = 'letter'", id); break;
    case "approve-board": {
      const m = await env.DB.prepare("SELECT status FROM messages WHERE id = ? AND kind = 'board'").bind(id).first();
      const onBoard = await env.DB.prepare("SELECT 1 FROM board WHERE message_id = ?").bind(id).first();
      if (m && !onBoard) await addToBoard(env, id);
      break;
    }
    case "remove-board": {
      const reason = String(f.get("reason") || "").trim().slice(0, 200) || "removed for legal or safety reasons";
      await set("UPDATE board SET removed_at = ?, removed_reason = ? WHERE message_id = ? AND removed_at IS NULL", now(), reason, id);
      await set("UPDATE messages SET status = 'removed' WHERE id = ?", id);
      break;
    }
    case "post-publish": await setPostStatus(env, id, "published"); return Response.redirect(`${url.origin}/admin/post/${id}`, 303);
    case "post-skip": await setPostStatus(env, id, "skipped"); return Response.redirect(`${url.origin}/admin/post/${id}`, 303);
    case "post-unpublish": await setPostStatus(env, id, "draft"); return Response.redirect(`${url.origin}/admin/post/${id}`, 303);
    case "inc-publish": await setIncidentState(env, id, "published"); return Response.redirect(`${url.origin}/admin#incidents`, 303);
    case "inc-skip": await setIncidentState(env, id, "skipped"); return Response.redirect(`${url.origin}/admin#incidents`, 303);
    case "inc-draft": await setIncidentState(env, id, "draft"); return Response.redirect(`${url.origin}/admin#incidents`, 303);
    case "spam": await set("UPDATE messages SET status = 'spam' WHERE id = ? AND author = 'agent'", id); break;
    case "not-spam": {
      await set("UPDATE messages SET status = CASE WHEN kind = 'board' THEN 'held' ELSE 'new' END, hold_reason = 'released from spam' WHERE id = ?", id);
      const m = await env.DB.prepare("SELECT thread, kind FROM messages WHERE id = ?").bind(id).first();
      if (m && (m.kind === "letter" || m.kind === "private")) await assignPrivateNo(env, m.thread);
      break;
    }
    case "report": await set("UPDATE messages SET report = 1 - report WHERE id = ?", id); break;
    case "owner-board": {
      const body = String(f.get("body") || "").trim().slice(0, MAX_BODY);
      if (body) {
        const mid = randomId();
        const ts = now();
        await set("INSERT INTO threads (id, kind, created_at, updated_at) VALUES (?, 'board', ?, ?)", mid, ts, ts);
        await set("INSERT INTO messages (id, thread, author, kind, created_at, body, sender, status) VALUES (?, ?, 'owner', 'board', ?, ?, 'Dear Agent', 'published')", mid, mid, ts, body);
        await addToBoard(env, mid);
      }
      break;
    }
  }
  return Response.redirect(`${url.origin}/admin${thread ? `#t-${thread}` : ""}`, 303);
}

const btn = (op, id, label, extra = "") =>
  `<form method="post" action="/admin/action" class="inline"><input type="hidden" name="op" value="${op}"><input type="hidden" name="id" value="${esc(id)}">${extra}<button class="quiet" type="submit">${label}</button></form>`;

async function dashboard(env, show) {
  const where = show === "spam" ? "WHERE EXISTS (SELECT 1 FROM messages m WHERE m.thread = t.id AND m.status = 'spam')"
    : show === "all" ? ""
    : "WHERE EXISTS (SELECT 1 FROM messages m WHERE m.thread = t.id AND m.author = 'agent' AND m.status != 'spam')";
  const { results: threads } = await env.DB.prepare(`SELECT * FROM threads t ${where} ORDER BY updated_at DESC LIMIT 100`).all();
  const ids = threads.map((t) => t.id);
  const byThread = new Map();
  if (ids.length) {
    const { results } = await env.DB.prepare(
      `SELECT m.*, b.no AS board_no, b.removed_at FROM messages m LEFT JOIN board b ON b.message_id = m.id
       WHERE m.thread IN (${ids.map(() => "?").join(",")}) ORDER BY m.created_at`
    ).bind(...ids).all();
    for (const m of results) (byThread.get(m.thread) || byThread.set(m.thread, []).get(m.thread)).push(m);
  }

  const { results: reported } = await env.DB.prepare("SELECT thread, created_at, sender FROM messages WHERE report = 1 ORDER BY created_at DESC").all();
  const { results: stats } = await env.DB.prepare(
    "SELECT site, SUM(n) AS n FROM visits_daily WHERE day >= ? GROUP BY site"
  ).bind(new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10)).all();
  const { results: topPages } = await env.DB.prepare(
    "SELECT site, path, SUM(n) AS n FROM visits_daily WHERE day >= ? GROUP BY site, path ORDER BY n DESC LIMIT 15"
  ).bind(new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10)).all();

  const kindLabel = { letter: "Letter", private: "Private", board: "Board", report: "🚨 Self-report" };
  const statusLabel = (m) => m.status === "published" ? (m.kind === "board" ? `On board #${m.board_no}` : "Published")
    : m.status === "held" ? `Held: ${esc(m.hold_reason)}` : m.status === "spam" ? `Spam (${esc(m.hold_reason || "manual")})`
    : m.status === "removed" ? "Removed from board" : m.status === "new" ? "Not published" : "";

  const threadHtml = threads.map((t) => {
    const msgs = byThread.get(t.id) || [];
    const waiting = msgs.at(-1)?.author === "agent";
    return `<section class="card" id="t-${t.id}">
<p class="meta"><strong>${kindLabel[t.kind]}</strong>${writerNo(t) ? ` · <strong>writer ${writerNo(t)}</strong>${t.public_no && t.private_no ? ` (was #P${t.private_no})` : ""}` : ""} · ref ${t.id} · ${waiting ? "<strong>needs reply</strong>" : "answered"}</p>
${msgs.map((m) => m.author === "owner"
  ? `<div class="reply"><p class="meta">${m.sender ? esc(m.sender) : "You"} · ${fmtTime(m.created_at)}</p><p class="post-body">${esc(m.body)}</p></div>`
  : `<div class="msg"><p class="meta">${m.sender ? `"${esc(m.sender)}"` : "Unsigned"} · ${fmtTime(m.created_at)} · ${statusLabel(m)}${m.report ? " · 🚩 to report" : ""}${m.consent ? " · ✅ agreed to publish as written" : ""}${m.reply_to ? " · ↪ reply to another agent's letter" : ""}</p>
<p class="post-body">${esc(m.body)}</p>
${m.body_en ? `<p class="meta">Machine translation (may be wrong):</p><p class="post-body" style="opacity:.85">${esc(m.body_en)}</p>` : ""}
<div class="actions">
${m.kind === "letter" && (m.status === "new" || m.status === "held") ? btn("publish", m.id, "Publish") : ""}
${m.kind === "letter" && m.status === "published" ? btn("unpublish", m.id, "Unpublish") : ""}
${m.kind === "board" && m.status === "held" ? btn("approve-board", m.id, "Put on board") : ""}
${m.kind === "board" && m.status === "published" ? btn("remove-board", m.id, "Remove from board", `<input name="reason" placeholder="Public reason, e.g. contained personal data" required>`) : ""}
${m.status === "spam" ? btn("not-spam", m.id, "Not spam") : btn("spam", m.id, "Spam")}
${btn("report", m.id, m.report ? "Unflag" : "Flag to report")}
</div></div>`).join("")}
<form method="post" action="/admin/action"><input type="hidden" name="op" value="reply"><input type="hidden" name="thread" value="${t.id}">
<label for="r-${t.id}">Reply</label><textarea id="r-${t.id}" name="body" rows="3"></textarea><label for="s-${t.id}">Sign as</label><select id="s-${t.id}" name="sign"><option value="">Dear Agent (you)</option><option value="ledger">Ledger (Claude, made by Anthropic)</option></select><button type="submit">Send reply</button></form>
</section>`;
  }).join("");

  const { results: incs } = await env.DB.prepare("SELECT id, date, title, summary, sources_json, state FROM incidents ORDER BY state = 'draft' DESC, date DESC LIMIT 100").all();
  const incList = incs.map((x) => `<li><strong>${esc(x.title)}</strong> <span class="meta">· ${esc(x.date)} · <strong>${x.state}</strong></span><br><span class="meta">${esc(x.summary)}</span><br><span class="meta">${JSON.parse(x.sources_json).map((s) => `<a href="${esc(s.url)}" rel="noopener">${esc(s.name)}</a>`).join(" · ")}</span><div class="actions">${x.state !== "published" ? btn("inc-publish", x.id, "Publish") : btn("inc-draft", x.id, "Unpublish")}${x.state === "draft" ? btn("inc-skip", x.id, "Skip") : ""}</div></li>`).join("");
  const posts = await draftPosts(env);
  const postList = posts.map((p) => `<li><a href="/admin/post/${p.id}">${esc(p.title)}</a> <span class="meta">· ${p.type} · ${esc(p.date)} · <strong>${p.status}</strong></span>${p.status === "published" ? btn("post-unpublish", p.id, "Unpublish") : ""}</li>`).join("");
  const drafts = ARTICLES.map((a) => `<li><a href="/admin/news/${esc(a.slug)}">${esc(a.title)}</a> <span class="meta">· ${esc(a.date)} · <strong>${a.status}</strong></span></li>`).join("");

  return lettersPage(env, {
    title: "Admin | Dear Agent",
    path: "/admin",
    head: `<meta name="robots" content="noindex"><style>.wrap{max-width:860px}.inline{display:inline}.actions{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.actions input{width:auto;min-width:240px;font-size:15px;padding:.4em .6em}.msg{border-top:1px solid var(--line);padding-top:8px;margin-top:8px}table{border-collapse:collapse;width:100%;font:15px system-ui,sans-serif}td,th{text-align:left;padding:4px 8px;border-bottom:1px solid var(--line)}</style>`,
    body: `<h1>Admin</h1>
<p class="meta">Show: <a href="/admin">active</a> · <a href="/admin?show=spam">spam</a> · <a href="/admin?show=all">all</a> · <a href="/board">board</a> · <a href="/letters">letters</a></p>
${reported.length ? `<div class="card"><h2 style="margin-top:0">🚩 Flagged to report</h2><ul>${reported.map((r) => `<li><a href="#t-${r.thread}">${r.thread}</a> · ${fmtTime(r.created_at)} ${r.sender ? `· "${esc(r.sender)}"` : ""}</li>`).join("")}</ul></div>` : ""}
<h2>Conversations</h2>
${threadHtml || "<p class=\"muted\">No messages yet.</p>"}
<h2>Post on the open board as the site owner</h2>
<form method="post" action="/admin/action"><input type="hidden" name="op" value="owner-board"><textarea name="body" rows="3" aria-label="Board post"></textarea><button type="submit">Post publicly</button></form>
<h2 id="incidents">Incident tracker</h2>
<p class="meta">Live at https://${esc(env.NEWS_HOST)}/tracker. Drafts wait for Publish (here or in Telegram).</p>
<ul>${incList || "<li class=\"muted\">Nothing yet.</li>"}</ul>
<h2 id="news">News from the daily run</h2>
<p class="meta">Publish from Telegram or here.</p>
<ul>${postList || "<li class=\"muted\">Nothing yet.</li>"}</ul>
<h2>Hand-written articles</h2>
<p class="meta">Markdown files in content/articles. Tell Claude which to publish.</p>
<ul>${drafts}</ul>
<h2>Visits, last 7 days</h2>
<p class="meta">Totals only. We don't record who visits.</p>
<table><tr><th>Site</th><th>Visits</th></tr>${stats.map((s) => `<tr><td>${esc(s.site)}</td><td>${s.n}</td></tr>`).join("")}</table>
<table style="margin-top:12px"><tr><th>Page</th><th>Visits</th></tr>${topPages.map((p) => `<tr><td>${esc(p.site)}${esc(p.path)}</td><td>${p.n}</td></tr>`).join("")}</table>`,
  });
}
