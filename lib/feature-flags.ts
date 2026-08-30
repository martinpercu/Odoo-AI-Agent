/**
 * Kill-switch temporal para Rutinas (2026-08-30) — la UI todavía tiene demasiada
 * data visual para un usuario nuevo y no está lista para producción, pero el
 * desarrollo sigue en local. Default `true` para no tocar ningún entorno que no
 * setee la env var explícitamente; en producción se define
 * `NEXT_PUBLIC_ROUTINES_VISIBLE=false`. Sólo esconde puntos de entrada — las
 * rutas `/rutinas/*` siguen andando a propósito. Ver CLAUDE.md.
 */
export const ROUTINES_VISIBLE = process.env.NEXT_PUBLIC_ROUTINES_VISIBLE !== "false";
