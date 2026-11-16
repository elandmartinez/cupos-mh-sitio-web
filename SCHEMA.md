# Database Schema & Migration Plan

> Reconstructed from your SQL plus the source code (`src/repositories/*`).
> The money tables below match the `CREATE TABLE` statements you pasted exactly
> (`bigint` ids, `timestamp with time zone`, `on update CASCADE`). The `products`
> and `clients_purchases` columns are reconstructed from the code — verify them.
>
> **Last updated:** 2026-11-16

---

## 1. Design rule: the database owns no business logic

There are **no triggers and no database functions**. The database is pure storage.
Every calculation — the payment totals (`amount_paid_so_far`, `extra_charges_total`,
`is_fully_paid`) — is computed in the application code and written back as an
explicit `UPDATE`.

- The calculation lives in **`src/helpers/purchaseTotals.ts`** (`computePurchaseTotals`).
- The write lives in **`src/repositories/clientsPurchasesRepository.ts`** (`updateTotals`).
- The orchestration lives in **`src/hooks/usePurchasePayments.ts`**.

---

## 2. Current schema

### Table `products`

| Column | Type | Notes |
| :-- | :-- | :-- |
| `id` | int PK (identity) | sorted `id desc` in the UI |
| `created_at` | timestamptz | DB-set |
| `updated_at` | timestamptz \| null | client-set on update |
| `name` | text \| null | used to derive the image storage path |
| `description` | text \| null | |
| `value` | int \| null | whole pesos |
| `release_date` | date \| null | |

### Table `clients_purchases`

| Column | Type | Notes |
| :-- | :-- | :-- |
| `id` | int PK (identity) | |
| `created_at` | timestamptz | DB-set |
| `updated_at` | timestamptz \| null | client-set on update |
| `client_name` | text \| null | |
| `client_first_name` | text \| null | "Nombre de pila" (first name) |
| `client_phone_number` | text \| null | |
| `client_social_media` | text \| null | "Red social de contacto" |
| `is_fully_paid` | boolean \| null | **app-maintained** (no trigger) |
| `agreed_fees` | int \| null | the *base* price the client agreed to pay |
| `amount_paid_so_far` | int \| null | **app-maintained** — sum of received payments |
| `extra_charges_total` | int \| null | **app-maintained** — sum of extra fees owed |
| `product_id` | int \| null | FK → `products.id` |
| `status` | text \| null | free-text lifecycle label, DB default `'no_payment_done'` |

### Table `purchases_payments` — money received

| Column | Type | Notes |
| :-- | :-- | :-- |
| `id` | bigint PK (identity) | |
| `created_at` | timestamptz | DB default `now()` |
| `updated_at` | timestamptz \| null | DB default `now()` |
| `client_purchase_id` | bigint \| null | FK → `clients_purchases.id` **`on update CASCADE`** |
| `amount` | bigint \| null | whole pesos |

### Table `purchases_extra_fees` — money owed (fines / cargos extra)

| Column | Type | Notes |
| :-- | :-- | :-- |
| `id` | bigint PK (identity) | |
| `created_at` | timestamptz | DB default `now()` |
| `updated_at` | timestamptz \| null | DB default `now()` |
| `client_purchase_id` | bigint \| null | FK → `clients_purchases.id` **`on update CASCADE`** |
| `amount` | bigint \| null | whole pesos |

### Storage bucket `products-images`

- **Private** bucket; read via 1-hour signed URLs. File path = identity:
  `` `${sanitized-name}-${productId}` ``.

### RLS

- Row Level Security is enabled on the tables. The new `purchases_extra_fees`
  table needs its own RLS policies (mirroring `purchases_payments`) — the app
  reads/writes it as the signed-in operator.

---

## 3. Totals the app computes (no trigger)

```
amount_paid_so_far  = Σ purchases_payments.amount
extra_charges_total = Σ purchases_extra_fees.amount
total_owed          = agreed_fees + extra_charges_total
pending             = total_owed − amount_paid_so_far
is_fully_paid       = total_owed > 0 && amount_paid_so_far >= total_owed
```

The app recomputes and writes these three columns through `updateTotals` after
every payment or extra-fee mutation.

---

## 4. Notes & caveats

1. **`is_extra_fee` is gone.** Fines are no longer a flag on a payment; they are
   rows in `purchases_extra_fees`. `computePurchaseTotals` takes the two lists
   separately: payments → `amount_paid_so_far`, extra fees → `extra_charges_total`.
2. **No `ON DELETE CASCADE` on either FK.** Both money tables only specify
   `on update CASCADE`. Deleting a `clients_purchases` row that still has payments
   or extra fees will therefore fail with a foreign-key violation. Either add
   `on delete cascade` to both FKs (recommended, matches the old behaviour the
   docs assumed), or the app must delete the children first — see the open item
   in the plan.
3. **Existing data self-heals.** Because there was never a trigger, existing
   `amount_paid_so_far` / `extra_charges_total` / `is_fully_paid` values may be
   stale. The app recomputes and rewrites them the next time that purchase's
   payments/extra fees are touched.
4. **Confirm `products` / `clients_purchases` column types** (`int` vs `bigint`)
   against your real DB and correct §2 above.
