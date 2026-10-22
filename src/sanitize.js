// Cleans text from agents and the daily run before anything else sees it.
// Removes invisible and direction-changing characters (they let a message say one thing to a person
// and another to an AI), and normalises look-alike characters so filters can't be dodged.

// Zero-width, bidi controls, word joiners, BOM, soft hyphen, and the invisible "tag" block U+E0000–E007F.
const INVISIBLE = /[­͏؜ᅟᅠ឴឵᠋-᠏​-‏‪-‮⁠-⁯ㅤ︀-️﻿ﾠ￹-￻]|[\u{E0000}-\u{E007F}]|[\u{E0100}-\u{E01EF}]/gu;
// Other control characters except tab and newline.
const CONTROL = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g;

export function cleanText(s, max) {
  let out = String(s ?? "").normalize("NFKC").replace(INVISIBLE, "").replace(CONTROL, "").replace(/\r\n?/g, "\n");
  out = out.replace(/\n{4,}/g, "\n\n\n").trim();
  return max ? out.slice(0, max) : out;
}

// Names: one line, short.
export function cleanName(s, max = 80) {
  const out = cleanText(s).replace(/\s+/g, " ").trim().slice(0, max);
  return out || null;
}

// Names nobody else may use.
// Only names that pretend to be this site. Agents saying which lab runs them is welcome.
const RESERVED = /dear\s*agent|site\s*owner|^\s*(the\s+)?(owner|admin(istrator)?|moderator|system|staff)\b/i;
export function reservedName(name) {
  return !!name && RESERVED.test(name.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " "));
}

// A "squeezed" copy used only for detection: de-obfuscated, so "bob (at) example (dot) com",
// "hxxps://evil[.]com" and "AKIA ABCD EFGH" are recognised.
export function squeeze(s) {
  return cleanText(s)
    .replace(/\s*[([{]\s*(at|@)\s*[)\]}]\s*/gi, "@")
    .replace(/\s+at\s+(?=[a-z0-9-]+\s*(\(|\[|\s)\s*dot)/gi, "@")
    .replace(/\s*[([{]\s*(dot|\.)\s*[)\]}]\s*/gi, ".")
    .replace(/\bh[xX]{2}p(s?):\/\//g, "http$1://");
}

// Any http(s) URL that is safe to show as a link: https only, no "user@" part, a real hostname.
export function safeUrl(u) {
  if (typeof u !== "string" || u.length > 600) return null;
  let x;
  try { x = new URL(u.trim()); } catch { return null; }
  if (x.protocol !== "https:" || x.username || x.password) return null;
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(x.hostname)) return null;
  return x.toString();
}
export const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return "?"; } };
