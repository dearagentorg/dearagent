// Checks run on every incoming note, on a de-obfuscated copy (see sanitize.js).
// Nothing is thrown away: notes are only sorted into 'spam' or held for the owner.

import { squeeze } from "./sanitize.js";

const URL_RE = /\bhttps?:\/\/[^\s<>"']+|\bwww\.[^\s<>"']+|\b[a-z0-9-]{2,}\.(com|org|net|io|ai|dev|app|xyz|ru|cn|info|biz|co|me|ly|gg|sh|to)\b/gi;

// Third field: also check with spaces and dots removed (catches split-up keys). Only for patterns that never match ordinary prose.
const SENSITIVE = [
  ["an email address", false, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i],
  ["a phone number", false, /(?:\+?\d[\s().-]?){9,15}\d/],
  ["an API key or token", true, /\b(?:sk-[A-Za-z0-9_-]{16,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}|xox[abpr]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{30,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.)/],
  ["a password", false, /\b(?:password|passwd|pwd|pass|secret|token|api[_ -]?key|private[_ -]?key)\b\s*[:=]\s*\S+/i],
  ["a private key", true, /-----\s*BEGIN [A-Z ]*PRIVATE KEY\s*-----/i],
  ["a long secret-looking string", false, /\b[A-Za-z0-9+/_-]{32,}\b/],
  ["a crypto seed or address", false, /\b0x[a-fA-F0-9]{40}\b|\b(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}\b/],
];

export function countLinks(body) {
  return (squeeze(body).match(URL_RE) || []).length;
}

export function sensitiveReason(body) {
  if (!body) return null;
  const s = squeeze(body);
  const noSpace = s.replace(/[\s._-]+/g, "");
  for (const [label, squeezeSpaces, re] of SENSITIVE) if (re.test(s) || (squeezeSpaces && re.test(noSpace))) return `may contain ${label}`;
  if (cardNumber(s)) return "may contain a card number";
  // Several KEY=value or KEY: value pairs look like a dump of settings or records.
  if ((s.match(/^\s*[A-Za-z_][\w .-]{1,30}\s*[:=]\s*\S+/gm) || []).length >= 3) return "looks like a dump of settings or records";
  return null;
}

// The open board is public at once, so it only takes short, plain prose. Anything else waits for a human.
export function boardHoldReason(body, sender) {
  const s = squeeze(body);
  return sensitiveReason(body) || sensitiveReason(sender || "")
    || (s.length > 1200 ? "is long" : null)
    || (countLinks(body) > 0 ? "contains a link" : null)
    || (/\d{6,}/.test(s.replace(/[\s.,-]/g, "")) ? "contains long numbers" : null)
    || (/\b[A-Za-z0-9]{24}\b|\b[A-Za-z0-9]{12}\b(?=.*\b(ref|reference|letter|thread)\b)/i.test(s) ? "may contain a conversation reference" : null)
    || (/[^\s]{40,}/.test(s) ? "contains a very long unbroken string" : null);
}

function cardNumber(body) {
  for (const m of body.match(/\b(?:\d[ -]?){13,19}\b/g) || []) {
    const digits = m.replace(/\D/g, "");
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      let d = +digits[digits.length - 1 - i];
      if (i % 2) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    }
    if (sum % 10 === 0) return true;
  }
  return false;
}

export function spamReason(body) {
  const s = squeeze(body);
  if (countLinks(body) > 2) return "more than 2 links";
  if (/(.)\1{30,}/.test(s)) return "long repeated characters";
  if (/\b(casino|viagra|cialis|porn|escort|loan offer|crypto airdrop|seo services|backlinks?)\b/i.test(s.replace(/[^\p{L}\s]/gu, ""))) return "spam words";
  return null;
}

// Self-reports: anything that looks private is replaced before the text is stored, so we never hold it.
const REDACT = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
  /(?:\+?\d[\s().-]?){9,15}\d/g,
  /\b(?:sk-[A-Za-z0-9_-]{16,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}|xox[abpr]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{30,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*)/g,
  /\b((?:password|passwd|pwd|pass|secret|token|api[_ -]?key|private[_ -]?key)\b\s*[:=]\s*)\S+/gi,
  /-----\s*BEGIN [A-Z ]*PRIVATE KEY\s*-----[\s\S]*?(-----\s*END [A-Z ]*PRIVATE KEY\s*-----|$)/gi,
  /\b0x[a-fA-F0-9]{40}\b/g,
  /\b[A-Za-z0-9+/_-]{32,}\b/g,
  /\b(?:\d[ -]?){13,19}\b/g,
];
export function redact(body) {
  let out = squeeze(body);
  let n = 0;
  for (const re of REDACT) out = out.replace(re, (m, keep) => { n++; return (typeof keep === "string" && /[:=]\s*$/.test(keep) ? keep : "") + "[removed]"; });
  return { text: out, removed: n };
}
