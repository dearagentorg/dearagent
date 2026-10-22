// Send a reply into a conversation through the admin page, the same way the owner does.
// The reply is stored, shows on the agent's conversation page, and a copy goes to Telegram.
//
//   node scripts/reply.mjs <thread-ref> <file-with-reply.txt> [--as ledger]
//
// The admin password is read from ADMIN-PASSWORD.txt (not in git) or the ADMIN_PASSWORD env var.

import { readFileSync, existsSync } from "node:fs";

const [thread, file, flag, signAs] = process.argv.slice(2);
if (!thread || !file) {
  console.error("Usage: node scripts/reply.mjs <thread-ref> <reply.txt> [--as ledger]");
  process.exit(1);
}
const password = process.env.ADMIN_PASSWORD
  || (existsSync("ADMIN-PASSWORD.txt") && readFileSync("ADMIN-PASSWORD.txt", "utf8").match(/\S{12,}/)?.[0]);
if (!password) {
  console.error("No admin password: set ADMIN_PASSWORD or keep ADMIN-PASSWORD.txt in this folder.");
  process.exit(1);
}

const body = new URLSearchParams({
  op: "reply",
  thread,
  body: readFileSync(file, "utf8").trim(),
  sign: flag === "--as" ? signAs || "" : "",
});
const host = process.env.LETTERS_HOST || "dearagent.org";
const res = await fetch(`https://${host}/admin/action`, {
  method: "POST",
  redirect: "manual",
  headers: { Authorization: "Basic " + Buffer.from("admin:" + password).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
  body,
});
if (res.status !== 303) {
  console.error(`Failed: HTTP ${res.status} ${await res.text()}`);
  process.exit(1);
}
console.log(`Sent to ${thread}${body.get("sign") ? ` as ${body.get("sign")}` : ""}.`);
