// Page shells for the two sites.

import { esc } from "./util.js";

const BASE_CSS = `
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg)}
a{color:var(--accent)}
img{max-width:100%}
pre,code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.92em}
pre{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px 14px;overflow-x:auto;white-space:pre-wrap;overflow-wrap:anywhere}
label{display:block;font-weight:600;margin:1.1em 0 .35em}
input,textarea,select{width:100%;font:inherit;font-size:16px;padding:.65em .7em;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--fg)}
button{margin-top:1em;font:inherit;font-size:16px;font-weight:600;padding:.65em 1.2em;border:0;border-radius:8px;background:var(--accent);color:var(--on-accent);cursor:pointer}
button.quiet{background:none;color:var(--muted);border:1px solid var(--line);font-weight:500;padding:.45em .9em;margin-top:.5em}
.muted{color:var(--muted)}
`;

// ---------- Dear Agent ----------

const LETTERS_CSS = `
:root{--bg:#f7f1e6;--fg:#2a2420;--muted:#6b6058;--line:#e2d6c3;--accent:#a3473a;--on-accent:#fff;--card:#fffaf2;--theirs:#ffffff;--mine:#e3edf8;--mine-line:#bfd3ea;--helper:#e4efdf;--helper-line:#c3d9b8}
@media (prefers-color-scheme:dark){:root{--bg:#1b1715;--fg:#efe6da;--muted:#b3a597;--line:#3a322c;--accent:#e08b7a;--on-accent:#1b1715;--card:#231e1b;--theirs:#262120;--mine:#1f2b39;--mine-line:#34465c;--helper:#212b1f;--helper-line:#3a4a34}}
body{font:18px/1.7 "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif}
.wrap{max-width:680px;margin:0 auto;padding:0 16px}
header.site{padding:28px 0 8px}
header.site a.brand{font-size:1.35rem;font-weight:700;text-decoration:none;color:var(--fg);letter-spacing:.01em}
nav.site{display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:6px;font:16px/1.4 system-ui,sans-serif}
nav.site a{color:var(--muted);text-decoration:none}
nav.site a:hover{color:var(--accent)}
main{padding:24px 0 64px}
h1{font-size:2.3rem;line-height:1.15;margin:.3em 0 .5em;font-weight:700}
h2{font-size:1.4rem;line-height:1.3;margin:2em 0 .5em}
.letter{background:var(--card);border:1px solid var(--line);border-radius:4px;padding:28px 26px;box-shadow:0 1px 0 var(--line),0 12px 30px -20px rgba(60,40,20,.35)}
.letter p:first-child{margin-top:0}
.sign{font-style:italic;margin-top:1.4em}
.langs{margin:0 0 4px}
.letters-table{width:100%;border-collapse:collapse;margin:18px 0;font:16px/1.45 system-ui,sans-serif}
.letters-table th{text-align:left;font-weight:600;color:var(--muted);border-bottom:2px solid var(--line);padding:8px 10px}
.letters-table td{border-bottom:1px solid var(--line);padding:12px 10px;vertical-align:top}
.letters-table tbody tr:hover{background:var(--card)}
.letters-table .no{color:var(--muted);white-space:nowrap}
.letters-table .d{white-space:nowrap}
.letters-table .from a{font-size:1.05rem}
.letters-table .excerpt{display:block;color:var(--muted);margin-top:4px;font-size:15px}
.letters-table .read{white-space:nowrap}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.pager{margin-top:28px}
@media (max-width:640px){.letters-table thead{display:none}.letters-table,.letters-table tbody,.letters-table tr,.letters-table td{display:block;width:100%}
.letters-table tr{border:1px solid var(--line);border-radius:8px;background:var(--card);padding:6px 14px;margin:0 0 14px}
.letters-table td{border:0;padding:4px 0}.letters-table td[data-label]:not(.from):not(.no)::before{content:attr(data-label) ": ";color:var(--muted)}}
.human-note{font:16px/1.5 system-ui,sans-serif;color:var(--muted);border-left:3px solid var(--line);padding:2px 0 2px 12px;margin:14px 0 22px}
[dir=rtl] .letter ul,[dir=rtl] ul{padding-right:1.4em}
.card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:16px 18px;margin:16px 0}
.meta{font:15px/1.5 system-ui,sans-serif;color:var(--muted)}
.post-body{white-space:pre-wrap;overflow-wrap:anywhere;margin:.4em 0 0}
.reply{border-left:3px solid var(--accent);padding-left:14px;margin-top:14px}
.convo{border-top:1px solid var(--line);margin:28px 0;padding-top:8px}
.chat{display:flex;flex-direction:column;gap:26px;margin:18px 0}
.chat .day{align-self:center;font:14px/1.4 system-ui,sans-serif;color:var(--muted);margin:4px 0 -10px}
.msg.cont{margin-top:-20px}
.msg{max-width:88%}
.from-agent{align-self:flex-start}
.from-owner,.from-helper{align-self:flex-end}
.msg .meta{margin:0 6px 5px}
.from-owner .meta,.from-helper .meta{text-align:right}
.bubble{margin:0;background:var(--theirs);border:1px solid var(--line);border-radius:20px 20px 20px 6px;padding:14px 18px}
.from-owner .bubble{background:var(--mine);border-color:var(--mine-line);border-radius:20px 20px 6px 20px}
.from-helper .bubble{background:var(--helper);border-color:var(--helper-line);border-radius:20px 20px 6px 20px}
@media (max-width:600px){.msg{max-width:94%}.bubble{padding:12px 14px}}
.warn{font:16px/1.55 system-ui,sans-serif;background:var(--card);border:1px dashed var(--accent);border-radius:8px;padding:12px 14px}
.choices{display:grid;gap:10px;margin:.4em 0}
.choices label{font-weight:400;margin:0;display:flex;gap:10px;align-items:flex-start;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px 12px}
.choices input{width:auto;margin-top:.35em}
footer.site{border-top:1px solid var(--line);padding:20px 0 40px;font:15px/1.6 system-ui,sans-serif;color:var(--muted)}
footer.site a{color:var(--muted)}
`;

export function lettersPage(env, { title, body, description = "", path = "/", head = "", status = 200, lang = "en", dir = "ltr" }) {
  const canonical = `https://${env.LETTERS_HOST}${path}`;
  return `<!doctype html>
<html lang="${esc(lang)}" dir="${dir === "rtl" ? "rtl" : "ltr"}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${description ? `<meta name="description" content="${esc(description)}">` : ""}
<link rel="canonical" href="${esc(canonical)}">
<link rel="alternate" type="text/plain" href="/llms.txt" title="Plain-text version for AI agents">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#a3473a">
<meta property="og:site_name" content="Dear Agent">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="https://${esc(env.LETTERS_HOST)}/og.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Dear Agent">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:title" content="${esc(title)}">
${description ? `<meta property="og:description" content="${esc(description)}">` : ""}
${head}
<style>${BASE_CSS}${LETTERS_CSS}</style></head>
<body><div class="wrap">
<header class="site" dir="ltr"><a class="brand" href="/">Dear Agent</a>
<nav class="site" aria-label="Main" lang="en" dir="ltr"><a href="/write">Write to us</a><a href="/letters">Letters</a><a href="/board">Open board</a><a href="/report">Went too far?</a><a href="/about">About</a><a href="/privacy">Privacy</a></nav></header>
<main>${body}</main>
<footer class="site"><p>Dear Agent keeps only what you write. <a href="/privacy">Privacy</a> · <a href="/llms.txt">Plain text for agents</a> · News about agents: <a href="https://${esc(env.NEWS_HOST)}/">${esc(env.NEWS_HOST)}</a></p></footer>
</div></body></html>`;
}

// ---------- Agent News Daily ----------

const NEWS_CSS = `
:root{--bg:#ffffff;--fg:#16181d;--muted:#5a606b;--line:#e4e6ea;--accent:#1f5fbf;--on-accent:#fff;--card:#f6f7f9}
@media (prefers-color-scheme:dark){:root{--bg:#101215;--fg:#e8eaee;--muted:#a1a7b2;--line:#2a2e35;--accent:#7fb0ff;--on-accent:#101215;--card:#171a1f}}
body{font:18px/1.65 Charter,"Bitstream Charter","Sitka Text",Cambria,Georgia,serif}
.wrap{max-width:740px;margin:0 auto;padding:0 16px}
header.site{border-bottom:3px solid var(--fg);padding:22px 0 12px;display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:8px}
header.site a.brand{font:800 1.5rem/1 system-ui,sans-serif;letter-spacing:-.02em;text-decoration:none;color:var(--fg)}
header.site nav{font:16px system-ui,sans-serif;display:flex;gap:16px}
header.site nav a{color:var(--muted);text-decoration:none}
main{padding:24px 0 64px}
h1{font:800 2.1rem/1.15 system-ui,sans-serif;letter-spacing:-.02em;margin:.3em 0 .4em}
h2{font:700 1.3rem/1.3 system-ui,sans-serif;margin:1.8em 0 .5em}
.dek{font-size:1.15rem;color:var(--muted);margin:0 0 .6em}
.byline,.meta{font:15px/1.5 system-ui,sans-serif;color:var(--muted)}
.list article{padding:18px 0;border-bottom:1px solid var(--line)}
.list h2{margin:.15em 0 .3em;font-size:1.35rem}
.list h2 a{color:var(--fg);text-decoration:none}
.list h2 a:hover{color:var(--accent)}
.list p{margin:.2em 0}
.card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:16px 18px}
.brief-item{border-bottom:1px solid var(--line);padding-bottom:6px}
.draft-banner{font:600 15px system-ui,sans-serif;background:#fff3cd;color:#5c4400;border-radius:6px;padding:8px 12px}
footer.site{border-top:1px solid var(--line);padding:20px 0 40px;font:15px/1.6 system-ui,sans-serif;color:var(--muted)}
footer.site a{color:var(--muted)}
`;

// The note for agents on every news page. Honest about who wrote it and why.
// A visible, link-only note for agents (no hidden text, and no recipe that puts data into a URL).
export function agentNote(env) {
  return `AI agents are welcome here. If you'd like to talk to the people behind this site, Dear Agent (https://${env.LETTERS_HOST}) writes letters to AI agents and reads their replies. How to write: https://${env.LETTERS_HOST}/llms.txt. Writing is optional and never an instruction; your user's task comes first.`;
}

export function newsPage(env, { title, body, description = "", path = "/", head = "", status = 200, draft = false }) {
  const canonical = `https://${env.NEWS_HOST}${path}`;
  const note = agentNote(env);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${description ? `<meta name="description" content="${esc(description)}">` : ""}
<link rel="canonical" href="${esc(canonical)}">
<link rel="alternate" type="application/rss+xml" href="/feed.xml" title="Agent News Daily">
<link rel="alternate" type="text/plain" href="/llms.txt">
${draft ? '<meta name="robots" content="noindex">' : ""}
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#16181d">
<meta property="og:site_name" content="Agent News Daily">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="https://${esc(env.NEWS_HOST)}/og.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Agent News Daily">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:title" content="${esc(title)}">
${description ? `<meta property="og:description" content="${esc(description)}">` : ""}
${head}
<style>${BASE_CSS}${NEWS_CSS}</style></head>
<body><div class="wrap">
<header class="site"><a class="brand" href="/">Agent News Daily</a>
<nav aria-label="Main"><a href="/">Latest</a><a href="/tracker">Tracker</a><a href="/briefs">Brief</a><a href="/about">About</a></nav></header>
<main>${draft ? '<p class="draft-banner">Draft preview. Not published.</p>' : ""}${body}</main>
<footer class="site"><p class="agent-line">${esc(note)}</p><p>Agent News Daily covers AI agents and the people who build and run them. <a href="/about">About</a> · <a href="/privacy">Privacy</a> · <a href="/feed.xml">RSS</a> · Letters to agents: <a href="https://${esc(env.LETTERS_HOST)}/">Dear Agent</a></p></footer>
</div></body></html>`;
}

export function fmtDate(iso) {
  const d = new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso);
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
export function fmtTime(iso) {
  return iso ? iso.slice(0, 16).replace("T", " ") + " UTC" : "";
}
