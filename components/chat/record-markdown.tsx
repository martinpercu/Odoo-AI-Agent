"use client";

import { Children, cloneElement, isValidElement, useEffect, useMemo, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

import type { RecordLinksEvent, RecordRef } from "@/lib/types";

interface RecordMarkdownProps {
  content: string;
  event: RecordLinksEvent;
  onOpen: (ref: RecordRef) => void;
}

/**
 * El texto del agente con el listado numerado vuelto clickeable, renglón por renglón.
 *
 * Antes la lista salía DOS veces: el texto numerado y, debajo, la tarjeta de chips de
 * `record_links`. Ahora el back marca el evento `inline` y le da a cada registro su
 * `position` (el número del renglón), y acá cada `<li>` cuyo número coincide abre ese
 * registro (contrato back `record-links.md` §10).
 *
 * ⚠️ El número sale de `<ol start>` + el índice del `<li>`, NUNCA de leer el texto: el
 * renglón incluye precio, ciudad, etapa… y los nombres se repiten (en `comercial` hay
 * oportunidades homónimas del mismo cliente). La página 2 empieza en `start="11"`.
 */
export function RecordMarkdown({ content, event, onOpen }: RecordMarkdownProps) {
  // El callback del padre cambia en cada render; con él en las dependencias, la lista
  // se volvería a montar entera cada vez.
  const onOpenRef = useRef(onOpen);
  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);

  const components = useMemo<Components>(() => {
    const byPosition = new Map(
      event.records.filter((r) => r.position).map((r) => [r.position as number, r])
    );

    // `node` (el hast) se saca para no pasarlo como atributo al DOM.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const Ol: Components["ol"] = ({ node, start, children, ...rest }) => {
      let n = Number(start) || 1;
      const numbered = Children.map(children, (child: ReactNode) => {
        if (!isValidElement(child)) return child;
        return cloneElement(child as ReactElement<{ recordPosition?: number }>, {
          recordPosition: n++,
        });
      });
      return <ol start={start} {...rest}>{numbered}</ol>;
    };

    const Li = (props: React.ComponentProps<"li"> & { node?: unknown; recordPosition?: number }) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { node, recordPosition, children, ...rest } = props;
      const rec = recordPosition ? byPosition.get(recordPosition) : undefined;
      if (!rec) return <li {...rest}>{children}</li>;
      return (
        <li {...rest}>
          <button
            type="button"
            title={event.tooltip}
            onClick={() =>
              onOpenRef.current({
                model: event.model,
                id: rec.id,
                name: rec.name,
                url: rec.url,
                card: Boolean(event.card),
                openLabel: event.open_label,
              })
            }
            className="cursor-pointer text-left underline decoration-accent/40 decoration-dotted underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
          >
            {children}
          </button>
        </li>
      );
    };

    return { ol: Ol, li: Li as Components["li"] };
  }, [event]);

  return <ReactMarkdown components={components}>{content}</ReactMarkdown>;
}
