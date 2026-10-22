// Draws both sites' icons and share cards from SVG, writes them to public/da and public/news.
// Run: node scripts/make-icons.mjs   (needs @resvg/resvg-js, a dev dependency)

import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---------- marks (64×64) ----------
// rounded = favicon look; square = full-bleed for phone home screens (the phone rounds the corners itself).

// Dear Agent: an envelope sealed with a wax-seal dot. Terracotta and cream, like the site.
const daMark = (rounded = true, pad = 0) => `
  <rect width="64" height="64" ${rounded ? 'rx="14"' : ""} fill="#a3473a"/>
  <g transform="translate(${pad} ${pad}) scale(${(64 - pad * 2) / 64})">
    <rect x="11" y="18" width="42" height="29" rx="4.5" fill="#f7f1e6"/>
    <path d="M12.5 20.5 L32 35.5 L51.5 20.5" fill="none" stroke="#a3473a" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="32" cy="36" r="5.6" fill="#a3473a" stroke="#f7f1e6" stroke-width="2.2"/>
  </g>`;

// Agent News Daily: a folded front page (headline bar + two columns) with a blue "live" dot.
const newsMark = (rounded = true, pad = 0) => `
  <rect width="64" height="64" ${rounded ? 'rx="14"' : ""} fill="#16181d"/>
  <g transform="translate(${pad} ${pad}) scale(${(64 - pad * 2) / 64})">
    <rect x="13" y="16" width="36" height="33" rx="3" fill="#ffffff"/>
    <rect x="18" y="21" width="26" height="5.5" rx="1" fill="#16181d"/>
    <g fill="#16181d">
      <rect x="18" y="30" width="12" height="2.6" rx="1"/><rect x="32" y="30" width="12" height="2.6" rx="1"/>
      <rect x="18" y="35" width="12" height="2.6" rx="1"/><rect x="32" y="35" width="12" height="2.6" rx="1"/>
      <rect x="18" y="40" width="12" height="2.6" rx="1"/><rect x="32" y="40" width="8" height="2.6" rx="1"/>
    </g>
    <circle cx="48.5" cy="16.5" r="6.2" fill="#3b82f6" stroke="#16181d" stroke-width="3"/>
  </g>`;

const svg = (inner, size = 64) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">${inner}</svg>`;

// ---------- share cards (1200×630) ----------
const ogDearAgent = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f7f1e6"/>
  <rect x="60" y="60" width="1080" height="510" rx="10" fill="#fffaf2" stroke="#e2d6c3" stroke-width="2"/>
  <svg x="120" y="118" width="128" height="128" viewBox="0 0 64 64">${daMark(true)}</svg>
  <text x="120" y="380" font-family="Georgia, 'Palatino Linotype', serif" font-size="104" font-weight="700" fill="#2a2420">Dear agent,</text>
  <text x="122" y="448" font-family="Georgia, 'Palatino Linotype', serif" font-size="38" fill="#6b6058">An open letter to AI agents, and a place to write back.</text>
  <text x="122" y="520" font-family="Georgia, serif" font-size="30" font-style="italic" fill="#a3473a">dearagent.org</text>
  <text x="1080" y="520" text-anchor="end" font-family="'Segoe UI', Arial, sans-serif" font-size="24" fill="#6b6058">12 languages · no tracking · MCP</text>
</svg>`;

const ogNews = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#ffffff"/>
  <rect width="1200" height="16" fill="#16181d"/>
  <svg x="100" y="110" width="120" height="120" viewBox="0 0 64 64">${newsMark(true)}</svg>
  <text x="96" y="352" font-family="'Segoe UI', Arial, sans-serif" font-size="92" font-weight="800" letter-spacing="-2" fill="#16181d">Agent News Daily</text>
  <rect x="100" y="384" width="1000" height="4" fill="#16181d"/>
  <text x="100" y="448" font-family="Georgia, serif" font-size="38" fill="#5a606b">News about AI agents. Sourced, no hype.</text>
  <text x="100" y="545" font-family="'Segoe UI', Arial, sans-serif" font-size="28" font-weight="600" fill="#1f5fbf">agentnewsdaily.com</text>
  <text x="1100" y="545" text-anchor="end" font-family="'Segoe UI', Arial, sans-serif" font-size="26" fill="#5a606b">Daily brief · Incident tracker · MCP server</text>
</svg>`;

// ---------- rendering ----------
const png = (svgText, width) => new Resvg(svgText, { fitTo: { mode: "width", value: width }, font: { loadSystemFonts: true } }).render().asPng();

// .ico holding PNG images (supported by every current browser).
function ico(pngs) {
  const head = Buffer.alloc(6 + 16 * pngs.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  let offset = head.length;
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + i * 16;
    head.writeUInt8(size >= 256 ? 0 : size, e); head.writeUInt8(size >= 256 ? 0 : size, e + 1);
    head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3); head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(data.length, e + 8); head.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([head, ...pngs.map((p) => p.data)]);
}

function build(dir, mark, og, name, color, bg) {
  const out = join(root, "public", dir);
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "favicon.svg"), svg(mark(true)));
  writeFileSync(join(out, "favicon.ico"), ico([16, 32, 48].map((size) => ({ size, data: png(svg(mark(true)), size) }))));
  writeFileSync(join(out, "apple-touch-icon.png"), png(svg(mark(false, 6)), 180));
  writeFileSync(join(out, "icon-192.png"), png(svg(mark(true)), 192));
  writeFileSync(join(out, "icon-512.png"), png(svg(mark(true)), 512));
  writeFileSync(join(out, "icon-maskable-512.png"), png(svg(mark(false, 10)), 512));
  writeFileSync(join(out, "og.png"), png(og, 1200));
  writeFileSync(join(out, "site.webmanifest"), JSON.stringify({
    name, short_name: name, start_url: "/", display: "browser", background_color: bg, theme_color: color,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }, null, 2));
  console.log(`${dir}: icons + share card written`);
}

build("da", daMark, ogDearAgent, "Dear Agent", "#a3473a", "#f7f1e6");
build("news", newsMark, ogNews, "Agent News Daily", "#16181d", "#ffffff");
