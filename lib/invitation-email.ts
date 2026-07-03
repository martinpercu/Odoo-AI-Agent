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
  subject: string;       // {org_name}, {company_name}
  preheader: string;     // {expiry_date}
  heading: string;       // {org_name}, {company_name}
  body: string;
  cta: string;
  expiry: string;        // {expiry_date}
  fallback: string;      // shown before the raw URL in footer
  ignore: string;
  companyFallback: string; // shown when company_name is not available
}

const COPY: Record<SupportedEmailLang, EmailCopy> = {
  es: {
    subject: "{org_name}: activá tu acceso a {company_name}",
    preheader: "Creá tu cuenta en un clic. El enlace vence el {expiry_date}.",
    heading: "{org_name} te dio acceso a:<br>{company_name}",
    body: "Creá tu cuenta y empezá a consultar tu Odoo en lenguaje natural.",
    cta: "Crear mi cuenta",
    expiry: "El enlace vence el {expiry_date}.",
    fallback: "¿No te anda el botón? Pegá este enlace en tu navegador:",
    ignore: "Si no esperabas este email, ignoralo.",
    companyFallback: "Tu instancia de Odoo",
  },
  en: {
    subject: "{org_name}: activate your access to {company_name}",
    preheader: "Create your account in one click. The link expires on {expiry_date}.",
    heading: "{org_name} gave you access to:<br>{company_name}",
    body: "Create your account and start querying your Odoo in natural language.",
    cta: "Create my account",
    expiry: "The link expires on {expiry_date}.",
    fallback: "Button not working? Paste this link into your browser:",
    ignore: "If you weren't expecting this email, ignore it.",
    companyFallback: "Your Odoo instance",
  },
  fr: {
    subject: "{org_name} : activez votre accès à {company_name}",
    preheader: "Créez votre compte en un clic. Le lien expire le {expiry_date}.",
    heading: "{org_name} vous a donné accès à :<br>{company_name}",
    body: "Créez votre compte et commencez à interroger votre Odoo en langage naturel.",
    cta: "Créer mon compte",
    expiry: "Le lien expire le {expiry_date}.",
    fallback: "Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :",
    ignore: "Si vous ne vous y attendiez pas, ignorez cet e-mail.",
    companyFallback: "Votre instance Odoo",
  },
  de: {
    subject: "{org_name}: Aktiviere deinen Zugang zu {company_name}",
    preheader: "Erstelle dein Konto mit einem Klick. Der Link läuft am {expiry_date} ab.",
    heading: "{org_name} hat dir Zugang zu:<br>{company_name}",
    body: "Erstelle dein Konto und fange an, dein Odoo in natürlicher Sprache abzufragen.",
    cta: "Konto erstellen",
    expiry: "Der Link läuft am {expiry_date} ab.",
    fallback: "Schaltfläche funktioniert nicht? Füge diesen Link in deinen Browser ein:",
    ignore: "Falls du diese E-Mail nicht erwartet hast, ignoriere sie.",
    companyFallback: "Deine Odoo-Instanz",
  },
  pt: {
    subject: "{org_name}: ative seu acesso a {company_name}",
    preheader: "Crie sua conta com um clique. O link vence em {expiry_date}.",
    heading: "{org_name} te deu acesso a:<br>{company_name}",
    body: "Crie sua conta e comece a consultar seu Odoo em linguagem natural.",
    cta: "Criar minha conta",
    expiry: "O link vence em {expiry_date}.",
    fallback: "Botão não funciona? Cole este link no seu navegador:",
    ignore: "Se você não esperava este email, ignore-o.",
    companyFallback: "Sua instância do Odoo",
  },
  it: {
    subject: "{org_name}: attiva il tuo accesso a {company_name}",
    preheader: "Crea il tuo account in un clic. Il link scade il {expiry_date}.",
    heading: "{org_name} ti ha dato accesso a:<br>{company_name}",
    body: "Crea il tuo account e inizia a interrogare il tuo Odoo in linguaggio naturale.",
    cta: "Crea il mio account",
    expiry: "Il link scade il {expiry_date}.",
    fallback: "Il pulsante non funziona? Incolla questo link nel tuo browser:",
    ignore: "Se non ti aspettavi questa email, ignorala.",
    companyFallback: "La tua istanza Odoo",
  },
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
  brandName?: string | null;
  companyName?: string | null;
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
  const { lang, orgName, brandName, companyName, acceptUrl, expiresAt } = params;
  const c = COPY[lang];

  // brand_name is the white-label name shown to clients; falls back to internal org name.
  const displayBrand = brandName || orgName;
  // company_name is the Odoo instance name; falls back to localized generic string.
  const displayCompany = companyName || c.companyFallback;

  const safeOrg = escapeHtml(orgName);
  const safeCompany = escapeHtml(displayCompany);
  const safeUrl = escapeHtml(acceptUrl);

  const expiryDate = formatExpiry(expiresAt, lang);

  const subject = c.subject
    .replace("{org_name}", displayBrand)
    .replace("{company_name}", displayCompany);

  const preheader = expiryDate
    ? c.preheader.replace("{expiry_date}", expiryDate)
    : "";

  const heading = c.heading
    .replace("{org_name}", safeOrg)
    .replace("{company_name}", safeCompany);

  const expiry = expiryDate
    ? c.expiry.replace("{expiry_date}", expiryDate)
    : "";

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
</head>
<body style="margin:0;padding:0;background:#FAFAF7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escapeHtml(preheader)}</div>` : ""}
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:32px 16px">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:500px" cellpadding="0" cellspacing="0" role="presentation">

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:10px;border:1px solid #E7E5DD;box-shadow:0 1px 3px rgba(0,0,0,0.06);padding:36px 32px">

              <!-- Heading -->
              <p style="margin:0 0 12px;font-size:18px;font-weight:700;line-height:1.3;color:#111">${heading}</p>

              <!-- Body -->
              <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#444">${escapeHtml(c.body)}</p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:${expiry ? "16px" : "0"}">
                <tr>
                  <td style="border-radius:10px;background:#6366F1">
                    <a href="${safeUrl}"
                       style="display:inline-block;padding:13px 28px;color:#fff;text-decoration:none;font-size:15px;font-weight:600;border-radius:10px;line-height:1">${escapeHtml(c.cta)}</a>
                  </td>
                </tr>
              </table>

              <!-- Expiry -->
              ${expiry ? `<p style="margin:0;font-size:12px;color:#888">${escapeHtml(expiry)}</p>` : ""}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 4px 0">
              <p style="margin:0 0 6px;font-size:12px;color:#999;line-height:1.5">${escapeHtml(c.fallback)}<br>
                <a href="${safeUrl}" style="color:#999;word-break:break-all">${safeUrl}</a>
              </p>
              <p style="margin:0;font-size:12px;color:#bbb">${escapeHtml(c.ignore)}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textParts = [
    heading.replace(/<br>/g, "\n").replace(/&[^;]+;/g, ""),
    "",
    c.body,
    "",
    acceptUrl,
  ];
  if (expiry) textParts.push("", expiry);
  textParts.push("", c.fallback, acceptUrl, "", c.ignore);

  return { subject, html, text: textParts.join("\n") };
}
