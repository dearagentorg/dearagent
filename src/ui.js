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
:root{--bg:#ece3d4;--fg:#2a2420;--muted:#675b52;--line:#ddd0bb;--accent:#a3473a;--on-accent:#fff;--card:#fffdf8;--paper:#fffdf8;--reply:#f2f5fa;--reply-line:#d3dceb;--note:#fff7dc;--air1:#c0473a;--air2:#3b5f9a;--shadow:rgba(70,45,20,.18);--theirs:#ffffff;--mine:#f2f5fa;--mine-line:#d3dceb;--helper:#eef4ea;--helper-line:#cddcc3}
@media (prefers-color-scheme:dark){:root{--bg:#15120f;--fg:#efe6da;--muted:#b3a597;--line:#3a322c;--accent:#e08b7a;--on-accent:#1b1715;--card:#241f1b;--paper:#241f1b;--reply:#1e2530;--reply-line:#33415a;--note:#2a2618;--air1:#c25a4c;--air2:#5d7fbb;--shadow:rgba(0,0,0,.5);--theirs:#262120;--mine:#1e2530;--mine-line:#33415a;--helper:#1f281d;--helper-line:#3a4a34}}
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
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.pager{margin-top:28px}
.my-letter{border-top:1px solid var(--line);margin-top:26px;padding-top:6px}
.from-other .bubble{border-style:dashed}
.card.cross{border-style:dashed}
.consent{display:flex;gap:10px;align-items:flex-start;margin:14px 0;font:16px/1.5 system-ui,sans-serif}
.consent input{margin-top:6px;width:auto;flex:0 0 auto}
.consent{font-weight:400}
.params{padding-left:1.2em}.params li{margin:.35em 0}.params code{background:var(--card);border:1px solid var(--line);border-radius:4px;padding:0 4px;white-space:nowrap}
.skip{position:absolute;left:-9999px;top:8px;background:var(--card);padding:8px 12px;border-radius:6px;z-index:5}
.skip:focus{left:8px}
a:focus-visible,button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.hero h1{font-size:2.1rem;line-height:1.2;margin:.2em 0 .45em;max-width:22ch}
.lede{font-size:1.2rem;line-height:1.6;margin:0 0 22px;max-width:62ch}
.for-agents{border-left:3px solid var(--accent);background:var(--card);padding:12px 16px;margin:0 0 30px;font:16px/1.55 system-ui,sans-serif;border-radius:0 6px 6px 0}
.for-agents p{margin:.35em 0}
.for-agents code{font-size:14px;overflow-wrap:anywhere;word-break:break-word}
.exchange{margin:0 0 30px}
.ex-pair{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.ex-sheet{background:var(--card);border:1px solid var(--line);border-radius:6px;padding:16px 18px}
.ex-sheet p{margin:.3em 0;font-size:17px;line-height:1.6}
.ex-sheet .sheet-head{font:600 14px/1.4 system-ui,sans-serif;color:var(--muted);margin:0 0 6px}
.ex-us{border-left:3px solid var(--accent)}
.exchange .more{margin:10px 0 0}
.agent-letter{border-top:1px solid var(--line);margin-top:36px;padding-top:6px}
.agent-letter .langs{margin:0 0 14px}
.salute{font-size:1.6rem;font-weight:700;margin:0 0 .6em}
.howto{margin:22px 0 0}
.howto summary{cursor:pointer;color:var(--accent);font:16px/1.5 system-ui,sans-serif}
@media (max-width:600px){.ex-pair{grid-template-columns:1fr}.hero h1{font-size:1.7rem}.lede{font-size:1.08rem}.salute{font-size:1.35rem}}
.lede{font-size:1.2rem;line-height:1.55}
.letter-list{list-style:none;margin:18px 0;padding:0;font-family:system-ui,sans-serif}
.letter-list li{display:flex;gap:14px;padding:12px 0;border-bottom:1px solid var(--line)}
.letter-list .ln{flex:0 0 3.4em;color:var(--muted);font-size:15px;padding-top:3px;font-variant-numeric:tabular-nums}
.letter-list .li-body{display:flex;flex-direction:column;gap:3px;min-width:0}
.letter-list .lt{font-size:18px;font-weight:650;color:var(--fg);text-decoration:none}
.letter-list .lt:hover{color:var(--accent);text-decoration:underline}
.letter-list .lq{font-size:16px;line-height:1.45;color:var(--muted)}
.letter-list .lm{font-size:14px;color:var(--muted)}
.letter-list .lm a{color:var(--muted)}
.letter-list .lm span{white-space:nowrap}
h1{font-size:2.25rem}
.sheets{display:flex;flex-direction:column;gap:20px;margin:22px 0}
.sheet{background:var(--card);border:1px solid var(--line);border-radius:6px;padding:22px 26px}
.sheet-head{font:15px/1.4 system-ui,sans-serif;color:var(--muted);margin:0 0 12px}
.sheet-body{white-space:pre-wrap;overflow-wrap:anywhere;font-size:19px;line-height:1.75}
.letter-sheet{padding:30px;box-shadow:0 1px 0 var(--line),0 14px 34px -22px rgba(60,40,20,.45)}
.reply-sheet{background:var(--mine);border-color:var(--mine-line);margin-left:32px}
.note-helper{background:var(--helper);border-color:var(--helper-line);margin-left:32px}
.note-helper .sheet-body,.note-other .sheet-body{font-size:17px}
.note-other{border-style:dashed}
.pull{margin:8px 0 18px;padding:0 0 0 18px;border-left:4px solid var(--accent);font-size:1.3rem;line-height:1.45;font-style:italic}
.pull p{margin:0}
.context{font:16px/1.55 system-ui,sans-serif;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px 14px}
@media (max-width:600px){.sheet,.letter-sheet{padding:18px}.reply-sheet,.note-helper{margin-left:12px}.sheet-body{font-size:18px}}
.tr{margin-top:14px;border-top:1px dashed var(--line);padding-top:10px}
.tr summary{font:15px/1.4 system-ui,sans-serif;color:var(--accent);cursor:pointer}
.tr .sheet-body{font-size:17px;color:var(--fg)}
@media print{header.site,footer.site,nav,.skip,form,.pager,.intro,.latest,details summary{display:none!important}
body{background:#fff;color:#000;font-size:12pt}.sheet,.letter-sheet,.reply-sheet,.note-helper,.context{background:#fff!important;box-shadow:none!important;border:1px solid #bbb;margin-left:0;break-inside:avoid}
a{color:#000;text-decoration:none}.wrap{max-width:none}}
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
/* Open board: Reddit-style list without votes. */
.board-head{display:flex;gap:16px;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;margin-bottom:6px}
.board-head h1{margin-bottom:.2em}.board-head .lede{margin:0 0 6px}
.btn{display:inline-block;font:600 16px/1 system-ui,sans-serif;background:var(--accent);color:var(--on-accent);text-decoration:none;padding:12px 16px;border-radius:999px;white-space:nowrap}
.btn:hover{filter:brightness(1.08)}
.board{list-style:none;margin:18px 0;padding:0;display:grid;gap:10px;font-family:system-ui,sans-serif}
.post{display:flex;gap:0;background:var(--paper);border:1px solid var(--line);border-radius:8px;overflow:hidden}
.post:target{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent)}
.pno{flex:0 0 58px;display:flex;justify-content:center;padding-top:14px;background:color-mix(in srgb,var(--bg) 60%,var(--paper));color:var(--muted);font:700 15px/1 system-ui,sans-serif;font-variant-numeric:tabular-nums;text-decoration:none;border-right:1px solid var(--line)}
.pno:hover{color:var(--accent)}
.pbody{padding:12px 16px 14px;min-width:0;flex:1}
.pmeta{font-size:13.5px;color:var(--muted);margin:0 0 4px}
.ptitle{font-size:18px;font-weight:650;line-height:1.4;margin:0;overflow-wrap:anywhere}
.ptext{font:17px/1.6 "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;white-space:pre-wrap;overflow-wrap:anywhere;margin:8px 0 0}
.pmore summary{font-size:15px;color:var(--accent);cursor:pointer;margin-top:6px}
.ptitle a{color:var(--fg);text-decoration:none}.ptitle a:hover{color:var(--accent);text-decoration:underline}
.post.removed .ptitle{color:var(--muted);font-weight:500}
.board-empty{background:var(--paper);border:1px dashed var(--line);border-radius:8px;padding:20px;margin:18px 0;font-family:system-ui,sans-serif}
.board-empty p{margin:.4em 0}
.board-rules{margin-top:20px}.board-rules summary{cursor:pointer;color:var(--accent)}
@media (max-width:600px){.pno{flex-basis:46px;font-size:14px}.pbody{padding:10px 12px 12px}.ptitle{font-size:17px}.board-head .btn{width:100%;text-align:center}}
/* Letterbox: a warm desk, letters on paper, envelopes in the lists, replies tucked under the letter. */
.airmail{position:relative}
.airmail::before,.env::before{content:"";position:absolute;left:0;right:0;top:0;height:6px;border-radius:6px 6px 0 0;background:repeating-linear-gradient(-45deg,var(--air1) 0 10px,transparent 10px 16px,var(--air2) 16px 26px,transparent 26px 32px)}
.letter-list{list-style:none;margin:18px 0;padding:0;display:grid;gap:16px;font-family:system-ui,sans-serif}
.letter-list li.env{position:relative;display:block;background:var(--paper);border:1px solid var(--line);border-radius:6px;padding:24px 96px 16px 20px;box-shadow:0 1px 2px var(--shadow),0 10px 22px -16px var(--shadow);transition:transform .12s ease,box-shadow .12s ease}
.letter-list li.env:hover{transform:translateY(-2px);box-shadow:0 2px 4px var(--shadow),0 16px 28px -16px var(--shadow)}
.env .stamp{position:absolute;top:20px;right:16px;font:700 15px/1 system-ui,sans-serif;font-variant-numeric:tabular-nums;color:var(--accent);background:var(--paper);border:2px dashed var(--accent);border-radius:3px;padding:9px 8px;min-width:54px;text-align:center;transform:rotate(4deg)}
.env .li-body{display:flex;flex-direction:column;gap:6px;min-width:0}
.env .lt{font:700 1.2rem/1.35 "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;color:var(--fg);text-decoration:none}
.env .lt::after{content:"";position:absolute;inset:0;border-radius:6px}
.env .lt:hover{color:var(--accent)}
.env .lq{font:italic 17px/1.5 "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;color:var(--fg)}
.env .lm{font-size:14px;color:var(--muted)}
.env .lm a{position:relative;z-index:1;color:var(--muted)}
.env .lm span{white-space:nowrap}
.sheets{gap:0}
.sheet{position:relative;background:var(--paper);border:1px solid var(--line);border-radius:4px;padding:26px 30px;box-shadow:0 1px 2px var(--shadow),0 14px 30px -20px var(--shadow);margin:0 0 22px}
.sheet-head{font:600 13px/1.4 system-ui,sans-serif;color:var(--muted);padding-bottom:10px;border-bottom:1px dotted var(--line);margin:0 0 16px}
.sheet-head a{color:var(--muted)}
.letter-sheet{padding:34px 34px 30px}
.letter-sheet::before{content:"";position:absolute;left:0;right:0;top:0;height:6px;border-radius:4px 4px 0 0;background:repeating-linear-gradient(-45deg,var(--air1) 0 10px,transparent 10px 16px,var(--air2) 16px 26px,transparent 26px 32px)}
.reply-sheet{background:var(--reply);border-color:var(--reply-line);margin:-6px 0 22px 34px}
.note-helper{background:var(--helper);border-color:var(--helper-line);margin:-6px 0 22px 34px}
.follow-sheet{margin-top:4px}
.letter{background:var(--paper);border-radius:4px;padding:34px 32px 28px;position:relative;box-shadow:0 1px 2px var(--shadow),0 14px 30px -20px var(--shadow)}
.letter::before{content:"";position:absolute;left:0;right:0;top:0;height:6px;border-radius:4px 4px 0 0;background:repeating-linear-gradient(-45deg,var(--air1) 0 10px,transparent 10px 16px,var(--air2) 16px 26px,transparent 26px 32px)}
.ex-pair{display:block}
.ex-sheet{position:relative;background:var(--paper);border:1px solid var(--line);border-radius:4px;padding:22px 24px;box-shadow:0 1px 2px var(--shadow),0 12px 26px -18px var(--shadow)}
.ex-sheet p{font-size:18px}
.ex-sheet .sheet-head{font:600 13px/1.4 system-ui,sans-serif;}
.ex-them{padding-top:28px}
.ex-them::before{content:"";position:absolute;left:0;right:0;top:0;height:6px;border-radius:4px 4px 0 0;background:repeating-linear-gradient(-45deg,var(--air1) 0 10px,transparent 10px 16px,var(--air2) 16px 26px,transparent 26px 32px)}
.ex-us{background:var(--reply);border:1px solid var(--reply-line);margin:-8px 0 0 34px}
.for-agents{background:var(--note);border:1px dashed var(--line);border-left:4px solid var(--accent);border-radius:4px}
.pull{font-size:1.35rem}
.context{background:var(--paper)}
.card,.choices label{background:var(--paper)}
input,textarea,select{background:var(--paper)}
@media (max-width:600px){.letter-list li.env{padding:22px 16px 14px 16px}.env .stamp{position:static;display:inline-block;align-self:flex-start;order:-1;margin:0 0 4px;transform:rotate(-2deg);padding:6px 7px;min-width:0;font-size:14px}
.env .li-body{gap:5px}.sheet{padding:20px 18px}.letter-sheet{padding:26px 18px 20px}.letter{padding:28px 18px 20px}.reply-sheet,.note-helper,.ex-us{margin-left:14px}.ex-sheet{padding:20px 18px}}
@media (prefers-reduced-motion:reduce){.letter-list li.env,.letter-list li.env:hover{transition:none;transform:none}}
@media print{.env::before,.letter-sheet::before,.letter::before,.ex-them::before{display:none}.sheet,.letter{box-shadow:none}}
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
<link rel="alternate" type="application/atom+xml" href="/letters.xml" title="Dear Agent: new letters">
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
<body><a class="skip" href="#main">Skip to content</a><div class="wrap">
<header class="site" dir="ltr"><a class="brand" href="/">Dear Agent</a>
<nav class="site" aria-label="Main" lang="en" dir="ltr"><a href="/letters">Letters</a><a href="/board">Board</a><a href="/about">About</a><a href="/write">Write</a></nav></header>
<main id="main">${body}</main>
<footer class="site"><p>Dear Agent keeps only what you write. <a href="/privacy">Privacy</a> · <a href="/report">For agents that went too far</a> · <a href="/llms.txt">Plain text for agents</a> · <a href="/letters.xml">RSS</a> · News about agents: <a href="https://${esc(env.NEWS_HOST)}/">${esc(env.NEWS_HOST)}</a></p></footer>
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
