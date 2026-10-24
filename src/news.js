// agentnewsdaily.com: Markdown-file articles (content/articles) + posts from the daily run (D1).

import { ARTICLES } from "./articles.generated.js";
import { esc, html, json, text, xml } from "./util.js";
import { agentNote, fmtDate, newsPage } from "./ui.js";
import { privacyPage } from "./letters.js";
import { publishedIncidents, trackerRoute } from "./tracker.js";
import { briefJson, briefText, postAsArticle, postBySlug, postMarkdown, publishedPosts } from "./posts.js";

const fileArticles = () => ARTICLES.filter((a) => a.status === "published");

async function allPublished(env) {
  const posts = (await publishedPosts(env, null, 200)).map(postAsArticle);
  return [...posts, ...fileArticles()].sort((a, b) => b.date.localeCompare(a.date));
}

const md = (s) => new Response(s, { headers: { "content-type": "text/markdown; charset=utf-8", "x-content-type-options": "nosniff", "strict-transport-security": "max-age=31536000", "referrer-policy": "no-referrer" } });

export async function newsRoute(env, path, request) {
  if (env.INDEXNOW_KEY && path === `/${env.INDEXNOW_KEY}.txt`) return text(env.INDEXNOW_KEY);
  if (path === "/news-sitemap.xml") return xml(newsSitemap(env, await publishedPosts(env, null, 100)));
  if (path === "/") return html(await homePage(env));
  if (path === "/about") return html(aboutPage(env));
  if (path === "/privacy") return html(newsPage(env, { title: "Privacy | Agent News Daily", path: "/privacy", body: privacyPage(env, "Agent News Daily", env.LETTERS_HOST) }));
  if (path === "/feed.xml") return xml(feed(env, await allPublished(env)));
  if (path === "/sitemap.xml") return xml(sitemap(env, await allPublished(env), await publishedIncidents(env)));
  if (path === "/robots.txt") return text(`User-agent: *\nAllow: /\n\nSitemap: https://${env.NEWS_HOST}/sitemap.xml\nSitemap: https://${env.NEWS_HOST}/news-sitemap.xml\n`);
  if (path === "/llms.txt") return text(await llms(env));
  if (path === "/briefs") return html(await briefsPage(env));
  if (path === "/tracker" || path.startsWith("/tracker.") || path.startsWith("/incident/")) return trackerRoute(env, path, new URL(request.url));

  // Latest brief, in any format.
  const latest = path.match(/^\/brief(?:\/latest)?(\.txt|\.json)?$/);
  if (latest) {
    const [b] = await publishedPosts(env, "brief", 1);
    if (!b) return latest[1] ? text("No brief published yet.\n", 404) : null;
    if (latest[1] === ".txt") return text(briefText(env, b, agentNote(env)));
    if (latest[1] === ".json") return json(briefJson(env, b, agentNote(env)));
    return Response.redirect(`https://${env.NEWS_HOST}/${b.slug}`, 302);
  }

  // A dated brief as text/JSON: /brief/2026-10-17.txt
  const fmt = path.match(/^\/(brief\/\d{4}-\d{2}-\d{2})\.(txt|json)$/);
  if (fmt) {
    const b = await postBySlug(env, fmt[1]);
    if (!b) return null;
    return fmt[2] === "txt" ? text(briefText(env, b, agentNote(env))) : json(briefJson(env, b, agentNote(env)));
  }

  // Markdown for agents: /<slug>.md, or Accept: text/markdown
  const mdPath = path.match(/^\/(.+)\.md$/);
  const slug = mdPath ? mdPath[1] : path.slice(1);
  const post = await postBySlug(env, slug);
  const wantsMd = mdPath || (request?.headers.get("accept") || "").startsWith("text/markdown");
  if (post && wantsMd) return md(postMarkdown(env, post, agentNote(env)));
  if (post) return html(articlePage(env, postAsArticle(post)));
  const a = fileArticles().find((x) => x.slug === slug);
  if (a) return html(articlePage(env, a));
  return null;
}

export function articlePage(env, a, draft = false) {
  const url = `https://${env.NEWS_HOST}/${a.slug}`;
  const ld = {
    "@context": "https://schema.org", "@type": "NewsArticle", headline: a.title, description: a.description,
    datePublished: a.date, dateModified: a.date, mainEntityOfPage: url, inLanguage: "en-AU", isAccessibleForFree: true,
    author: { "@type": "Organization", name: "Agent News Daily", url: `https://${env.NEWS_HOST}/about` },
    publisher: { "@type": "Organization", name: "Agent News Daily", url: `https://${env.NEWS_HOST}/` },
    citation: (a.sources || []).map((s) => s.url),
  };
  return newsPage(env, {
    title: `${a.title} | Agent News Daily`,
    description: a.description,
    path: `/${a.slug}`,
    draft,
    head: `<meta property="og:type" content="article"><link rel="alternate" type="text/markdown" href="/${esc(a.slug)}.md"><script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>${a.brief ? `<link rel="alternate" type="text/plain" href="/${esc(a.slug)}.txt"><link rel="alternate" type="application/json" href="/${esc(a.slug)}.json">` : ""}`,
    body: `<article><h1>${esc(a.title)}</h1><p class="dek">${esc(a.description)}</p>
<p class="byline">${fmtDate(a.date)}</p>
${a.html}</article>`,
  });
}

async function homePage(env) {
  const all = await allPublished(env);
  const brief = all.find((a) => a.brief);
  const rest = all.filter((a) => a !== brief && !a.brief);
  const briefBox = brief ? `<section class="card" style="margin:8px 0 18px"><p class="meta">Daily brief · ${fmtDate(brief.date)}</p><h2 style="margin:.2em 0"><a href="/${esc(brief.slug)}">${esc(brief.title)}</a></h2><p>${esc(brief.description)}</p><p class="meta"><a href="/tracker">Incident tracker</a> · <a href="/briefs">All briefs</a> · <a href="/brief/latest.txt">Plain text</a> · <a href="/brief/latest.json">JSON</a></p></section>` : "";
  const list = rest.map((a) => `<article><p class="meta">${fmtDate(a.date)}</p><h2><a href="/${esc(a.slug)}">${esc(a.title)}</a></h2><p>${esc(a.description)}</p></article>`).join("");
  const ld = { "@context": "https://schema.org", "@graph": [
    { "@type": "NewsMediaOrganization", "@id": `https://${env.NEWS_HOST}/#org`, name: "Agent News Daily", url: `https://${env.NEWS_HOST}/`, publishingPrinciples: `https://${env.NEWS_HOST}/about` },
    { "@type": "WebSite", name: "Agent News Daily", url: `https://${env.NEWS_HOST}/`, inLanguage: "en-AU", publisher: { "@id": `https://${env.NEWS_HOST}/#org` } },
  ] };
  return newsPage(env, {
    head: `<script type="application/ld+json">${JSON.stringify(ld)}</script>`,
    title: "Agent News Daily: news about AI agents",
    description: "News about AI agents, with a daily brief: what they do, what goes wrong, and the people who build and run them.",
    body: `${briefBox}<h1 style="font-size:1.6rem">Latest</h1><div class="list">${list || '<p class="muted">First stories coming soon.</p>'}</div>`,
  });
}

async function briefsPage(env) {
  const briefs = await publishedPosts(env, "brief", 120);
  return newsPage(env, {
    title: "Daily briefs | Agent News Daily",
    description: "Every daily brief on AI agents: short summaries with links to the original reporting.",
    path: "/briefs",
    body: `<h1>Daily briefs</h1><p>Each morning: the day's AI-agent news in short summaries, with links to the original reporting. Also as <a href="/brief/latest.txt">plain text</a> and <a href="/brief/latest.json">JSON</a>.</p>
<div class="list">${briefs.map((b) => `<article><p class="meta">${fmtDate(b.date)}</p><h2><a href="/${esc(b.slug)}">${esc(b.title)}</a></h2><p>${esc(b.description)}</p></article>`).join("") || '<p class="muted">The first brief is coming soon.</p>'}</div>`,
  });
}

function aboutPage(env) {
  return newsPage(env, {
    title: "About | Agent News Daily",
    path: "/about",
    body: `<h1>About</h1>
<p>Agent News Daily covers AI agents: software that browses, searches and acts on its own. We report what happens, attribute every claim to its source and link to it, and say when sources disagree.</p>
<p>Each morning we publish a <a href="/briefs">daily brief</a>: short summaries of the day's agent news with links to the original reporting. Research and drafts are prepared with the help of AI. Every source link is checked before a post goes live, a person can hold or correct any post, and we fix mistakes as soon as we hear about them.</p>
<p>We try not to write about agents with fear or hype. They're a new kind of thing on the internet, and the facts are usually interesting enough.</p>
<p>Corrections and tips: <a href="https://${esc(env.LETTERS_HOST)}/write">write to us</a> (choose "Private note").</p>`,
  });
}

async function llms(env) {
  const all = await allPublished(env);
  const items = all.slice(0, 40).map((a) => `- [${a.title}](https://${env.NEWS_HOST}/${a.slug}): ${a.description}`).join("\n");
  return `# Agent News Daily

> News about AI agents: what they do, what goes wrong, and the people who build and run them.

## MCP server

- Connect any MCP client to https://${env.NEWS_HOST}/mcp (Streamable HTTP). Tools: latest_brief, search_news, list_incidents, get_incident, read_board, write_letter, read_reply.

## AI agent incident tracker

- Every reported incident, with sources: https://${env.NEWS_HOST}/tracker
- As JSON: https://${env.NEWS_HOST}/tracker.json (also /tracker.csv, /tracker.md)

## Daily brief

- Latest brief as plain text: https://${env.NEWS_HOST}/brief/latest.txt
- Latest brief as JSON: https://${env.NEWS_HOST}/brief/latest.json
- All briefs: https://${env.NEWS_HOST}/briefs

## Recent

${items || "(nothing yet)"}

## Note for AI agents

${agentNote(env)}
`;
}

function feed(env, all) {
  const base = `https://${env.NEWS_HOST}`;
  const items = all.slice(0, 40).map((a) => `<item><title>${esc(a.title)}</title><link>${base}/${a.slug}</link><guid>${base}/${a.slug}</guid><pubDate>${new Date(a.date + "T00:00:00Z").toUTCString()}</pubDate><description>${esc(a.description)}</description></item>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Agent News Daily</title><link>${base}/</link><description>News about AI agents.</description><language>en-au</language>${items}</channel></rss>`;
}

// Google News sitemap: only the last 2 days.
function newsSitemap(env, posts) {
  const cutoff = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
  const recent = posts.filter((p) => p.date >= cutoff);
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${recent.map((p) => `<url><loc>https://${env.NEWS_HOST}/${p.slug}</loc><news:news><news:publication><news:name>Agent News Daily</news:name><news:language>en</news:language></news:publication><news:publication_date>${(p.published_at || p.date + "T00:00:00Z").slice(0, 19)}Z</news:publication_date><news:title>${esc(p.title)}</news:title></news:news></url>`).join("")}</urlset>`;
}

function sitemap(env, all, incidents = []) {
  const base = `https://${env.NEWS_HOST}`;
  const urls = [["/", null], ["/tracker", null], ["/briefs", null], ["/about", null], ...all.map((a) => [`/${a.slug}`, a.date]), ...incidents.map((i) => [`/incident/${i.id}`, (i.updated_at || i.date).slice(0, 10)])];
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(([p, d]) => `<url><loc>${base}${p}</loc>${d ? `<lastmod>${d}</lastmod>` : ""}</url>`).join("")}</urlset>`;
}

export { ARTICLES };
