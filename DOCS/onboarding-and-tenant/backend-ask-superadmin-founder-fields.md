# Backend ask — exponer campos founder en la lista superadmin de orgs

**Contexto:** el front (panel SUPERADMIN → tab Orgs) ya muestra una columna "Founder"
con los días restantes de beta y un botón para extender la ventana. El endpoint de
extender (`POST /admin/orgs/{org_id}/founder/extend-beta`) ya existe y se consume.
Falta **solo** que la lista de orgs devuelva el estado founder para poder mostrarlo
sin tener que extender a ciegas.

## Único cambio pedido

`GET /admin/superadmin/orgs` — agregar a cada item del array `orgs` estos 4 campos
(mismos valores/semántica que ya se devuelven en `/me → org` y `/billing/state`):

```jsonc
{
  // ... campos actuales (id, name, slug, type, is_active, created_at, subscription, user_count) ...
  "is_founding_partner": true,                     // bool
  "founder_since": "2026-06-15T12:00:00+00:00",    // ISO | null (null = aún no conectó instancia)
  "beta_ends_at":  "2026-08-14T12:00:00+00:00",    // ISO | null
  "days_left": 60                                   // int | null (0 si venció, null si no arrancó el reloj)
}
```

Es un `SELECT` extra de `organizations.is_founding_partner, founder_since, beta_ends_at`
en `list_all_orgs` + `days_left_until(beta_ends_at)` (helper ya existe en `billing.py`).

## Opcional (nice-to-have, no bloqueante)

Devolver los mismos 4 campos en `GET /admin/orgs/{org_id}` (detalle) — el front no
los usa todavía ahí, pero quedaría consistente.

## Lo que NO hace falta

- Nada nuevo de cobro/Stripe.
- El endpoint de extender ya está OK; no se toca.
- El front degrada con gracia si los campos faltan (columna muestra "—"), así que
  esto no rompe nada mientras tanto.
