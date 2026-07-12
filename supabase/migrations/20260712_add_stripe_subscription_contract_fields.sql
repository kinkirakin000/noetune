-- Noetune Stripe subscription contract snapshot
-- Stripe is the source of truth for subscription state.
-- public.profiles stores a contract snapshot for safe UI rendering and history.
-- plan_status remains a temporary compatibility column.

alter table public.profiles
  add column if not exists stripe_subscription_status text;

comment on column public.profiles.stripe_subscription_status is
  'Snapshot of the Stripe subscription status. Stripe remains the source of truth.';

alter table public.profiles
  add column if not exists cancel_at_period_end boolean not null default false;

comment on column public.profiles.cancel_at_period_end is
  'Whether Stripe has scheduled cancellation at the end of the current period.';

alter table public.profiles
  add column if not exists stripe_price_id text;

comment on column public.profiles.stripe_price_id is
  'Stripe Price ID for the current subscription snapshot.';

alter table public.profiles
  add column if not exists stripe_product_id text;

comment on column public.profiles.stripe_product_id is
  'Stripe Product ID for the current subscription snapshot.';

alter table public.profiles
  add column if not exists subscription_currency text;

comment on column public.profiles.subscription_currency is
  'Subscription currency code from Stripe.';

alter table public.profiles
  add column if not exists subscription_unit_amount bigint;

comment on column public.profiles.subscription_unit_amount is
  'Subscription amount in Stripe minor currency units.';

alter table public.profiles
  add column if not exists subscription_interval text;

comment on column public.profiles.subscription_interval is
  'Subscription billing interval from Stripe, kept unconstrained for future values.';

alter table public.profiles
  add column if not exists subscription_interval_count integer;

comment on column public.profiles.subscription_interval_count is
  'Subscription billing interval count from Stripe.';

alter table public.profiles
  add column if not exists stripe_livemode boolean;

comment on column public.profiles.stripe_livemode is
  'Stripe livemode flag used to detect test/live data mixing.';

alter table public.profiles
  add column if not exists stripe_subscription_updated_at timestamptz;

comment on column public.profiles.stripe_subscription_updated_at is
  'Timestamp of the latest Stripe subscription snapshot, used to ignore stale webhook updates.';
