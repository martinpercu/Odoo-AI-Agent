"use client";

import { useEffect, useState } from "react";
import { fetchInstanceUsage, type InstanceUsageInfo } from "@/lib/api";

/**
 * El uso de UNA instancia, compartido por todas las pantallas que lo leen (F-01).
 *
 * Antes el resumen y el carrusel lo pedían cada uno por su lado —cuatro pedidos por cada
 * "Nueva consulta"— y guardaban la respuesta en un estado que NO decía de qué instancia
 * era: al ciclar a una instancia lenta, la tarjeta seguía mostrando los números de la
 * anterior hasta que llegaba la nueva. Un número correcto de la empresa equivocada no se
 * ve distinto de uno correcto.
 *
 * Dos reglas:
 * - **Un pedido por instancia**, en una caché de módulo con vencimiento corto: los
 *   consumidores que montan juntos comparten la misma promesa.
 * - **Se deriva, no se sincroniza**: el estado guarda de qué instancia es cada
 *   respuesta y se devuelve sólo si coincide con la pedida. No hay `setState` en un
 *   efecto que "limpie" lo viejo — ese patrón pinta un render con el dato viejo.
 */

const TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; promise: Promise<InstanceUsageInfo | null> }>();

function loadInstanceUsage(configId: string): Promise<InstanceUsageInfo | null> {
  const hit = cache.get(configId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.promise;
  const promise = fetchInstanceUsage(configId).then((info) => {
    // Un fallo no se cachea: el próximo que monte vuelve a intentar.
    if (info === null) cache.delete(configId);
    return info;
  });
  cache.set(configId, { at: Date.now(), promise });
  return promise;
}

/** `null` mientras no llegó (o no se pudo medir) la respuesta de ESTA instancia. */
export function useInstanceUsage(configId: string | null | undefined): InstanceUsageInfo | null {
  const [entry, setEntry] = useState<{ configId: string; info: InstanceUsageInfo | null } | null>(
    null
  );

  useEffect(() => {
    if (!configId) return;
    let alive = true;
    loadInstanceUsage(configId).then((info) => {
      if (alive) setEntry({ configId, info });
    });
    return () => {
      alive = false;
    };
  }, [configId]);

  return entry && entry.configId === configId ? entry.info : null;
}
