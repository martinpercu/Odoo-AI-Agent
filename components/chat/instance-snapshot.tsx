"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { fetchInstanceUsage } from "@/lib/api";
import { useOdooConfig } from "@/hooks/use-odoo-config";

/**
 * "Esto ya sé de tu negocio" — el primer valor en 60 segundos (quick-wins §9).
 *
 * ⭐ **El hueco que cierra:** al conectar una instancia el usuario caía en un chat
 * VACÍO con sugerencias al azar. Debería caer en **un resultado**. Esta tarjeta
 * convierte la hoja en blanco en números reales de su propia base, leídos en el
 * primer segundo.
 *
 * Sale gratis: los conteos son los MISMOS que ya mide el gating del catálogo (B6)
 * y quedan cacheados 24 h, así que la segunda visita no paga nada.
 *
 * ⚠️ **Se muestra sólo si hay algo que mostrar.** Sin datos, con la instancia
 * caída o en demo no se renderiza nada — una tarjeta vacía o en cero es peor que
 * la hoja en blanco que venía a reemplazar.
 */

/**
 * Los modelos que se muestran, en el orden en que se leen.
 *
 * ⚠️ La clave de i18n **no puede ser el nombre del modelo**: `next-intl` usa el
 * punto para anidar y una clave con punto invalida el bundle ENTERO — la app
 * queda sin traducciones, no sólo esta tarjeta. `tsc` y `build` no lo detectan;
 * salta recién al abrir la página.
 */
const SNAPSHOT_MODELS: ReadonlyArray<{ model: string; key: string }> = [
  { model: "res.partner", key: "resPartner" },
  { model: "product.product", key: "productProduct" },
  { model: "sale.order", key: "saleOrder" },
  { model: "account.move", key: "accountMove" },
  { model: "crm.lead", key: "crmLead" },
  { model: "purchase.order", key: "purchaseOrder" },
];

const MAX_TILES = 4;

export function InstanceSnapshot() {
  const t = useTranslations("Snapshot");
  const { activeConfigId, isDemoMode } = useOdooConfig();
  const [usage, setUsage] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    // En demo los números son de NUESTRA instancia: mostrarlos como "tu negocio"
    // sería mentir en la primera pantalla.
    if (!activeConfigId || isDemoMode) return;
    let vivo = true;
    fetchInstanceUsage(activeConfigId).then((u) => {
      if (vivo) setUsage(u);
    });
    return () => {
      vivo = false;
    };
  }, [activeConfigId, isDemoMode]);

  const tiles = SNAPSHOT_MODELS.filter((m) => (usage?.[m.model] ?? 0) > 0).slice(0, MAX_TILES);
  // Nada que mostrar ⇒ nada se renderiza. Una tarjeta en cero es peor que no tenerla.
  if (tiles.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="mb-6 rounded-card border border-border bg-surface p-4"
    >
      <p className="mb-3 flex items-center gap-1.5 text-small font-medium text-foreground">
        <Sparkles size={14} strokeWidth={1.5} className="text-accent" aria-hidden />
        {t("title")}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.model} className="rounded-btn border border-border bg-base px-3 py-2">
            <p className="text-subheading tabular-nums">
              {(usage?.[tile.model] ?? 0).toLocaleString()}
            </p>
            <p className="text-micro text-text-muted">{t(`model.${tile.key}`)}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-micro text-text-muted">{t("hint")}</p>
    </motion.div>
  );
}
