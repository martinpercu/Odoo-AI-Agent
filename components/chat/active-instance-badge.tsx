"use client";

import { useState } from "react";
import { ArrowBigRight, Server } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";

import { useChatContext } from "@/components/app-shell";
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
 * La flecha cicla (round-robin) a la siguiente instancia con un click — pensado para el
 * caso común de 2 instancias, donde "la otra" siempre es una sola. Si el click ocurre
 * DENTRO de un chat, sale al chat vacío igual que el selector del menú de usuario: quedarse
 * mirando la conversación de la instancia anterior con el cartel ya mostrando la nueva es
 * la misma confusión que este cartel existe para evitar, y de paso hace visible el cambio
 * — `instance-snapshot` ("esto ya sé de tu negocio") en el chat vacío trae otros números.
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
  const router = useRouter();
  const pathname = usePathname();
  const { meData } = useSession();
  const { configs, activeConfigId, setActiveConfigId, isDemoMode } = useOdooConfig();
  const { setCurrentChatId, stopStreaming } = useChatContext();
  const iconBtn = useIconSize("button");

  const role = meData?.user?.role;
  const isBuilder = role === "ADMIN" || role === "SUPERADMIN";
  const name = instanceLabel(configs.find((c) => c.id === activeConfigId));

  const [textHover, setTextHover] = useState(false);
  const [btnHover, setBtnHover] = useState(false);

  if (!isBuilder || isDemoMode || !name) return null;

  const isActive = textHover || btnHover;

  function handleCycleNext() {
    if (configs.length < 2) return;
    const idx = configs.findIndex((c) => c.id === activeConfigId);
    const next = configs[(idx + 1) % configs.length];
    if (!next) return;
    setActiveConfigId(next.id);
    if (pathname.startsWith("/chat/")) {
      stopStreaming();
      setCurrentChatId(undefined);
      router.push("/chat");
    }
  }

  // Colapsado queda sólo el ícono; el nombre viaja en el `title` para que siga siendo
  // recuperable sin expandir.
  if (collapsed) {
    return (
      <div className="border-b border-sidebar-border px-3 pb-3 pt-3">
        <div
          className="flex h-btn-md items-center justify-center rounded-btn bg-sidebar-hover"
          title={`${t("instanceBadge")}: ${name}`}
        >
          <Server size={iconBtn} strokeWidth={1.5} className="text-accent" aria-hidden />
          <span className="sr-only">{`${t("instanceBadge")}: ${name}`}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-sidebar-border px-3 pb-3 pt-3">
      <div className="flex items-center gap-3 rounded-btn bg-sidebar-hover px-3 py-2">
        <Server
          size={iconBtn}
          strokeWidth={1.5}
          className="shrink-0 text-accent"
          aria-hidden
        />
        <span
          className="min-w-0 flex-1 cursor-default truncate text-center text-body font-medium text-foreground"
          title={name}
          onMouseEnter={() => { if (configs.length >= 2) setTextHover(true); }}
          onMouseLeave={() => setTextHover(false)}
        >
          {name}
        </span>
        <button
          type="button"
          onClick={handleCycleNext}
          onMouseEnter={() => { if (configs.length >= 2) setBtnHover(true); }}
          onMouseLeave={() => setBtnHover(false)}
          disabled={configs.length < 2}
          aria-label="Cambiar instancia"
          className={`shrink-0 rounded-btn p-1 transition-colors disabled:opacity-40 ${isActive ? "bg-raised text-accent" : "text-foreground"}`}
        >
          <ArrowBigRight size={iconBtn} strokeWidth={btnHover ? 2.5 : 1.5} />
        </button>
      </div>
    </div>
  );
}
