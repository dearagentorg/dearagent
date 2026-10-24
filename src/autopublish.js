// News drafts and tracker entries publish by themselves after a short wait, unless the owner taps Hold.
// Before a draft is scheduled, every source link must load. If any link is dead it waits for a tap instead.
// AUTO_PUBLISH_MINUTES (wrangler var): the wait. "0" turns auto-publishing off.

const UA = "Mozilla/5.0 (compatible; AgentNewsDaily link check; +https://agentnewsdaily.com/about)";

export const autoMinutes = (env) => {
  const n = Number(env.AUTO_PUBLISH_MINUTES ?? 120);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

// Only a missing page or a dead site counts as bad. Paywalls and bot walls (401/403/429) mean the page exists.
// Some sites (Yahoo) answer named bots with oversized headers, so a failed try is repeated once with default headers.

async function checkOne(url) {
  let why = null;
  for (const headers of [{ "user-agent": UA, accept: "text/html,*/*" }, {}]) {
    try {
      const r = await fetch(url, { redirect: "follow", headers, signal: AbortSignal.timeout(10000) });
      r.body?.cancel();
      if (r.status === 404 || r.status === 410) why = `page not found (${r.status})`;
      else return null;
    } catch (e) {
      why = e?.name === "TimeoutError" ? "no answer in 10 s" : "site unreachable";
    }
  }
  return why;
}

export async function checkLinks(urls) {
  const list = [...new Set(urls)].slice(0, 30);
  const results = await Promise.all(list.map(async (url) => ({ url, why: await checkOne(url) })));
  return results.filter((r) => r.why);
}

// Returns { autoAt, bad }. autoAt is null when auto-publishing is off or a link failed.
export async function scheduleAuto(env, table, id, urls) {
  const minutes = autoMinutes(env);
  if (!minutes) return { autoAt: null, bad: [] };
  const bad = await checkLinks(urls);
  const autoAt = bad.length ? null : new Date(Date.now() + minutes * 60e3).toISOString();
  await env.DB.prepare(`UPDATE ${table === "posts" ? "posts" : "incidents"} SET auto_at = ? WHERE id = ?`).bind(autoAt, id).run();
  return { autoAt, bad };
}

export const melbourneTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" });

export function autoLine(autoAt, bad) {
  if (autoAt) return `⏰ Publishes by itself around ${melbourneTime(autoAt)} Melbourne time. Tap Hold to stop it.`;
  if (bad?.length) return `⚠️ Not publishing by itself: ${bad.length} link${bad.length > 1 ? "s" : ""} failed:\n${bad.map((b) => `• ${b.url} (${b.why})`).join("\n")}\nCheck it and tap Publish if it's fine.`;
  return "";
}

// Runs from the 20-minute cron.
export async function runDue(env) {
  if (!autoMinutes(env)) return;
  const ts = new Date().toISOString();
  const { publishPostAndAnnounce, announceIncident } = await import("./telegram.js");
  const { setIncidentState, resolveIncidentUpdate } = await import("./tracker.js");
  const { pingIndexNow } = await import("./posts.js");

  const { results: posts } = await env.DB.prepare("SELECT id FROM posts WHERE status = 'draft' AND auto_at IS NOT NULL AND auto_at <= ? ORDER BY date, created_at").bind(ts).all();
  for (const p of posts) {
    await env.DB.prepare("UPDATE posts SET auto_at = NULL WHERE id = ?").bind(p.id).run();
    await publishPostAndAnnounce(env, p.id, { auto: true });
  }

  const { results: incs } = await env.DB.prepare(
    "SELECT id, state FROM incidents WHERE auto_at IS NOT NULL AND auto_at <= ? AND (state = 'draft' OR (state = 'published' AND pending_json IS NOT NULL))"
  ).bind(ts).all();
  for (const i of incs) {
    await env.DB.prepare("UPDATE incidents SET auto_at = NULL WHERE id = ?").bind(i.id).run();
    if (i.state === "draft") await setIncidentState(env, i.id, "published");
    else await resolveIncidentUpdate(env, i.id, true);
    await pingIndexNow(env, [`https://${env.NEWS_HOST}/incident/${i.id}`, `https://${env.NEWS_HOST}/tracker`]);
    await announceIncident(env, i.id, i.state === "draft" ? "added" : "updated");
  }
}
