# Noetune SaaS Architecture

## Status

SaaS migration in progress. Current production app is `index.html` (static, fully functional).

GitHub Pages serves `noetune.com` from this repo during development.
Vercel preview URL will be used to test the SaaS stack before cutting DNS over.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | `index.html` — single-file HTML/CSS/JS (existing) |
| Hosting | Vercel (static files + serverless functions) |
| Auth | Supabase Auth |
| Database | Supabase Postgres (profiles table) |
| Payments | Stripe Checkout + Stripe Subscription + Customer Portal |
| Webhooks | Stripe → /api/stripe-webhook → Supabase profiles |
| Analytics | PostHog |

---

## Directory structure

```
noetune/
├── api/
│   ├── me.js                       # GET  /api/me
│   ├── consume-trial.js            # POST /api/consume-trial
│   ├── create-checkout-session.js  # POST /api/create-checkout-session
│   ├── create-portal-session.js    # POST /api/create-portal-session
│   └── stripe-webhook.js           # POST /api/stripe-webhook
├── supabase/
│   ├── schema.sql                  # profiles table + RLS + triggers
│   └── migrations/                 # future migration files
├── lib/
│   └── supabase-admin.js           # service-role Supabase client (server only)
├── index.html                      # Main app — landing + full V10 flow
├── app-v10.html                    # Backup (unchanged)
├── app-v9.html                     # Backup (unchanged)
├── .env.example                    # Environment variable template
├── vercel.json                     # Vercel function + header config
├── package.json                    # Node.js deps (Supabase, Stripe)
└── README_SAAS.md                  # This file
```

---

## How index.html is preserved

`index.html` is served as a static file from the repo root.
Vercel serves it at the root path (`/`) alongside `/api/*` serverless functions.

Core app logic (breathing flow, themes, results, Door A/B/C) requires zero API calls.
SaaS features (auth, trial counting, Stripe) are layered on top additively.

If any API call fails, the app continues in a degraded mode (no trial enforcement).

---

## Commit roadmap

| Commit | What ships |
|---|---|
| 1 ✅ | SaaS scaffold (this commit) |
| 2 | Supabase Auth — CDN + auth state listener in index.html |
| 3 | profiles + trial schema — finalize SQL, RLS, trigger |
| 4 | Trial limit logic — consume-trial, lock screen wiring |
| 5 | Stripe Checkout — /api/create-checkout-session, USD $9.99/mo |
| 6 | Stripe Webhook — event handling, profiles.plan_status sync |
| 7 | Customer Portal — /api/create-portal-session |
| 8 | PostHog events — core analytics tracking |

---

## Environment variables

See `.env.example` for the full list.

Variables prefixed `NEXT_PUBLIC_` are safe to expose in the browser.
`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET`
are server-only and must never reach the browser.

Set all variables in the Vercel dashboard under Project Settings → Environment Variables.

---

## Payment truth

Payment and account state lives in `supabase.profiles.plan_status`.
It is never stored in `localStorage` (tampered easily, not shared across devices).

Stripe secret keys and webhook secrets require server-side code.
All Stripe operations go through `/api/*` serverless functions.

---

## Trial logic

- Trial limit: 5 completed result views (not abandoned sessions).
- Increment: `POST /api/consume-trial` — called only when result screen is shown.
- Gate: if `trial_used_count >= trial_limit` AND `plan_status !== 'plus'` → show `s-lock`.
- Admin bypass: `isUnlimited()` in index.html returns `true` for `?admin=1` — always unlimited.

---

## DNS migration (not yet done)

Current DNS: GitHub Pages (CNAME `noetune.com`).
Future DNS: Vercel (after full stack verification on preview URL).

Steps to cut over:
1. Add `noetune.com` as a custom domain in Vercel dashboard
2. Update DNS A/CNAME records at your registrar to point to Vercel
3. Verify HTTPS on Vercel
4. Remove GitHub Pages configuration
5. Delete `CNAME` file from repo (or leave it — Vercel ignores it)

Do not cut over until Vercel preview confirms:
- index.html loads correctly
- /api routes respond (even 501 placeholder is fine)
- No JS errors in browser console
- Supabase Auth works (Commit 2)
- Stripe test checkout works (Commit 5)
