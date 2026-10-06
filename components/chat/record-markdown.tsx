"use client";

import { Children, cloneElement, isValidElement, useEffect, useMemo, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronRight } from "lucide-react";
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
    const Ol: Components["ol"] = ({ node, start, children, className, ...rest }) => {
      let n = Number(start) || 1;
      const numbered = Children.map(children, (child: ReactNode) => {
        if (!isValidElement(child)) return child;
        return cloneElement(child as ReactElement<{ recordPosition?: number }>, {
          recordPosition: n++,
        });
      });
      // El número lo dibuja cada renglón (adentro de su zona clickeable), no el marcador
      // del navegador: así el hover cubre el renglón entero, número incluido.
      return (
        <ol
          start={start}
          {...rest}
          className={`${className ?? ""} !my-2 !list-none !pl-0`}
        >
          {numbered}
        </ol>
      );
    };

    const Li = (props: React.ComponentProps<"li"> & { node?: unknown; recordPosition?: number }) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { node, recordPosition, children, ...rest } = props;
      // Un `<li>` de una lista con viñetas (sin número) queda como siempre.
      if (!recordPosition) return <li {...rest}>{children}</li>;
      const rec = byPosition.get(recordPosition);

      // ⚠️ Grupo CON NOMBRE (`group/row`): la burbuja del agente ya es un `group` (el que
      // muestra "Reportar" al pasar el mouse), y un `group-hover` a secas se encendía en
      // todos los renglones a la vez apenas el mouse entraba al mensaje.
      const number = (
        <span className="min-w-[2.5ch] shrink-0 text-small tabular-nums text-text-muted transition-colors duration-150 group-hover/row:text-accent">
          {recordPosition}.
        </span>
      );
      // Un renglón = una línea: lo que no entra termina en "…". `[&>p]:inline`: en una
      // lista "suelta" react-markdown envuelve el renglón en un `<p>`.
      const body = (
        <span className="min-w-0 truncate [&>p]:!m-0 [&>p]:inline">{children}</span>
      );
      const row = "flex max-w-full items-center gap-2 py-1";

      if (!rec) {
        return (
          <li {...rest} className="!mb-0">
            <div className={row}>{number}{body}</div>
          </li>
        );
      }
      return (
        <li {...rest} className="!mb-0">
          <button
            type="button"
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
            className={`group/row ${row} cursor-pointer rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
          >
            {number}
            {body}
            {/* Pegado al final del TEXTO, no del bloque: el renglón mide lo que mide su texto. */}
            <ChevronRight
              size={15}
              strokeWidth={1.75}
              aria-hidden
              className="shrink-0 text-text-muted opacity-50 transition-all duration-150 ease-out group-hover/row:translate-x-0.5 group-hover/row:scale-125 group-hover/row:text-accent group-hover/row:opacity-100 group-hover/row:[stroke-width:2.75]"
            />
          </button>
        </li>
      );
    };

    return { ol: Ol, li: Li as Components["li"] };
  }, [event]);

  return <ReactMarkdown components={components}>{content}</ReactMarkdown>;
}
