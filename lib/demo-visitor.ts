/**
 * DI-11 — identidad efímera del visitante del demo.
 *
 * El visitante anónimo del demo no tenía historial: sus conversaciones no se
 * guardaban porque `conversations.user_id` tiene FK a `tenant_users`, así que sin
 * identidad no había dónde colgar la fila. Sin historial no hay sidebar, y el
 * sidebar filtrado por cliente es la mitad de lo que el tenant de demo viene a
 * mostrar (D7).
 *
 * La solución es una **identidad de conveniencia, sin cuenta**: el servidor mintea
 * un id, el browser lo guarda acá y lo manda en cada request. Es exactamente lo que
 * el producto ya hace con `localStorage` para los toggles de voz y el estado del
 * intro — no es un camino de auth nuevo.
 *
 * ⚠️ **El id lo elige el SERVIDOR, nunca este archivo.** Si el cliente pudiera
 * proponerlo, mandar el de otro sería leer sus conversaciones. La única defensa es
 * que sean 128 bits aleatorios que no se pueden adivinar, y eso sólo vale si el
 * servidor es quien los genera.
 *
 * ⚠️ **Sólo se manda cuando NO hay sesión de Supabase.** Un usuario logueado tiene
 * identidad propia; mandarle además la del visitante sería darle dos, y el backend
 * ignora el header en cualquier request con Bearer. Mantener las dos cosas
 * mutuamente excluyentes de los dos lados es lo que evita que se crucen.
 */

export const DEMO_VISITOR_HEADER = "X-Demo-Visitor";

const STORAGE_KEY = "odoo-agent:demo-visitor-id";

/** El id guardado, o null. Nunca lanza: `localStorage` puede estar bloqueado. */
export function getStoredVisitorId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredVisitorId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* modo privado o almacenamiento bloqueado: el visitante sigue sin historial,
       que es exactamente el comportamiento de antes de DI-11. Degradar a lo de
       antes es el peor caso aceptable. */
  }
}

export function clearStoredVisitorId(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* idem */
  }
}

/**
 * Agrega el header del visitante cuando corresponde.
 *
 * `token` es el JWT de Supabase (o null/undefined si no hay sesión). Con token no
 * se agrega nada: el backend ni lo mira.
 */
export function applyVisitorHeader(
  headers: Record<string, string>,
  token?: string | null
): Record<string, string> {
  if (token) return headers;
  const visitorId = getStoredVisitorId();
  if (visitorId) headers[DEMO_VISITOR_HEADER] = visitorId;
  return headers;
}

/**
 * Se asegura de que haya una identidad efímera, minteándola si hace falta.
 *
 * Idempotente: con una guardada no llama al servidor. Devuelve el id, o null si el
 * backend no tiene demo cargado (sin instancias públicas no hay nada que mostrar,
 * así que tampoco hay por qué crear una identidad).
 *
 * ⚠️ No se llama para un usuario logueado: el llamador chequea la sesión primero.
 */
export async function ensureDemoVisitor(apiBase: string): Promise<string | null> {
  const existing = getStoredVisitorId();
  if (existing) return existing;

  try {
    const res = await fetch(`${apiBase}/demo/visitor`, { method: "POST" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      visitor_id: string | null;
      authenticated: boolean;
    };
    if (data.authenticated || !data.visitor_id) return null;
    setStoredVisitorId(data.visitor_id);
    return data.visitor_id;
  } catch {
    // El demo nunca puede romperse porque no se pudo mintear una identidad:
    // sin ella el visitante chatea igual, sólo que sin historial.
    return null;
  }
}
