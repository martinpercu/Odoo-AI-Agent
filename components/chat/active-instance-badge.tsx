"use client";

import { Server } from "lucide-react";
import { useTranslations } from "next-intl";

import { useIconSize } from "@/hooks/use-icon-size";
import { useOdooConfig } from "@/hooks/use-odoo-config";
import { useSession } from "@/hooks/use-session";
import { instanceLabel } from "@/lib/instance-label";

/**
 * **Contra qué instancia estás trabajando**, arriba de todo en el panel izquierdo.
 *
 * ⭐ Existe para el implementador con varios clientes conectados: el dato vivía sólo
 * adentro del menú de usuario, a dos clicks, así que la respuesta a *"¿esto que estoy por
 * preguntar sale de la base de quién?"* costaba abrir un popover. Es la pregunta más cara
 * de contestar mal en todo el producto — un número correcto sobre la empresa equivocada
 * no se ve distinto de uno correcto.
 *
 * ⚠️ **Es informativo, no un selector.** Cambiar de instancia sigue viviendo en el menú de
 * usuario: un control de cambio arriba de "Nueva consulta", del lado del que sólo quiere
 * saber dónde está parado, invita a tocarlo sin querer.
 *
 * No se muestra:
 *  - a un `CLIENT_USER`, que tiene una sola instancia y para quien nombrarla no distingue
 *    nada (le diría el nombre de su propia empresa, que ya sabe);
 *  - en demo, donde los datos son NUESTROS y el nombre no es el de su negocio;
 *  - cuando no hay ningún nombre utilizable — un cartel que dice "—" ocupa lugar y no
 *    informa nada.
 */
export function ActiveInstanceBadge({ collapsed = false }: { collapsed?: boolean }) {
  const t = useTranslations("Sidebar");
  const { meData } = useSession();
  const { configs, activeConfigId, isDemoMode } = useOdooConfig();
  const iconInline = useIconSize("inline");

  const role = meData?.user?.role;
  const isBuilder = role === "ADMIN" || role === "SUPERADMIN";
  const name = instanceLabel(configs.find((c) => c.id === activeConfigId));

  if (!isBuilder || isDemoMode || !name) return null;

  // Colapsado queda sólo el ícono; el nombre viaja en el `title` para que siga siendo
  // recuperable sin expandir.
  if (collapsed) {
    return (
      <div className="px-3 pt-3">
        <div
          className="flex h-btn-md items-center justify-center rounded-btn bg-sidebar-hover"
          title={`${t("instanceBadge")}: ${name}`}
        >
          <Server size={iconInline} strokeWidth={1.5} className="text-accent" aria-hidden />
          <span className="sr-only">{`${t("instanceBadge")}: ${name}`}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 pt-3">
      <div className="flex items-center gap-2.5 rounded-btn bg-sidebar-hover px-3 py-2">
        <Server
          size={iconInline}
          strokeWidth={1.5}
          className="shrink-0 text-accent"
          aria-hidden
        />
        <span className="min-w-0">
          <span className="block text-micro uppercase tracking-wide text-text-secondary">
            {t("instanceBadge")}
          </span>
          <span className="block truncate text-small font-medium text-foreground" title={name}>
            {name}
          </span>
        </span>
      </div>
    </div>
  );
}
