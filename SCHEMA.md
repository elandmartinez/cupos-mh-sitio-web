# Database Schema & Migration Plan

> Reconstructed from the live Supabase schema (table/RLS dump) reconciled with the
> source code (`src/repositories/*`). The dump shows only column types — foreign-key
> and CHECK constraints are inferred from the code and the migration discussion, so
> verify them against the real DB before relying on them.
>
> **Last updated:** 2026-11-20

---

## 1. Design rule: no business logic in the database

There are **no business-logic triggers or functions**. Every money calculation —
`amount_paid_so_far`, `extra_charges_total`, `is_fully_paid` — is computed in the
app and written back as an explicit `UPDATE`.

- Calculation lives in **`src/helpers/purchaseTotals.ts`** (`computePurchaseTotals`).
- The write lives in **`src/repositories/clientsPurchasesRepository.ts`** (`updateTotals`).
- The orchestration lives in **`src/hooks/usePurchasePayments.ts`**.

**The roles work is the one deliberate exception** — but it is auth/identity
plumbing, not business logic:

- `public.is_admin()` — security-definer helper the RLS policies call.
- `handle_new_user()` + `on_auth_user_created` trigger — creates a `profiles` row
  (default role `customer`) when an auth user signs up.

Nothing in the database recomputes money.

---

## 2. Roles & ownership

Two roles, enforced by **Row Level Security**. The app never checks a role to
decide what to show — frontend role-branching is UX only; RLS is the real boundary.

| Role | Database access |
| :-- | :-- |
| `admin` | Full CRUD on every table (`is_admin()`). |
| `customer` | Read-only, only their own rows (`profile_id = auth.uid()`). |

- `profiles` links `auth.users` to an app role, 1:1 on `id` (`profiles.id = auth.users.id`).
- Ownership columns point at `profiles.id`: `clients_purchases.profile_id` and
  `custom_articles_orders.profile_id`. `null` = walk-in customer (the legacy
  `client_*` text fields still describe them).
- `auth.uid()` is the `uuid` in the JWT and equals `profiles.id`, so RLS compares
  `profile_id = auth.uid()` directly — no join to `auth.users` needed.

---

## 3. Current schema

### Table `products`

| Column | Type | Notes |
| :-- | :-- | :-- |
| `id` | bigint PK (identity) | list sorted `id desc` in the UI |
| `created_at` | timestamptz | DB-set |
| `updated_at` | timestamptz \| null | client-set on update |
| `name` | varchar \| null | used to derive the image storage path |
| `description` | varchar \| null | |
| `value` | bigint \| null | whole pesos |
| `release_date` | date \| null | |
| `image_path` | text \| null | **legacy** — the app never reads/writes it; the image lives in the `products-images` bucket |

### Table `clients_purchases`

| Column | Type | Notes |
| :-- | :-- | :-- |
| `id` | bigint PK (identity) | |
| `created_at` | timestamptz | DB-set |
| `updated_at` | timestamptz \| null | client-set on update |
| `client_name` | text \| null | |
| `client_first_name` | text \| null | "Nombre de pila" |
| `client_phone_number` | text \| null | |
| `client_social_media` | text \| null | |
| `is_fully_paid` | boolean \| null | **app-maintained** (no trigger) |
| `agreed_fees` | int4 \| null | the *base* price the client agreed to pay |
| `amount_paid_so_far` | bigint \| null | **app-maintained** — sum of received payments |
| `extra_charges_total` | bigint \| null | **app-maintained** — sum of extra fees owed |
| `product_id` | bigint \| null | FK → `products.id` |
| `status` | varchar \| null | shipping lifecycle enum — one of `PURCHASE_STATUSES`, default `shipping_to_locker_abroad` |
| `profile_id` | uuid \| null | FK → `profiles.id` (owner); `null` = walk-in |

`client_name` (and only `client_name`) can be autofilled from the linked
`profiles.name` — either via the "Vincular producto al perfil del cliente"
button (legacy) or by selecting a profile in the "Cuenta del cliente" selector.

`status` takes one of these six values (in lifecycle order):
`shipping_to_locker_abroad` → `at_locker_abroad` → `shipping_to_colombia` →
`at_colombia` → `shipping_to_client` → `product_delivered_to_customer`.

### Table `purchases_payments` — money received (polymorphic parent)

| Column | Type | Notes |
| :-- | :-- | :-- |
| `id` | bigint PK (identity) | |
| `created_at` | timestamptz | DB default `now()` |
| `updated_at` | timestamptz \| null | DB default `now()` |
| `client_purchase_id` | bigint \| null | FK → `clients_purchases.id` (a *regular* purchase's payment) |
| `amount` | bigint \| null | whole pesos |
| `article_order_payment_track_id` | bigint \| null | FK → `articles_orders_payment_track.id` (a *custom order's* payment) |

A payment belongs to **exactly one** parent: `client_purchase_id` **or**
`article_order_payment_track_id` is set, never both, never neither. Enforce this
with a CHECK constraint (see §7 item 3).

### Table `purchases_extra_fees` — money owed (fines / cargos extra)

Polymorphic, like `purchases_payments`: the parent is one of `client_purchase_id`
(regular purchase) or `article_order_payment_track_id` (custom order), enforced by
a CHECK (exactly one). `reason` is only used for custom orders.

| Column | Type | Notes |
| :-- | :-- | :-- |
| `id` | bigint PK (identity) | |
| `created_at` | timestamptz | DB default `now()` |
| `updated_at` | timestamptz \| null | DB default `now()` |
| `client_purchase_id` | bigint \| null | FK → `clients_purchases.id` (regular purchase parent) |
| `article_order_payment_track_id` | bigint \| null | FK → `articles_orders_payment_track.id` (custom order parent) |
| `reason` | text \| null | why the charge exists (custom orders only) |
| `amount` | bigint \| null | whole pesos |

### Table `profiles`

| Column | Type | Notes |
| :-- | :-- | :-- |
| `id` | uuid PK | = `auth.users.id` (1:1) |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz \| null | |
| `role` | text \| null | `'ADMIN'` / `'CUSTOMER'`; `DEFAULT 'CUSTOMER'`, no CHECK — `null` acts as customer |

> No `username` column: login stays Supabase email/password. `role` defaults to
> `'CUSTOMER'` but has **no CHECK** — `is_admin()` must match the casing
> (`role = 'ADMIN'`) or admins silently stop being admins. `null` acts as non-admin
> (safe).

### Table `custom_articles_orders`

Like `products`, but for custom orders placed **off-website** (via WhatsApp/phone).
New in the website as its own list.

| Column | Type | Notes |
| :-- | :-- | :-- |
| `id` | bigint PK (identity) | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz \| null | |
| `name` | varchar \| null | |
| `description` | varchar \| null | |
| `value` | bigint \| null | |
| `date_to_deliver` | date \| null | |
| `image_path` | text \| null | |
| `last_date_to_deliver` | date \| null | |
| `has_date_to_deliver_been_updated` | boolean \| null | |
| `profile_id` | uuid \| null | FK → `profiles.id` (owner) |
| `creation_progress` | int \| null | 0–100 percentage; the order's creation progress, set from the form slider (app-maintained). |

### Table `articles_orders_payment_track`

Payment *state* for one custom article order (1:1 via `article_order_id`). Holds the
same aggregate money fields `clients_purchases` holds inline.

| Column | Type | Notes |
| :-- | :-- | :-- |
| `id` | bigint PK (identity) | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz \| null | |
| `is_fully_paid` | boolean \| null | |
| `agreed_fees` | int4 \| null | |
| `amount_paid_so_far` | bigint \| null | |
| `status` | varchar \| null | |
| `extra_charges_total` | bigint \| null | |
| `client_gave_starter_payment` | boolean \| null | |
| `article_order_id` | bigint \| null | FK → `custom_articles_orders.id` |

**The custom-order money flow:** `custom_articles_orders` → (1:1)
`articles_orders_payment_track` → (1:N) `purchases_payments` rows whose
`article_order_payment_track_id` points at the track row.

Migration for the creation-progress column:

```sql
alter table public.custom_articles_orders add column creation_progress int;
```

---

## 4. RLS policies

Policies as dumped (all `PERMISSIVE`, applied to `public`):

| Table | Policy | Command | USING |
| :-- | :-- | :-- | :-- |
| `products` | `products_admin_all` | ALL | `is_admin()` |
| `products` | `products_selet` | SELECT | `auth.uid() IS NOT NULL` |
| `clients_purchases` | `purchase_admin_all` | ALL | `is_admin()` |
| `clients_purchases` | `purchases_select_own` | SELECT | `profile_id = auth.uid()` |
| `purchases_payments` | `payments_admin_all` | ALL | `is_admin()` |
| `purchases_payments` | `payments_select_own` | SELECT | `EXISTS (SELECT 1 FROM clients_purchases cp WHERE cp.id = purchases_payments.client_purchase_id AND cp.profile_id = auth.uid())` |
| `purchases_extra_fees` | `extra_fees_admin_all` | ALL | `is_admin()` |
| `purchases_extra_fees` | `extra_fees_select_own` | SELECT | `EXISTS (SELECT 1 FROM clients_purchases cp WHERE cp.id = purchases_extra_fees.client_purchase_id AND cp.profile_id = auth.uid()) OR EXISTS (SELECT 1 FROM articles_orders_payment_track aopt JOIN custom_articles_orders cao ON cao.id = aopt.article_order_id WHERE aopt.id = purchases_extra_fees.article_order_payment_track_id AND cao.profile_id = auth.uid())` |
| `profiles` | `profiles_admin_all` | ALL | `is_admin()` |
| `profiles` | `profiles_select_own` | SELECT | `id = auth.uid()` |

> Never use `SELECT USING (true)` anywhere — that would make a table public to every
> signed-in (or anonymous) user and defeat the role split.

## 5. Functions & triggers

| Object | Purpose |
| :-- | :-- |
| `public.is_admin()` | `security definer`, `stable`, `set search_path = public`; returns whether `profiles.role = 'ADMIN'` for `auth.uid()`. |
| `handle_new_user()` + `on_auth_user_created` | `after insert on auth.users` → inserts a `profiles` row (`id`; role falls back to the column default `'CUSTOMER'`). `security definer` so it can write `profiles` despite RLS. |

---

## 6. Storage bucket `products-images`

- **Private**; read via 1-hour signed URLs. File path is the identity:
  `` `${sanitized-name}-${productId}` `` (the `image_path` columns are unused legacy).
- Upload uses `upsert: true`; rename moves the file (`storage.move`); delete removes it.

---

## 7. Notes & caveats (open items)

1. **No RLS on `custom_articles_orders` or `articles_orders_payment_track` yet.**
   The dump lists no policies for them. Before the customer view ships they need the
   same pair as the other tables: `…_admin_all` (`is_admin()`) and `…_select_own`
   (owner via `profile_id = auth.uid()` for `custom_articles_orders`; via the parent
   order for `articles_orders_payment_track`).
2. **`purchases_payments.payments_select_own` only covers the `client_purchase_id`
   path.** A payment whose parent is `article_order_payment_track_id` (a custom
   order) is invisible to the customer under the current policy. Add an `OR EXISTS`
   clause over `articles_orders_payment_track` → `custom_articles_orders.profile_id`.
3. **The polymorphic CHECK.** `purchases_payments` should carry a CHECK enforcing
   *exactly one* of `client_purchase_id` / `article_order_payment_track_id`:
   `((client_purchase_id IS NOT NULL AND article_order_payment_track_id IS NULL) OR (client_purchase_id IS NULL AND article_order_payment_track_id IS NOT NULL))`.
   **The final `CREATE TABLE` omits it — add it** (the ALTER is in the roles plan).
4. **No `ON DELETE CASCADE` on the money FKs.** Deleting a `clients_purchases` (or
   `custom_articles_orders`) row that still has payments/fees will fail with a
   foreign-key violation. Either add `on delete cascade` or have the app delete the
   children first.
5. **`products_selet` is misspelled** (should be `products_select`). Harmless, but
   confusing if you go looking for the policy by name.
6. **`image_path` columns are legacy.** The app reads/writes the `products-images`
   bucket, deriving paths from `name` + `id`; `image_path` is not used.
7. **`profile_id` had a `DEFAULT gen_random_uuid()`** (both `clients_purchases` and
   `custom_articles_orders`). That fills in a random UUID that violates the FK to
   `profiles(id)` on any insert that omits `profile_id` — which is the current
   `create()` path. Walk-ins must be `NULL`, so **drop those defaults** before the
   app writes purchases.
