/**
 * Localized copy + HTML builder for the team invitation email.
 *
 * The backend does NOT send invitation emails — it only mints the token. The front
 * is responsible for building and sending the localized email (see
 * DOCS/invitation-email/invitation-email-frontend.md). This module owns the email
 * *content*; the actual transport lives in app/api/send-invitation/route.ts.
 *
 * Note: this is email body copy, not UI copy — it intentionally does NOT use
 * next-intl. The strings are mirrored from the backend contract doc.
 */

import type { SupportedEmailLang } from "@/lib/supabase";

export type InvitationRole = "ADMIN" | "CLIENT_USER";

interface EmailCopy {
  subject: string; // may contain {org_name}
  heading: string; // may contain {org_name}
  body: string; // may contain {role_label} (already bolded as <strong>)
  cta: string;
  expiry: string; // may contain {expiry_date}
  ignore: string;
}

const COPY: Record<SupportedEmailLang, EmailCopy> = {
  es: {
    subject: "Te invitaron a {org_name}",
    heading: "Te invitaron a {org_name}",
    body: "Te sumaron como <strong>{role_label}</strong>. Hacé clic para crear tu cuenta y empezar.",
    cta: "Aceptar invitación",
    expiry: "La invitación vence el {expiry_date}.",
    ignore: "Si no esperabas esto, ignorá este email.",
  },
  en: {
    subject: "You've been invited to {org_name}",
    heading: "You've been invited to {org_name}",
    body: "You've been added as <strong>{role_label}</strong>. Click to create your account and get started.",
    cta: "Accept invitation",
    expiry: "This invitation expires on {expiry_date}.",
    ignore: "If you weren't expecting this, ignore this email.",
  },
  fr: {
    subject: "Vous avez été invité à {org_name}",
    heading: "Vous avez été invité à {org_name}",
    body: "Vous avez été ajouté en tant que <strong>{role_label}</strong>. Cliquez pour créer votre compte et commencer.",
    cta: "Accepter l'invitation",
    expiry: "Cette invitation expire le {expiry_date}.",
    ignore: "Si vous ne vous y attendiez pas, ignorez cet email.",
  },
  de: {
    subject: "Du wurdest zu {org_name} eingeladen",
    heading: "Du wurdest zu {org_name} eingeladen",
    body: "Du wurdest als <strong>{role_label}</strong> hinzugefügt. Klicke, um dein Konto zu erstellen und loszulegen.",
    cta: "Einladung annehmen",
    expiry: "Diese Einladung läuft am {expiry_date} ab.",
    ignore: "Falls du das nicht erwartet hast, ignoriere diese E-Mail.",
  },
  pt: {
    subject: "Você foi convidado para {org_name}",
    heading: "Você foi convidado para {org_name}",
    body: "Você foi adicionado como <strong>{role_label}</strong>. Clique para criar sua conta e começar.",
    cta: "Aceitar convite",
    expiry: "Este convite expira em {expiry_date}.",
    ignore: "Se você não esperava isto, ignore este email.",
  },
  it: {
    subject: "Sei stato invitato in {org_name}",
    heading: "Sei stato invitato in {org_name}",
    body: "Sei stato aggiunto come <strong>{role_label}</strong>. Clicca per creare il tuo account e iniziare.",
    cta: "Accetta l'invito",
    expiry: "Questo invito scade il {expiry_date}.",
    ignore: "Se non te lo aspettavi, ignora questa email.",
  },
};

const ROLE_LABELS: Record<SupportedEmailLang, Record<InvitationRole, string>> = {
  es: { ADMIN: "Administrador", CLIENT_USER: "Usuario" },
  en: { ADMIN: "Administrator", CLIENT_USER: "User" },
  fr: { ADMIN: "Administrateur", CLIENT_USER: "Utilisateur" },
  de: { ADMIN: "Administrator", CLIENT_USER: "Benutzer" },
  pt: { ADMIN: "Administrador", CLIENT_USER: "Usuário" },
  it: { ADMIN: "Amministratore", CLIENT_USER: "Utente" },
};

/** BCP-47 locale for Intl date formatting, keyed by our email lang. */
const DATE_LOCALE: Record<SupportedEmailLang, string> = {
  es: "es-ES",
  en: "en-US",
  fr: "fr-FR",
  de: "de-DE",
  pt: "pt-BR",
  it: "it-IT",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatExpiry(expiresAt: string | undefined, lang: SupportedEmailLang): string {
  if (!expiresAt) return "";
  const d = new Date(expiresAt);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(DATE_LOCALE[lang], {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export interface BuildInvitationEmailParams {
  lang: SupportedEmailLang;
  orgName: string;
  role: InvitationRole;
  acceptUrl: string;
  expiresAt?: string;
}

export interface BuiltInvitationEmail {
  subject: string;
  html: string;
  text: string;
}

export function buildInvitationEmail(params: BuildInvitationEmailParams): BuiltInvitationEmail {
  const { lang, orgName, role, acceptUrl, expiresAt } = params;
  const c = COPY[lang];
  const safeOrg = escapeHtml(orgName);
  const roleLabel = ROLE_LABELS[lang][role];
  const expiryDate = formatExpiry(expiresAt, lang);

  const subject = c.subject.replace("{org_name}", orgName);
  const heading = c.heading.replace("{org_name}", safeOrg);
  const body = c.body.replace("{role_label}", escapeHtml(roleLabel));
  const expiry = expiryDate ? c.expiry.replace("{expiry_date}", expiryDate) : "";

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f5f5f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
    <h2 style="margin:0 0 16px;font-size:20px;line-height:1.3">${heading}</h2>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#333">${body}</p>
    <p style="margin:0 0 24px">
      <a href="${escapeHtml(acceptUrl)}"
         style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600">${escapeHtml(c.cta)}</a>
    </p>
    ${expiry ? `<p style="margin:0 0 8px;color:#666;font-size:13px">${escapeHtml(expiry)}</p>` : ""}
    <p style="margin:0;color:#666;font-size:13px">${escapeHtml(c.ignore)}</p>
  </div>
</body>
</html>`;

  const textParts = [
    heading.replace(/&[^;]+;/g, ""),
    "",
    c.body.replace("{role_label}", roleLabel).replace(/<\/?strong>/g, ""),
    "",
    acceptUrl,
  ];
  if (expiry) textParts.push("", c.expiry.replace("{expiry_date}", expiryDate));
  textParts.push("", c.ignore);

  return { subject, html, text: textParts.join("\n") };
}
