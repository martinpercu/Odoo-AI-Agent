/**
 * Standalone SMTP smoke test for the invitation email config.
 *
 *   node scripts/test-invite-email.mjs [recipient@example.com]
 *
 * Reads the same env vars the route handler uses from .env.local, verifies the
 * SMTP connection, then sends one test message. Never prints the password.
 */
import nodemailer from "nodemailer";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Minimal .env.local parser (KEY=VALUE, ignores comments/blank lines).
const env = {};
try {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2];
  }
} catch {
  console.error("Could not read .env.local");
  process.exit(1);
}

const host = env.ZOHO_SMTP_HOST || "smtp.zoho.com";
const port = Number(env.ZOHO_SMTP_PORT || 465);
const user = env.ZOHO_SMTP_USER;
const pass = env.ZOHO_SMTP_PASS;
const from = env.INVITE_EMAIL_FROM || `TheOdooAgent <${user}>`;
const replyTo = env.INVITE_EMAIL_REPLY_TO || undefined;
const to = process.argv[2] || user;

if (!user || !pass) {
  console.error("Missing ZOHO_SMTP_USER or ZOHO_SMTP_PASS in .env.local");
  process.exit(1);
}

console.log(`Host : ${host}:${port} (secure=${port === 465})`);
console.log(`User : ${user}`);
console.log(`From : ${from}`);
console.log(`Reply: ${replyTo || "(none)"}`);
console.log(`To   : ${to}`);
console.log("");

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
});

try {
  console.log("→ Verifying SMTP connection...");
  await transporter.verify();
  console.log("✓ Connection + auth OK\n");

  console.log("→ Sending test email...");
  const info = await transporter.sendMail({
    from,
    to,
    replyTo,
    subject: "TheOdooAgent — SMTP test ✅",
    text: "If you can read this, the invitation email pipeline (Zoho SMTP) works.",
    html: `<div style="font-family:sans-serif;padding:24px">
      <h2 style="margin:0 0 12px">SMTP test ✅</h2>
      <p>If you can read this, the invitation email pipeline (Zoho SMTP) works.</p>
      <p style="color:#666;font-size:13px">Sent from <code>${host}:${port}</code> as <code>${from}</code>.</p>
    </div>`,
  });
  console.log(`✓ Sent. messageId=${info.messageId}`);
  console.log(`  accepted=${JSON.stringify(info.accepted)} rejected=${JSON.stringify(info.rejected)}`);
} catch (err) {
  console.error("\n✗ FAILED:");
  console.error(`  ${err?.message || err}`);
  if (err?.response) console.error(`  server: ${err.response}`);
  process.exit(1);
}
