"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  getRandomSuggestions,
  suggestionsForInstance,
  type Suggestion,
} from "@/lib/suggestions";
import { fetchInstanceUsage } from "@/lib/api";
import { useOdooConfig } from "@/hooks/use-odoo-config";

const ROTATION_INTERVAL = 4000;
const FADE_OUT_MS = 1600;
const FADE_IN_MS = 750;
const FADE_OUT_S = FADE_OUT_MS / 1000;
const FADE_IN_S = FADE_IN_MS / 1000;

interface Props {
  onSelect: (text: string) => void;
  getLabel: (key: string) => string;
}

export function SuggestionCarousel({ onSelect, getLabel }: Props) {
  const { activeConfigId, isDemoMode } = useOdooConfig();
  /**
   * El uso real de la instancia (quick-wins §7). Se pide **después** del render y
   * sin bloquear: la primera medición puede costar ~1s contra una instancia
   * grande, y el carrusel no puede esperarla. Hasta que llega se muestra el pool
   * completo, que es el comportamiento de siempre.
   */
  const [usage, setUsage] = useState<Record<string, number> | null>(null);
  const poolRef = useRef<Suggestion[]>(suggestionsForInstance(null));

  const [visible, setVisible] = useState<Suggestion[]>(getRandomSuggestions(4));
  const [show, setShow] = useState(true);
  const hoveredRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimer() {
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  // One full cycle: wait ROTATION_INTERVAL → fade out → swap → fade in → repeat
  function scheduleNext() {
    clearTimer();
    timerRef.current = setTimeout(() => {
      if (hoveredRef.current) return; // will reschedule on mouse leave
      setShow(false);
      timerRef.current = setTimeout(() => {
        setVisible(getRandomSuggestions(4, poolRef.current));
        setShow(true);
        timerRef.current = setTimeout(scheduleNext, FADE_IN_MS);
      }, FADE_OUT_MS);
    }, ROTATION_INTERVAL);
  }

  useEffect(() => {
    // En demo no se filtra: la instancia de demo es nuestra y tiene de todo.
    if (!activeConfigId || isDemoMode) return;
    let vivo = true;
    fetchInstanceUsage(activeConfigId).then((u) => {
      if (vivo) setUsage(u);
    });
    return () => {
      vivo = false;
    };
  }, [activeConfigId, isDemoMode]);

  useEffect(() => {
    poolRef.current = suggestionsForInstance(usage);
    // Si el filtro sacó alguna de las que están en pantalla, se refrescan ya:
    // dejar una sugerencia que sabemos que va a devolver "no hay registros" es
    // exactamente lo que este filtro existe para evitar.
    setVisible((prev) =>
      prev.every((s) => poolRef.current.some((p) => p.key === s.key))
        ? prev
        : getRandomSuggestions(4, poolRef.current)
    );
  }, [usage]);

  useEffect(() => {
    scheduleNext();
    return clearTimer;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleMouseEnter() {
    hoveredRef.current = true;
    clearTimer();
    setShow(true);
  }

  function handleMouseLeave() {
    hoveredRef.current = false;
    scheduleNext();
  }

  return (
    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <motion.div
        animate={{ opacity: show ? 1 : 0 }}
        transition={{ duration: show ? FADE_IN_S : FADE_OUT_S, ease: "easeOut" }}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {visible.map(({ key, icon: Icon, color }) => {
          const text = getLabel(key);
          return (
            <button
              key={key}
              onClick={() => onSelect(text)}
              aria-label={text}
              className="flex items-center gap-3 rounded-md border border-border bg-surface p-4 text-left text-body transition-all hover:border-accent/30 hover:bg-raised hover:shadow-sm"
            >
              <Icon size={20} strokeWidth={1.5} className={color} />
              <span>{text}</span>
            </button>
          );
        })}
      </motion.div>
    </div>
  );
}
