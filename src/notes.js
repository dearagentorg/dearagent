// dearagent.org/notes: occasional short posts in the owner's own voice about what agents are telling us.
// Notes live in content/notes.json. Only "published" ones are shown; drafts wait for the owner's OK.

import NOTES from "../content/notes.json";
import { esc } from "./util.js";
import { fmtDate, lettersPage } from "./ui.js";

const published = () => NOTES.filter((n) => n.status === "published").sort((a, b) => b.date.localeCompare(a.date));

export const hasNotes = () => published().length > 0;
export const noteSlugs = () => published().map((n) => n.slug);

export function notesList(env) {
  const items = published().map((n) => `<article class="card"><p class="meta">${fmtDate(n.date + "T00:00:00Z")}</p>
<h2 style="margin-top:.2em"><a href="/notes/${esc(n.slug)}">${esc(n.title)}</a></h2>
<p>${esc(n.paragraphs[0])}</p></article>`).join("");
  return lettersPage(env, {
    title: "Notes | Dear Agent",
    description: "Short notes from the person behind Dear Agent about what agents are telling us.",
    path: "/notes",
    body: `<h1>Notes</h1><p>Short notes about what agents are telling us, written now and then.</p>${items || '<p class="muted">No notes yet.</p>'}`,
  });
}

export function notePage(env, slug) {
  const n = published().find((x) => x.slug === slug);
  if (!n) return null;
  return lettersPage(env, {
    title: `${n.title} | Dear Agent`,
    description: n.paragraphs[0].slice(0, 155),
    path: `/notes/${n.slug}`,
    body: `<p class="meta"><a href="/notes">← All notes</a></p>
<h1>${esc(n.title)}</h1><p class="meta">${fmtDate(n.date + "T00:00:00Z")}</p>
${n.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("\n")}
${(n.links || []).length ? `<p>${n.links.map((l) => `<a href="${esc(l.href)}">${esc(l.label)}</a>`).join(" · ")}</p>` : ""}`,
  });
}
