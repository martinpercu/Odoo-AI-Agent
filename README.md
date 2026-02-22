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
- AI-proposed CRUD actions with confirm/cancel flow
- Visual feedback for write operations (create, update, method calls)
- Success cards with record links to Odoo
- Validation error prompts with missing field indicators
- Ambiguity resolution with interactive selection cards

**Analytics & Export:**
- Interactive charts (bar, line, pie) powered by Recharts
- Automatic Excel export button on chart cards
- Standalone Excel download cards for explicit export requests
- PDF report download cards

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

**Charts:**
- **Recharts** - Composable charting library (bar, area, pie)

**Internationalization:**
- **next-intl** - Locale-based routing, 5 supported languages

**Rendering:**
- **react-markdown** - Markdown rendering for agent responses

### Project Structure

```
app/
  [locale]/
    layout.tsx                  # Root layout with i18n and providers
    page.tsx                    # Root redirector (chat or settings)
    chat/page.tsx               # New query (suggestions + input)
    chat/[id]/page.tsx          # Conversation with SSE streaming
    pricing/page.tsx            # Subscription plans
    settings/page.tsx           # Odoo connection + instance inspector
  globals.css                   # Theme variables (light/dark) + markdown styles
components/
  app-shell.tsx                 # Wrapper with global ChatContext
  locale-switcher.tsx           # Language selector dropdown
  chat/
    sidebar.tsx                 # Collapsible sidebar + history + theme toggle
    chat-messages.tsx           # Message bubbles with metadata handling
    chat-input.tsx              # Auto-resizing input with send/stop
    success-card.tsx            # Green card for successful actions
    validation-prompt.tsx       # Orange card for missing fields
    odoo-action-button.tsx      # Purple action confirmation button
    action-proposal-button.tsx  # AI-proposed CRUD action confirm/cancel
    selection-card.tsx          # Multi-option selector for ambiguity resolution
    odoo-file-card.tsx          # PDF report download card
    odoo-chart-card.tsx         # Interactive charts (bar/line/pie) + Excel export
    excel-export-card.tsx       # Standalone Excel download card
  pricing/pricing-cards.tsx     # Plan cards (Free, Pro, Enterprise)
  odoo/
    connection-form.tsx         # Odoo credentials form
    instance-inspector.tsx      # View installed Odoo modules
hooks/
  use-chat.ts                   # Chat state + SSE + metadata/chart/export parsing
  use-odoo-config.tsx           # Odoo config context (localStorage)
lib/
  api.ts                        # Backend integration (chat, actions, inspect)
  types.ts                      # TypeScript interfaces + metadata types
i18n/                           # Routing, request config, navigation
messages/                       # Translations (es, en, fr, de, pt)
proxy.ts                        # Locale detection middleware
```

## UI Components

The interface uses specialized cards to handle different response types from the AI agent:

### SuccessCard
Displayed when the agent successfully performs a write operation:
- Green card with CheckCircle icon
- Shows record ID and name
- Direct link to view the record in Odoo (opens in new tab)

### ValidationPrompt
Displayed when required fields are missing:
- Orange card with AlertCircle icon
- Lists missing fields as bullet points
- Guides user to provide complete information

### ActionProposalButton
AI-proposed CRUD action with confirm/cancel flow:
- Purple button using Odoo brand color (#714B67)
- Shows action summary (model, operation, data)
- Confirm executes the action; cancel shows a translated cancellation message
- Loading and completed states with visual feedback

### OdooActionButton
Interactive button for confirmable method calls:
- Purple button using Odoo brand color
- Loading state with spinner during execution
- Completed state with checkmark
- Example: "Confirm Quotation", "Approve Purchase Order"

### SelectionCard
Displayed when the agent needs to resolve ambiguity:
- Lists matching records as selectable options
- Clicking an option sends the selection back as a chat message

### OdooFileCard
PDF report download card:
- Red-themed icon for PDF files
- Shows filename and download button
- Links to backend-served static file

### OdooChartCard
Interactive analytics visualization:
- Supports bar, line (area), and pie charts via Recharts
- Responsive layout with horizontal bars on narrow containers
- Custom tooltip with formatted values (currency, integer, decimal)
- Purple color palette matching Odoo branding
- Footer with global total and group-by info
- **Excel export button** appears when `export_url` is present (ghost style, top-right)

### ExcelExportCard
Standalone Excel download card for explicit export requests:
- Green Excel icon (#1D6F42) matching Microsoft Excel branding
- Shows filename and "export ready" message
- Download button with `download` attribute to force browser download

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
| `POST` | `/chat/{id}/action` | Execute confirmable action (e.g., confirm quotation) |
| `POST` | `/test-connection` | Validate Odoo credentials |
| `POST` | `/inspect-instance` | Fetch installed Odoo modules |

### SSE Event Types

The backend sends typed events in the SSE stream. Each event has an explicit `type` field:

**Text Chunk (streaming response):**
```json
{
  "type": "text",
  "content": "I found 5 contacts in your database..."
}
```

**Action Proposal (CRUD confirmation):**
```json
{
  "type": "action_proposal",
  "action": {
    "action": "create",
    "model": "res.partner",
    "vals": { "name": "Juan Pérez", "email": "juan@example.com" },
    "target_ids": [],
    "status": "pending_confirmation"
  },
  "labels": {
    "action_btn": "Create Contact",
    "confirm_btn": "Confirm",
    "cancel_btn": "Cancel",
    "cancelled_msg": "Action cancelled. How else can I help you?"
  }
}
```

**Selection Prompt (ambiguity resolution):**
```json
{
  "type": "selection_prompt",
  "field": "partner_id",
  "searchValue": "Juan",
  "options": [
    { "index": 0, "id": 42, "name": "Juan Pérez" },
    { "index": 1, "id": 43, "name": "Juan García" }
  ]
}
```

**Chart (analytics visualization):**
```json
{
  "type": "chart",
  "chart_type": "bar",
  "title": "Sales by Product",
  "data": [
    { "label": "Product A", "value": 15000 },
    { "label": "Product B", "value": 8500 }
  ],
  "meta": {
    "value_label": "Revenue",
    "value_format": "currency",
    "currency_symbol": "$",
    "group_by": "product",
    "model": "sale.order",
    "period": "2026-02",
    "total": 23500
  },
  "export_url": "/static/reports/sales_by_product_abc123.xlsx"
}
```

**Export (explicit Excel export request):**
```json
{
  "type": "export",
  "export_url": "/static/reports/export_abc123.xlsx",
  "filename": "sales_report_2026_02.xlsx"
}
```

The `labels` field in action proposals contains translated UI text based on the `language` sent in the request. The frontend uses these labels directly for button text and cancellation messages.

### Action Confirmation Responses

The `/chat/{id}/action` endpoint returns:

**Success (201 - Create):**
```json
{
  "status": "ok",
  "message": "Contact created successfully (ID: 42)",
  "result": { "action": "create", "model": "res.partner", "id": 42 }
}
```

**Success (200 - Update):**
```json
{
  "status": "ok",
  "message": "Contact updated successfully (IDs: [42])",
  "result": { "action": "update", "model": "res.partner", "ids": [42], "success": true }
}
```

**Success (200 - Report):**
```json
{
  "status": "ok",
  "message": "Report generated successfully",
  "result": { "action": "report", "model": "account.move", "ids": [1], "file_url": "/static/reports/invoice.pdf", "filename": "INV-2026-001.pdf" }
}
```

**Error Responses:**
- **400** - Validation error (missing fields, invalid data)
- **401** - Odoo authentication failed
- **422** - Odoo business error (constraint violation)
- **500** - Odoo execution error

**Auto-sequencing:** The response may include a `queue_next` field with `{ text: string }` to automatically trigger a follow-up action after a short delay.

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

**Component Color Coding:**
- Success cards use `--color-success` (green)
- Validation prompts use `--color-warning` (orange)
- Action buttons use `--color-odoo-purple` (Odoo brand color)
- PDF file cards use red accent
- Excel export cards use `#1D6F42` (Excel green)
- Charts use Odoo purple palette

## Supported Languages

| Code | Language |
|------|----------|
| `es` | Spanish (default) |
| `en` | English |
| `fr` | French |
| `de` | German |
| `pt` | Portuguese |

Translations are located in `messages/[locale].json` with **132 keys** per language.

### Translation Key Namespaces

| Namespace | Keys | Description |
|-----------|------|-------------|
| `Metadata` | 2 | Page title and description |
| `Sidebar` | 6 | Navigation and theme toggle |
| `ChatGroups` | 4 | Date-based grouping labels |
| `NewChat` | 8 | Welcome screen and suggestions |
| `ChatInput` | 2 | Input placeholder and disclaimer |
| `ChatMessages` | 26 | All chat UI: typing, success, validation, selection, file, chart, export |
| `Pricing` | 46 | Plans, features, and CTAs |
| `Settings` | 24 | Connection form, inspector, security |
| `LocaleSwitcher` | 5 | Language names |
