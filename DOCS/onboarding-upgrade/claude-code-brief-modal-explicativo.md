# Brief para Claude Code — Refactor del modal "¿Qué es TheOdooAgent?"

## Objetivo

Rehacer el contenido y la estructura del modal explicativo "¿Qué es TheOdooAgent?" que se abre desde el botón de ayuda en la UI. El diseño visual y el design-system ya existen y **no se tocan**: este trabajo es de **arquitectura de información, copy y comportamiento**, no de estilos.

El público que lee este modal es **mayormente implementadores de Odoo** (partners que revenden). La versión actual está pensada para usuario final y es demasiado larga para leer. Hay que compactarla, reordenarla con foco en implementador, y aplicar divulgación progresiva.

## Paso 0 — Descubrimiento (hacelo antes de editar)

1. Localizá el componente del modal explicativo actual y el contenido que renderiza.
2. Identificá los primitivos del design-system disponibles (componentes de modal, acordeón/collapsible, chips/pills, listas con icono, botones) y el **componente/set de iconos** del proyecto.
3. **Reutilizá esos primitivos.** No introduzcas estilos nuevos, tokens nuevos, ni dependencias nuevas. Si no existe un acordeón en el design-system, usá el patrón de colapso más simple ya presente en el código.
4. Para los iconos: usá el set existente. Abajo indico el **concepto** de cada fila para que elijas el icono semánticamente apropiado del set — no hardcodees nombres de iconos que no verificaste que existan.

## Arquitectura de información nueva

Orden y jerarquía (de arriba hacia abajo):

**Visible por defecto:**
1. Hook (1 título + 1 línea)
2. Qué hace (1 línea + 3 chips de ejemplo)
3. Por qué es distinto (filas con icono — el gancho para implementadores)
4. ¿Implementás Odoo? (el pitch de reventa)
5. Seguro por diseño (fila compacta de confianza: icono + etiqueta corta)

**Colapsado (expandible):**
6. Preguntas frecuentes (acordeón)
7. Hecho por Martin

La regla rectora: la primera vista debe escanearse en ~10 segundos. Todo lo que sea prosa larga va detrás de un expandir.

## Copy exacto (español rioplatense — pegar tal cual)

> Nota: respetá los acentos y la "ñ". Las etiquetas de las filas de confianza y de diferenciación deben quedar **cortas** (2–6 palabras del lado del título); la oración larga, si va, es secundaria.

### 1. Hook
- Título: **TheOdooAgent**
- Línea: *Hablale a tu Odoo en lenguaje natural. Consultás y operás tu ERP como le hablarías a un colega — datos reales, gráficos y exports, sin navegar menús.*

### 2. Qué hace
- Título: **Preguntá, y responde con tus datos reales**
- Línea: *Interpreta tu pregunta, consulta tu Odoo y responde al instante. También opera —crear, confirmar, actualizar— siempre con tu confirmación.*
- Chips de ejemplo (3):
  - `Facturas vencidas de más de $10.000`
  - `Ventas por vendedor del mes pasado, en gráfico`
  - `Creá un contacto: María López`
- Comportamiento de los chips: ver sección "Comportamiento".

### 3. Por qué es distinto
- Título: **Lo que la IA nativa de Odoo no te da**
- Filas (icono + etiqueta + línea corta):
  - **Corre en Community y versiones 14–19** — *La IA de Odoo es solo Enterprise. Esto funciona donde ya estás.* — concepto de icono: versiones / compatibilidad
  - **~$1 por usuario** — *Enterprise cobra ~$25–60 por usuario/mes, y por todos los usuarios.* — concepto de icono: precio / etiqueta
  - **No inventa cifras** — *Los números los calcula el sistema; el modelo solo redacta. Por eso es exacto y barato.* — concepto de icono: cálculo / exactitud

> CORRECCIÓN FACTUAL IMPORTANTE: el texto viejo decía "Odoo 14–20". Odoo 20 todavía no existe (sale ~oct 2026). Usar **14–19**. Cuando salga la 20, se actualiza.

### 4. ¿Implementás Odoo?
- Título: **¿Implementás Odoo?**
- Línea: *Ofrecelo a tus clientes con tu marca y revendelo.*
- Filas (icono + etiqueta corta):
  - **White-label y reventa** — *desde ~$1/usuario* — concepto: marca / etiqueta
  - **Multi-cliente** — *gestionás todas tus empresas desde una sola cuenta* — concepto: múltiples organizaciones
  - **No instala nada en el Odoo del cliente** — *no se rompe en upgrades, cero mantenimiento* — concepto: conexión / sin instalación

### 5. Seguro por diseño (fila compacta de confianza)
- Título: **Seguro por diseño**
- Items (icono + etiqueta corta, SIN oración larga):
  - **Confirmación humana en toda escritura** — concepto: check / aprobación
  - **Respeta tus permisos de Odoo** — concepto: candado / permisos
  - **No alucina cifras** — concepto: exactitud
  - **Credenciales cifradas** — concepto: escudo / cifrado

### 6. Preguntas frecuentes (acordeón, colapsado por defecto)
- **¿Es seguro?** — *Sí: confirmación humana en toda escritura, respeta tus permisos de Odoo y las credenciales van cifradas.*
- **¿Mis datos se usan para entrenar?** — `TODO: Martin debe escribir esta respuesta según el setup real (a qué proveedor de LLM se mandan los datos, retención, etc.). NO inventar una respuesta. Dejar un placeholder visible para Martin hasta que la complete.`
- **¿Qué versiones soporta?** — *Odoo 14 a 19, y Community.*
- **¿Instala algo en mi Odoo?** — *No. Se conecta por API key estándar (XML-RPC).*
- **¿Puedo ponerle mi marca?** — *Sí: white-label para revender a tus clientes con tu identidad.*
- **¿Cuánto cuesta?** — *Gratis sobre tu propio Odoo. Para desplegarlo a tus clientes, desde ~$1/usuario.*

### 7. Hecho por Martin (colapsado o sección breve al pie)
- Título: **Hecho por Martin**
- Texto: *Lo construí solo, con una idea simple: que cualquiera en una empresa pueda hablarle a su Odoo sin pelearse con menús. Desarrollo activo y soporte directo conmigo — si lo probás y algo no anda, escribime: tu feedback literalmente lo mejora.*
- Contacto: `martin@theodooagent.com`

> Nota de tono: mantené la cercanía del solo-founder, pero la mención de "desarrollo activo y soporte directo" es deliberada — le baja al implementador el miedo a la continuidad. No la quites.

## Comportamiento

- **Divulgación progresiva:** secciones 6 y 7 colapsadas por defecto; el resto visible. Usar el patrón de collapse/acordeón del design-system.
- **Chips de ejemplo:** al tocar un chip, si es trivial conectarlo, que cargue esa consulta en el input del chat (o la envíe al agente). Si requiere refactor no trivial del estado del chat, dejarlos como texto no interactivo y anotar un TODO — no bloquear el refactor del modal por esto.
- **Tag opcional para implementadores:** si encaja con el diseño, un pequeño tag/enlace cerca del hook ("¿Implementás Odoo? →") que haga scroll a la sección 4. Opcional, no obligatorio.

## Restricciones

- No tocar tokens, paleta, tipografía ni espaciados del design-system. Reutilizar componentes existentes.
- No agregar librerías ni dependencias.
- Iconos: solo del set existente del proyecto; elegir por el concepto indicado en cada fila.
- Mantener accesibilidad: foco atrapado en el modal, cierre con Escape, `aria-expanded` en los collapsibles, roles correctos.
- Responsive: las filas con icono y los chips deben funcionar en mobile (que envuelvan, no que desborden).
- No duplicar contenido: la seguridad se dice una vez en "Seguro por diseño" y una vez en el FAQ — nada más. Eliminar repeticiones del texto viejo.
- Revisar y eliminar artefactos del texto actual (encabezados duplicados como "¿Sos implementador de Odoo?" dos veces, o "Soy / Martin").

## Criterios de aceptación

- [ ] La primera vista (sin expandir nada) es escaneable: hook + qué hace + distinto + implementador + confianza, sin párrafos largos.
- [ ] FAQ y "Hecho por Martin" están colapsados por defecto y expanden correctamente.
- [ ] Las filas de "distinto" y "confianza" usan icono + etiqueta corta del design-system.
- [ ] Los 3 ejemplos son chips (interactivos si fue trivial; si no, texto + TODO).
- [ ] El copy dice "Odoo 14 a 19" en todos lados (cuerpo y FAQ). No aparece "20" en ninguna parte.
- [ ] El FAQ de privacidad de datos existe con un placeholder TODO visible para Martin (no una respuesta inventada).
- [ ] El FAQ incluye la pregunta de white-label.
- [ ] No se introdujeron estilos, tokens ni dependencias nuevas.
- [ ] Accesibilidad: foco, Escape, aria en collapsibles.
- [ ] No quedan duplicados ni artefactos del texto viejo.
