# Odoo Agent Front

> Frontend conversacional estilo ChatGPT para interactuar con Odoo ERP mediante un agente de IA

[![Next.js](https://img.shields.io/badge/Next.js-16.1-000000.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4.svg)](https://tailwindcss.com/)
[![next-intl](https://img.shields.io/badge/next--intl-4.8-blue.svg)](https://next-intl.dev/)

## 📋 Descripcion

Interfaz moderna y responsive que permite a los usuarios consultar datos de su instancia de Odoo (inventario, facturas, ventas, empleados) usando lenguaje natural a traves de un chat con IA. Principales funcionalidades:

- 💬 Chat en tiempo real con streaming SSE
- 🤖 Respuestas con formato Markdown enriquecido
- 💡 Sugerencias predefinidas para empezar a consultar rapidamente
- 📂 Historial de conversaciones agrupado por fecha (hoy, ayer, ultimos 7 dias)
- 🔗 Configuracion y validacion de conexion a Odoo
- 🌐 Soporte multilingue (Espanol, Ingles, Frances, Aleman, Portugues)
- 🌙 Modo claro / oscuro
- 📱 Sidebar colapsable y responsive (mobile-friendly)
- 💳 Pagina de planes y precios (Free, Pro, Enterprise)

## 🏗️ Arquitectura

### Stack Tecnologico

**Core:**
- **Next.js 16** - Framework React con App Router
- **React 19** - Libreria de UI
- **TypeScript 5** - Tipado estatico

**Styling & UI:**
- **Tailwind CSS v4** - Utilidades CSS (config via `@theme`)
- **Framer Motion** - Animaciones y transiciones fluidas
- **Lucide React** - Libreria de iconos

**Internacionalizacion:**
- **next-intl** - Routing por locale, 5 idiomas soportados

**Rendering:**
- **react-markdown** - Renderizado de Markdown en respuestas del agente

### Estructura del Proyecto

```
app/
  [locale]/
    layout.tsx                  # Layout raiz con i18n y providers
    chat/page.tsx               # Nueva consulta (sugerencias + input)
    chat/[id]/page.tsx          # Conversacion con streaming SSE
    pricing/page.tsx            # Planes de suscripcion
    settings/page.tsx           # Configuracion de conexion Odoo
components/
  app-shell.tsx                 # Wrapper con ChatContext global
  chat/
    sidebar.tsx                 # Sidebar colapsable + historial
    chat-messages.tsx           # Burbujas de mensajes con Markdown
    chat-input.tsx              # Input con auto-resize
  pricing/pricing-cards.tsx     # Cards de planes (Free, Pro, Enterprise)
  odoo/connection-form.tsx      # Formulario de credenciales Odoo
  locale-switcher.tsx           # Selector de idioma
hooks/
  use-chat.ts                   # Estado de chats + streaming SSE
  use-odoo-config.tsx           # Contexto de config Odoo (localStorage)
lib/
  api.ts                        # Integracion con backend
  types.ts                      # Interfaces TypeScript
i18n/                           # Routing, request config, navigation
messages/                       # Traducciones (es, en, fr, de, pt)
proxy.ts                        # Middleware de deteccion de locale
```

## ⚡ Flujo de Comunicacion

```
┌─────────────┐     POST /chat/{id}/stream      ┌─────────────────┐
│             │  ──────────────────────────────►  │                 │
│   Frontend  │     { message, odoo_config }      │     Backend     │
│  (Next.js)  │                                   │  (FastAPI/SSE)  │
│             │  ◄──────────────────────────────  │                 │
└─────────────┘     text/event-stream (SSE)       └─────────────────┘
                    chunks en tiempo real
```

**Endpoints consumidos:**

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| `POST` | `/chat/{id}/stream` | Envio de mensaje + recepcion SSE |
| `POST` | `/test-connection` | Validacion de credenciales Odoo |

## 🚀 Setup

### Requisitos

- **Node.js 18+**
- Backend corriendo en `http://localhost:8000` ([odoo-agent-back](../odoo-agent-back))

### Instalacion

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Abrir `http://localhost:3000` → redirige automaticamente a `/es/chat`.

### Scripts Disponibles

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (hot reload) |
| `npm run build` | Build de produccion |
| `npm run start` | Servidor de produccion |
| `npm run lint` | Linting con ESLint |

## 🎨 Temas y Diseno

El sistema de colores soporta **modo claro y oscuro** con variables CSS:

| Token | Light | Dark |
|-------|-------|------|
| Primary | `#6d28d9` (violeta) | `#8b5cf6` (violeta claro) |
| Background | `#ffffff` | `#0c0a14` |
| Card | `#ffffff` | `#1a1625` |
| Sidebar | `#f8fafc` | `#110e1c` |

## 🌐 Idiomas Soportados

| Codigo | Idioma |
|--------|--------|
| `es` | Espanol (default) |
| `en` | English |
| `fr` | Francais |
| `de` | Deutsch |
| `pt` | Portugues |

Las traducciones se encuentran en `messages/[locale].json` con **126 claves** por idioma.
