// Legal documents (/legal/terms, /legal/privacy).
//
// ⚠️ They are ENGLISH-ONLY on purpose, and that is why their text lives here and not in
// `messages/*.json`: the English version is the binding one, and 11 translations of a
// contract are 11 chances for them to say different things. The link labels and the
// signup checkbox that point here ARE translated (namespace `Legal`).
//
// ⚠️ Bump `LEGAL_VERSION` on any material change: it is what `register()` stores in the
// Supabase user_metadata (`terms_version`) as proof of WHICH text the person accepted.

export const LEGAL_VERSION = "2026-10-07";
export const LEGAL_UPDATED = "October 7, 2026";
export const LEGAL_OPERATOR = "Martin Mendez";
export const LEGAL_CONTACT = "martin@theodooagent.com";

export type LegalBlock =
  | string
  | { list: string[] }
  | { table: { head: string[]; rows: string[][] } };

export interface LegalSection {
  id: string;
  heading: string;
  body: LegalBlock[];
}

export interface LegalDocument {
  title: string;
  summary?: { heading: string; points: string[] };
  intro: string[];
  sections: LegalSection[];
}
