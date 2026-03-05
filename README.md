# Odoo Agent Front

> ChatGPT-style conversational frontend for interacting with Odoo ERP through an AI agent

[![Next.js](https://img.shields.io/badge/Next.js-16.1-000000.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4.svg)](https://tailwindcss.com/)
[![next-intl](https://img.shields.io/badge/next--intl-4.8-blue.svg)](https://next-intl.dev/)

## Description

A modern, responsive interface that allows users to query and manage data from their Odoo instance (inventory, invoices, sales, employees) using natural language through an AI-powered chat. Key features:

**Core Chat:**
- Real-time chat with SSE streaming
- Rich Markdown-formatted responses
- Predefined suggestions to quickly start querying
- Conversation history grouped by date (today, yesterday, last 7 days)

**Action Management:**
- Visual feedback for write operations (create, update, confirm)
- Success cards with record links to Odoo
- Validation error prompts with missing field indicators
- Confirmable action buttons (e.g., "Confirm Quotation")

**Configuration:**
- Odoo connection configuration and validation
- Instance inspector to view installed modules
- Multi-language support (Spanish, English, French, German, Portuguese)
- Light / dark mode
- Collapsible and responsive sidebar (mobile-friendly)

**Other:**
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
    settings/page.tsx           # Odoo connection + instance inspector
  globals.css                   # Theme variables (light/dark)
components/
  app-shell.tsx                 # Wrapper with global ChatContext
  chat/
    sidebar.tsx                 # Collapsible sidebar + history
    chat-messages.tsx           # Message bubbles with metadata handling
    chat-input.tsx              # Auto-resizing input
    success-card.tsx            # Green card for successful actions
    validation-prompt.tsx       # Orange card for missing fields
    odoo-action-button.tsx      # Purple action confirmation button
  pricing/pricing-cards.tsx     # Plan cards (Free, Pro, Enterprise)
  odoo/
    connection-form.tsx         # Odoo credentials form
    instance-inspector.tsx      # View installed Odoo modules
  locale-switcher.tsx           # Language selector
hooks/
  use-chat.ts                   # Chat state + SSE + metadata parsing
  use-odoo-config.tsx           # Odoo config context (localStorage)
lib/
  api.ts                        # Backend integration (chat, actions, inspect)
  types.ts                      # TypeScript interfaces + metadata types
i18n/                           # Routing, request config, navigation
messages/                       # Translations (es, en, fr, de, pt)
proxy.ts                        # Locale detection middleware
```

## Action Feedback System

The interface differentiates between **read queries** (e.g., "Show me all contacts") and **write actions** (e.g., "Create a new contact") with specialized UI components:

### SuccessCard
Displayed when the agent successfully performs a write operation:
- ✅ Green card with CheckCircle icon
- Shows record ID and name
- Direct link to view the record in Odoo (opens in new tab)

### ValidationPrompt
Displayed when required fields are missing:
- ⚠️ Orange card with AlertCircle icon
- Lists missing fields as bullet points
- Guides user to provide complete information

### OdooActionButton
Interactive button for confirmable actions:
- 🟣 Purple button using Odoo brand color (#714B67)
- Loading state with spinner during execution
- Completed state with checkmark
- Example: "Confirm Quotation", "Approve Purchase Order"

## Communication Flow

```
┌─────────────┐     POST /chat/{id}/stream      ┌─────────────────┐
│             │  ──────────────────────────────►  │                 │
│   Frontend  │     { message, odoo_config }      │     Backend     │
│  (Next.js)  │                                   │  (FastAPI/SSE)  │
│             │  ◄──────────────────────────────  │                 │
└─────────────┘     text/event-stream (SSE)       └─────────────────┘
                    chunks with optional metadata
```

**Consumed endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/chat/{id}/stream` | Send message + receive SSE response with metadata |
| `POST` | `/test-connection` | Validate Odoo credentials |
| `POST` | `/inspect-instance` | Fetch installed Odoo modules |
| `POST` | `/chat/{id}/action` | Execute confirmable action (e.g., confirm quotation) |

### SSE Event Format

The backend sends typed events in the SSE stream. Each event has an explicit `type` field:

**Text Chunk (streaming response):**
```json
{
  "type": "text",
  "content": "I found 5 contacts in your database..."
}
```

**Action Proposal (after text streaming completes):**
```json
{
  "type": "action_proposal",
  "action": {
    "action": "create",
    "model": "res.partner",
    "vals": {
      "name": "Juan Pérez",
      "email": "juan@example.com"
    },
    "target_ids": [],
    "status": "pending_confirmation"
  },
  "labels": {
    "action_btn": "Crear Contacto",
    "confirm_btn": "Confirmar",
    "cancel_btn": "Cancelar",
    "cancelled_msg": "Acción cancelada. ¿En qué más puedo ayudarte?"
  }
}
```

The `labels` field contains translated UI text based on the `language` sent in the request. The frontend uses these labels directly:
- **action_btn**: Primary button text (e.g., "Create Contact", "Crear Contacto", "Kontakt erstellen")
- **confirm_btn**: Text shown during loading (e.g., "Confirm", "Confirmar", "Bestätigen")
- **cancel_btn**: Cancel button text
- **cancelled_msg**: Message displayed when user cancels the action

The frontend renders this as a confirmation button. When clicked, it calls the `/chat/{id}/action` endpoint with `action: "confirm_action"` and the proposal data as context.

### Action Confirmation Responses

The `/chat/{id}/action` endpoint returns different HTTP status codes:

**Success (201 - Create):**
```json
{
  "status": "ok",
  "message": "Contact created successfully (ID: 42)",
  "result": {
    "action": "create",
    "model": "res.partner",
    "id": 42
  }
}
```

**Success (200 - Update):**
```json
{
  "status": "ok",
  "message": "Contact updated successfully (IDs: [42])",
  "result": {
    "action": "update",
    "model": "res.partner",
    "ids": [42],
    "success": true
  }
}
```

**Error Responses:**
- **400** - Validation error (missing fields, invalid data)
- **401** - Odoo authentication failed
- **500** - Odoo execution error (constraint violation, etc.)

All error responses include:
```json
{
  "status": "error",
  "detail": "Error description..."
}
```

**User Cancellation:**
If the user clicks "Cancel" instead of confirming, no request is sent to the backend. The UI displays the translated cancellation message from `labels.cancelled_msg` (e.g., "Action cancelled. How else can I help you?" or "Acción cancelada. ¿En qué más puedo ayudarte?").

**Backward Compatibility:**
The parser still supports the old format without `type` field for gradual migration:
```json
{"content": "..."}
```

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
| Odoo Purple | `#714B67` | `#8d6584` |
| Success | `#22c55e` (green) | `#22c55e` |
| Warning | `#f59e0b` (orange) | `#f59e0b` |
| Background | `#ffffff` | `#0c0a14` |
| Card | `#ffffff` | `#1a1625` |
| Sidebar | `#f8fafc` | `#110e1c` |

**Action Button Colors:**
- Success cards use `--color-success` (green)
- Validation prompts use `--color-warning` (orange)
- Action buttons use `--color-odoo-purple` (Odoo brand color)

## Supported Languages

| Code | Language |
|------|----------|
| `es` | Spanish (default) |
| `en` | English |
| `fr` | French |
| `de` | German |
| `pt` | Portuguese |

Translations are located in `messages/[locale].json` with **135+ keys** per language.

### New Translation Keys (Phase 1 CRUD)

- `ChatMessages.success.*` - Action success feedback
- `ChatMessages.validation.*` - Validation error prompts
- `Settings.inspector.*` - Instance inspector UI
