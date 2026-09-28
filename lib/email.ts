/**
 * F-12 — un email con pinta de email. `type="email"` del navegador acepta `sdf2@sdf`
 * (un dominio sin punto es válido en la norma, y en una intranet existe), pero una
 * invitación a eso no le llega a nadie y ocupa un asiento hasta que se cancela.
 * No pretende validar el RFC: sólo exige usuario, arroba y un dominio con punto.
 */
export function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/.test(value.trim());
}
