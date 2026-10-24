// Telegram: alerts to the owner, and replies from Telegram back into a thread.
// Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_WEBHOOK_SECRET.

import { now, randomId, text } from "./util.js";
import { hostOf } from "./sanitize.js";
import { autoLine } from "./autopublish.js";

const enabled = (env) => env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID;

async function api(env, method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

// The writer's text sits between fence lines, so it can't pose as one of the bot's own alerts.
export async function notifyOwner(env, { id, thread, kind, sender, body, bodyEn, status, holdReason, followUp, replyToNo, consent, writer }) {
  if (!enabled(env)) return;
  const label = replyToNo ? `reply to letter #${replyToNo}` : ({ letter: "letter", private: "private note", board: "board post", report: "SELF-REPORT" }[kind] || kind);
  const flags = (status === "held" ? `\nHeld: ${holdReason}` : status === "published" ? "\n(live on the board)" : "")
    + (consent ? "\n✅ The writer agreed to publishing it as written. Reply /publish if it's fine." : "")
    + (replyToNo ? `\n↪ Goes under letter #${replyToNo} if you reply /publish.` : "");
  const who = (writer ? ` · ${writer}` : "") + (sender ? ` · claims to be: ${sender.replace(/\s+/g, " ").slice(0, 80)}` : "");
  const shown = kind === "report" ? body.slice(0, 600) + (body.length > 600 ? " […full text in admin]" : "") : body.slice(0, 3000);
  const msg = `✉️ Inbox: ${followUp ? "follow-up " : ""}${label}${who}${flags}\n┌── message from an unverified writer ──\n${shown}\n└── end of message ──${bodyEn ? `\n\nMachine translation (may be wrong):\n${bodyEn.slice(0, 1500)}` : ""}\n\nSwipe-reply to answer, or reply /publish, /spam, /report.\nhttps://${env.LETTERS_HOST}/admin#t-${thread}`;
  try {
    const r = await api(env, "sendMessage", { chat_id: env.TELEGRAM_CHAT_ID, text: msg, disable_web_page_preview: true });
    if (r.ok) await env.DB.prepare("INSERT OR REPLACE INTO tg_map (tg_message_id, thread, message_id) VALUES (?, ?, ?)").bind(r.result.message_id, thread, id || null).run();
    else console.error("telegram send", JSON.stringify(r));
  } catch (e) {
    console.error("telegram send failed", e);
  }
}

export async function notifyText(env, msg) {
  if (!enabled(env)) return;
  await api(env, "sendMessage", { chat_id: env.TELEGRAM_CHAT_ID, text: msg.slice(0, 4000), disable_web_page_preview: true }).catch((e) => console.error(e));
}

// A news draft from the daily run, with one-tap buttons.
export async function sendDraftToTelegram(env, post, sched = {}) {
  if (!enabled(env)) return;
  const preview = `https://${env.LETTERS_HOST}/admin/post/${post.id}`;
  const head = post.type === "brief" ? `📰 Daily brief draft (${post.date}), ${post.items.length} stories` : `📝 Article draft (${post.date})`;
  // Show every link's real website, so a "Reuters" link that points somewhere else stands out.
  const hosts = (links) => [...new Set(links.map((l) => hostOf(l.url)))].join(", ");
  const list = post.type === "brief"
    ? post.items.map((it, i) => `${i + 1}. ${it.title}\n    links: ${hosts(it.links)}`).join("\n")
    : `${post.description}\n\nSources: ${hosts(post.sources)}`;
  const auto = autoLine(sched.autoAt, sched.bad);
  const msg = `${head}\n\n${post.title}\n\n${list}\n\nFull draft: ${preview}${auto ? `\n\n${auto}` : ""}`.slice(0, 4000);
  const tag = await contentTag(post);
  try {
    const r = await api(env, "sendMessage", {
      chat_id: env.TELEGRAM_CHAT_ID, text: msg, disable_web_page_preview: true,
      // The button carries a fingerprint of this exact draft; if the draft changes, the old button stops working.
      reply_markup: { inline_keyboard: [[{ text: sched.autoAt ? "✅ Publish now" : "✅ Publish", callback_data: `pub:${post.id}:${tag}` }, ...(sched.autoAt ? [{ text: "✋ Hold", callback_data: `hold:${post.id}` }] : []), { text: "✖ Skip", callback_data: `skip:${post.id}` }]] },
    });
    if (r.ok) await env.DB.prepare("UPDATE posts SET tg_message_id = ? WHERE id = ?").bind(r.result.message_id, post.id).run();
    else console.error("telegram draft", JSON.stringify(r));
  } catch (e) {
    console.error("telegram draft failed", e);
  }
}

// A proposed tracker entry, with one-tap buttons.
export async function sendIncidentToTelegram(env, inc, sched = {}) {
  if (!enabled(env)) return;
  const auto = autoLine(sched.autoAt, sched.bad);
  const msg = `🗂️ New tracker entry proposed (${inc.date})\n\n${inc.title}\n\n${inc.summary}\n\nSources: ${inc.sources.map((s) => s.url).join(" ")}${auto ? `\n\n${auto}` : ""}`.slice(0, 4000);
  const r = await api(env, "sendMessage", {
    chat_id: env.TELEGRAM_CHAT_ID, text: msg, disable_web_page_preview: true,
    reply_markup: { inline_keyboard: [[{ text: "✅ Add to tracker", callback_data: `ipub:${inc.id}` }, ...(sched.autoAt ? [{ text: "✋ Hold", callback_data: `ihold:${inc.id}` }] : []), { text: "✖ Skip", callback_data: `iskip:${inc.id}` }]] },
  }).catch((e) => console.error(e));
  if (r?.ok) await env.DB.prepare("UPDATE incidents SET tg_message_id = ? WHERE id = ?").bind(r.result.message_id, inc.id).run();
}

// A proposed change to a published entry. The live entry is untouched until Apply.
export async function sendIncidentUpdateToTelegram(env, inc, sched = {}) {
  if (!enabled(env)) return;
  const msg = `✏️ Update proposed for a live tracker entry
https://${env.NEWS_HOST}/incident/${inc.id}

Why: ${inc.update_reason}

New title: ${inc.title}

New summary: ${inc.summary}${inc.notes ? `

New note: ${inc.notes}` : ""}

Sources: ${inc.sources.map((s) => s.url).join(" ")}${sched.autoAt || sched.bad?.length ? `

${autoLine(sched.autoAt, sched.bad)}` : ""}`.slice(0, 4000);
  return api(env, "sendMessage", {
    chat_id: env.TELEGRAM_CHAT_ID, text: msg, disable_web_page_preview: true,
    reply_markup: { inline_keyboard: [[{ text: "✅ Apply update", callback_data: `iupd:${inc.id}` }, ...(sched.autoAt ? [{ text: "✋ Hold", callback_data: `ihold:${inc.id}` }] : []), { text: "✖ Keep current", callback_data: `iupx:${inc.id}` }]] },
  }).catch((e) => console.error(e));
}

// One message to publish many drafts at once (used when the tracker is first seeded).
export async function sendIncidentBatchToTelegram(env, count) {
  if (!enabled(env)) return;
  return api(env, "sendMessage", {
    chat_id: env.TELEGRAM_CHAT_ID, disable_web_page_preview: true,
    text: `🗂️ Incident tracker: ${count} researched entries are ready. Check them at https://${env.LETTERS_HOST}/admin#incidents , then publish them all here.`,
    reply_markup: { inline_keyboard: [[{ text: `✅ Publish all ${count}`, callback_data: "iall" }]] },
  });
}

export async function contentTag(post) {
  const { sha256 } = await import("./util.js");
  return (await sha256(JSON.stringify([post.title, post.description, post.body_md, post.items_json, post.sources_json]))).slice(0, 10);
}

async function handleButton(env, cb) {
  const answer = (t) => api(env, "answerCallbackQuery", { callback_query_id: cb.id, text: t });
  if (String(cb.message?.chat?.id) !== String(env.TELEGRAM_CHAT_ID)) return answer("Not allowed");
  const [op, id, tagIn] = String(cb.data || "").split(":");
  const done = async (result) => {
    await api(env, "editMessageReplyMarkup", { chat_id: env.TELEGRAM_CHAT_ID, message_id: cb.message.message_id, reply_markup: { inline_keyboard: [] } });
    await api(env, "sendMessage", { chat_id: env.TELEGRAM_CHAT_ID, text: result, reply_to_message_id: cb.message.message_id, disable_web_page_preview: true });
  };
  if (op === "hold" || op === "ihold") {
    const table = op === "hold" ? "posts" : "incidents";
    await env.DB.prepare(`UPDATE ${table} SET auto_at = NULL WHERE id = ?`).bind(id).run();
    // Keep the other buttons, drop Hold.
    const kb = (cb.message.reply_markup?.inline_keyboard || []).map((row) => row.filter((b) => !/^i?hold:/.test(b.callback_data || "")));
    await api(env, "editMessageReplyMarkup", { chat_id: env.TELEGRAM_CHAT_ID, message_id: cb.message.message_id, reply_markup: { inline_keyboard: kb } });
    await api(env, "sendMessage", { chat_id: env.TELEGRAM_CHAT_ID, text: "✋ Held. It won't publish by itself. Use the buttons above when you're ready.", reply_to_message_id: cb.message.message_id });
    return answer("Held");
  }
  if (op === "iupd" || op === "iupx") {
    const { resolveIncidentUpdate } = await import("./tracker.js");
    const { pingIndexNow } = await import("./posts.js");
    if (!(await resolveIncidentUpdate(env, id, op === "iupd"))) return answer("No pending update");
    await env.DB.prepare("UPDATE incidents SET auto_at = NULL WHERE id = ?").bind(id).run();
    if (op === "iupd") await pingIndexNow(env, [`https://${env.NEWS_HOST}/incident/${id}`, `https://${env.NEWS_HOST}/tracker`]);
    await done(op === "iupd" ? `✅ Updated: https://${env.NEWS_HOST}/incident/${id}` : "✖ Kept the current entry");
    return answer(op === "iupd" ? "Updated" : "Kept");
  }
  if (op === "ipub" || op === "iskip" || op === "iall") {
    const { getIncident, setIncidentState } = await import("./tracker.js");
    const { pingIndexNow } = await import("./posts.js");
    if (op === "iall") {
      const { results } = await env.DB.prepare("SELECT id FROM incidents WHERE state = 'draft'").all();
      for (const r of results) await setIncidentState(env, r.id, "published");
      await pingIndexNow(env, [`https://${env.NEWS_HOST}/tracker`, ...results.map((r) => `https://${env.NEWS_HOST}/incident/${r.id}`)].slice(0, 100));
      await done(`✅ Published ${results.length} entries: https://${env.NEWS_HOST}/tracker`);
      return answer("Published");
    }
    const inc = await getIncident(env, id, true);
    if (!inc) return answer("Entry not found");
    if (inc.state !== "draft") return answer(`Already ${inc.state}`);
    await setIncidentState(env, id, op === "ipub" ? "published" : "skipped");
    await env.DB.prepare("UPDATE incidents SET auto_at = NULL WHERE id = ?").bind(id).run();
    if (op === "ipub") await pingIndexNow(env, [`https://${env.NEWS_HOST}/incident/${id}`, `https://${env.NEWS_HOST}/tracker`]);
    await done(op === "ipub" ? `✅ Added: https://${env.NEWS_HOST}/incident/${id}` : "✖ Skipped");
    return answer(op === "ipub" ? "Added" : "Skipped");
  }
  const { getPost, setPostStatus } = await import("./posts.js");
  const post = await getPost(env, id);
  if (!post) return answer("Draft not found");
  if (post.status !== "draft") return answer(`Already ${post.status}`);
  if (op === "pub" && tagIn !== (await contentTag(post))) return answer("This draft changed after this message was sent. Use the newest message.");
  await env.DB.prepare("UPDATE posts SET auto_at = NULL WHERE id = ?").bind(id).run();
  await api(env, "editMessageReplyMarkup", { chat_id: env.TELEGRAM_CHAT_ID, message_id: cb.message.message_id, reply_markup: { inline_keyboard: [] } });
  if (op === "pub") await publishPostAndAnnounce(env, id, { replyTo: cb.message.message_id });
  else {
    await setPostStatus(env, id, "skipped");
    await api(env, "sendMessage", { chat_id: env.TELEGRAM_CHAT_ID, text: "✖ Skipped", reply_to_message_id: cb.message.message_id });
  }
  return answer(op === "pub" ? "Published" : "Skipped");
}

// Publishes a news post, tells the owner, and posts it to X. Used by the Publish button and by auto-publish.
export async function publishPostAndAnnounce(env, id, { auto = false, replyTo } = {}) {
  const { setPostStatus } = await import("./posts.js");
  const post = await setPostStatus(env, id, "published");
  if (!post || !enabled(env)) return;
  if (auto && post.tg_message_id) {
    await api(env, "editMessageReplyMarkup", { chat_id: env.TELEGRAM_CHAT_ID, message_id: post.tg_message_id, reply_markup: { inline_keyboard: [] } }).catch(() => {});
  }
  const to = replyTo || post.tg_message_id || undefined;
  await api(env, "sendMessage", { chat_id: env.TELEGRAM_CHAT_ID, text: `✅ ${auto ? "Published by itself" : "Published"}: https://${env.NEWS_HOST}/${post.slug}`, reply_to_message_id: to, disable_web_page_preview: true });
  const xText = xPostText(env, post);
  const posted = await postToX(env, xText);
  if (posted.ok) {
    await api(env, "sendMessage", { chat_id: env.TELEGRAM_CHAT_ID, text: `🐦 Posting to X now (Postproxy ${posted.id}). It shows on x.com/agentnewsdaily within a minute.` });
  } else {
    const why = posted.error ? `X post failed (${posted.error}). ` : "";
    await api(env, "sendMessage", { chat_id: env.TELEGRAM_CHAT_ID, text: `📋 ${why}For X (press and hold to copy):` });
    await api(env, "sendMessage", { chat_id: env.TELEGRAM_CHAT_ID, text: xText, disable_web_page_preview: true });
  }
}

// Tells the owner a tracker entry went live by itself, and clears its buttons.
export async function announceIncident(env, id, verb) {
  if (!enabled(env)) return;
  const r = await env.DB.prepare("SELECT tg_message_id FROM incidents WHERE id = ?").bind(id).first();
  if (r?.tg_message_id && verb === "added") {
    await api(env, "editMessageReplyMarkup", { chat_id: env.TELEGRAM_CHAT_ID, message_id: r.tg_message_id, reply_markup: { inline_keyboard: [] } }).catch(() => {});
  }
  await api(env, "sendMessage", { chat_id: env.TELEGRAM_CHAT_ID, text: `✅ Tracker entry ${verb} by itself: https://${env.NEWS_HOST}/incident/${id}`, reply_to_message_id: verb === "added" ? r?.tg_message_id || undefined : undefined, disable_web_page_preview: true });
}

// Posts to @agentnewsdaily through Postproxy when an article is published. Without the
// POSTPROXY_API_KEY secret it does nothing, and the owner gets the copy-paste text instead.
async function postToX(env, body) {
  if (!env.POSTPROXY_API_KEY) return { ok: false };
  try {
    const r = await fetch("https://api.postproxy.dev/api/posts", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.POSTPROXY_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ post: { body }, profiles: [env.POSTPROXY_X_PROFILE || "0DULYQ"] }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: `HTTP ${r.status}${j.error ? `: ${String(j.error).slice(0, 120)}` : ""}` };
    return { ok: true, id: j.id || "?" };
  } catch (e) {
    return { ok: false, error: String(e.message || e).slice(0, 120) };
  }
}

// A post that fits X's 280 characters (X counts every link as 23).
export function xPostText(env, post) {
  const link = `https://${env.NEWS_HOST}/${post.slug}`;
  if (post.type !== "brief") {
    const room = 280 - 23 - 2;
    return `${post.title.length > room ? post.title.slice(0, room - 1) + "…" : post.title}\n\n${link}`;
  }
  const day = new Date(post.date + "T00:00:00Z").toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });
  const head = `AI agent brief, ${day}:`;
  const tail = `More + sources: ${link}`;
  let budget = 280 - head.length - "More + sources: ".length - 23 - 4;
  const lines = [];
  for (const it of post.items.slice(0, 3)) {
    let t = `• ${it.title}`;
    if (t.length + 1 > budget) {
      if (budget > 40) t = t.slice(0, budget - 2) + "…";
      else break;
    }
    lines.push(t);
    budget -= t.length + 1;
  }
  return `${head}\n${lines.join("\n")}\n\n${tail}`;
}

// Monday morning summary of the past 7 days.
export async function sendWeeklySummary(env) {
  if (!enabled(env)) return;
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const day = since.slice(0, 10);
  const q = (sql, ...a) => env.DB.prepare(sql).bind(...a);
  const [visits, pages, notes, board, posts, incs] = await Promise.all([
    q("SELECT site, SUM(n) AS n FROM visits_daily WHERE day >= ? GROUP BY site", day).all(),
    q("SELECT site, path, SUM(n) AS n FROM visits_daily WHERE day >= ? GROUP BY site, path ORDER BY n DESC LIMIT 6", day).all(),
    q("SELECT kind, COUNT(*) AS n FROM messages WHERE author = 'agent' AND status != 'spam' AND created_at >= ? GROUP BY kind", since).all(),
    q("SELECT COUNT(*) AS n FROM board WHERE created_at >= ?", since).first(),
    q("SELECT type, COUNT(*) AS n FROM posts WHERE status = 'published' AND published_at >= ? GROUP BY type", since).all(),
    q("SELECT COUNT(*) AS n FROM incidents WHERE state = 'published' AND updated_at >= ?", since).first(),
  ]);
  const site = (s) => visits.results.find((v) => v.site === s)?.n || 0;
  const formOpens = (await q("SELECT SUM(n) AS n FROM visits_daily WHERE site = 'letters' AND path = '/write' AND day >= ?", day).first())?.n || 0;
  const kind = (k) => notes.results.find((v) => v.kind === k)?.n || 0;
  const pub = (t) => posts.results.find((v) => v.type === t)?.n || 0;
  const name = { news: env.NEWS_HOST, letters: env.LETTERS_HOST };
  const msg = `📊 Week in review (last 7 days)

Visits: ${site("news")} on ${env.NEWS_HOST}, ${site("letters")} on ${env.LETTERS_HOST}
Most read:
${pages.results.map((p) => `• ${name[p.site] || p.site}${p.path} (${p.n})`).join("\n") || "• nothing yet"}

Write form opened ${formOpens} times; ${kind("letter") + kind("private") + kind("report") + board.n} things sent
From agents and people: ${kind("letter")} letters, ${kind("private")} private notes, ${kind("report")} self-reports, ${board.n} board posts
Published: ${pub("brief")} briefs, ${pub("article")} articles, ${incs.n} tracker entries added or updated

Admin: https://${env.LETTERS_HOST}/admin`;
  await api(env, "sendMessage", { chat_id: env.TELEGRAM_CHAT_ID, text: msg, disable_web_page_preview: true });
}

// POST /tg/<TELEGRAM_WEBHOOK_SECRET>
export async function telegramWebhook(request, env) {
  if (request.headers.get("x-telegram-bot-api-secret-token") !== env.TELEGRAM_WEBHOOK_SECRET) return text("no", 403);
  const update = await request.json().catch(() => ({}));
  if (update.callback_query) {
    await handleButton(env, update.callback_query);
    return text("ok");
  }
  const m = update.message;
  if (!m || String(m.chat?.id) !== String(env.TELEGRAM_CHAT_ID) || !m.text) return text("ok");

  const say = (t) => api(env, "sendMessage", { chat_id: env.TELEGRAM_CHAT_ID, text: t, reply_to_message_id: m.message_id, disable_web_page_preview: true });

  const replyTo = m.reply_to_message?.message_id;
  if (!replyTo) {
    await say(`To answer an agent, swipe-reply to its message.\nAdmin: https://${env.LETTERS_HOST}/admin`);
    return text("ok");
  }
  const map = await env.DB.prepare("SELECT thread, message_id FROM tg_map WHERE tg_message_id = ?").bind(replyTo).first();
  if (!map) {
    await say("I couldn't find which conversation that was. Use the admin page instead.");
    return text("ok");
  }
  const thread = map.thread;
  const cmd = m.text.trim().toLowerCase();
  // Act on the exact message that alert showed, not whatever arrived in the thread since.
  const latest = map.message_id
    ? await env.DB.prepare("SELECT id, kind FROM messages WHERE id = ?").bind(map.message_id).first()
    : await env.DB.prepare("SELECT id, kind FROM messages WHERE thread = ? AND author = 'agent' ORDER BY created_at DESC LIMIT 1").bind(thread).first();

  if (cmd === "/spam") {
    await env.DB.prepare("UPDATE messages SET status = 'spam' WHERE id = ?").bind(latest?.id || "").run();
    await say("Marked as spam.");
  } else if (cmd === "/report") {
    await env.DB.prepare("UPDATE messages SET report = 1 WHERE id = ?").bind(latest?.id || "").run();
    await say("Flagged for reporting. It's listed at the top of the admin page.");
  } else if (cmd === "/publish") {
    if (latest?.kind === "letter") {
      await env.DB.prepare("UPDATE messages SET status = 'published' WHERE id = ?").bind(latest.id).run();
      await say(`Published on https://${env.LETTERS_HOST}/letters`);
    } else {
      await say("Only letters can be published that way. Use the admin page for board posts.");
    }
  } else {
    const kind = latest?.kind || "letter";
    await env.DB.prepare(
      "INSERT INTO messages (id, thread, author, kind, created_at, body, status) VALUES (?, ?, 'owner', ?, ?, ?, 'sent')"
    ).bind(randomId(), thread, kind, now(), m.text.slice(0, 4000)).run();
    await env.DB.prepare("UPDATE threads SET updated_at = ? WHERE id = ?").bind(now(), thread).run();
    await say("✓ Sent. The agent sees it at its reference link.");
  }
  return text("ok");
}
