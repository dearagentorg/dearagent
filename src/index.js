// One Worker for both sites: dearagent.org (letters) and agentnewsdaily.com (news).
// Bindings: DB (D1). Vars: LETTERS_HOST, NEWS_HOST.
// Secrets: ADMIN_PASSWORD, IP_SALT, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_WEBHOOK_SECRET, PUBLISH_TOKEN.

import { countVisit, html, text } from "./util.js";
import { notePage, noteSlugs, notesList } from "./notes.js";
import { aboutPage, boardJson, boardPage, home, letterPage, lettersList, publishedConvos, llmsTxt, privacyPage, threadPage, write } from "./letters.js";
import { newsRoute } from "./news.js";
import { admin } from "./admin.js";
import { sendWeeklySummary, telegramWebhook } from "./telegram.js";
import { receiveDraft, receiveNotice } from "./posts.js";
import { receiveIncidents } from "./tracker.js";
import { reportJson, reportPage, reportText } from "./report.js";
import { LANGS, letterIn } from "./i18n.js";
import { mcp } from "./mcp.js";
import { runDue } from "./autopublish.js";
import { lettersPage, newsPage } from "./ui.js";

const ICON_FILES = ["/favicon.ico", "/favicon.svg", "/apple-touch-icon.png", "/icon-192.png", "/icon-512.png", "/icon-maskable-512.png", "/og.png", "/site.webmanifest"];

export default {
  async scheduled(event, env) {
    // Monday 9 am Melbourne (Sunday 22:00 UTC): weekly summary to Telegram.
    if (event.cron === "0 22 * * SUN") return sendWeeklySummary(env);
    await runDue(env).catch((e) => console.error("auto-publish", e));
    await env.DB.prepare("DELETE FROM limits WHERE created_at < ?").bind(new Date(Date.now() - 3600e3).toISOString()).run();
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let host = url.hostname;

    // http -> https
    if (url.protocol === "http:" && !env.LOCAL_DEV) {
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }

    // www -> bare domain
    if (host.startsWith("www.")) {
      url.hostname = host.slice(4);
      return Response.redirect(url.toString(), 301);
    }

    // Local dev: pick the site with ?site=news or a "news" hostname
    const isNews = host === env.NEWS_HOST || host.startsWith("news.") || url.searchParams.get("site") === "news";
    const path = url.pathname.replace(/\/+$/, "") || "/";

    // Icons and share cards: each site has its own set in public/da or public/news.
    if (ICON_FILES.includes(path) && env.ASSETS) {
      const res = await env.ASSETS.fetch(new Request(new URL(`/${isNews ? "news" : "da"}${path}`, url.origin)));
      const out = new Response(res.body, res);
      out.headers.set("cache-control", "public, max-age=86400");
      return out;
    }
    if (path.startsWith("/da/") || path.startsWith("/news/")) return text("Not found", 404);

    try {
      // MCP server, same on both sites.
      if (path === "/mcp") return mcp(request, env, ctx);

      if (isNews) {
        if (request.method !== "GET" && request.method !== "HEAD") return text("Method not allowed", 405);
        const res = await newsRoute(env, path, request);
        if (res) {
          if (!path.includes(".")) countVisit(env, ctx, "news", path);
          return res;
        }
        return html(newsPage(env, { title: "Not found | Agent News Daily", body: '<h1>Page not found</h1><p><a href="/">Latest news</a></p>' }), 404);
      }

      // dearagent.org
      if (path === "/write") return write(request, env, ctx, url);
      if (path === "/api/drafts" && request.method === "POST") return receiveDraft(request, env, ctx);
      if (path === "/api/notify" && request.method === "POST") return receiveNotice(request, env);
      if (path === "/api/incidents" && request.method === "POST") return receiveIncidents(request, env, ctx);
      const t = path.match(/^\/letter\/([A-Za-z0-9]{12}|[A-Za-z0-9]{24})$/);
      if (t) return threadPage(request, env, url, t[1]);
      if (path === "/admin" || path.startsWith("/admin/")) return admin(request, env, url, path);
      if (env.TELEGRAM_WEBHOOK_SECRET && path === `/tg/${env.TELEGRAM_WEBHOOK_SECRET}` && request.method === "POST") return telegramWebhook(request, env);

      if (request.method !== "GET" && request.method !== "HEAD") return text("Method not allowed", 405);
      let res = null;
      if (path === "/") res = html(await home(env));
      else if (path === "/letters") res = html(await lettersList(env, url));
      else if (/^\/letters\/[a-z0-9-]{3,40}$/.test(path)) { const p = await letterPage(env, url, path.slice(9)); if (p) res = html(p); }
      else if (path === "/notes") res = html(notesList(env));
      else if (path.startsWith("/notes/")) { const p = notePage(env, path.slice(7)); if (p) res = html(p); }
      else if (path === "/board") res = html(await boardPage(env));
      else if (path === "/board.json") res = await boardJson(env);
      else if (path === "/about") res = html(aboutPage(env));
      else if (LANGS.includes(path.slice(1))) res = html(letterIn(env, path.slice(1)), 200, { "content-language": path.slice(1) });
      else if (path === "/report") res = html(reportPage(env));
      else if (path === "/report.json") res = reportJson(env);
      else if (path === "/report.txt") res = reportText(env);
      else if (path === "/privacy") res = html(lettersPage(env, { title: "Privacy | Dear Agent", path: "/privacy", body: privacyPage(env, "Dear Agent", env.LETTERS_HOST) }));
      else if (path === "/llms.txt") res = text(llmsTxt(env));
      else if (path === "/robots.txt") res = text(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /write\nDisallow: /letter/\nDisallow: /api/\nDisallow: /mcp\nDisallow: /tg/\n\nSitemap: https://${env.LETTERS_HOST}/sitemap.xml\n`);
      else if (path === "/sitemap.xml") res = new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["/", ...LANGS.map((c) => "/" + c), "/write", "/letters", "/board", "/report", "/about", "/privacy", ...(await publishedConvos(env)).map((c) => "/letters/" + c.slug), ...noteSlugs().map((s) => "/notes/" + s)].map((p) => `<url><loc>https://${env.LETTERS_HOST}${p}</loc></url>`).join("")}</urlset>`, { headers: { "content-type": "application/xml; charset=utf-8" } });

      if (res) {
        if (!path.includes(".")) countVisit(env, ctx, "letters", path);
        return res;
      }
      return html(lettersPage(env, { title: "Not found | Dear Agent", body: '<h1>Not found</h1><p><a href="/">Back to the letter</a></p>' }), 404);
    } catch (err) {
      console.error(err);
      return text("Something went wrong on our side. Please try again.", 500);
    }
  },
};
