# Noetune v17 Current Billing & Auth Snapshot

> Status: Temporary factual snapshot
> Date: 2026-07-12
> Purpose: Record the current implementation before migrating billing and membership responsibilities fully to v17.

---

## 1. Scope

This document records current code facts only.

It is not the target architecture and must not be treated as permanent product policy.

Source files reviewed:

```text
app-v17.html
js/v15/access.js
js/v15/billing-ui.js
js/v15/billing-core.js
js/v17/auth.js
en.json
ja.json
zh-TW.json
```

---

## 2. Current Runtime Structure

`app-v17.html` currently loads both v15 and v17 modules.

Relevant order:

```text
js/v15/access.js
js/v15/billing-ui.js
js/v15/billing-core.js
js/v15/auth-ui.js
js/v15/progress-save.js
js/v15/auth-core.js
js/v17/auth.js
```

This means v17 authentication currently operates on top of compatibility globals and billing functions still defined by v15 files.

---

## 3. Current Authentication State

`js/v17/auth.js` defines a v17 authentication state object:

```js
{
  status: 'idle',
  user: null,
  profile: null,
  error: null
}
```

Known auth statuses include:

- `idle`
- `loading`
- `guest`
- `free`
- `plus`
- `error`

The module initializes Supabase dynamically, restores the session, calls `/api/me`, and stores the returned profile.

It also synchronizes v17 state into compatibility globals:

```text
currentUser
currentProfile
supabaseClient
```

This compatibility layer allows older v15 functions to continue working.

---

## 4. Current Profile and Pro Detection

Current Pro detection is based on:

```js
currentProfile.plan_status === 'plus'
```

The same condition is used by both the legacy access layer and the v17 auth helper.

Current behavior effectively supports only:

- guest
- free
- plus

It does not independently represent:

- active subscription
- scheduled cancellation
- payment attention
- ended subscription
- unknown billing state

`plus` is currently both a plan label and an entitlement decision.

---

## 5. Current Access Logic

`js/v15/access.js` currently owns multiple responsibilities.

### Pro entitlement

```js
function isUnlimited() {
  return currentProfile && currentProfile.plan_status === 'plus';
}
```

### Trial and lock logic

The same file also contains:

- trial exhaustion detection
- lock-screen enforcement
- guest first-session tracking
- login requirement after the first guest session
- trial consumption via `/api/consume-trial`
- claim logic dependencies used by the HTML

This mixes:

- entitlement
- trial-era product rules
- navigation
- server mutations
- guest localStorage state

Before migration, each rule must be confirmed as still valid for the current v17 Free/Pro strategy.

---

## 6. Current Checkout Flow

`js/v15/billing-core.js` currently implements Checkout.

Behavior:

1. Detects whether the current screen is lock or pricing.
2. Requires Supabase and an authenticated user.
3. Gets the current Supabase access token.
4. Sends an authenticated request to:

```text
POST /api/create-checkout-session
```

5. Redirects to `data.url` when returned.

Current request body is empty.

Therefore, regional Price selection is presumed to happen on the backend or is not yet implemented.

The frontend currently does not send an explicit region, currency, or Price ID.

---

## 7. Current Customer Portal Flow

`js/v15/billing-core.js` currently implements Customer Portal.

Behavior:

1. Requires Supabase and an authenticated user.
2. Gets the current access token.
3. Sends an authenticated request to:

```text
POST /api/create-portal-session
```

4. Redirects to `data.url` when returned.

The current Portal button source is:

```text
account-manage
```

The current UI opens Stripe Portal directly. There is no complete in-app membership status screen yet.

---

## 8. Current Billing UI

`js/v15/billing-ui.js` currently:

- updates pricing CTA labels
- shows Portal controls only for `isUnlimited()` users
- calls `updateAccountActions()`
- tracks a simple `subscription_active` event

It does not render:

- actual contract amount
- actual currency
- billing interval
- next billing date
- scheduled cancellation
- final Pro access date
- payment-attention state
- ended state
- unknown state

---

## 9. Current Account Menu

The HTML contains:

```text
account-login
account-signup
account-professional
account-manage
account-logout
```

Current behavior:

### Guest

- login visible
- signup visible

### Free

- Pro/pricing action visible
- logout visible

### Plus

- manage action visible
- logout visible

Both inline HTML functions and `js/v17/auth.js` update account-menu visibility.

This creates duplicate ownership of account UI state.

---

## 10. Duplicate or Overlapping Ownership

Current implementation has overlapping responsibilities.

### Account state

Handled by:

- inline functions in `app-v17.html`
- `js/v17/auth.js`
- `js/v15/billing-ui.js`

### Pro detection

Handled by:

- `js/v15/access.js`
- helper logic in `js/v17/auth.js`

### Billing UI refresh

`js/v17/auth.js` calls legacy functions when authentication state changes:

```text
updatePricingCTA()
updatePricingAccountState()
updatePortalButton()
```

This means v17 authentication is not yet independent from the v15 billing UI.

---

## 11. Current Locale State

The three locale files identify themselves as v17.

```text
en
ja
zh-TW
```

They include:

- Free / Pro pricing-page copy
- account button labels
- basic manage-plan copy
- bookmark copy

Current Pro price copy is still represented as preparation/coming soon.

Examples:

```text
準備中
Coming soon
準備中
```

Prices are not yet supplied dynamically in the visible locale content.

There is no complete localized membership-state copy for:

- active
- cancellation scheduled
- final access date
- payment attention
- ended
- unknown
- next billing date
- actual billing interval

---

## 12. Localization Quality Risk

The Traditional Chinese locale contains a substantial number of untranslated or malformed theme-library labels mixed with English and unnatural word order.

This is broader than billing and membership, but it is a release-quality risk for the full product.

It should be treated as a separate localization QA workstream so it does not silently expand the billing migration scope.

At minimum before public release:

- check all visible landing, account, pricing, session, and result copy
- identify whether malformed theme-library entries are reachable in the release build
- correct critical visible Traditional Chinese strings

---

## 13. Known Missing Billing Data

The reviewed frontend code does not show evidence that it currently receives or renders these fields:

```text
subscription_status
cancel_at_period_end
current_period_end
price_amount
price_currency
price_interval
```

These fields may exist in backend files not yet reviewed.

They must be confirmed before frontend implementation.

Do not infer or fabricate them in the frontend.

---

## 14. Current API Endpoints Observed

```text
GET  /api/config
GET  /api/me
POST /api/create-checkout-session
POST /api/create-portal-session
POST /api/consume-trial
POST /api/claim-guest-first-session
```

Stripe webhook endpoints were not included in the reviewed files and remain unknown in this snapshot.

---

## 15. Current Risks

### Structural risks

- v17 auth depends on v15 billing functions.
- account UI has more than one owner.
- Pro plan and subscription health are collapsed into one `plus` flag.
- trial-era logic may conflict with the current unlimited Free strategy.
- billing state cannot be explained clearly to users.

### Release risks

- active and cancel-scheduled may look identical
- a payment problem may still look like healthy Pro
- ended access may remain stale until profile refresh
- displayed price may not match the real Stripe contract
- Portal access depends on correct backend customer lookup
- Traditional Chinese visible content may be incomplete or malformed

---

## 16. Migration Requirements

Before v15 billing/access files are removed from runtime:

- create v17 entitlement logic
- create normalized billing state
- create v17 Checkout and Portal client functions
- create one owner for account UI
- create an in-app membership screen
- update v17 auth integration
- verify current trial rules against the latest product decision
- confirm backend data contract
- confirm webhook behavior
- complete three-language membership copy

---

## 17. Temporary Rules During Migration

Until migration is complete:

- do not add new functionality to v15 billing files
- do not duplicate new v17 functions under the same global names
- do not remove v15 scripts before confirming all references
- do not change access policy merely to fit the old `plus` flag
- do not hardcode Price IDs or displayed prices in HTML or locale JSON
- do not display raw Stripe statuses

---

## 18. Snapshot Retirement

This file should be retired after:

- v17 billing and access modules are live
- v15 billing/access scripts are no longer loaded
- backend contract is documented in the technical specification
- QA results are recorded

Then:

1. merge lasting facts into `02 Technical & Content Specification.md`
2. merge implementation decisions into `03 Implementation, QA & Decisions.md`
3. archive or delete this snapshot
