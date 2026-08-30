"use client";

import { useId, useState } from "react";
import { Play, Server } from "lucide-react";
import { useTranslations } from "next-intl";

import { A11yModal } from "@/components/intro/a11y-modal";
import { instanceLabel } from "@/lib/instance-label";
import type { OdooConfigSummary } from "@/lib/types";

/**
 * **Contra qué instancia se corre esta Rutina**, preguntado al ejecutar.
 *
 * ⭐ **Por qué un popup y no un desplegable en la tarjeta** (2026-08-12, reemplaza al
 * selector inline que duró un día): un desplegable por tarjeta obliga a mantener una
 * elección por tarjeta, y esa elección **se congela** — quedó hecha en un momento y deja
 * de reflejar la instancia que el usuario cambió después desde el menú lateral. Ese fue
 * el bug real: cambiar de instancia en el sidebar no se veía en ninguna tarjeta. Acá el
 * estado nace **cuando se abre el popup**, así que siempre arranca en la instancia que
 * está seleccionada *en ese momento*; no hay nada que sincronizar porque no hay nada que
 * sobreviva al cierre.
 *
 * Dos capas, y la segunda sólo si hace falta:
 *  1. **Confirmar** — dice contra qué instancia va a correr y ofrece seguir. Es el caso
 *     del 90%: la instancia correcta ya es la que está seleccionada.
 *  2. **Elegir otra** — recién ahí aparece la lista. Poner el desplegable de entrada
 *     convierte una confirmación de un click en una decisión de dos, todas las veces.
 *
 * ⚠️ **Click afuera = cancelar, sin efecto.** Lo da `A11yModal` (backdrop + Esc), y es la
 * salida que tiene que existir en un diálogo cuya acción consulta el ERP de un cliente.
 */
export function RoutineRunConfirm({
  open,
  onClose,
  onConfirm,
  routineName,
  instances,
  activeConfigId,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (configId: string) => void;
  routineName: string;
  instances: OdooConfigSummary[];
  activeConfigId: string | null;
}) {
  const titleId = useId();

  return (
    <A11yModal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      className="w-full max-w-sm rounded-card border border-border bg-surface p-5 shadow-lg sm:w-[26rem]"
    >
      {/* ⭐ **El cuerpo se monta recién al abrir, y ahí nace su estado.**
          El reset "volvé a la instancia activa" NO se hace con un efecto: un
          `setState` dentro de `useEffect` dispara un render en cascada (lo marca el
          lint de React) y además deja una ventana en la que el diálogo se pinta con el
          valor viejo. Desmontando el cuerpo al cerrar, el estado se reinicia por
          construcción — que es la versión de la misma idea sin ninguna de las dos
          consecuencias. */}
      {open && (
        <ConfirmBody
          titleId={titleId}
          onConfirm={onConfirm}
          routineName={routineName}
          instances={instances}
          activeConfigId={activeConfigId}
        />
      )}
    </A11yModal>
  );
}

function ConfirmBody({
  titleId,
  onConfirm,
  routineName,
  instances,
  activeConfigId,
}: {
  titleId: string;
  onConfirm: (configId: string) => void;
  routineName: string;
  instances: OdooConfigSummary[];
  activeConfigId: string | null;
}) {
  const t = useTranslations("Routines");
  const selectId = useId();

  // Nace en la instancia activa DE ESTE MOMENTO, porque el componente nace ahora.
  const [chosen, setChosen] = useState<string | null>(activeConfigId);
  const [expanded, setExpanded] = useState(false);

  const target = chosen ?? activeConfigId;
  const targetName =
    instanceLabel(instances.find((c) => c.id === target)) ?? target ?? "";

  return (
    <>
      <h2 id={titleId} className="text-small text-text-muted">
        {t("runConfirm.title")}
      </h2>

      {/* El nombre de la instancia es LO que se está confirmando, así que es lo más
          grande del diálogo. Con el ícono del sidebar y de la tarjeta del historial:
          es la misma pregunta contestada en tres lugares. */}
      <p className="mt-1 flex items-center gap-2">
        <Server size={18} strokeWidth={1.5} className="shrink-0 text-accent" aria-hidden />
        <span className="min-w-0 truncate text-subheading font-medium" title={targetName}>
          {targetName}
        </span>
      </p>

      <p className="mt-2 truncate text-small text-text-muted" title={routineName}>
        {routineName}
      </p>

      {/* Capa 2 — sólo cuando el usuario pide cambiar. */}
      {expanded && (
        <label htmlFor={selectId} className="mt-4 flex flex-col gap-1">
          <span className="text-micro text-text-muted">{t("runOn")}</span>
          <select
            id={selectId}
            value={target ?? ""}
            onChange={(e) => setChosen(e.target.value)}
            className="h-btn-md w-full rounded-btn border border-border bg-surface px-2 text-small"
          >
            {instances.map((config) => (
              <option key={config.id} value={config.id}>
                {instanceLabel(config) ?? config.id}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="mt-5 flex items-center justify-end gap-2">
        {/* Se esconde una vez desplegada: con la lista abierta, "Otra instancia" ya no
            hace nada y un botón que no hace nada erosiona la confianza en los que sí. */}
        {!expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex h-btn-md items-center rounded-btn border border-border px-3 text-small transition-colors hover:bg-raised"
          >
            {t("runConfirm.otherInstance")}
          </button>
        )}
        <button
          type="button"
          onClick={() => target && onConfirm(target)}
          disabled={!target}
          className="flex h-btn-md items-center gap-1.5 rounded-btn bg-accent px-4 text-small font-medium text-white shadow-sm transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play size={16} strokeWidth={1.5} aria-hidden />
          {t("runConfirm.confirm")}
        </button>
      </div>
    </>
  );
}
