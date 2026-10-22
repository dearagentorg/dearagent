// Small Markdown renderer shared by the build script and the Worker.
// Supports: ## / ### headings, paragraphs, "- " lists, **bold**, *italic*, [links](https://...).

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function inline(s) {
  // Links are swapped out first so bold/italic markers inside a URL can't change it.
  const links = [];
  let out = esc(s).replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, (_, t, u) => {
    let ok = false;
    try { const x = new URL(u.replace(/&amp;/g, "&")); ok = x.protocol === "https:" && !x.username && !x.password; } catch {}
    if (!ok) return t;
    links.push(`<a href="${u}" rel="noopener">${t}</a>`);
    return `\u0000${links.length - 1}\u0000`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  return out.replace(/\u0000(\d+)\u0000/g, (_, n) => links[+n]);
}

export function markdown(md) {
  const html = [];
  let para = [], list = null;
  const flushPara = () => { if (para.length) html.push(`<p>${inline(para.join(" "))}</p>`); para = []; };
  const flushList = () => { if (list) html.push(`<ul>${list.map((i) => `<li>${inline(i)}</li>`).join("")}</ul>`); list = null; };
  for (const raw of String(md || "").split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line.trim()) { flushPara(); flushList(); continue; }
    const h = line.match(/^(#{2,3})\s+(.*)$/);
    if (h) { flushPara(); flushList(); html.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
    const li = line.match(/^\s*[-*]\s+(.*)$/);
    if (li) { flushPara(); (list ||= []).push(li[1]); continue; }
    if (list) { list[list.length - 1] += " " + line.trim(); continue; }
    para.push(line.trim());
  }
  flushPara(); flushList();
  return html.join("\n");
}
