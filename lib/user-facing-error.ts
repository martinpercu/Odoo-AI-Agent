import { NETWORK_ERROR } from "@/lib/api";

/**
 * F-13 (A12) — qué error se le puede mostrar a una persona.
 *
 * Varias llamadas de `lib/api.ts` devuelven, cuando fallan, textos pensados para el
 * desarrollador: el centinela de red, "Network error: Could not connect to backend",
 * "Failed to fetch pins", "API error: 500", el `message` de una excepción. En inglés, en
 * una pantalla en castellano, y con jerga. El visitante anónimo del demo no puede ver
 * NINGUNO (A12: sólo un mensaje neutro); alguien con sesión sigue viendo los mensajes del
 * backend que SÍ están redactados para él (un 409 que dice qué hacer), pero nunca los
 * de red, que se traducen para todos.
 */

const NETWORK_PATTERNS = [/^network error\b/i, /failed to fetch/i, /networkerror/i, /load failed/i];

/** Textos que no son para una persona: fallbacks en inglés, códigos, excepciones. */
const TECHNICAL_PATTERNS = [
  /^api error:?\s*\d+/i,
  /^(failed to|could not|unable to)\b/i,
  /\b(refresh|export|upload|transcription) failed\b/i,
  /^(type|reference|syntax|range)?error\b/i,
  /\btraceback\b|\bexception\b|\bat \S+:\d+:\d+/i,
  /^[A-Z][A-Z0-9_]{3,}(:|$)/, // códigos tipo STT_NOT_ENTITLED, NO_CREDENTIALS:
  /[{}[\]]/, // JSON crudo
];

export function isNetworkError(message: string | null | undefined): boolean {
  if (!message) return false;
  return message === NETWORK_ERROR || NETWORK_PATTERNS.some((p) => p.test(message));
}

export function isTechnicalError(message: string | null | undefined): boolean {
  if (!message) return false;
  return isNetworkError(message) || TECHNICAL_PATTERNS.some((p) => p.test(message.trim()));
}

/**
 * El texto final: el de red siempre traducido; sin sesión, cualquier cosa técnica se
 * vuelve el neutro. Con sesión, un mensaje de negocio del backend pasa tal cual.
 */
export function userFacingError(
  message: string | null | undefined,
  opts: { anonymous: boolean; connection: string; generic: string }
): string {
  if (!message) return opts.generic;
  if (isNetworkError(message)) return opts.connection;
  if (opts.anonymous && isTechnicalError(message)) return opts.generic;
  return message;
}
