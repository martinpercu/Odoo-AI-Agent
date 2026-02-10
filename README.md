# Odoo Agent Front

> ChatGPT-style conversational frontend for interacting with Odoo ERP through an AI agent

[![Next.js](https://img.shields.io/badge/Next.js-16.1-000000.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4.svg)](https://tailwindcss.com/)
[![next-intl](https://img.shields.io/badge/next--intl-4.8-blue.svg)](https://next-intl.dev/)

## Description

A modern, responsive interface that allows users to query data from their Odoo instance (inventory, invoices, sales, employees) using natural language through an AI-powered chat. Key features:

- Real-time chat with SSE streaming
- Rich Markdown-formatted responses
- Predefined suggestions to quickly start querying
- Conversation history grouped by date (today, yesterday, last 7 days)
- Odoo connection configuration and validation
- Multi-language support (Spanish, English, French, German, Portuguese)
- Light / dark mode
- Collapsible and responsive sidebar (mobile-friendly)
- Plans and pricing page (Free, Pro, Enterprise)

## Architecture

### Tech Stack

**Core:**
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript 5** - Static typing

**Styling & UI:**
- **Tailwind CSS v4** - CSS utilities (configured via `@theme`)
- **Framer Motion** - Smooth animations and transitions
- **Lucide React** - Icon library

**Internationalization:**
- **next-intl** - Locale-based routing, 5 supported languages

**Rendering:**
- **react-markdown** - Markdown rendering for agent responses

### Project Structure

```
app/
  [locale]/
    layout.tsx                  # Root layout with i18n and providers
    chat/page.tsx               # New query (suggestions + input)
    chat/[id]/page.tsx          # Conversation with SSE streaming
    pricing/page.tsx            # Subscription plans
    settings/page.tsx           # Odoo connection settings
components/
  app-shell.tsx                 # Wrapper with global ChatContext
  chat/
    sidebar.tsx                 # Collapsible sidebar + history
    chat-messages.tsx           # Message bubbles with Markdown
    chat-input.tsx              # Auto-resizing input
  pricing/pricing-cards.tsx     # Plan cards (Free, Pro, Enterprise)
  odoo/connection-form.tsx      # Odoo credentials form
  locale-switcher.tsx           # Language selector
hooks/
  use-chat.ts                   # Chat state + SSE streaming
  use-odoo-config.tsx           # Odoo config context (localStorage)
lib/
  api.ts                        # Backend integration
  types.ts                      # TypeScript interfaces
i18n/                           # Routing, request config, navigation
messages/                       # Translations (es, en, fr, de, pt)
proxy.ts                        # Locale detection middleware
```

## Communication Flow

```
┌─────────────┐     POST /chat/{id}/stream      ┌─────────────────┐
│             │  ──────────────────────────────►  │                 │
│   Frontend  │     { message, odoo_config }      │     Backend     │
│  (Next.js)  │                                   │  (FastAPI/SSE)  │
│             │  ◄──────────────────────────────  │                 │
└─────────────┘     text/event-stream (SSE)       └─────────────────┘
                    real-time chunks
```

**Consumed endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/chat/{id}/stream` | Send message + receive SSE response |
| `POST` | `/test-connection` | Validate Odoo credentials |

## Setup

### Requirements

- **Node.js 18+**
- Backend running at `http://localhost:8000` ([odoo-agent-back](../odoo-agent-back))

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:3000` — it automatically redirects to `/es/chat`.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server (hot reload) |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | Linting with ESLint |

## Themes and Design

The color system supports **light and dark mode** with CSS variables:

| Token | Light | Dark |
|-------|-------|------|
| Primary | `#6d28d9` (violet) | `#8b5cf6` (light violet) |
| Background | `#ffffff` | `#0c0a14` |
| Card | `#ffffff` | `#1a1625` |
| Sidebar | `#f8fafc` | `#110e1c` |

## Supported Languages

| Code | Language |
|------|----------|
| `es` | Spanish (default) |
| `en` | English |
| `fr` | French |
| `de` | German |
| `pt` | Portuguese |

Translations are located in `messages/[locale].json` with **126 keys** per language.
