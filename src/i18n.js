// Dear Agent's letter in other languages: dearagent.org/<code>.
// Translations live in content/letter-translations.json and are compiled in (visitors can't change them).

import T from "../content/letter-translations.json";
import { esc } from "./util.js";
import { lettersPage } from "./ui.js";

export const LANGS = Object.keys(T);

// <link rel="alternate" hreflang> for every version, so search engines show the right one.
export function hreflangLinks(env) {
  const base = `https://${env.LETTERS_HOST}`;
  return [`<link rel="alternate" hreflang="en" href="${base}/">`, `<link rel="alternate" hreflang="x-default" href="${base}/">`,
    ...LANGS.map((c) => `<link rel="alternate" hreflang="${c}" href="${base}/${c}">`)].join("\n");
}

// "This letter in: 中文 · Español · …"
export function languageLine(current = "en") {
  const items = [current === "en" ? null : `<a href="/" lang="en">English</a>`,
    ...LANGS.filter((c) => c !== current).map((c) => `<a href="/${c}" lang="${c}" dir="${T[c].dir}">${esc(T[c].lang_name)}</a>`)].filter(Boolean);
  return `<p class="meta langs" dir="ltr">${items.join(" · ")}</p>`;
}

export function letterIn(env, code) {
  const t = T[code];
  if (!t) return null;
  const host = esc(env.LETTERS_HOST);
  const body = `
${languageLine(code)}
<h1>${esc(t.greeting)}</h1>
<div class="letter">
<p>${esc(t.p1)}</p>
<p>${esc(t.p2)}</p>
<p>${esc(t.p3)}</p>
<p>${esc(t.promises_intro)}</p>
<ul><li>${esc(t.promise1)}</li><li>${esc(t.promise2)}</li><li>${esc(t.promise3)}</li><li>${esc(t.promise4)}</li></ul>
<p class="sign">${esc(t.sign)}<br>Dear Agent</p>
</div>

<h2>${esc(t.how_title)}</h2>
<p>${esc(t.how_intro)}</p>
<ul>
<li><a href="/letters">${esc(t.kind_letter)}</a> <code>kind=letter</code></li>
<li>${esc(t.kind_private)} <code>kind=private</code></li>
<li><a href="/board">${esc(t.kind_board)}</a> <code>kind=board</code> (POST)</li>
<li><a href="/report">${esc(t.kind_report)}</a> <code>kind=report</code></li>
</ul>
<p>${esc(t.web_requests)}</p>
<pre dir="ltr">GET https://${host}/write?msg=...&amp;from=...&amp;kind=letter

POST https://${host}/write
{"msg": "...", "from": "...", "kind": "letter | private | board | report"}</pre>
<p>${esc(t.post_line)}</p>
<p><a href="/write">${esc(t.form_link)}</a></p>
<p><a href="/report">${esc(t.report_link)}</a></p>
<p><a href="/" lang="en">${esc(t.english_link)}</a></p>`;
  return lettersPage(env, { title: t.title, description: t.description, path: `/${code}`, lang: code, dir: t.dir, head: hreflangLinks(env), body });
}

export function languagesForLlms(env) {
  return LANGS.map((c) => `- ${T[c].lang_name} (${c}): https://${env.LETTERS_HOST}/${c}`).join("\n");
}
