# Plan — Página "Manual técnico para implementadores" (frontend)

> **Para quién es este documento:** para el Claude Code que trabaja en `odoo-agent-front`. Es un
> brief de contenido + intención de producto, NO un diff de código. Vos (el agente del front)
> decidís la implementación real — ruta, componentes, estilo — siguiendo `odoo-agent-front/CLAUDE.md`
> y `DESIGN_GUIDELINES.md` (skill `design-refactor`). Este documento no asume nada sobre el árbol de
> archivos del front más allá de lo que se aclara explícitamente.

## 1. Qué hay que construir y para qué

Una página (o sección) dentro de `odoo-agent-front` dirigida a **implementadores de Odoo** —
consultoras y freelancers que instalan/mantienen Odoo para sus clientes y a quienes les queremos
vender u ofrecer en reventa el agente ("Odoo Agent" / "TheOdooAgent"). No es documentación para el
usuario final del chat; es una ficha técnico-comercial para alguien que evalúa si esto le sirve a
sus clientes y qué tan sólido es por dentro.

Objetivo de negocio: que el implementador entienda **rápido y en su idioma técnico** (a) qué partes
de Odoo cubre el agente hoy y con qué profundidad, (b) por qué es seguro conectarlo a instancias
productivas de sus clientes, y (c) que sienta que puede **influir en el roadmap** — la sección de
roadmap debe leerse como un menú abierto, no como una promesa cerrada, e idealmente termina en algún
tipo de CTA para que dejen su opinión (puede ser tan simple como un mailto o el mecanismo de
contacto/feedback que ya exista en el front — no hace falta construir infraestructura nueva de
votación).

Todo el contenido de abajo está verificado contra el código y docs reales del backend
(`odoo-agent-back/CLAUDE.md` + `odoo-agent-back/instructions/ROADMAP.md`) a fecha 2026-07-29. **El
detalle de escritura por dominio (Bloque A) además se verificó grepeando el código real de
`odoo_action_executor`, `query_planner` y `prepare_metadata`**, no solo la descripción de alto nivel
del CLAUDE.md — la cobertura real es más despareja de lo que un resumen a nivel dominio sugiere (ver
nota al final de Bloque A). Si al implementar pasa mucho tiempo, vale la pena pedirle a alguien que lo
re-verifique contra el backend antes de publicar — este doc es un snapshot, no una fuente viva.

### Relación con los drawers existentes (IntroPanel / HowItWorksPanel)

Ya existen dos superficies que tocan claims parecidos: `IntroPanel` ("¿qué es?", sabor partner) y
`HowItWorksPanel` (sabor Client, con chips de ejemplo tipo "Crear contacto: María López"). Esta página
es una tercera superficie, más profunda — para evitar que los claims de seguridad/capacidad diverjan
en 3 lugares, la relación debe ser:

- Los drawers quedan como el pitch corto **in-flow** (lo que ya son) — no hace falta reescribirlos
  ahora, pero si tienen párrafos largos de seguridad que se solapan con el Bloque B de abajo, la idea
  a mediano plazo es recortarlos a 1-2 líneas + un link "ver más" que apunte a esta página, en vez de
  mantener 3 copias del mismo claim.
- Esta página es el **deep-link**: se abre desde el bloque partner del drawer (o desde donde el front
  considere más natural — footer, sección "para implementadores", etc.) y es la fuente canónica del
  detalle técnico. Si hay conflicto de redacción entre un drawer y esta página, esta página gana
  (tiene el detalle verificado contra código).
- El chip "Crear contacto: María López" de `HowItWorksPanel` es consistente con lo que dice el Bloque
  A de abajo (crear/editar `res.partner` está confirmado) — no hay contradicción ahí, solo hay que
  cuidar que el resto de los ejemplos que se agreguen en cualquiera de las 3 superficies respeten la
  tabla de escritura real del Bloque A y no generalicen de más.

Nivel de detalle: **técnico-comercial**. Nombrá mecanismos y modelos reales (Fernet, XML-RPC,
LangGraph, `res.partner`, `account.move`...) porque el lector es técnico, pero NO expongas nombres
de archivos internos, funciones, ni jerga de implementación del repo (eso es para el equipo, no para
un partner externo).

## 2. Estructura de contenido (3 bloques)

### Bloque A — Cobertura funcional por dominio de Odoo

Mensaje central: el agente no es un chatbot genérico sobre Odoo — tiene un motor determinístico
(keywords + reglas, no LLM libre) que sabe **exactamente** qué modelos y campos tocar por dominio.

Por cada dominio, comunicar: modelos que toca, profundidad de lectura, y qué acciones de escritura
están **confirmadas** (ver nota de escritura al final de este bloque — es importante seguirla al
pie de la letra, porque la escritura NO es pareja ni siquiera dentro de un mismo dominio).

- **Ventas / CRM** — `sale.order`, `sale.order.line`, `crm.lead`, `res.users` (vendedores),
  `mail.activity` (llamadas/reuniones). Lectura: conteos, rankings ("los 5 productos más vendidos"),
  agregaciones agrupadas por vendedor/equipo/categoría/mes, filtros por fecha (incl. "fecha de
  cierre" de oportunidades), filtro por vendedor/cliente nombrado con desambiguación cuando hay
  coincidencias múltiples. Métricas propias de CRM: tasa de conversión (win rate) y pipeline
  ponderado por probabilidad, calculadas en el backend (nunca por el LLM). Soporta "mis
  oportunidades" (auto-filtro por el usuario logueado). **Escritura confirmada** (siempre como
  propuesta a confirmar, ver Bloque B): sobre pedidos de venta — crear, editar, confirmar, cancelar,
  enviar por email; sobre oportunidades — cambiar de etapa, marcar ganada/perdida (con motivo),
  asignar vendedor, convertir un lead a oportunidad; agendar una llamada o reunión. (Crear una
  oportunidad nueva desde cero por chat todavía no está confirmado end-to-end — no ofrecerlo como
  capacidad hoy.)
- **Finanzas** — `account.move` (facturas/notas de crédito), `account.payment`,
  `account.bank.statement`. Lectura: filtros de estado (vencidas, pagadas, parciales, a cobrar, a
  pagar), antigüedad de cobros en tramos de mora (30/60/90+ días, calculada en Python — no depende de
  módulos de Enterprise), reportes en PDF y Excel con totales. **Escritura confirmada**: sobre
  facturas — crear, editar, validar, cancelar, enviar por email.
- **Inventario / Compras** — `product.product`, `product.template`, `purchase.order`,
  `purchase.order.line`, `stock.picking`. Lectura: filtro por disponibilidad de stock, ordenamiento
  por precio o stock, catálogo con precio y existencia. **Escritura confirmada**: sobre productos del
  catálogo — crear, editar; sobre órdenes de compra y remitos YA EXISTENTES — acciones de flujo
  (confirmar, cancelar, validar, enviar). (Dar de alta una orden de compra nueva desde cero por chat
  todavía no está confirmado end-to-end — no ofrecerlo como capacidad hoy.)
- **Contactos** — `res.partner`. Lectura: distingue clientes/proveedores/empresas/personas, búsqueda
  de nombre tolerante a acentos y mayúsculas, y para listados amplios ofrece filtrar por tipo antes
  de tirar todo el padrón. **Escritura confirmada**: crear y editar contactos, con clasificación
  automática (cliente/proveedor/empresa/solo contacto) resuelta con una pregunta corta cuando hace
  falta.
- **RRHH** — `hr.employee`, `hr.payslip`, `hr.payslip.line`. Legajo/roster con columnas que se
  ajustan solas a lo que la instancia realmente tiene cargado (no muestra columnas vacías). **Solo
  lectura por ahora** — no hay escritura confirmada en este dominio; no listar ninguna acción de
  escritura para RRHH.
- **Proyectos** — `project.project`, `project.task`, `account.analytic.line` (horas/timesheets).
  Lectura profunda sobre tareas, proyectos y horas cargadas. Acciones de flujo confirmadas sobre
  tareas ya existentes (ej. marcarla como hecha); dar de alta proyectos o tareas nuevas desde cero
  por chat todavía no está confirmado end-to-end — no ofrecerlo como capacidad hoy.

**Nota de escritura — importante:** no uses un badge binario "lectura / escritura" por dominio. La
escritura real es pareja de facturas y pedidos de venta (crear+editar+acciones), parcial en
inventario/compras (creación de productos sí, alta de órdenes de compra nuevas no todavía), y
ausente en RRHH. Preferí, para cada dominio, listar las 2-4 acciones de escritura concretas que sí
están confirmadas (o directamente "por ahora, solo lectura" cuando no hay ninguna) en vez de un
badge genérico — un badge "escritura ✓" en Inventario, por ejemplo, sería engañoso porque no cubre
alta de órdenes de compra.

Capacidades transversales a destacar (aplican a todos los dominios):

- **Conversación con memoria real**: entiende referencias a la respuesta anterior ("¿y en marzo?",
  "las vencidas de esas", "dale, seguí") sin que el usuario repita la consulta completa.
- **Multi-idioma**: el motor de conversación entiende y responde en español, inglés, francés, alemán,
  portugués e italiano. La interfaz (UI) soporta además hindi, gujarati, tamil, kannada y marathi (11
  idiomas en total en la interfaz).
- **Reportes**: cualquier resultado se puede pedir como PDF o Excel, incluidos reportes agrupados
  (por vendedor, por mes, etc.) con fila de totales.
- **Se adapta a instancias reales, no a una instancia ideal**: detecta automáticamente edición
  (Community/Enterprise/OCA) y versión de Odoo (14 a 19), y si el usuario pide algo que ese módulo/
  campo no tiene instalado, lo dice explícitamente en vez de inventar una respuesta.
- **Aprende el vocabulario propio del cliente sin configuración manual**: si el implementador tiene
  módulos propios o de OCA, o campos de Studio, el agente puede aprender a responder consultas sobre
  esos modelos leyendo los menús y vistas que Odoo ya tiene (nombres, reglas de negocio declaradas en
  los filtros de búsqueda) — sin que nadie le enseñe nada a mano. Este es un diferencial fuerte:
  vale la pena una mención destacada, tipo "tu ERP a medida, el agente lo entiende solo".

### Bloque B — Ficha técnica de seguridad y arquitectura

Mensaje central: esto está pensado para conectarse a instancias productivas de terceros con cuidado
real, no como un demo. Framing recomendado: "por qué un implementador puede confiar en conectar esto
a la instancia de un cliente".

- **Credenciales de Odoo cifradas, nunca en texto plano**: cada API key de Odoo se guarda cifrada
  con **Fernet** (cifrado simétrico autenticado); ni en la base ni en logs queda la clave legible.
- **Credenciales por usuario, no compartidas**: cada persona se conecta con su propio usuario/API key
  de Odoo — el agente respeta los permisos que ya existen en Odoo para esa persona, no usa una
  credencial "todopoderosa" compartida por toda la organización.
- **Autenticación por token (JWT)** en cada request a la API, con verificación criptográfica de
  firma (JWKS).
- **Aislamiento multi-tenant real**: cada organización y cada conversación están aislados por
  identificador propio; hay controles explícitos para que un usuario autenticado no pueda leer el
  historial o los datos de otra organización u otro usuario simplemente adivinando un ID.
- **Modo solo-lectura para sesiones de soporte**: cuando alguien de soporte necesita mirar una
  instancia para diagnosticar un problema, existe un modo que bloquea CUALQUIER método de Odoo que no
  esté explícitamente permitido (lista blanca, no lista negra) — pensado para que ni un error humano
  ni un bug puedan terminar escribiendo algo en la base del cliente durante una sesión de soporte.
- **Protección contra URLs internas (SSRF)**: cuando un usuario conecta una instancia propia, el
  sistema verifica que la URL apunte a una dirección pública real antes de intentar conectarse —
  rechaza direcciones internas/privadas para que nadie pueda usar el conector como puerta de entrada
  a la red interna de otro.
- **Nada se ejecuta sin confirmación humana**: esto aplica parejo a TODA operación de escritura que
  el sistema soporta hoy en cualquier dominio (ver Bloque A para el detalle de qué está confirmado en
  cada uno) — no hay una categoría de "escritura sin confirmar" en ningún lado. Lo que varía entre
  dominios es CUÁNTAS acciones de escritura existen todavía, nunca cuán seguras son: para cualquier
  operación (crear/editar un registro, cambiar un estado, etc.) el agente arma una propuesta y la
  persona la tiene que confirmar explícitamente antes de que se ejecute contra Odoo. El agente nunca
  escribe "por su cuenta".
  Sistema de reglas primero, IA al final: la clasificación de qué se está pidiendo se resuelve con
  reglas determinísticas; el modelo de lenguaje entra recién al final, para redactar la respuesta —
  nunca para decidir qué escribir en Odoo ni para hacer cuentas (los totales y cálculos los hace el
  backend, no la IA, para evitar que un modelo "invente" un número).
- **Timeouts de red**: cada llamada a Odoo tiene un límite de tiempo — si una instancia se cuelga, no
  se cuelga el agente con ella.
- **Errores nunca exponen detalles internos**: si algo falla, el usuario ve un mensaje neutro; el
  detalle técnico queda solo en logs del lado del servidor.

### Bloque C — Roadmap como menú abierto (para pedir feedback, no para prometer)

Encabezado sugerido: algo como *"Esto es lo que estamos evaluando construir después — decinos qué te
serviría más a vos y a tus clientes"*. Formato sugerido: lista corta, sin fechas ni compromisos,
invitando comentario.

Traducción a lenguaje de negocio de los frentes reales hoy abiertos (fuente:
`odoo-agent-back/instructions/ROADMAP.md`, sección "Next"):

- Ampliar el catálogo de preguntas que el agente puede responder por dominio (por ejemplo: márgenes
  por producto, categorías vía líneas de compra, país/geografía, etiquetas, almacenes en remitos).
- Reconocimiento más profundo de instancias con módulos propios/OCA — hoy ya "aprende solo" el
  vocabulario de módulos custom (ver Bloque A); el siguiente paso es sumarle más matices de filtro y
  reglas de negocio propias.
- Corrección de errores de tipeo más amplia en más tipos de consulta (hoy ya funciona para fechas,
  estados y tipo de consulta).
- Trazabilidad más fina para diagnóstico técnico (tiempos de respuesta por llamada a Odoo, no solo
  por paso del agente).
- Indicadores de progreso en tiempo real para operaciones que tardan (conectando / ejecutando / en
  cola / validando).
- Ampliar las pruebas automatizadas sobre la capa de administración y facturación del propio
  producto (no afecta a los tenants, es robustez interna).

**No copiar la lista de arriba palabra por palabra sin adaptarla** — está en tono de nota interna;
en la página debería sonar a invitación real a opinar, no a changelog técnico. Si el front tiene ya
un mecanismo de feedback/contacto (formulario, mailto, Slack, etc.), enganchar el CTA ahí en vez de
crear uno nuevo.

## 3. Qué NO incluir

- No mencionar nombres de archivos, funciones, variables de entorno individuales, ni detalles de
  testing/CI — eso es contexto interno del repo, no para un partner externo.
- No prometer fechas de entrega para nada del Bloque C.
- No exponer que las claves de Odoo del implementador quedan en la misma base que las de otros
  tenants (aunque sea cierto y esté aislado correctamente) — foco en el aislamiento y el cifrado, no
  en la topología interna de la base de datos.

## 4. Notas de implementación para el front

- Es contenido mayormente estático (no depende de datos en vivo del backend) — no debería requerir
  nuevas llamadas a `lib/api.ts` ni tipos nuevos en `lib/types.ts`.
- Decidí vos dónde vive esta página según las convenciones ya existentes del front (grupo de rutas,
  si hay una zona pública/marketing separada de `(app)`, etc.) y si conviene i18n completo (11
  locales) desde el día uno o arrancar solo en español e inglés e ir sumando — juicio tuyo según
  cuánto cuesta mantenerlo.
- Seguí `DESIGN_GUIDELINES.md` (skill `design-refactor`) para el estilo visual — este documento solo
  fija el contenido y el tono, no el diseño.
