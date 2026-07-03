/**
 * Server-side endpoint that sends the team invitation email via Zoho SMTP.
 *
 * The backend mints the token (POST /admin/orgs/{id}/invitations) but does NOT send
 * the email — this route owns the transport. The SMTP secrets never reach the client.
 *
 * Flow (see DOCS/invitation-email/invitation-email-frontend.md):
 *   client createInvitation() -> token -> POST /api/send-invitation -> Zoho SMTP
 *
 * Abuse protection: the caller must present a valid Supabase access token (Bearer).
 * We verify it against the backend /me before sending, so an anonymous visitor can't
 * use this route as an open relay to spam arbitrary addresses.
 *
 * Env vars (server-side only):
 *   ZOHO_SMTP_HOST   default smtp.zoho.com
 *   ZOHO_SMTP_PORT   default 465
 *   ZOHO_SMTP_USER   e.g. martin@theodooagent.com
 *   ZOHO_SMTP_PASS   Zoho app-specific password
 *   INVITE_EMAIL_FROM      default "TheOdooAgent <martin@theodooagent.com>"
 *   INVITE_EMAIL_REPLY_TO  optional — monitored inbox replies go to (e.g. when FROM is no-reply@)
 *   APP_BASE_URL     default https://theodooagent.com  (used to build the accept link)
 */

import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { buildInvitationEmail, type InvitationRole } from "@/lib/invitation-email";
import { normalizeEmailLang } from "@/lib/supabase";

export const runtime = "nodejs";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const APP_BASE_URL = (process.env.APP_BASE_URL || "https://theodooagent.com").replace(/\/$/, "");
const SMTP_HOST = process.env.ZOHO_SMTP_HOST || "smtp.zoho.com";
const SMTP_PORT = Number(process.env.ZOHO_SMTP_PORT || 465);
const SMTP_USER = process.env.ZOHO_SMTP_USER;
const SMTP_PASS = process.env.ZOHO_SMTP_PASS;
const NO_REPLY_ADDR = process.env.INVITE_NO_REPLY_ADDR || "no-reply@theodooagent.com";
const REPLY_TO = process.env.INVITE_EMAIL_REPLY_TO || undefined;

interface SendInvitationBody {
  token?: string;
  email?: string;
  orgName?: string;
  brandName?: string | null;
  companyName?: string | null;
  role?: string;
  lang?: string;
  expiresAt?: string;
}

/** Verify the caller is an authenticated user by replaying their token to /me. */
async function isAuthorized(req: NextRequest): Promise<boolean> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  try {
    const res = await fetch(`${API_BASE}/me`, { headers: { Authorization: auth } });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!SMTP_USER || !SMTP_PASS) {
    return NextResponse.json(
      { error: "Email transport not configured (missing ZOHO_SMTP_USER / ZOHO_SMTP_PASS)." },
      { status: 503 }
    );
  }

  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SendInvitationBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { token, email, orgName, brandName, companyName, role, lang, expiresAt } = body;
  if (!token || !email || !orgName) {
    return NextResponse.json(
      { error: "Missing required fields: token, email, orgName" },
      { status: 400 }
    );
  }

  const emailLang = normalizeEmailLang(lang) ?? "en";
  const invitationRole: InvitationRole = role === "ADMIN" ? "ADMIN" : "CLIENT_USER";
  const acceptUrl = `${APP_BASE_URL}/invite?token=${encodeURIComponent(token)}`;

  const { subject, html, text } = buildInvitationEmail({
    lang: emailLang,
    orgName,
    brandName,
    companyName,
    role: invitationRole,
    acceptUrl,
    expiresAt,
  });

  // From name = brand name (white-label) so the recipient recognises who invited them.
  const from = `${brandName || orgName} <${NO_REPLY_ADDR}>`;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // SSL on 465, STARTTLS on 587
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  try {
    await transporter.sendMail({ from, to: email, replyTo: REPLY_TO, subject, html, text });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[send-invitation] SMTP error:", err);
    return NextResponse.json({ error: "Failed to send invitation email." }, { status: 502 });
  }
}
