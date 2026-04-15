# Odoo Agent Front

> Multi-tenant SaaS frontend for interacting with Odoo ERP through an AI agent

[![Next.js](https://img.shields.io/badge/Next.js-16.1-000000.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4.svg)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth-3ECF8E.svg)](https://supabase.com/)
[![next-intl](https://img.shields.io/badge/next--intl-4.8-blue.svg)](https://next-intl.dev/)

## Description

A modern, responsive interface that allows users to query and manage data from their Odoo instance (inventory, invoices, sales, employees) using natural language through an AI-powered chat. Key features:

**Core Chat:**
- Real-time chat with SSE streaming
- Rich Markdown-formatted responses
- Image upload with inline preview (vision-based AI interactions)
- Predefined suggestions to quickly start querying
- Conversation history grouped by date (today, yesterday, last 7 days)

**Action Management:**
- AI-proposed CRUD actions with confirm/cancel flow (from text and vision sources)
- Field editor modal with per-field validation (422 error handling)
- Visual feedback for write operations (create, update, method calls)
- Success cards with record links to Odoo
- Validation error prompts with missing field indicators
- Ambiguity resolution with interactive selection cards
- Entity autocomplete for Odoo model search
- Audit history popover for action execution trail
- Auto-sequencing: `queue_next` triggers follow-up actions automatically

**Analytics & Export:**
- Interactive charts (bar, line, pie) powered by Recharts
- Automatic Excel export button on chart cards
- Standalone Excel download cards for explicit export requests
- PDF report download cards

**Pinned Insights Dashboard:**
- Pin charts, files, and exports to a collapsible right sidebar
- Refresh pinned charts to get updated data from Odoo
- Flying pin animation with spring physics
- Max 20 pins per chat with optimistic UI updates

**Notification System:**
- Proactive alerts from Odoo (sales, stock, invoices) with severity levels
- Notification feed in right sidebar (Alerts tab) with unread badge
- Mark as read (individual and bulk), dismiss
- Deep link: click notification to inject prompt into chat
- Configurable settings modal (toggle alerts by category, daily summary)
- Auto-polling every 30 seconds

**Authentication & Multi-Tenancy:**
- Supabase email/password authentication (DEV MODE bypass when unset)
- Demo mode: unauthenticated access when backend sets `demo_available` (banner in chat + "Try Demo" button on login)
- Organization management (name, slug, type)
- Role-based access control (SuperAdmin, Admin, Client User)
- Subscription tiers (Free, Starter, Implementor S/M/L/XL/XXL) with slot limits
- Team management: invite users by email, toggle free/paid slots
- 2-step onboarding wizard (org creation + Odoo connection)
- 402 payment limit modal (graceful degradation, no crash)

**Configuration:**
- Admin settings panel with tabs: organization, Odoo connections (CRUD), users, invitations, feedback reports
- Odoo connection configuration, validation, and instance inspection
- Multi-language support (Spanish, English, French, German, Portuguese)
- Light / dark mode with preference persisted in `localStorage` (no flash on reload)
- Collapsible and responsive sidebar (mobile-friendly)
- Accessibility: `aria-label` on all interactive icon buttons, `role="switch"` on toggles

**Other:**
- Plans and pricing page (Free, Starter, Implementor) with Stripe checkout and billing portal integration; current plan highlighted; Implementor detail modal with tier comparison table

## Architecture

### Tech Stack

**Core:**
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript 5** - Static typing

**Auth:**
- **Supabase** - Email/password authentication + session management

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
    layout.tsx                  # Root layout with provider stack (9 nested contexts)
    page.tsx                    # Auth-based redirector (no user→login, no org→onboarding, SUPERADMIN→/superadmin, else→chat)
    login/page.tsx              # Supabase email/password login (+ DEV MODE bypass)
    register/page.tsx           # Account signup → onboarding flow
    onboarding/page.tsx         # 2-step wizard: org name/slug + Odoo connection
    invite/page.tsx             # Accept team invitation by token
    superadmin/page.tsx         # Superadmin panel (standalone, no AppShell)
    (app)/
      layout.tsx                # AppShell wrapper (ChatContext + RightPanelContext); only wraps app routes
      chat/page.tsx             # New query (suggestions + input)
      chat/[id]/page.tsx        # Conversation with SSE streaming
      settings/page.tsx         # Admin panel: org, Odoo configs, users, invitations
      pricing/page.tsx          # Subscription plans
  globals.css                   # Theme variables (light/dark) + markdown styles
components/
  app-shell.tsx                 # Wrapper with ChatContext + RightPanelContext; renders shellless (no sidebar) for /invite
  locale-switcher.tsx           # Language selector dropdown
  theme-initializer.tsx         # Client component: applies .dark class from localStorage on every route change
  auth/
    auth-guard.tsx              # Login redirect HOC (checks auth, shows spinner)
  chat/
    sidebar.tsx                 # Collapsible sidebar + history (paginated) + theme toggle (persisted in localStorage) + logout
    chat-messages.tsx           # Message bubbles with metadata + charts + image handling + feedback button (shown when allow_feedback)
    feedback-modal.tsx          # Modal to report an AI message (category + comment)
    chat-input.tsx              # Auto-resizing input with image upload + send/stop
    welcome-dashboard.tsx       # First-chat landing with suggestion cards
    demo-banner.tsx             # Banner shown in demo mode (unauthenticated or no org)
    odoo-config-selector.tsx    # Dropdown to switch active Odoo config + credential status indicator
    success-card.tsx            # Green card for successful actions
    validation-prompt.tsx       # Orange card for missing fields
    odoo-action-button.tsx      # Purple action confirmation button
    action-proposal-button.tsx  # AI-proposed CRUD action confirm/cancel with field editor
    selection-card.tsx          # Multi-option selector for ambiguity resolution
    odoo-file-card.tsx          # PDF report download card
    odoo-chart-card.tsx         # Interactive charts (bar/line/pie) + Excel export + pin
    excel-export-card.tsx       # Standalone Excel download card
    audit-history-popover.tsx   # Action execution history timeline
    entity-autocomplete.tsx     # Odoo model search with debounced autocomplete
  pinned/
    pinned-sidebar.tsx          # Collapsible right sidebar (pins + alerts tabs)
    pinned-insight-mini-card.tsx # Compact card with refresh (charts) + unpin
    pin-toggle-button.tsx       # Reusable pin/unpin toggle on chart/file cards
    flying-pin-animation.tsx    # Spring-animated flying pin portal
  notifications/
    notification-feed.tsx       # Notification list with mark-all-read
    notification-card.tsx       # Individual alert card with time-ago
    notification-settings-modal.tsx # Toggle alerts by category
  settings/
    user-credentials-section.tsx      # Section for users to save their own Odoo credentials (username + API key)
    admin-user-credentials-modal.tsx  # Admin modal to manage credentials for any org user
  odoo/
    connection-form.tsx         # Odoo connection form (saves via POST /admin/orgs/{id}/configs, not localStorage)
    instance-inspector.tsx      # View installed Odoo modules
  pricing/pricing-cards.tsx     # Plan cards (Free, Starter, Implementor); accepts currentTier prop; Stripe checkout/portal CTAs; Implementor detail modal
  ui/
    error-toast.tsx             # Toast notification provider + display
    limit-reached-modal.tsx     # 402 payment limit upgrade modal
    password-input.tsx          # Password field with show/hide toggle (Eye/EyeOff)
hooks/
  use-auth.tsx                  # Supabase auth context (login/register/logout, DEV MODE stub)
  use-session.tsx               # /me endpoint context (user/org/subscription/odoo_configs bootstrap; always loads, even unauthenticated)
  use-chat.ts                   # Chat state + SSE + image upload + action execution
  use-odoo-config.tsx           # Odoo config context (configs from backend; activeConfigId persisted in localStorage; isDemoMode flag)
  use-pinned-insights.tsx       # Pinned insights context (pin/unpin/refresh/clear)
  use-notifications.tsx         # Notification context (polling/read/dismiss/settings)
  use-limit-reached-modal.tsx   # 402 limit modal context (listens to auth:limit_reached event)
lib/
  api.ts                        # Centralized API client (28+ endpoints, authFetch with 401/402)
  types.ts                      # TypeScript interfaces (Message, Metadata, Action, Charts, Multi-tenant)
  supabase.ts                   # Supabase client singleton + IS_AUTH_ENABLED + getAccessToken
  pin-animation-events.ts       # Pub-sub system for flying pin animations
i18n/                           # Routing, request config, navigation (Link/Router wrappers)
messages/                       # Translations (es, en, fr, de, pt)
proxy.ts                        # Locale detection middleware
```

### Provider Stack

The root layout nests 9 context providers in this order:

```
NextIntlClientProvider
  → AuthProvider (Supabase user)
    → SessionProvider (/me bootstrap: org, subscription, slots)
      → OdooConfigProvider (localStorage)
        → ToastProvider (error notifications)
          → LimitReachedModalProvider (402 modal)
            → NotificationProvider (30s polling)
              → PinnedInsightsProvider (pin state)
                → [root layout ends here]
                  → AppShell (ChatContext + RightPanelContext)  ← only inside (app)/ route group
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
- **Field editor modal** with inline editing and validation
- Handles 422 per-field validation errors from backend
- User-edited field indicators (badge showing "Modified")
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
- **Pin button** to save chart to pinned insights sidebar

### ExcelExportCard
Standalone Excel download card for explicit export requests:
- Green Excel icon (#1D6F42) matching Microsoft Excel branding
- Shows filename and "export ready" message
- Download button with `download` attribute to force browser download

### PinnedInsightMiniCard
Compact card displayed in the pinned insights sidebar:
- **Chart cards:** Icon by chart type (bar/pie/line), title, formatted total, refresh + unpin buttons
- **File cards:** Red PDF icon, filename, download link, unpin button
- **Excel cards:** Green Excel icon, filename, download link, unpin button
- Refresh button (charts only) with spinning animation during API call
- Buttons revealed on hover with smooth opacity transition

### NotificationCard
Individual alert displayed in the notification feed:
- Severity-based color coding (critical, warning, info, success)
- Title, body, and relative timestamp ("5 min ago")
- Read/unread visual state
- Click to dismiss or deep-link into chat with prompt injection

### ChatInput
Auto-resizing textarea with image upload support:
- Paperclip button opens native file picker (`accept="image/*"`)
- Selected image shows as 64px thumbnail preview with X to remove
- Supports sending text only, image only, or both together
- Enter to send, Shift+Enter for newline

### AuditHistoryPopover
Action execution history timeline:
- Shows all actions executed in the current conversation
- Displays action type, model, record IDs, status
- Highlights user-edited fields vs system values
- Empty state when no actions have been executed

### EntityAutocomplete
Odoo model search with autocomplete:
- Debounced search against backend (`/chat/{id}/search`)
- Dropdown with matching records (id + name)
- Used within ActionProposalButton field editor

## Authentication & User Flows

### Unauthenticated User

```
App loads → GET /me (no auth token)
         → demo_available: false → /login
         → demo_available: true  → /chat (Demo Mode)
                                    activeConfigId = "demo"
                                    banner shown in chat
                                    "Try Demo" button on login page
```

> Demo Mode lets visitors interact with the AI using a read-only Odoo demo instance — no account required.

### Authenticated User (any role)

```
App loads → AuthProvider restores Supabase session
         → SessionProvider calls GET /me
         → SUPERADMIN      → /superadmin (standalone panel, no app shell)
         → No org yet      → /onboarding (2-step wizard: org name + Odoo connection)
         → Org exists      → /chat
         → 401 from any API call → clear session → /login
         → 402 from any API call → show LimitReachedModal (no crash)
```

### Admin User

Admins have access to `/settings` (tab-based panel) with full control over:

```
Settings
├── Organization  → edit name, slug, org type
├── Connections   → CRUD for Odoo configs (multiple per org)
│                   test connection, inspect installed modules
├── Users         → list members, change role, toggle free/paid slot, remove
├── Invitations   → send invite by email, view status (pending / accepted / expired)
│                   pending invitations show "Show link" button to reveal and copy the invite URL
└── Feedback      → read-only list of feedback reports submitted by org users (expandable rows)
```

Role comparison:

| Capability | CLIENT_USER | ADMIN | SUPERADMIN |
|------------|:-----------:|:-----:|:----------:|
| Chat & query Odoo | ✓ | ✓ | ✓ |
| Submit feedback on AI messages | per `allow_feedback` flag | per `allow_feedback` flag | per `allow_feedback` flag |
| View plans/pricing link | — | ✓ | ✓ |
| View settings | — | ✓ | ✓ |
| Manage Odoo connections | — | ✓ | ✓ |
| Manage users & invitations | — | ✓ | ✓ |
| View org feedback reports | — | ✓ | ✓ |
| Edit organization | — | ✓ | ✓ |
| Cross-org administration | — | — | ✓ |
| Feedback dashboard + full triage | — | — | ✓ |

### Invitation Flow

```
Admin sends invite (email) → POST /admin/orgs/{id}/invitations
                           → backend emails token link: /invite?token=...

Invitee opens link → GET /admin/invitations/{token}/preview  (no auth)
                   → renders without app shell (no sidebar, no chat context)
                   → shows registration form
                      email  (pre-filled, read-only)
                      org name + role badge
                      password field (with show/hide toggle)
                   → submit:
                      1. POST Supabase signUp  → gets accessToken
                      2. POST /admin/invitations/accept  (Bearer accessToken)
                      3. reload /me → redirect /chat

Error states:
  token missing / invalid → "Invitation not found"
  token expired (410)     → "Invitation expired"
  already accepted (409)  → "Already used" + go to chat button
```

> The invitation page handles registration inline — the invitee never needs to visit `/login` or `/register` separately.

### DEV MODE

When `NEXT_PUBLIC_SUPABASE_URL` is unset:
- `IS_AUTH_ENABLED = false`
- `useAuth()` returns stub user `dev@localhost`
- Login page shows "Continue without login" bypass button
- No token sent to backend (backend must also be in DEV MODE)

## Multi-Tenancy Model

| Concept | Values | Description |
|---------|--------|-------------|
| **Roles** | `SUPERADMIN`, `ADMIN`, `CLIENT_USER` | Per-user permission level |
| **Org Types** | `PARTNER`, `SOLITARY` | Multi-client vs single company |
| **Subscriptions** | `FREE`, `STARTER`, `IMPLEMENTOR_S`, `IMPLEMENTOR_M`, `IMPLEMENTOR_L`, `IMPLEMENTOR_XL`, `IMPLEMENTOR_XXL` | Tier with slot limits |
| **Slots** | `paid_slots_limit`, `free_slots_limit` | Max users per org by type |
| **Odoo Configs** | `OdooConfigSummaryWithCreds[]` | Multiple Odoo connections per org; active one selected via `activeConfigId`; enriched with per-user credentials (`hasCredentials`, `odoo_username`) |
| **Demo Mode** | `demo_available: boolean` | Backend flag enabling unauthenticated access; `activeConfigId = "demo"` |
| **allow_feedback** | `boolean` (per user, on `MeUser`) | When `true`, a "Report" button appears on hover over AI messages. Users submit reports with optional category (`wrong_answer`, `crash`, `misunderstood`, `other`) and comment. Managed via PATCH `/admin/orgs/{id}/users/{id}`. |

**Settings page** (`/settings`) provides admin controls for:
- Organization name/slug/type editing
- Odoo connections: create, update, delete (multiple per org)
- Users: list, change role, toggle free/paid, remove
- Invitations: send by email, view status (pending/accepted/expired)

## Communication Flow

```
┌─────────────┐     POST /chat/{id}/stream      ┌─────────────────┐
│             │  ──────────────────────────────►  │                 │
│   Frontend  │     { message, odoo_config }      │     Backend     │
│  (Next.js)  │                                   │  (FastAPI/SSE)  │
│             │  ◄──────────────────────────────  │                 │
└─────────────┘     text/event-stream (SSE)       └─────────────────┘
                    chunks with optional metadata

┌─────────────┐     POST /chat/{id}/upload      ┌─────────────────┐
│             │  ──────────────────────────────►  │                 │
│   Frontend  │     multipart/form-data (image)   │     Backend     │
│  (Next.js)  │                                   │  (FastAPI/OCR)  │
│             │  ◄──────────────────────────────  │                 │
└─────────────┘     JSON (action_proposal)        └─────────────────┘
```

**Consumed endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/me` | Current user + org + subscription |
| `POST` | `/me/onboarding` | Setup org + Odoo connection (409 on slug conflict) |
| `GET` | `/me/conversations` | Chat history (paginated with limit/offset) |
| `POST` | `/chat/{id}/stream` | Send message + receive SSE response with metadata (body: `{ message, config_id, language }`) |
| `POST` | `/chat/{id}/upload` | Upload image (multipart) + receive JSON with action proposal (field: `config_id`) |
| `POST` | `/chat/{id}/action` | Execute confirmable action (body: `{ config_id, action, context, language }`) |
| `GET` | `/chat/{id}/history` | Load full message history for a conversation (query param: `config_id`) |
| `GET` | `/chat/{id}/audit` | Action execution history (audit trail) |
| `POST` | `/chat/{id}/search` | Odoo entity name_search (body: `{ model, query, config_id }`) |
| `GET` | `/chat/{id}/pins` | Fetch all pinned insights for a chat |
| `POST` | `/chat/{id}/pin` | Create a new pin (chart, file, or excel) |
| `DELETE` | `/chat/{id}/pin/{pinId}` | Delete a specific pin |
| `POST` | `/chat/{id}/pin/{pinId}/refresh` | Refresh a pinned chart with updated data |
| `DELETE` | `/chat/{id}/pins` | Clear all pins for a chat |
| `GET` | `/chat/{id}/notifications` | Fetch notification list (filterable) |
| `PATCH` | `/chat/{id}/notifications/{id}/read` | Mark notification as read |
| `PATCH` | `/chat/{id}/notifications/read-all` | Mark all notifications as read |
| `POST` | `/test-connection` | Validate Odoo credentials |
| `POST` | `/inspect-instance` | Fetch installed Odoo modules |
| `POST` | `/admin/orgs` | Create organization |
| `PATCH` | `/admin/orgs/{id}` | Update organization (name, slug, type) |
| `GET` | `/admin/orgs/{id}/configs` | List Odoo connections |
| `POST` | `/admin/orgs/{id}/configs` | Create Odoo connection |
| `PATCH` | `/admin/orgs/{id}/configs/{id}` | Update Odoo connection |
| `DELETE` | `/admin/orgs/{id}/configs/{id}` | Delete Odoo connection |
| `GET` | `/admin/orgs/{id}/users` | List organization users |
| `PATCH` | `/admin/orgs/{id}/users/{id}` | Update user (role, is_free_license, allow_feedback) |
| `DELETE` | `/admin/orgs/{id}/users/{id}` | Remove user from organization |
| `POST` | `/admin/orgs/{id}/invitations` | Send invitation by email |
| `GET` | `/admin/orgs/{id}/invitations` | List invitations |
| `POST` | `/admin/invitations/accept` | Accept invitation by token |
| `GET` | `/me/odoo-credentials` | List current user's saved credentials (one per config) |
| `PUT` | `/me/odoo-credentials/{configId}` | Save/update current user's credentials for a config |
| `GET` | `/admin/orgs/{id}/users/{userId}/odoo-credentials/{configId}` | Admin: get a user's credentials for a config |
| `PUT` | `/admin/orgs/{id}/users/{userId}/odoo-credentials/{configId}` | Admin: save/update a user's credentials for a config |
| `DELETE` | `/admin/orgs/{id}/users/{userId}/odoo-credentials/{configId}` | Admin: delete a user's credentials for a config |
| `POST` | `/billing/checkout` | Create Stripe checkout session for a given tier |
| `POST` | `/billing/portal` | Create Stripe billing portal session |
| `POST` | `/chat/{id}/feedback` | Submit user feedback for a message (body: `{ config_id, message_id?, user_comment?, category? }`) |
| `GET` | `/admin/feedback` | List feedback reports (filterable by status, category, org_id; paginated) |
| `GET` | `/admin/feedback/stats` | Feedback statistics (total, 24h, 7d, by_status, by_category, top_orgs) |
| `GET` | `/admin/feedback/{id}` | Fetch single feedback report detail |
| `PATCH` | `/admin/feedback/{id}` | Update report (status, admin_notes, is_hidden) |
| `DELETE` | `/admin/feedback/{id}` | Delete feedback report |

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
    "vals": { "name": "Juan Perez", "email": "juan@example.com" },
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
    { "index": 0, "id": 42, "name": "Juan Perez" },
    { "index": 1, "id": 43, "name": "Juan Garcia" }
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

**Watermark (subscription-based):**
```json
{
  "type": "watermark",
  "show": true
}
```

The `labels` field in action proposals contains translated UI text based on the `language` sent in the request. The frontend uses these labels directly for button text and cancellation messages.

### Image Upload Response

The `/chat/{id}/upload` endpoint accepts `multipart/form-data` with `file`, `odoo_config` (JSON string), and `language` fields. It returns a regular JSON response (not SSE):

```json
{
  "message": "I found an invoice in the image. Here's what I extracted:",
  "type": "action_proposal",
  "action": {
    "action": "create",
    "model": "account.move",
    "vals": { "partner_id": 42, "amount_total": 1500.00 },
    "target_ids": [],
    "status": "pending_confirmation"
  },
  "labels": {
    "action_btn": "Create Invoice",
    "confirm_btn": "Confirm",
    "cancel_btn": "Cancel",
    "cancelled_msg": "Action cancelled."
  }
}
```

The frontend renders the uploaded image in the user's message bubble and displays the action proposal below the assistant's response using the same `ActionProposalButton` component used for SSE-based proposals.

### Pin Refresh Response

The `POST /chat/{id}/pin/{pinId}/refresh` endpoint re-queries Odoo and returns the updated chart data:

```json
{
  "status": "ok",
  "new_payload": {
    "type": "chart",
    "chart_type": "bar",
    "title": "Sales by Product",
    "data": [{ "label": "Product A", "value": 16200 }],
    "meta": { "value_label": "Revenue", "value_format": "currency", "currency_symbol": "$", "group_by": "product", "model": "sale.order", "period": "2026-02", "total": 16200 }
  },
  "refreshed_at": "2026-02-24T15:30:00Z"
}
```

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
- **402** - Payment limit reached (triggers LimitReachedModal)
- **422** - Odoo business error (constraint violation, per-field errors)
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
- **Supabase project** (optional — leave unset for DEV MODE)

### Environment Variables

```bash
# Supabase Auth (leave empty for DEV MODE — no auth, no token)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...

# Backend API base URL (default: http://localhost:8000)
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:3000` — it automatically redirects based on auth state.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server (hot reload) |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | Linting with ESLint |

## Themes and Design

The color system supports **light and dark mode** with CSS variables defined in `app/globals.css` under `@theme`. Components use semantic utility tokens — never raw hex values.

Theme preference is persisted in `localStorage` under the key `theme` (`"dark"` | `"light"`). The `ThemeInitializer` component (mounted in `<body>` in `app/[locale]/layout.tsx`) applies the `.dark` class on every route change via `usePathname`, ensuring the correct theme is always active across navigations.

### Design Token System

| Token | Role | Example usage |
|-------|------|---------------|
| `bg-base` | Page background | `<div className="bg-base">` |
| `bg-surface` | Card/panel background | `<div className="bg-surface">` |
| `bg-raised` | Elevated element (hover, input bg) | `hover:bg-raised` |
| `text-foreground` | Primary text | `<p className="text-foreground">` |
| `text-text-secondary` | Secondary/label text | `<label className="text-text-secondary">` |
| `text-text-muted` | Placeholder / de-emphasized text | `placeholder:text-text-muted` |
| `bg-accent` / `text-accent` | Interactive primary (replaces `primary`) | buttons, active states |
| `bg-accent-hover` | Hover state for accent buttons | `hover:bg-accent-hover` |
| `bg-accent-subtle` / `text-accent` | Accent tint (icon backgrounds) | icon wrappers |
| `bg-error` / `text-error` | Destructive actions | delete buttons, error messages |
| `bg-error-subtle` | Error tint | hover on delete, inline errors |
| `text-success-solid` | Success color | success icons |
| `text-warning-solid` | Warning color | warning icons, badges |
| `text-info` | Info color | info icons |
| `border-border` | Default border | all card/input borders |

### Typography Tokens

| Token | Usage |
|-------|-------|
| `text-heading` | Section headings (`h1`/`h2`) |
| `text-subheading` | Sub-section headings |
| `text-body` | Default body text (replaces `text-sm`) |
| `text-small` | Secondary labels (replaces `text-xs`) |
| `text-micro` | Captions, badges, timestamps |
| `font-technical` | Monospaced/code values (slugs, URLs, IDs) |

### Component Color Coding

- Success cards use `text-success-solid` / `bg-success-subtle`
- Validation prompts use `text-warning-solid` / `bg-warning-subtle`
- Action buttons use `--color-odoo-purple` (`#714B67`) — Odoo brand color
- PDF file cards use `text-error` red accent
- Excel export cards use `#1D6F42` (Excel green)
- Charts use Odoo purple palette
- Notification severity: critical (`text-error`), warning (`text-warning-solid`), info (`text-info`), success (`text-success-solid`)

### Shape & Animation Conventions

- Cards / modals: `rounded-lg` (was `rounded-2xl`)
- Buttons / inputs / small elements: `rounded-md` (was `rounded-xl`/`rounded-lg`)
- Icons: 20px size, `strokeWidth={1.5}` throughout
- Animations: `duration-0.15` + `ease: "easeOut"` (replaced spring physics)

## Supported Languages

| Code | Language |
|------|----------|
| `es` | Spanish (default) |
| `en` | English |
| `fr` | French |
| `de` | German |
| `pt` | Portuguese |

Translations are located in `messages/[locale].json`.

### Translation Key Namespaces

| Namespace | Description |
|-----------|-------------|
| `Metadata` | Page title and description |
| `Sidebar` | Navigation, theme toggle, logout, collapse/expand labels |
| `ChatGroups` | Date-based grouping labels |
| `NewChat` | Welcome screen and suggestions |
| `ChatInput` | Input placeholder, disclaimer, image attach/remove, send/stop aria labels |
| `ChatMessages` | Chat UI: typing, success, validation, selection, file, chart, export, action proposal, audit, feedback button |
| `Feedback` | Feedback modal: title, categories, comment, submit/cancel, success toast |
| `ChatHistory` | Loading states |
| `WelcomeDashboard` | Suggestion cards for first-chat landing |
| `Pricing` | Plans, features, and CTAs |
| `Settings` | Connection form, inspector, security, admin panel (org, configs, users, invitations, feedback reports) |
| `PinnedInsights` | Pin/unpin tooltips, empty state, error messages |
| `Notifications` | Alert feed, settings, time labels |
| `Auth` | Login, register, DEV MODE bypass |
| `Onboarding` | 2-step wizard (org + Odoo connection) |
| `LimitReachedModal` | 402 payment limit message |
| `Invite` | Invitation acceptance (loading, success, error, expired) |
| `LocaleSwitcher` | Language names |
