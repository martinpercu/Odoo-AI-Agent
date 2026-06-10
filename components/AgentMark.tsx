// AgentMark.tsx — Logo components for TheOdooAgent
// Drop into your components folder. Works with any React 18+ setup.

import * as React from 'react';

const INDIGO = '#6366F1';
const ODOO = '#714B67';

interface MarkProps {
  size?: number;
  /** Outline color — defaults to currentColor (inherits from parent) */
  fg?: string;
  /** Eye/prong fill */
  accent?: string;
  /** Mouth/ground fill (Odoo wink) */
  odoo?: string;
  title?: string;
  className?: string;
}

/**
 * Primary mark — "Socket Eyes"
 * Use for: app icon, sidebar, favicon, chat avatar.
 */
export function MarkB({
  size = 32,
  fg = 'currentColor',
  accent = INDIGO,
  odoo = ODOO,
  title = 'The Odoo Agent',
  className,
}: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={fg}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={title}
      className={className}
    >
      <title>{title}</title>
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <rect x="14.4" y="12.5" width="1.2" height="3" fill={accent} stroke="none" rx="0.4" />
      <rect x="8.4" y="12.5" width="1.2" height="3" fill={accent} stroke="none" rx="0.4" />
      <circle cx="12" cy="17.2" r="0.7" fill={odoo} stroke="none" />
    </svg>
  );
}

/**
 * Processing mark — "Cursor"
 * Use for: loading states, "agent is thinking", streaming indicators.
 */
export function MarkI({
  size = 32,
  fg = 'currentColor',
  accent = INDIGO,
  odoo = ODOO,
  title = 'The Odoo Agent — processing',
  className,
}: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={fg}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={title}
      className={className}
    >
      <title>{title}</title>
      <rect x="11.25" y="3" width="1.5" height="4" fill={accent} stroke="none" />
      <path d="M12 7V8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <rect x="14.4" y="12.5" width="1.2" height="3" fill={accent} stroke="none" rx="0.4" />
      <rect x="8.4" y="12.5" width="1.2" height="3" fill={accent} stroke="none" rx="0.4" />
      <rect x="10" y="17" width="4" height="0.8" fill={odoo} stroke="none" />
    </svg>
  );
}

interface WordmarkProps {
  scale?: number;
  color?: string;
  className?: string;
}

/**
 * Wordmark — "The Odoo Agent"
 * "The" in regular 400 @ 50% opacity, "OdooAgent" in semibold 600.
 */
export function Wordmark({ scale = 1, color = 'currentColor', className }: WordmarkProps) {
  return (
    <span
      className={className}
      style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        color,
        fontSize: 20 * scale,
        letterSpacing: '-0.015em',
        lineHeight: 1.6,
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: '0.22em',
      }}
    >
      <span style={{ fontWeight: 400, opacity: 0.5 }}>The</span>
      <span style={{ fontWeight: 600 }}>Odoo</span>
      <span style={{ fontWeight: 600 }}>Agent</span>
    </span>
  );
}

interface LockupProps extends MarkProps {
  Mark?: typeof MarkB;
  wordColor?: string;
}

/**
 * Lockup — Mark + Wordmark, horizontal.
 * Use for headers, footers, "powered by" badges.
 */
export function Lockup({
  Mark = MarkB,
  size = 36,
  fg,
  accent,
  odoo,
  wordColor = 'currentColor',
  className,
}: LockupProps) {
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.34 }}
    >
      <Mark size={size} fg={fg} accent={accent} odoo={odoo} />
      <Wordmark scale={size / 32} color={wordColor} />
    </span>
  );
}

/* ============================================================
   USAGE EXAMPLES
   ------------------------------------------------------------

   // Sidebar (Builder, dark)
   <Lockup size={28} wordColor="#F1F5F9" />

   // Sidebar (Client, light)
   <Lockup size={28} wordColor="#1C1917" />

   // App icon (filled brand)
   <div style={{ background: '#6366F1', padding: 14, borderRadius: 12 }}>
     <MarkB size={36} fg="#fff" accent="#fff" odoo="#fff" />
   </div>

   // Loading state — animated pulse
   <MarkI size={48} className="animate-pulse" />

   // "Powered by" footer (Client)
   <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
     <span>Powered by</span>
     <Lockup size={14} wordColor="currentColor" />
   </div>

   ============================================================ */
