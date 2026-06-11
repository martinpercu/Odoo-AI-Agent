# TheOdooAgent — Capacidades del Sistema
### Documento para el equipo de marketing

> Este documento describe con precisión qué hace el producto, para quién, y cómo se diferencia. Está escrito en lenguaje de negocio, sin tecnicismos innecesarios. Es el punto de partida para construir el discurso comercial.

---

## Qué es TheOdooAgent

TheOdooAgent es una interfaz conversacional de inteligencia artificial que se conecta a cualquier instancia de Odoo y permite a los usuarios consultar, analizar y operar su ERP usando lenguaje natural — del mismo modo en que uno le hablaría a un asistente.

El usuario escribe (o dictaría) preguntas como:

- *"¿Cuántas facturas vencidas tenemos esta semana?"*
- *"Mostrá las ventas por cliente del mes pasado en un gráfico"*
- *"Creá un contacto nuevo: Juan Pérez, juan@empresa.com"*
- *"Confirmá la orden SO-0042"*

Y el sistema responde en tiempo real, con texto, tablas, gráficos interactivos, archivos Excel o PDFs — según lo que la consulta requiera.

No es un chatbot de FAQ. Es un agente que realmente lee y escribe datos en Odoo.

---

## Para quién es

El producto tiene dos perfiles de cliente claramente definidos:

### 1. Partners de Odoo (clientes directos del producto)

Son los implementadores: consultoras, integradores y desarrolladores que trabajan con múltiples empresas clientes. Ellos contratan TheOdooAgent como una herramienta que agregan a sus propias implementaciones.

**Qué buscan:**
- Reducir el tiempo que sus clientes necesitan soporte para consultas operativas de Odoo
- Ofrecer una experiencia más moderna y accesible a sus clientes finales
- Diferenciar su propuesta frente a otros implementadores

**Cómo acceden:** Plan Implementor (desde $100/mes). Tienen acceso multi-cliente: una sola cuenta gestiona múltiples empresas (instancias de Odoo) con usuarios propios.

### 2. Empresas que usan Odoo directamente (usuarios finales, o vía partner)

Son los usuarios del día a día: gerentes, contadores, vendedores, coordinadores de stock. No son técnicos. Necesitan información de su Odoo sin depender del área de IT ni aprender a navegar formularios complejos.

**Qué buscan:**
- Consultar ventas, facturas, inventario o contactos sin saber usar Odoo
- Recibir gráficos y resúmenes listos para tomar decisiones
- Ejecutar operaciones simples (crear contactos, confirmar pedidos) desde un chat

**Cómo acceden:** A través del partner que los implementó, con usuarios propios dentro de la plataforma.

---

## Qué hace el sistema — capacidades concretas

### Consultas en lenguaje natural

El usuario hace preguntas en español, inglés, francés, alemán, portugués, italiano, hindi y otros idiomas. El sistema interpreta la intención, consulta Odoo y responde con los datos reales.

Ejemplos de lo que el sistema puede resolver:

| Pregunta del usuario | Qué hace el sistema |
|---|---|
| "¿Cuántas ventas tuvimos esta semana?" | Cuenta los pedidos en Odoo y responde con el número |
| "Mostrá las facturas vencidas de más de $10.000" | Lista los registros filtrados, con los datos clave |
| "¿Cuál fue el top 5 de clientes por ingresos este año?" | Agrega datos en Odoo y muestra el ranking |
| "¿Hay stock del producto X?" | Consulta el inventario y responde con disponibilidad |
| "¿Tiene deuda el cliente Acme Corp?" | Verifica facturas impagas y responde con el monto |

El sistema entiende referencias implícitas: si el usuario pregunta "¿y cuánto suma en total?" después de una consulta, entiende que se refiere a los mismos datos de antes.

### Gráficos interactivos

Cuando la respuesta implica una comparación o un desglose, el sistema genera automáticamente un gráfico dentro del chat:

- **Barras:** para comparar grupos (ventas por cliente, facturas por estado, etc.)
- **Torta:** para proporciones (distribución de ventas por categoría)
- **Línea:** para tendencias en el tiempo (ingresos por mes, semana, etc.)

Los gráficos tienen tooltips interactivos y muestran totales y agrupaciones en el pie.

### Exportación a Excel y PDF

Cualquier resultado con datos puede exportarse:

- **Excel:** con formato profesional, moneda nativa (el sistema detecta si la instancia usa USD, EUR, ARS, PYG, etc.), encabezados traducidos al idioma del usuario, y fila de totales.
- **PDF:** el sistema puede generar y descargar reportes estándar de Odoo (facturas, pedidos, etc.) directamente desde el chat.

### Escritura en Odoo con confirmación humana

El sistema no solo lee datos — también puede crear y actualizar registros. Pero **nunca ejecuta una operación de escritura sin confirmación explícita del usuario**.

El flujo es:

1. El usuario pide: *"Creá un contacto: María López, maria@acme.com"*
2. El agente muestra una tarjeta con los datos que va a ingresar y botones de Confirmar / Cancelar
3. El usuario puede editar cualquier campo antes de confirmar
4. El usuario confirma → el registro se crea en Odoo
5. El sistema muestra una confirmación con el número de registro

Esto aplica a:
- Crear contactos, clientes, productos
- Actualizar registros existentes (email, dirección, precio, estado)
- Ejecutar métodos de negocio (confirmar un pedido, aprobar una compra, cancelar una factura)
- Generar reportes PDF

**Este "gate" de confirmación es una decisión de diseño central**: protege al usuario de errores y genera confianza en el sistema.

### Lectura de imágenes (OCR de facturas)

El usuario puede subir una imagen de una factura o recibo. El sistema la analiza, extrae los datos relevantes (proveedor, fecha, total, CUIT/RUC/VAT, referencia de factura) y propone crear el registro en Odoo — con el mismo flujo de confirmación.

Esto es especialmente valioso para usuarios que reciben facturas en papel o como imágenes JPG/PNG.

### Panel de insights fijos

El usuario puede "fijar" cualquier gráfico o archivo a un panel lateral derecho permanente. Ese panel funciona como un dashboard personalizado que persiste entre conversaciones.

Los gráficos fijados se dividen en dos categorías:
- **Gráficos en vivo:** pueden actualizarse con un clic — el sistema re-consulta Odoo y devuelve datos frescos
- **Gráficos históricos (punto en el tiempo):** quedan guardados como snapshot

Esto permite que el usuario tenga sus KPIs favoritos siempre a mano, sin repetir la consulta.

### Alertas proactivas

El sistema monitorea la instancia de Odoo en segundo plano y genera alertas automáticas cuando detecta anomalías. No requiere que el usuario pregunte — el sistema avisa solo.

Ejemplos de alertas:
- *"Las ventas de hoy están 30% por debajo del promedio de los últimos 7 días"*
- *"La cantidad de facturas vencidas aumentó significativamente"*
- *"CRM: los leads nuevos están muy por debajo del promedio semanal"*

Las alertas aparecen en un feed dentro de la aplicación. Cada alerta puede convertirse en una consulta: el usuario hace clic y el sistema abre automáticamente una conversación con el contexto de esa alerta.

### Historial de conversaciones

El sistema guarda el historial completo de cada conversación. El usuario puede retomar cualquier chat anterior y continuar desde donde dejó, con todo el contexto preservado.

---

## Experiencia diferenciada según el rol

El sistema tiene dos modos de interfaz que coexisten en la misma plataforma:

### Para implementadores y admins (modo "Builder")

- La interfaz muestra información técnica: nombres de modelos de Odoo, IDs de registros, tipo de acción ejecutada
- Acceso completo al panel de administración: configurar conexiones a Odoo, gestionar usuarios, ver reportes de feedback, manejar invitaciones
- Panel de trazabilidad del agente: muestra qué nodos del pipeline se ejecutaron en cada respuesta (útil para debugging)
- Pueden ver el precio del plan actual y acceder a la gestión de facturación

### Para usuarios finales (modo "Client")

- La interfaz usa lenguaje natural y amigable, sin jerga técnica
- Los números de documento se muestran como pastillas visuales (ej: "Factura #42"), no como IDs técnicos
- Los mensajes de confirmación y éxito usan frases como "Tu pedido quedó confirmado" en lugar de "method_call successful"
- El pie de la pantalla muestra "Powered by TheOdooAgent" de forma discreta (el partner puede estar en primer plano)
- No ven configuración técnica ni herramientas de admin

Esta distinción no es cosmética: está construida en toda la capa de lenguaje del sistema. El mismo agente habla distinto según con quién habla.

---

## Idiomas soportados

El sistema está disponible en 11 idiomas: español, inglés, francés, alemán, portugués, italiano, hindi, gujarati, tamil, kannada y marathi.

El usuario puede cambiar de idioma en cualquier momento desde el menú lateral. El agente responde automáticamente en el idioma de la conversación. Los Excel exportados también adaptan sus encabezados y metadatos al idioma del usuario.

---

## Modelo de negocio y estructura de cuentas

### Tipos de organización

**Partner (multi-cliente)**
- Una organización que gestiona múltiples instancias de Odoo de diferentes empresas
- Puede tener múltiples conexiones de Odoo configuradas
- Puede invitar usuarios a cada conexión por separado
- Puede pre-configurar credenciales para los usuarios antes de que acepten la invitación
- Ve el panel completo de gestión de usuarios y configuraciones

**Solitary (empresa única)**
- Una organización que usa solo su propia instancia de Odoo
- No puede agregar múltiples conexiones de Odoo
- La pantalla de usuarios muestra un banner de upgrade en lugar de herramientas de gestión de equipo

### Roles de usuario

| Rol | Qué puede hacer |
|---|---|
| **SuperAdmin** | Panel de control global: todas las organizaciones, feedback de todos los clientes, cambiar tipos de org, gestión cruzada |
| **Admin** | Gestiona su propia organización: conexiones de Odoo, usuarios, invitaciones, configuración |
| **Client User** | Solo usa el chat: consultas, gráficos, exportaciones, alertas, operaciones confirmadas |

### Planes de suscripción

| Plan | Precio orientativo | Para quién |
|---|---|---|
| Free | Sin costo | Evaluación |
| Starter | ~$50/mes | Empresa pequeña, uso básico |
| Implementor S | ~$100/mes | Partner con pocos clientes |
| Implementor M/L/XL/XXL | Desde $100/mes | Partners medianos y grandes |

Los planes Implementor están pensados para que un partner agregue el costo al valor de su implementación o lo cobre como servicio mensual a sus clientes.

### Gestión de asientos (seats)

Cada plan tiene un límite de usuarios pagos y usuarios gratuitos. El administrador puede:
- Invitar usuarios con asignación automática de asiento
- Cambiar un usuario de pago a gratuito (y viceversa)
- Cancelar invitaciones pendientes (libera el asiento inmediatamente)
- Ver en tiempo real cuántos asientos están usados vs disponibles

### Demo mode

El sistema puede activarse en modo demo para que visitantes sin cuenta puedan probar el agente con una instancia de Odoo de demostración — sin registrarse. Esto es útil para landing pages y demos de ventas.

---

## Seguridad y confiabilidad

- Las credenciales de Odoo (usuario y API key) se almacenan cifradas en la base de datos (cifrado Fernet)
- Cada organización vive aislada: el sistema garantiza que los datos de un cliente no son visibles para otro
- Toda operación de escritura requiere confirmación explícita del usuario — no hay automatismos que ejecuten cambios sin aprobación
- El sistema de autenticación usa Supabase JWT (estándar de la industria)
- La integración con Odoo usa XML-RPC con API key — el mismo protocolo que usan las integraciones oficiales de Odoo

---

## Lo que el sistema no es (para alinear expectativas)

- **No es un reemplazo de Odoo.** Es una interfaz adicional que se conecta encima. Odoo sigue siendo el sistema de registro.
- **No modifica la instalación de Odoo.** No requiere instalar ningún módulo en el ERP del cliente.
- **No funciona sin conexión.** Necesita conectarse a la instancia de Odoo para responder consultas reales.
- **No es 100% autónomo.** Las operaciones de escritura requieren que el usuario confirme. El sistema propone — el humano aprueba.
- **No cubre todos los módulos de Odoo.** Actualmente soporta: ventas, finanzas, inventario, contactos, RRHH y proyectos. La cobertura se puede ampliar.

---

## Diferenciadores clave para la conversación comercial

1. **Habla el idioma del cliente final:** el usuario no necesita aprender Odoo. Hace preguntas como hablaría con un colega.

2. **No ejecuta sin permiso:** la arquitectura de confirmación es un diferenciador de confianza. Los usuarios saben que el sistema no va a hacer cambios por error.

3. **Multi-tenant nativo:** un partner puede gestionar decenas de clientes desde una sola cuenta. No es un producto pensado para una sola empresa.

4. **Se adapta a quien lo usa:** el modo Builder y el modo Client no son configuraciones manuales — el sistema detecta el rol y ajusta el tono y la interfaz automáticamente.

5. **Datos reales, no simulaciones:** el agente consulta Odoo en tiempo real con cada pregunta. Los números que muestra son los mismos que en el ERP, con los mismos filtros y permisos.

6. **Alertas sin intervención:** el monitoreo proactivo detecta anomalías y avisa antes de que el problema escale. No requiere configuración de KPIs por parte del usuario.

7. **Panel de insights persistente:** los gráficos importantes se fijan y se pueden actualizar con un clic — sin repetir la consulta. Funciona como un mini-dashboard integrado en el chat.

8. **Integración sin customización de Odoo:** no requiere tocar la instalación del cliente. Se conecta via API key estándar. El proceso de onboarding es un formulario de 2 pasos.

---

## Proceso de onboarding (cómo empieza un cliente nuevo)

1. El admin se registra con email y contraseña
2. Completa el formulario de organización (nombre, slug)
3. Ingresa los datos de conexión de su Odoo (URL, base de datos, usuario, API key)
4. El sistema valida la conexión y muestra el nombre de la empresa y la versión de Odoo
5. El admin ya puede empezar a usar el chat
6. Para agregar usuarios: los invita por email — el invitado recibe un link, se registra con contraseña y entra directamente al sistema

El onboarding completo, desde el registro hasta la primera consulta, tarda menos de 5 minutos si el cliente tiene sus credenciales de Odoo a mano.

---

## Métricas del sistema (estado actual)

- **11 idiomas** soportados
- **6 áreas de negocio** de Odoo cubiertas (ventas, finanzas, inventario, contactos, RRHH, proyectos)
- **10 tipos de consulta** (count, listado, detalle, agregación, top N, existencia, crear, actualizar, método, reporte)
- **3 tipos de gráfico** generados automáticamente
- **11 tipos de campos** para edición en el flujo de confirmación (texto, número, fecha, booleano, relacional con autocomplete, etc.)
- **Monitoreo cada 15 minutos** para alertas proactivas
- **Caché de 45 segundos** en resultados de lectura para reducir carga sobre Odoo
- **Hasta 20 insights fijados** por usuario en el panel lateral

---

*Documento preparado para el equipo de marketing. Versión: junio 2026.*
