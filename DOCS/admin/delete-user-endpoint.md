# Total user deletion — frontend integration guide

**Endpoint:** `DELETE /admin/superadmin/users/{user_id}`
**Auth:** SUPERADMIN only (`403` otherwise)
**Added:** 2026-06-12 · backend `src/api/admin.py` → `delete_user_completely`

Permanently and irreversibly removes a user from **both** systems the platform
uses for identity and data:

1. **Postgres** (the app DB) — the `tenant_users` row plus every piece of data
   that references the user, including the rows that have **no** foreign key and
   therefore would otherwise be left orphaned (pins, notifications, audit logs,
   LangGraph checkpoints, feedback reports, analytics events).
2. **Supabase auth** — the login identity itself, via the Supabase Admin API.

> ⚠️ This is destructive and non-recoverable. Always show a typed confirmation
> ("type the user's email to confirm") before calling it.

---

## Why this endpoint exists

A user lives in two independent places with **no automatic sync**:

| System | Holds | Key |
|--------|-------|-----|
| Supabase `auth.users` | the login / identity | UUID |
| Postgres `tenant_users` | the app-level user + all their data | same UUID (`tenant_users.id`) |

Deleting one does **not** delete the other. Before this endpoint, the only
admin action was `DELETE /admin/orgs/{org_id}/users/{user_id}`, which merely
**unlinks** the user from the org (`organization_id = NULL`) — it does not delete
anything. This endpoint is the real, complete purge.

---

## Request

```
DELETE /admin/superadmin/users/{user_id}?delete_empty_org=false
Authorization: Bearer <supabase_jwt_of_a_SUPERADMIN>
```

| Param | In | Type | Default | Meaning |
|-------|----|------|---------|---------|
| `user_id` | path | UUID | — | The user's id (same value Supabase auth uses; comes from `GET /admin/superadmin/users`) |
| `delete_empty_org` | query | bool | `false` | If `true`, **and** this user was the **last member** of their org, the org is also deleted (cascades its subscription, Odoo configs, invitations). If the org still has other members it is left untouched regardless. |

### When to pass `delete_empty_org=true`

Use it for **SOLITARY** orgs (one ADMIN = one org, auto-provisioned on signup):
deleting that user otherwise leaves an empty org + subscription + Odoo configs
behind. For **PARTNER** orgs with multiple members, leave it `false` (default) —
you usually only want to remove the one person.

The frontend should surface this as a checkbox, e.g.
*"Also delete the organization if this was its only member"*, defaulting to
**checked** when the user is the sole member of a SOLITARY org, **unchecked**
otherwise.

---

## Response — `200 OK`

```jsonc
{
  "status": "ok",
  "user_id": "aefc01da-b08d-408f-878e-810403887e82",
  "email": "pedro@pedro.com",         // null if the user wasn't in tenant_users
  "tenant_existed": true,             // false = orphan auth identity (Supabase only)
  "deleted": {
    "tenant_user": true,
    "conversations": 4,               // cascade-deleted with the tenant row
    "user_odoo_credentials": 1,       // cascade-deleted with the tenant row
    "pinned_insights": 7,
    "notifications": 12,
    "audit_logs": 3,
    "checkpoints": 4,
    "feedback_reports": 1,
    "analytics_events": 0
  },
  "org_deleted": null,                // or the org_id string if it was collapsed
  "supabase_auth": "deleted",         // see status values below
  "supabase_error": null              // populated only when supabase_auth == "failed"
}
```

### `supabase_auth` status values

| Value | Meaning | UI suggestion |
|-------|---------|---------------|
| `deleted` | Identity removed from Supabase auth | ✅ Success |
| `not_found` | Already absent in Supabase (idempotent) | ✅ Treat as success |
| `skipped_not_configured` | Backend has no `SUPABASE_SERVICE_KEY` (e.g. dev) | ℹ️ Postgres purged; tell admin to remove the auth user manually in the Supabase dashboard |
| `failed` | Supabase Admin API errored — see `supabase_error` | ⚠️ **Partial deletion**: Postgres is already wiped, but the login still exists. Offer a retry, or instruct manual deletion in the dashboard |

> **Important for the frontend:** a `200` does **not** guarantee the Supabase
> side succeeded. Postgres is committed first and is always done on a `200`;
> the Supabase deletion is best-effort. **Always inspect `supabase_auth`** and
> show a warning banner when it is `failed` or `skipped_not_configured`.

---

## Error responses

| Status | Cause |
|--------|-------|
| `400` | The caller tried to delete **their own** account (`A SUPERADMIN cannot delete their own account`) |
| `403` | Caller is not a SUPERADMIN |
| `500` | Unexpected DB error (Postgres purge runs in a single transaction — it either fully commits or rolls back) |

There is intentionally **no `404`**: if the `user_id` is not in `tenant_users`
(an orphan auth identity), the Postgres counts come back zero and the call still
runs the Supabase deletion, so it doubles as an orphan-auth cleanup tool.

---

## Suggested frontend flow (`lib/api.ts` + a confirm modal)

```ts
// lib/api.ts
export interface DeleteUserResult {
  status: "ok";
  user_id: string;
  email: string | null;
  tenant_existed: boolean;
  deleted: {
    tenant_user: boolean;
    conversations: number;
    user_odoo_credentials: number;
    pinned_insights: number;
    notifications: number;
    audit_logs: number;
    checkpoints: number;
    feedback_reports: number;
    analytics_events: number;
  };
  org_deleted: string | null;
  supabase_auth: "deleted" | "not_found" | "skipped_not_configured" | "failed";
  supabase_error: string | null;
}

export async function deleteUserCompletely(
  userId: string,
  opts: { deleteEmptyOrg?: boolean } = {},
): Promise<DeleteUserResult> {
  const qs = opts.deleteEmptyOrg ? "?delete_empty_org=true" : "";
  const res = await authFetch(`/admin/superadmin/users/${userId}${qs}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Delete failed (${res.status})`);
  }
  return res.json();
}
```

```tsx
// On confirm (after the admin types the user's email to match):
const result = await deleteUserCompletely(user.id, { deleteEmptyOrg: collapseOrg });

if (result.supabase_auth === "failed") {
  toast.warning(
    `User data deleted, but the Supabase login could not be removed: ` +
    `${result.supabase_error}. Remove it manually in the Supabase dashboard.`,
  );
} else if (result.supabase_auth === "skipped_not_configured") {
  toast.info("User data deleted. Remove the auth user manually in Supabase (service key not configured).");
} else {
  toast.success(`Deleted ${result.email ?? user.id} completely.`);
}
// refresh the users list
```

UX checklist:
- Gate the button behind a SUPERADMIN role check.
- Require a typed confirmation (the user's email) before enabling the action.
- Show the per-table `deleted` counts in a success summary (optional but nice).
- Surface the `supabase_auth` warning states prominently — they mean a partial
  deletion the admin must finish manually.

---

## Backend requirement (ops note)

For the Supabase side to work in production, the backend process must have
**`SUPABASE_SERVICE_KEY`** set (the project's `service_role` key, from Supabase
dashboard → Settings → API). It is the same key already used for brand-logo
uploads (see [`SUPABASE_STORAGE.md`](../SUPABASE_STORAGE.md)). Without it the
endpoint still purges Postgres but returns `supabase_auth: "skipped_not_configured"`.

> Because today local and production **share one Supabase project**, deleting a
> user here removes them from that shared auth pool. Once dev/stage gets its own
> Supabase project this concern goes away.
