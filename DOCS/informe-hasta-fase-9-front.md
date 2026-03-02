# Odoo Agent Front - Capability Report (Phase 1-9)

> Comprehensive inventory of all frontend capabilities as of Phase 9.
> This document serves as a baseline for defining new features in subsequent phases.
> **Phase 9 additions** are marked with 🆕 for easy identification.

---

## Table of Contents

1. [Core Chat System](#1-core-chat-system)
2. [Action Management](#2-action-management)
3. [Analytics & Visualization](#3-analytics--visualization)
4. [Export System](#4-export-system)
5. [Pinned Insights Dashboard](#5-pinned-insights-dashboard)
6. [Notification System](#6-notification-system)
7. [Odoo Configuration](#7-odoo-configuration)
8. [Internationalization (i18n)](#8-internationalization-i18n)
9. [Theme System](#9-theme-system)
10. [Navigation & Layout](#10-navigation--layout)
11. [Image Upload & Vision](#11-image-upload--vision)
12. [Error Handling](#12-error-handling)
13. [Routing & Pages](#13-routing--pages)
14. [State Management Architecture](#14-state-management-architecture)
15. [API Integration Layer](#15-api-integration-layer)
16. [Type System](#16-type-system)
17. [Animation System](#17-animation-system)
18. [Chat Persistence & Hydration](#18-chat-persistence--hydration) 🆕
19. [Onboarding & Discovery](#19-onboarding--discovery) 🆕
20. [Human-in-the-Loop Editing](#20-human-in-the-loop-editing) 🆕
21. [Visual Diffing System](#21-visual-diffing-system) 🆕
22. [Observations & Potential Improvements](#22-observations--potential-improvements)

---

## 1. Core Chat System

### What it does
Real-time conversational interface where users interact with an AI agent to query and manage their Odoo ERP data using natural language.

### Capabilities

| Capability | Description | Implementation |
|-----------|-------------|----------------|
| SSE Streaming | Token-by-token real-time response rendering via Server-Sent Events | `hooks/use-chat.ts` |
| Message History | Full conversation history maintained per chat session | `hooks/use-chat.ts` |
| 🆕 Backend Persistence | Messages recovered from PostgreSQL on page reload | `hooks/use-chat.ts` → `loadChatHistory` |
| 🆕 Hydration on Mount | Chat state hydrated from `GET /chat/{id}/history` when component mounts | `app/[locale]/chat/[id]/page.tsx` |
| 🆕 Loading State | Spinner shown while history is being fetched from backend | `Loader2` + Framer Motion fade |
| Markdown Rendering | Agent responses rendered as rich Markdown (headings, lists, bold, code) | `react-markdown` in `chat-messages.tsx` |
| Typing Indicator | Animated dots while the agent is processing/streaming | `chat-messages.tsx` |
| Auto-scroll | Messages auto-scroll to bottom as new content arrives | `chat-messages.tsx` |
| Abort Streaming | Stop button to cancel an ongoing SSE stream mid-response | `AbortController` in `use-chat.ts` |
| Chat Creation | New chats created with auto-generated UUID | `use-chat.ts` |
| Title Generation | Chat title derived from the first user message (truncated) | `use-chat.ts` |
| Predefined Suggestions | Quick-start suggestion cards on the new chat screen | `app/[locale]/chat/page.tsx` |
| 🆕 Welcome Dashboard | Context-aware suggestion cards inside existing chats when empty | `welcome-dashboard.tsx` |
| Enter to Send | Enter key sends message, Shift+Enter inserts newline | `chat-input.tsx` |
| Auto-resize Input | Textarea grows vertically as the user types | `chat-input.tsx` |

### How it works
1. User navigates to `/chat/{id}`. The `useEffect` calls `loadChatHistory(id)` to fetch persisted messages. 🆕
2. If backend returns messages, they hydrate the chat state (skip if already loaded via dedup ref). 🆕
3. If backend returns empty array, `WelcomeDashboard` is shown with contextual suggestions. 🆕
4. User types a message in `ChatInput` and presses Enter.
5. `useChat` hook creates a POST request to `/chat/{id}/stream` with the message, Odoo config, and locale.
6. Backend responds with an SSE stream. The hook reads chunks via `ReadableStream`, parsing each `data:` line.
7. Text chunks are appended token-by-token to the assistant message (streaming effect).
8. Metadata events (action proposals, charts, selections, etc.) are parsed and attached to the message.
9. The stream closes with `[DONE]`, finalizing the message.

---

## 2. Action Management

### What it does
Handles AI-proposed write operations on Odoo (create, update, method calls, reports) with an inline editing and confirmation flow before execution.

### Capabilities

| Capability | Description | Component |
|-----------|-------------|-----------|
| Action Proposals | AI proposes CRUD operations; user reviews, edits, and confirms | `action-proposal-button.tsx` |
| Action Types | Supports `create`, `update`, `method_call`, `report` | `types.ts` → `ActionContext` |
| 🆕 Inline Field Editing | All proposed `vals` displayed as editable fields (click pencil to edit) | `action-proposal-button.tsx` |
| 🆕 Dynamic Input Types | Fields auto-detect type: entity→autocomplete, number→numeric, date→datepicker, boolean→checkbox, text→text | `FieldInput` component |
| 🆕 Entity Autocomplete | Relational fields (`_id`) use debounced search against Odoo `name_search` | `entity-autocomplete.tsx` |
| 🆕 Modified Vals Submission | On confirm, sends `ActionContext` with user-edited `vals` (not original) | `action-proposal-button.tsx` → `handleConfirm` |
| 🆕 Visual Diff | Edited fields highlighted with green indicators + tooltip showing original value | See [§21 Visual Diffing](#21-visual-diffing-system) |
| Confirm/Cancel Flow | Purple Odoo-branded buttons with translated labels | `action-proposal-button.tsx` |
| Method Call Buttons | Interactive buttons for confirmable methods (e.g., "Confirm Quotation") | `odoo-action-button.tsx` |
| Success Feedback | Green card with record ID, name, and link to Odoo | `success-card.tsx` |
| Validation Prompts | Orange card listing missing required fields | `validation-prompt.tsx` |
| Ambiguity Resolution | Selection cards when multiple records match a query | `selection-card.tsx` |
| Loading States | Spinner during action execution, checkmark on completion | All action components |
| Auto-sequencing | `queue_next` field triggers follow-up actions automatically | `use-chat.ts` |
| Error Handling | HTTP status-based error messages (400, 401, 422, 500) | `api.ts` → `executeAction` |

### How it works (updated for Phase 9)
1. Backend sends an `action_proposal` event via SSE with action details, `vals`, and translated labels.
2. Frontend renders `ActionProposalButton` with all `vals` as a card of editable field rows. 🆕
3. Each field shows its current value. Click the pencil icon to toggle inline editing. 🆕
4. For `_id` fields, `EntityAutocomplete` queries `POST /chat/{id}/search` with debounced input. 🆕
5. User modifies values as needed. Visual diff highlights changed fields in green. 🆕
6. On confirm, `executeAction()` POSTs to `/chat/{id}/action` with the **modified** `ActionContext`. 🆕
7. Response is parsed: success shows `SuccessCard`, report generates `OdooFileCard`, errors show toast.
8. If `queue_next` is present, a follow-up message is auto-sent after a short delay.

---

## 3. Analytics & Visualization

### What it does
Renders interactive charts from Odoo data directly within the chat conversation.

### Capabilities

| Capability | Description | Details |
|-----------|-------------|---------|
| Bar Charts | Vertical and horizontal bar charts | Responsive: horizontal on narrow screens |
| Line Charts | Area charts with gradient fill | Smooth curve interpolation |
| Pie Charts | Donut-style with percentage labels | 5-color purple gradient palette |
| Interactive Tooltips | Hover tooltips with formatted values | Currency, integer, decimal formats |
| Currency Formatting | Supports `$`, currency symbols from backend | `value_format: "currency"` |
| Number Formatting | Integer, decimal, and number formats | Locale-aware formatting |
| Label Truncation | Long labels truncated with ellipsis | Prevents chart overflow |
| Global Total | Footer displays total value across all data points | `meta.total` from SSE |
| Group-by Info | Shows grouping dimension (e.g., "by product") | `meta.group_by` from SSE |
| Responsive Layout | Adapts layout based on container width | Horizontal bars when narrow |
| Odoo Color Palette | Purple-themed colors matching Odoo branding | `#714B67` base color |

### How it works
1. Backend sends a `chart` event via SSE with `chart_type`, `data[]`, and `meta`.
2. `OdooChartCard` renders the appropriate Recharts component (BarChart, AreaChart, PieChart).
3. Charts are attached to the assistant message via the `charts[]` array on the `Message` type.
4. Multiple charts can appear in a single response.

---

## 4. Export System

### What it does
Enables downloading data as Excel spreadsheets and PDF reports.

### Capabilities

| Capability | Description | Component |
|-----------|-------------|-----------|
| Chart Excel Export | Export button on chart cards when `export_url` is present | `odoo-chart-card.tsx` (ghost button, top-right) |
| Standalone Excel Export | Dedicated card for explicit export requests | `excel-export-card.tsx` |
| PDF Report Download | Download card for generated PDF reports | `odoo-file-card.tsx` |
| Force Download | Uses HTML `download` attribute to force browser download | All export cards |
| Branded Icons | Excel green (`#1D6F42`), PDF red accent | Matching product branding |
| Filename Display | Shows the generated filename on the card | From SSE `filename` field |

### How it works
- **Excel from chart:** Chart SSE event includes optional `export_url`. If present, a download button appears on the chart card.
- **Standalone Excel:** Backend sends an `export` SSE event with `export_url` and `filename`. Renders `ExcelExportCard`.
- **PDF reports:** Action execution with `action: "report"` returns `file_url` and `filename`. Renders `OdooFileCard`.
- All downloads link to `{API_BASE}{url}` served as static files by the backend.

---

## 5. Pinned Insights Dashboard

### What it does
Allows users to pin charts, PDFs, and Excel exports to a persistent right sidebar for quick reference and refresh.

### Capabilities

| Capability | Description | Details |
|-----------|-------------|---------|
| Pin Charts | Pin any chart from chat to the sidebar | Stores full SSE payload |
| Pin Files | Pin PDF reports to the sidebar | Stores file metadata |
| Pin Excel | Pin Excel exports to the sidebar | Stores export metadata |
| Unpin | Remove individual pins | Optimistic UI with rollback |
| Refresh Charts | Re-query Odoo to update pinned chart data | Charts only, via `/pin/{id}/refresh` |
| Clear All | Remove all pins for a chat at once | Confirmation implicit |
| Max 20 Pins | Enforced limit per chat | Frontend validation |
| Deduplication | Prevents duplicate pins by identifier | `messageId` + `chartIndex` check |
| Flying Animation | Spring-physics animation when pinning | Portal-based, z-index 9999 |
| Collapsible Panel | Right sidebar expands (320px) / collapses (48px) | Click to toggle |
| Pin Count Badge | Shows number of active pins on collapsed sidebar | Numeric badge |
| Optimistic Updates | Instant UI feedback, rollback on API failure | `use-pinned-insights.tsx` |
| Backend Persistence | Pins survive page refresh (stored on backend) | CRUD via `/chat/{id}/pins` |
| Per-Chat Isolation | Each chat has its own set of pins | Loaded on chat switch |

### How it works
1. `PinToggleButton` appears on chart cards, file cards, and Excel cards.
2. Clicking pin triggers `pinInsight()` from `usePinnedInsights` context.
3. Optimistic: pin added to local state immediately, then POST to `/chat/{id}/pin`.
4. On failure, pin is removed from local state (rollback).
5. Flying animation uses a pub-sub event system (`pin-animation-events.ts`) to coordinate the animation from the source element to the sidebar.
6. Refresh re-queries the backend and updates the stored chart payload.

---

## 6. Notification System

### What it does
Proactive alerts from Odoo (sales, stock, invoices) displayed in a feed with configurable settings.

### Capabilities

| Capability | Description | Details |
|-----------|-------------|---------|
| Notification Feed | List of alerts in right sidebar (Alerts tab) | `notification-feed.tsx` |
| Severity Levels | Critical, Warning, Info, Success | Color-coded display |
| Categories | Sales, Stock, Invoices, General | Filterable by settings |
| Unread Badge | Count of unread notifications on bell icon | Left sidebar bell icon |
| Mark as Read | Individual notification mark as read | Optimistic with rollback |
| Mark All as Read | Bulk mark all as read | Fires individual PATCH calls |
| Dismiss | Remove notification from local view | Local-only, not synced |
| Deep Link to Chat | Click notification injects `chatPrompt` into chat | Auto-send prompt |
| Time Ago | Relative timestamps (e.g., "5 min ago") | `notification-card.tsx` |
| Polling | Auto-refresh every 30 seconds | `setInterval` in provider |
| Settings Modal | Toggle alerts by category | `notification-settings-modal.tsx` |
| Sales Alerts Toggle | Enable/disable sales notifications | Backend-synced setting |
| Stock Alerts Toggle | Enable/disable stock notifications | Backend-synced setting |
| Invoice Alerts Toggle | Enable/disable invoice notifications | Backend-synced setting |
| Daily Summary Toggle | Enable/disable daily summary | Backend-synced setting |

### How it works
1. `NotificationProvider` wraps the app and polls `POST /notifications` every 30 seconds.
2. Notifications are stored in state with `read` status.
3. Mark-as-read is optimistic: state updates immediately, then PATCH to backend.
4. Settings are fetched from `POST /notification-settings` and updated via PUT.
5. Clicking a notification with `chatPrompt` creates a new chat and sends the prompt.

---

## 7. Odoo Configuration

### What it does
Manages Odoo ERP connection credentials and provides an instance inspector.

### Capabilities

| Capability | Description | Component |
|-----------|-------------|-----------|
| Connection Form | URL, database, login, API key fields | `connection-form.tsx` |
| Test Connection | Validates credentials against Odoo | `POST /test-connection` |
| Success Feedback | Shows company name and Odoo version | Green success state |
| Error Messages | Detailed error display on failure | Red error state |
| LocalStorage Persistence | Config saved to browser localStorage | `use-odoo-config.tsx` |
| Instance Inspector | View all installed Odoo modules | `instance-inspector.tsx` |
| Module Details | Name, display name, version, state | Table with search |
| Module Search | Filter modules by name | Text input filter |
| Installation Badges | Color-coded status (installed, uninstalled) | Status badges |
| Security Notice | Warning about localStorage credential storage | Prominent info card |
| Auto-redirect | Redirects to settings if not configured | Root page logic |

### How it works
1. User enters Odoo credentials in the connection form.
2. "Test Connection" calls `POST /test-connection` with the config.
3. On success, credentials are saved to localStorage via `useOdooConfig` context.
4. Instance Inspector calls `POST /inspect-instance` to fetch module list.
5. If no config is saved, the root page redirects to `/settings`.

---

## 8. Internationalization (i18n)

### What it does
Full multi-language support with locale-based URL routing.

### Capabilities

| Capability | Description | Details |
|-----------|-------------|---------|
| 5 Languages | Spanish, English, French, German, Portuguese | `messages/*.json` |
| Locale Routing | URL prefix: `/es/chat`, `/en/chat`, etc. | `next-intl` + middleware |
| Language Switcher | Dropdown in sidebar footer | `locale-switcher.tsx` |
| 🆕 ~139 Keys | Expanded translation coverage (was ~126) | All UI strings translated |
| 🆕 13 Namespaces | Organized by feature area (was 11) | See namespace table below |
| Server-side Detection | Locale detected from URL on server | `i18n/request.ts` |
| Default Locale | Spanish (`es`) as default | `i18n/routing.ts` |
| Backend Language Sync | Locale sent to backend in API calls | `language` field in payloads |

### Translation Namespaces

| Namespace | Description | Phase |
|-----------|-------------|-------|
| `Metadata` | Page titles and descriptions | 1 |
| `Sidebar` | Navigation labels and theme toggle | 1 |
| `ChatGroups` | Date grouping (today, yesterday, etc.) | 1 |
| `NewChat` | Welcome screen and suggestion cards | 1 |
| `ChatInput` | Input placeholder, disclaimer, image controls | 1 |
| `ChatMessages` | Chat UI strings (typing, success, validation, selection, charts, exports, 🆕 actionProposal) | 1 + 9 |
| `Pricing` | Plan names, features, CTAs | 1 |
| `Settings` | Connection form, inspector, security | 1 |
| `PinnedInsights` | Pin/unpin tooltips, empty states, errors | 7 |
| `Notifications` | Alert feed, settings, time labels | 7 |
| `LocaleSwitcher` | Language display names | 1 |
| 🆕 `ChatHistory` | Loading state for history hydration | 9 |
| 🆕 `WelcomeDashboard` | Onboarding suggestions in empty chats | 9 |

### 🆕 New Translation Keys (Phase 9)

| Key | EN | ES |
|-----|----|----|
| `ChatMessages.actionProposal.editField` | Edit | Editar |
| `ChatMessages.actionProposal.noResults` | No results found | Sin resultados |
| `ChatMessages.actionProposal.searching` | Search... | Buscar... |
| `ChatMessages.actionProposal.fieldEdited` | Modified | Modificado |
| `ChatMessages.actionProposal.originalValue` | Original suggestion | Sugerencia original |
| `ChatHistory.loading` | Loading conversation... | Cargando conversación... |
| `WelcomeDashboard.heading` | What would you like to do? | ¿Qué te gustaría hacer? |
| `WelcomeDashboard.suggestions.sales` | Analyze sales by period | Analizar ventas por período |
| `WelcomeDashboard.suggestions.invoice` | Upload an invoice image | Subir imagen de factura |
| `WelcomeDashboard.suggestions.inventory` | Check product inventory | Consultar inventario de productos |
| `WelcomeDashboard.suggestions.report` | Generate a PDF report | Generar un reporte PDF |

---

## 9. Theme System

### What it does
Light and dark mode support using CSS custom properties.

### Capabilities

| Capability | Description |
|-----------|-------------|
| Light Mode | Default theme with white backgrounds |
| Dark Mode | Dark purple-tinted backgrounds |
| Toggle Button | Sun/Moon icon in sidebar footer |
| CSS Variables | All colors defined as `--color-*` tokens in `globals.css` |
| Tailwind v4 | Integrated via `@theme` directive |
| Component Colors | Context-aware coloring (success=green, warning=orange, Odoo=purple) |
| 🆕 Dirty Field Colors | Emerald green for edited fields (light: `emerald-50/30`, dark: `emerald-950/20`) |
| Markdown Styles | Themed code blocks, blockquotes, tables |

### Color Tokens

| Token | Light | Dark |
|-------|-------|------|
| Background | `#ffffff` | `#0c0a14` |
| Foreground | `#1a1625` | `#e2dff0` |
| Card | `#ffffff` | `#1a1625` |
| Primary | `#6d28d9` | `#8b5cf6` |
| Odoo Purple | `#714B67` | `#8d6584` |
| Success | `#22c55e` | `#22c55e` |
| Warning | `#f59e0b` | `#f59e0b` |
| Sidebar BG | `#f8fafc` | `#110e1c` |
| 🆕 Dirty Field BG | `rgba(34,197,94,0.06)` | `rgba(34,197,94,0.06)` |
| 🆕 Dirty Field Border | `rgba(34,197,94,0.35)` | `rgba(34,197,94,0.35)` |
| 🆕 Dirty Field Text | `rgb(22,163,74)` | `rgb(22,163,74)` |

---

## 10. Navigation & Layout

### What it does
Three-panel layout with responsive sidebar navigation.

### Capabilities

| Capability | Description | Component |
|-----------|-------------|-----------|
| Left Sidebar | App logo, new chat, history, navigation, settings | `sidebar.tsx` |
| Right Sidebar | Tabbed panel: Pinned Insights + Alerts | `pinned-sidebar.tsx` |
| Chat History | Conversations grouped by date (Today, Yesterday, Last 7 days, Older) | `sidebar.tsx` |
| Collapsible Sidebars | Both sidebars can be collapsed/expanded | Click toggles |
| Mobile Support | Hamburger menu with slide-in overlay | `sidebar.tsx` |
| Bottom Nav | Plans, Settings, Theme, Language links | `sidebar.tsx` |
| Tab Switching | Right sidebar tabs: Pins / Alerts | `pinned-sidebar.tsx` |
| Active Chat Highlight | Current chat visually highlighted in history | `sidebar.tsx` |
| New Chat Button | Creates new conversation with UUID | `sidebar.tsx` |

---

## 11. Image Upload & Vision

### What it does
Upload images (invoices, documents) for AI vision analysis and automatic data extraction.

### Capabilities

| Capability | Description |
|-----------|-------------|
| File Picker | Paperclip button opens native file picker (images only) |
| Image Preview | 64px thumbnail preview before sending |
| Remove Image | X button to discard selected image |
| Send With/Without Text | Supports image-only, text-only, or both |
| Multipart Upload | Sends as `multipart/form-data` to `/chat/{id}/upload` |
| Inline Display | Uploaded image shown in user's message bubble |
| Action Proposal | Backend extracts data and proposes create/update action |
| 🆕 Editable OCR Results | User can now correct OCR-extracted values before confirming | `action-proposal-button.tsx` |
| Same Confirm Flow | Uses identical `ActionProposalButton` as text-based proposals |

### How it works
1. User clicks paperclip, selects an image file.
2. Preview thumbnail appears in the input area.
3. On send, `uploadImage()` sends multipart POST to `/chat/{id}/upload`.
4. Backend performs OCR/vision analysis and returns JSON with action proposal.
5. Frontend renders the image in the user bubble and the action proposal below the assistant response.
6. 🆕 User reviews OCR-extracted fields in the inline editor, corrects any misreads, and confirms.

---

## 12. Error Handling

### What it does
Centralized error feedback system with toast notifications.

### Capabilities

| Capability | Description | Component |
|-----------|-------------|-----------|
| Error Toasts | Bottom-right toast notifications | `error-toast.tsx` |
| Auto-dismiss | Toasts disappear after 4 seconds | Timeout-based |
| Manual Dismiss | X button to close immediately | Click handler |
| AnimatePresence | Smooth enter/exit animations | Framer Motion |
| Portal Rendering | Toasts render above all content (z-9999) | React portal |
| Network Errors | Handled in all API calls | `api.ts` catch blocks |
| HTTP Status Codes | Specific messages for 400, 401, 422, 500 | `executeAction()` |
| Optimistic Rollback | Failed optimistic updates revert state | Pins, notifications |

---

## 13. Routing & Pages

### Route Structure

```
/[locale]/                    Root redirector (-> /chat or /settings)
/[locale]/chat                New chat with suggestion cards
/[locale]/chat/[id]           Active conversation with streaming + history hydration 🆕
/[locale]/pricing             Subscription plans (Free, Pro, Enterprise)
/[locale]/settings            Odoo connection config + instance inspector
```

### Page Details

| Page | Description | Key Features |
|------|-------------|--------------|
| Root (`/`) | Redirect logic | Goes to `/settings` if unconfigured, `/chat` otherwise |
| New Chat | Welcome screen | Greeting, 4 suggestion cards, centered input |
| Chat `[id]` | Conversation | 🆕 Hydrates from backend, WelcomeDashboard if empty, inline editing |
| Pricing | Plans page | 3 tiers (Free/Pro/Enterprise), animated cards |
| Settings | Configuration | Connection form, instance inspector, security notice |

---

## 14. State Management Architecture

### Context Providers (nested in order)

```
NextIntlClientProvider          (i18n translations)
  └─ OdooConfigProvider         (Odoo credentials + localStorage)
      └─ ToastProvider          (Error notifications)
          └─ NotificationProvider (Alerts + 30s polling)
              └─ PinnedInsightsProvider (Pin CRUD + animations)
                  └─ AppShell + ChatContext (Chat state + SSE + History 🆕)
```

### Custom Hooks

| Hook | File | Responsibility |
|------|------|---------------|
| `useChat` | `hooks/use-chat.ts` | SSE streaming, messages, image upload, metadata parsing, 🆕 history hydration |
| `useOdooConfig` | `hooks/use-odoo-config.tsx` | Credentials CRUD, localStorage, test connection state |
| `usePinnedInsights` | `hooks/use-pinned-insights.tsx` | Pin/unpin/refresh/clear, optimistic updates |
| `useNotifications` | `hooks/use-notifications.tsx` | Polling, mark read, dismiss, settings |
| `useToast` | `components/ui/error-toast.tsx` | Show/dismiss error toasts |
| `useChatContext` | `components/app-shell.tsx` | Access chat state from nested components |
| `useRightPanel` | `components/pinned/pinned-sidebar.tsx` | Tab switching (pins/alerts) |

### 🆕 New State in `useChat` (Phase 9)

| State / Ref | Type | Purpose |
|-------------|------|---------|
| `isLoadingHistory` | `boolean` | True while `fetchChatHistory` is in-flight |
| `loadedChatIdsRef` | `Set<string>` (ref) | Deduplicates history fetches — prevents re-fetching already-loaded chats |
| `loadChatHistory(id)` | `async function` | Fetches `GET /chat/{id}/history` and hydrates the chat's message array |

---

## 15. API Integration Layer

### Centralized in `lib/api.ts`

All backend communication goes through typed functions with consistent error handling.

| Function | Method | Endpoint | Purpose | Phase |
|----------|--------|----------|---------|-------|
| `testOdooConnection` | POST | `/test-connection` | Validate Odoo credentials | 1 |
| `inspectInstance` | POST | `/inspect-instance` | Fetch installed modules | 1 |
| `executeAction` | POST | `/chat/{id}/action` | Execute confirmed CRUD action | 1 |
| `uploadImage` | POST | `/chat/{id}/upload` | Upload image (multipart) | 5 |
| `fetchPins` | GET | `/chat/{id}/pins` | Get all pins for a chat | 7 |
| `createPin` | POST | `/chat/{id}/pin` | Create a new pin | 7 |
| `deletePin` | DELETE | `/chat/{id}/pin/{pinId}` | Delete a specific pin | 7 |
| `refreshPin` | POST | `/chat/{id}/pin/{pinId}/refresh` | Refresh pinned chart | 7 |
| `deleteAllPins` | DELETE | `/chat/{id}/pins` | Clear all pins | 7 |
| `fetchNotifications` | POST | `/notifications` | Get notifications list | 7 |
| `markNotificationRead` | PATCH | `/notifications/{id}/read` | Mark notification as read | 7 |
| `fetchNotificationSettings` | POST | `/notification-settings` | Get alert settings | 7 |
| `updateNotificationSettings` | PUT | `/notification-settings` | Update alert settings | 7 |
| 🆕 `fetchChatHistory` | GET | `/chat/{id}/history` | Recover persisted messages | 9 |
| 🆕 `searchEntities` | POST | `/chat/{id}/search` | Odoo `name_search` for autocomplete | 9 |

### SSE Streaming (in `use-chat.ts`)

| Event Type | Description | Frontend Handler |
|-----------|-------------|-----------------|
| `text` | Streaming text chunk | Append to message content |
| `action_proposal` | CRUD confirmation | Render `ActionProposalButton` (🆕 with inline editing) |
| `selection_prompt` | Ambiguity resolution | Render `SelectionCard` |
| `chart` | Analytics visualization | Render `OdooChartCard` |
| `export` | Excel file ready | Render `ExcelExportCard` |
| `[DONE]` | Stream end signal | Finalize message |

---

## 16. Type System

### Complete TypeScript coverage in `lib/types.ts` (228 lines)

| Type/Interface | Purpose | Phase |
|---------------|---------|-------|
| `Message` | Chat message with role, content, metadata, charts, imageUrl | 1 |
| `MessageMetadata` | Discriminated union of all metadata types | 1 |
| `ActionContext` | CRUD action structure (create/update/method_call/report) | 1 |
| `ActionLabels` | Translated button labels from backend | 1 |
| `ActionResult` | Discriminated union of action response types | 1 |
| `ChartSSEEvent` | Chart data + metadata from SSE | 3 |
| `ChartDataPoint` | `{ label, value }` for chart rendering | 3 |
| `ChartMeta` | Value format, currency, group_by, total | 3 |
| `ExportSSEEvent` | Excel export event from SSE | 4 |
| `PinnedInsight` | Union: `PinnedChart \| PinnedFile \| PinnedExcel` | 7 |
| `AppNotification` | Notification with severity, category, chatPrompt | 7 |
| `NotificationSettings` | Toggle flags for alert categories | 7 |
| `OdooConfig` | Connection credentials | 1 |
| `Chat` | Chat session with messages array | 1 |
| `ChatGroup` | Date-grouped chat list | 1 |
| `Plan` | Pricing plan definition | 1 |
| `ConnectionStatus` | `idle \| loading \| success \| error` | 1 |
| 🆕 `EntitySearchResult` | `{ id: number, name: string }` for autocomplete results | 9 |

---

## 17. Animation System

### Framer Motion throughout the application

| Animation | Where | Type | Phase |
|-----------|-------|------|-------|
| Message entrance | Chat messages | Fade + slide up | 1 |
| Sidebar slide | Left sidebar (mobile) | Slide from left | 1 |
| Card scale | Pricing cards | Scale + fade | 1 |
| Modal backdrop | Settings modal | Fade overlay | 1 |
| Flying pin | Pin action | Spring physics (portal) | 7 |
| Layout shift | Pin list | Layout animation | 7 |
| Typing dots | Typing indicator | Pulsing opacity | 1 |
| Toast enter/exit | Error toasts | Slide + fade | 1 |
| Button states | Action buttons | Scale on hover/tap | 1 |
| Tab transitions | Right sidebar tabs | Content crossfade | 7 |
| 🆕 Dirty field highlight | Edited action fields | Background + border color transition (0.25s easeInOut) | 9 |
| 🆕 Dirty indicator dot | Pencil badge on edited field | Scale in/out with AnimatePresence | 9 |
| 🆕 Dirty count badge | Header pill showing edit count | Scale + opacity with AnimatePresence | 9 |
| 🆕 Original value tooltip | Hover tooltip on dirty field | Fade + slide (0.15s) | 9 |
| 🆕 History loading spinner | Chat page while fetching | Fade in | 9 |
| 🆕 Welcome dashboard entrance | Suggestion cards | Fade + slide up (staggered) | 9 |

---

## 18. Chat Persistence & Hydration 🆕

### What it does
Recovers chat message history from the backend (PostgreSQL via LangGraph) on page load, eliminating data loss on refresh.

### Capabilities

| Capability | Description | Implementation |
|-----------|-------------|----------------|
| History Fetch | `GET /chat/{id}/history` returns full `Message[]` array | `api.ts` → `fetchChatHistory` |
| Auto-hydration | Messages loaded automatically when navigating to a chat | `useEffect` in `chat/[id]/page.tsx` |
| Deduplication | Each chat ID is only fetched once per session (via `Set<string>` ref) | `loadedChatIdsRef` in `use-chat.ts` |
| Skip if Loaded | If chat already has messages in state, skip the fetch | Early return in `loadChatHistory` |
| Title Recovery | Chat title reconstructed from first user message if not in state | `loadChatHistory` |
| Timestamp Parsing | Backend timestamps (`created_at` / `timestamp`) parsed to `Date` objects | `fetchChatHistory` mapper |
| Loading State | `isLoadingHistory` flag drives UI spinner | `Loader2` component |
| Empty = New Chat | Empty response array triggers `WelcomeDashboard` instead of spinner | Conditional rendering |

### How it works
1. User navigates to `/chat/{id}` (or refreshes the page).
2. `useEffect` fires `loadChatHistory(id)`.
3. Hook checks: (a) already in `loadedChatIdsRef`? skip. (b) chat exists with messages? skip.
4. Calls `fetchChatHistory(chatId, odooConfig)` → `GET /chat/{id}/history?odoo_url=...&odoo_db=...`
5. Response mapped to `Message[]` with parsed timestamps.
6. If messages returned: hydrate existing chat or create new `Chat` entry with the fetched data.
7. If empty array: do nothing (WelcomeDashboard renders for empty chats).

### Technical Details

```
loadChatHistory(chatId)
  ├── loadedChatIdsRef.has(chatId)? → return (deduplicated)
  ├── chats.find(id).messages.length > 0? → return (already hydrated)
  ├── !odooConfig? → return (can't call API)
  ├── setIsLoadingHistory(true)
  ├── fetchChatHistory(chatId, odooConfig)
  │   └── GET /chat/{chatId}/history?odoo_url&odoo_db&odoo_username&odoo_api_key
  ├── messages.length === 0? → return (new chat)
  └── setChats(prev => hydrate or create)
```

---

## 19. Onboarding & Discovery 🆕

### What it does
Provides contextual quick-start suggestions when a chat has no messages, helping users discover key capabilities without prior knowledge.

### Capabilities

| Capability | Description | Implementation |
|-----------|-------------|----------------|
| Welcome Dashboard | 4 suggestion cards shown in empty chats | `welcome-dashboard.tsx` |
| Contextual Suggestions | Sales analysis, invoice upload, inventory check, PDF report | Translation keys `WelcomeDashboard.suggestions.*` |
| One-click Action | Clicking a card sends the suggestion text as a message in the current chat | `onSend(text)` callback |
| Animated Entrance | Cards appear with staggered fade + slide up (Framer Motion) | `motion.div` with delay |
| i18n Support | All suggestion texts translated in 5 languages | `messages/*.json` |
| Conditional Display | Only shown when `messages.length === 0` AND `!isLoadingHistory` | `chat/[id]/page.tsx` |
| Icons | BarChart3 (sales), FileUp (invoice), Package (inventory), FileText (report) | `lucide-react` |

### Suggestion Cards

| Key | Icon | Color | EN Text | ES Text |
|-----|------|-------|---------|---------|
| `sales` | BarChart3 | emerald-500 | Analyze sales by period | Analizar ventas por período |
| `invoice` | FileUp | amber-500 | Upload an invoice image | Subir imagen de factura |
| `inventory` | Package | blue-500 | Check product inventory | Consultar inventario de productos |
| `report` | FileText | purple-500 | Generate a PDF report | Generar un reporte PDF |

### How it works
1. `chat/[id]/page.tsx` checks three states: loading history, has messages, or empty.
2. If `!isLoadingHistory && !hasMessages` → renders `<WelcomeDashboard onSend={sendMessage} />`.
3. User clicks a suggestion → `onSend(translatedText)` → message sent in current chat → SSE streaming begins.
4. Once the first message is sent, WelcomeDashboard disappears and `ChatMessages` takes over.

---

## 20. Human-in-the-Loop Editing 🆕

### What it does
Transforms AI-proposed actions from a simple confirm/cancel into a full inline editing form, allowing users to review, modify, and correct individual field values before execution.

### Capabilities

| Capability | Description | Implementation |
|-----------|-------------|----------------|
| Inline Field Display | All `vals` from `ActionContext` rendered as labeled rows | `action-proposal-button.tsx` |
| Click-to-Edit | Pencil icon toggles each field between display and edit mode | `editingField` state |
| Dynamic Input Types | Auto-detected from field key and value type | `getFieldType()` helper |
| Entity Autocomplete | Fields ending in `_id` use searchable dropdown via Odoo `name_search` | `entity-autocomplete.tsx` |
| Numeric Inputs | Amount/price/total/qty fields use `type="number"` with `step="any"` | `FieldInput` component |
| Date Pickers | Date fields (by key name or value pattern) use `type="date"` | `FieldInput` component |
| Boolean Checkboxes | Boolean values use checkbox with accent color | `FieldInput` component |
| Text Fallback | All other fields use plain text input | `FieldInput` component |
| Edited Vals Submission | On confirm, sends `ActionContext` with modified `vals` object | `handleConfirm()` |
| Enter to Confirm | Pressing Enter in any field input closes the editor | `onKeyDown` handler |
| Label Formatting | Field keys auto-formatted (`partner_id` → "Partner") | `formatFieldLabel()` |
| Value Formatting | Display values handle tuples, booleans, arrays, null | `formatDisplayValue()` |

### Entity Autocomplete Component (`entity-autocomplete.tsx`)

| Feature | Description |
|---------|-------------|
| Debounced Search | 300ms debounce before calling backend | `setTimeout` + `useEffect` cleanup |
| Minimum Query | Search triggers only with 2+ characters | Guard in `doSearch` |
| Dropdown Results | Scrollable list (max 48 items visible) with name + ID | `max-h-48 overflow-y-auto` |
| Selected Chip | Selected entity shown as chip with clear button | Inline display with X |
| No Results State | "No results found" message when search yields nothing | Translated text |
| Model Resolution | Field key mapped to Odoo model (18 known models + fallback) | `fieldKeyToModel()` |
| Outside Click | Dropdown closes on click outside | `mousedown` event listener |

### Known Model Mappings

| Field Key | Odoo Model |
|-----------|------------|
| `partner_id` | `res.partner` |
| `product_id` | `product.product` |
| `product_tmpl_id` | `product.template` |
| `account_id` | `account.account` |
| `journal_id` | `account.journal` |
| `user_id` | `res.users` |
| `company_id` | `res.company` |
| `currency_id` | `res.currency` |
| `warehouse_id` | `stock.warehouse` |
| `location_id` | `stock.location` |
| `tax_id` | `account.tax` |
| `pricelist_id` | `product.pricelist` |
| `payment_term_id` | `account.payment.term` |
| `analytic_account_id` | `account.analytic.account` |
| `team_id` | `crm.team` |
| `category_id` | `res.partner.category` |
| `country_id` | `res.country` |
| `state_id` | `res.country.state` |

---

## 21. Visual Diffing System 🆕

### What it does
Provides clear visual feedback showing which action proposal fields have been manually edited by the user versus the AI/OCR suggestion, building confidence before confirming write operations.

### Capabilities

| Capability | Description | Implementation |
|-----------|-------------|----------------|
| Immutable Original Ref | `initialValsRef` (useRef) stores original backend/OCR values — never mutated | `useRef<Record<string, unknown>>` |
| Deep Value Comparison | `valuesEqual()` handles primitives, arrays, numbers, dates, null | Standalone utility function |
| `isFieldDirty(field)` | Returns `true` if current value differs from original | `useCallback` with `editedVals` dependency |
| Reversible Dirty State | Restoring original value removes dirty indicator (no phantom edits) | Comparison-based, not flag-based |
| Dirty Count Badge | Header pill shows total number of modified fields | `dirtyCount` computed from `isFieldDirty` |
| Green Row Highlight | Dirty field row gets emerald background + border (animated) | `motion.div` with `animate` prop |
| Pencil Indicator Dot | Tiny emerald circle with pencil icon on top-left corner of dirty field | `AnimatePresence` + scale transition |
| Green Text | Dirty field value rendered in emerald green with font-weight 600 | `motion.span` with animated color |
| Green Input Border | Edit inputs for dirty fields use `border-emerald-500/50` | `dirtyInputClass` conditional |
| Green Input Background | Edit inputs for dirty fields use `bg-emerald-50/30` / `dark:bg-emerald-950/20` | Light/dark theme support |
| Original Value Tooltip | Hover over dirty field shows "Original suggestion: [value]" | `AnimatePresence` tooltip |
| Smooth Transitions | All dirty state changes animate over 0.25s with easeInOut | `dirtyTransition` constant |

### Deep Comparison Logic (`valuesEqual`)

| Type Case | Handling |
|-----------|----------|
| Same reference (`a === b`) | Equal |
| Both null/undefined | Equal |
| One null, one not | Not equal |
| Arrays (many2one tuples) | Element-by-element recursive comparison |
| Numbers (cross-type) | `Number(a) === Number(b)` (handles `"100"` vs `100`) |
| Date strings | Normalize to `YYYY-MM-DD` before comparing (ignores time component) |
| Fallback | `String(a) === String(b)` |

### Visual States

```
┌─ Normal field (not dirty) ─────────────────────────┐
│  Partner      Azure Interior                    ✏️  │
│  (transparent border, transparent bg, normal text)  │
└─────────────────────────────────────────────────────┘

┌─ Dirty field (user edited) ────────────────────────┐
│🟢Partner      Gemini Furniture (green, bold)    ✏️  │
│  (green border, green bg tint, pencil dot)          │
│  ┌ tooltip on hover ──────────────────────────┐     │
│  │ Original suggestion: Azure Interior        │     │
│  └────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────┘
```

### Animation Timeline

| Event | Animation | Duration |
|-------|-----------|----------|
| Field becomes dirty | Background + border fade to green | 0.25s easeInOut |
| Pencil dot appears | Scale from 0 → 1 + fade in | 0.25s easeInOut |
| Dirty count badge appears | Scale from 0.8 → 1 + fade in | 0.25s easeInOut |
| Text color changes | Smooth transition to emerald | 0.25s easeInOut |
| Tooltip on hover | Fade in + slide up 4px | 0.15s |
| Field reverts to original | All green effects reverse-animate out | 0.25s easeInOut |

---

## 22. Observations & Potential Improvements

The following items are **observations only** - not changes to implement now. They serve as context for planning future phases.

### Functional Gaps

| Area | Observation | Impact | Status |
|------|------------|--------|--------|
| ~~Chat Persistence~~ | ~~Chat history is in-memory only; lost on page refresh~~ | ~~Users lose conversations~~ | ✅ Resolved in Phase 9 |
| Chat Deletion | No way to delete a conversation from history | History grows unbounded | Open |
| Chat Rename | Titles auto-generated, not editable | Organization limited | Open |
| Chat Search | No search across conversation history | Hard to find past queries | Open |
| Chat Export | No way to export a conversation as text/PDF | No offline record | Open |
| Pagination | No pagination for long histories or message lists | Performance risk | Open |

### Configuration

| Area | Observation | Impact |
|------|------------|--------|
| API Base URL | Hardcoded to `localhost:8000` in `api.ts` | Not configurable via env vars |

### Performance

| Area | Observation | Impact |
|------|------------|--------|
| Message Virtualization | All messages render in DOM regardless of count | Slow with very long chats |
| Chart Memoization | Charts may re-render on parent state changes | Unnecessary recomputes |
| Notification Polling | 30s polling could be replaced with SSE/WebSocket | More efficient real-time |

### Code Quality

| Area | Observation | Impact |
|------|------------|--------|
| Test Coverage | No test files found in the project | No automated safety net |
| Error Boundaries | No React error boundaries | Crash propagation risk |
| SSE Retry | No automatic reconnection on stream failure | User must manually retry |

### Security

| Area | Observation | Impact |
|------|------------|--------|
| Credential Storage | API key stored in localStorage (plaintext) | Visible in devtools |
| CSP Headers | No Content Security Policy configured | XSS attack surface |

### Accessibility

| Area | Observation | Impact |
|------|------------|--------|
| ARIA Labels | Some interactive elements lack ARIA attributes | Screen reader gaps |
| Keyboard Navigation | No keyboard shortcuts for common actions | Power user efficiency |
| Focus Management | Modals don't trap focus | Tab navigation escapes |

---

## Summary Statistics

| Metric | Phase 8 | Phase 9 | Delta |
|--------|---------|---------|-------|
| Total Source Files | ~52 | ~55 | +3 |
| React Components | 28 | 31 | +3 |
| Custom Hooks | 7 | 7 | — |
| Pages | 5 | 5 | — |
| Languages | 5 | 5 | — |
| Translation Keys | ~126 per language | ~139 per language | +13 |
| Translation Namespaces | 11 | 13 | +2 |
| API Endpoints Consumed | 13 | 15 | +2 |
| SSE Event Types | 5 + DONE | 5 + DONE | — |
| Pin Types | 3 (chart, file, excel) | 3 (chart, file, excel) | — |
| Chart Types | 3 (bar, line, pie) | 3 (bar, line, pie) | — |
| Action Types | 4 (create, update, method_call, report) | 4 (create, update, method_call, report) | — |
| Notification Categories | 4 (sales, stock, invoices, general) | 4 (sales, stock, invoices, general) | — |
| Severity Levels | 4 (critical, warning, info, success) | 4 (critical, warning, info, success) | — |
| Context Providers | 6 (nested) | 6 (nested) | — |
| Editable Field Types | 0 | 5 (entity, number, date, boolean, text) | +5 |
| Known Odoo Model Mappings | 0 | 18 | +18 |
| Framer Motion Animations | 10 | 16 | +6 |

### 🆕 New Components (Phase 9)

| Component | File | Purpose |
|-----------|------|---------|
| `WelcomeDashboard` | `components/chat/welcome-dashboard.tsx` | Onboarding suggestions in empty chats |
| `EntityAutocomplete` | `components/chat/entity-autocomplete.tsx` | Searchable dropdown for relational fields |
| `FieldInput` | `components/chat/action-proposal-button.tsx` (internal) | Dynamic input renderer by field type |

### 🆕 New API Functions (Phase 9)

| Function | Endpoint | Purpose |
|----------|----------|---------|
| `fetchChatHistory` | `GET /chat/{id}/history` | Recover persisted messages |
| `searchEntities` | `POST /chat/{id}/search` | Odoo `name_search` autocomplete |

---

*Document updated as part of Phase 9 review. Use as baseline for Phase 10+ feature planning.*
