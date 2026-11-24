# Admin / Customer Profile Handling — Refactor Plan

> **Status:** implemented (code) · **Date:** 2026-11-20
> Companion to `SCHEMA.md` (data model), `DOCUMENTATION.md` (how it works),
> `AGENTS.md` (working rules). The frontend wiring and the two new tables' CRUD are
> **done and verified** (`tsc`, `vitest`, `astro build` all green). The only remaining
> work is the **§1 DB SQL**, which must be run manually in Supabase before the role
> split takes effect.

---

## 0. Where things stand (verified)

**Already in the DB** (trust these, not the old docs):

- `profiles` (`id uuid PK` = `auth.users.id`, `role` default `'CUSTOMER'`).
- `clients_purchases.profile_id` and `custom_articles_orders.profile_id` (owner link).
- `custom_articles_orders` + `articles_orders_payment_track` (custom orders).
- `purchases_payments` is polymorphic: `client_purchase_id` **or**
  `article_order_payment_track_id`.
- Admin/customer RLS on `products`, `clients_purchases`, `purchases_payments`,
  `purchases_extra_fees`, `profiles`; `is_admin()` + `handle_new_user`.

**Still missing** (this plan's scope):

- No `role` in `authContext`; `dashboardApp.tsx` renders `Dashboard` unconditionally.
- No repository/hook/component for the two new tables.
- No customer view.
- Three DB fixes + two RLS additions (below).

---

## 1. DB fixes to run manually (before/alongside the code)

Run in Supabase SQL editor:

```sql
-- 1. profile_id must default to NULL, not a random UUID (breaks every insert)
alter table public.clients_purchases      alter column profile_id drop default;
alter table public.custom_articles_orders alter column profile_id drop default;

-- 2. is_admin() must match the uppercase role values
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'ADMIN');
$$;

-- 3. polymorphic CHECK on purchases_payments
alter table public.purchases_payments
  add constraint purchases_payments_exactly_one_parent check (
    (client_purchase_id is not null and article_order_payment_track_id is null)
    or (client_purchase_id is null and article_order_payment_track_id is not null)
  );

-- 4. RLS for the two new tables
alter table public.custom_articles_orders       enable row level security;
alter table public.articles_orders_payment_track enable row level security;

create policy custom_articles_admin_all on public.custom_articles_orders
  for all using (public.is_admin());
create policy custom_articles_select_own on public.custom_articles_orders
  for select using (profile_id = auth.uid());

create policy articles_orders_track_admin_all on public.articles_orders_payment_track
  for all using (public.is_admin());
create policy articles_orders_track_select_own on public.articles_orders_payment_track
  for select using (
    exists (
      select 1 from public.custom_articles_orders cao
      where cao.id = articles_orders_payment_track.article_order_id
        and cao.profile_id = auth.uid()
    )
  );

-- 5. payments_select_own must also cover the custom-order path
drop policy if exists payments_select_own on public.purchases_payments;
create policy payments_select_own on public.purchases_payments
  for select using (
    exists (
      select 1 from public.clients_purchases cp
      where cp.id = purchases_payments.client_purchase_id
        and cp.profile_id = auth.uid()
    )
    or exists (
      select 1
      from public.articles_orders_payment_track aopt
      join public.custom_articles_orders cao on cao.id = aopt.article_order_id
      where aopt.id = purchases_payments.article_order_payment_track_id
        and cao.profile_id = auth.uid()
    )
  );

-- 6. customers see ONLY the products they purchased (replace the permissive policy)
drop policy if exists products_selet on public.products;
create policy products_select_owned on public.products
  for select using (
    exists (
      select 1 from public.clients_purchases cp
      where cp.product_id = products.id
        and cp.profile_id = auth.uid()
    )
  );

-- 7. custom-article image bucket (create in the dashboard or run this)
insert into storage.buckets (id, name, public)
values ('handmade-article-images', 'handmade-article-images', false)
  on conflict (id) do nothing;

create policy handmade_article_images_admin_all on storage.objects
  for all using (bucket_id = 'handmade-article-images' and public.is_admin());

create policy handmade_article_images_select_own on storage.objects
  for select using (
    bucket_id = 'handmade-article-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- promote yourself to admin
update public.profiles set role = 'ADMIN' where id = '<your-user-id>';
```

Optional but recommended:

```sql
alter table public.profiles alter column id drop default;   -- id always comes from auth.users
alter table public.profiles add constraint profiles_role_check check (role in ('ADMIN','CUSTOMER'));
```

---

## 2. Architecture of the change

- **RLS is the security boundary.** A customer's `select('*')` on `clients_purchases`
  already returns *only their rows* — no app-side filtering. Frontend role-branching
  is UX only (which screen renders), never an access check.
- **`auth.uid()` = `profiles.id`**, so ownership is `profile_id = auth.uid()`
  directly. Role casing is **uppercase** `'ADMIN'` / `'CUSTOMER'`.
- **One door to Supabase** stays: repositories only, `RepoResult<T>` never throws.

---

## 3. Phases

### Phase 1 — Role plumbing (frontend)

- Add a `profilesRepository.ts` with `findOwn()` → `select('id, role').eq('id', auth.uid()).single()`
  (RLS `profiles_select_own` allows it).
- Extend `authContext.tsx`: after the session restores, fetch the role and expose
  `role: 'ADMIN' | 'CUSTOMER' | null`. Keep `loading` true until both session *and*
  role resolve, so the UI never flashes the wrong screen.
- `dashboardApp.tsx`: `AuthGuard` → branch on `role`:
  - `'ADMIN'` → `<Dashboard />` (unchanged)
  - `'CUSTOMER'` → `<CustomerDashboard />` (new, Phase 3)
  - `null` while loading → existing spinner.

**Done when:** an admin sees the current dashboard, a customer sees the new view,
and a role-less/error state falls back safely (treat `null` as customer).

### Phase 2 — Data layer (repositories + hooks)

- `clientsPurchasesRepository`: add `profile_id: string | null` to `ClientPurchase`,
  and add `profile_id` to the write input so the admin can *link* a purchase.
  `CreateClientPurchaseInput` gains an optional `profile_id`.
- New `customArticlesOrdersRepository` (`custom_articles_orders`) and
  `articlesOrdersPaymentTrackRepository` (`articles_orders_payment_track`), mirroring
  the existing repository style (verb set + `RepoResult`).
- New hooks: `useCustomArticlesOrders` (admin CRUD) and `useArticleOrderPaymentTrack`
  (totals recompute + write, mirroring `usePurchasePayments`).
- The customer read path needs **no new query**: RLS scopes the existing
  `fetchAllPurchases` / a new `fetchMyCustomOrders` to the signed-in user.

**Done when:** both new repositories are typed and return `RepoResult`; the customer
and admin reads return correctly scoped rows under their respective roles.

### Phase 3 — Customer view (`customerDashboard.tsx`)

Read-only, no mutate controls:

- Top bar: same layout, no "Nuevo producto" / product CRUD.
- **"Mis compras"** — their `clients_purchases` rows with product name, progress
  (`amount_paid_so_far` vs `agreed_fees + extra_charges_total`), `Pagado`/`Pendiente`
  badge, and the payment + extra-fee detail (reuse the read-only pieces of
  `SalesSection` / `ClientPurchaseModal`).
- **"Mis pedidos personalizados"** — their `custom_articles_orders` rows with the
  `articles_orders_payment_track` progress and its payments.

**Done when:** a customer logs in and sees only their own purchases + custom orders,
with progress and payment detail, and no way to create/edit/delete anything.

### Phase 4 — Custom-orders CRUD (admin)

- A new collapsible section in `dashboard.tsx` ("Pedidos personalizados") listing all
  `custom_articles_orders`.
- A create/edit modal (name, description, value, dates, image) + delete via
  `ConfirmModal`, mirroring the product flow.
- Payment management: register payments against the order's
  `articles_orders_payment_track` (with `article_order_payment_track_id` on
  `purchases_payments`), recomputing `amount_paid_so_far` / `is_fully_paid` the same
  way `usePurchasePayments` does.

**Done when:** an admin can CRUD a custom order and record payments against it, and a
customer sees that order + its progress.

### Phase 5 — Admin linking + storage

- In `ClientPurchaseModal`, add a "Cliente (cuenta)" selector populated from
  `profilesRepository.findMany()` (admin-only via RLS) to set/clear `profile_id`.
- Custom-order images: the `handmade-article-images` bucket (path
  `{profileId}/{orderId}-{sanitizedName}`), with the §1.7 storage policies.
- Product images for customers: with owned-only `products` RLS a customer can only
  reach products they own, but the `products-images` bucket still needs a read
  policy — recommend authenticated-read (`auth.uid() is not null`), since rows are
  already hidden; confirm whether customers need product images at all.

**Done when:** an admin can link a purchase to a customer account, and a customer's
images render.

### Phase 6 — i18n + docs + verification

- Add ES/EN keys for the customer view and the custom-orders section (parity test
  guards them automatically).
- Update `DOCUMENTATION.md` (§9 already done; add §10 hooks/components, §13 status)
  and `CHANGELOG.md`; bump "Last documented".
- Gates: `npx tsc --noEmit`, `npm test`, `npm run build` (static, no
  `.vercel/output/functions/`). Run `gate-verifier` + `ui-verifier` + `docs-sync`.

---

## 4. Constraints (non-negotiable, from `AGENTS.md`)

- Static-only Vercel output — no server functions, no build-time network, no new
  `PUBLIC_*` var (roles need none).
- RLS is the only access control; never `select using (true)`.
- `RepoResult<T>` never throws; repositories are the only Supabase touchers.
- Design tokens in `theme.css`; layout in `dashboard.css`.

## 5. Decisions

1. **Customer account creation** — ✅ manual: the admin creates accounts (auth user +
   `profiles` row) by hand. No signup UI. The `handle_new_user` trigger is optional
   (harmless to keep).
2. **Catalog visibility** — ✅ customers see only what they own. `products` RLS is
   owned-only (§1.6); `custom_articles_orders` is already `profile_id`-scoped.
3. **Custom-order images** — ✅ new private bucket **`handmade-article-images`**,
   path `{profileId}/{orderId}-{sanitizedName}` so customers read only their own
   folder (§1.7). `image_path` on `products` stays legacy.
4. **Extra fees on custom orders** — ⏳ deferred. Default to **aggregate-only** for
   now (no new table — just write `extra_charges_total`); itemizing (a
   `purchases_extra_fees`-style table) can be added later without breaking anything.

## 6. Expected new/changed files

- New: `src/repositories/profilesRepository.ts`, `customArticlesOrdersRepository.ts`,
  `articlesOrdersPaymentTrackRepository.ts`, `src/hooks/useCustomArticlesOrders.ts`,
  `useArticleOrderPaymentTrack.ts`, `src/components/customerDashboard.tsx`,
  `customArticleOrderModal.tsx` (or reuse).
- Changed: `src/context/authContext.tsx`, `src/components/dashboardApp.tsx`,
  `dashboard.tsx`, `clientPurchaseModal.tsx`,
  `src/repositories/clientsPurchasesRepository.ts`,
  `src/repositories/purchasesPaymentsRepository.ts`,
  `src/i18n/locales/{es,en}.ts`, `DOCUMENTATION.md`, `CHANGELOG.md`.
