> ⚠️ **TEMPLATE — NOT LEGAL ADVICE.** Replace every `[PLACEHOLDER]`, and update the cookie table to
> match exactly what the shipped product sets before publishing.

---

# Cookie Policy

**Effective date:** [DD MONTH YYYY] · **Last updated:** [DD MONTH YYYY] · **Version:** 1.0

This Cookie Policy explains how **[LEGAL ENTITY NAME]** ("**ARCH**", "**we**") uses cookies and
similar technologies (local storage, session storage, pixels) on [DOMAIN] and in the ARCH Service. It
should be read with our [Privacy Policy](PRIVACY-POLICY.md).

---

## 1. What cookies are

A cookie is a small text file placed on your device by a website. Cookies let a site remember things
between requests — such as who you are and whether you are signed in. Similar technologies (local
storage, session storage) do the same job in different ways; this policy covers all of them.

---

## 2. Our approach

We keep this deliberately small. ARCH:

- **does not use advertising cookies**;
- **does not use cross-site tracking cookies**;
- **does not sell or share cookie data** with advertisers or data brokers;
- **does not use third-party marketing pixels** on the dashboard or status pages.

Cookies on ARCH fall into two categories: **strictly necessary** (the Service cannot function without
them) and **optional analytics** (off by default in the EU/UK until you consent, if analytics is
enabled at all).

---

## 3. Cookies we set

### Strictly necessary — cannot be disabled while using the Service

| Name (indicative) | Purpose | Type | Lifetime |
|---|---|---|---|
| `authjs.session-token` / `__Secure-authjs.session-token` | Keeps you signed in; identifies your session | First-party, httpOnly, secure, sameSite | Session, or up to 30 days if "remember me" |
| `authjs.csrf-token` | Protects against cross-site request forgery | First-party, httpOnly | Session |
| `authjs.callback-url` | Returns you to the right page after sign-in | First-party | Session |
| `arch.org` | Remembers which organization you are currently viewing | First-party | 1 year |
| `arch.theme` *(if added)* | Remembers light/dark preference | First-party, local storage | Until cleared |
| `arch.consent` | Records your cookie choices so we don't ask again | First-party, local storage | 12 months |

### Optional analytics — only if enabled, and only with consent where required

| Name (indicative) | Purpose | Type | Lifetime |
|---|---|---|---|
| `[ANALYTICS COOKIE]` | Aggregate, non-identifying usage statistics (which pages are used) to improve the product | First-party or privacy-focused provider, no cross-site tracking, IP truncated | [12 months] |

**We do not use Google Analytics or any advertising-network tag on authenticated surfaces.** If a
privacy-focused, cookieless analytics approach is used instead, this table will state that no cookie
is set at all.

### Public status pages

Status pages set **no tracking cookies**. If you subscribe to status updates by email, the
subscription is tied to your email address and a confirmation token, not to a tracking cookie.

---

## 4. Third-party cookies

We do not set third-party cookies on the dashboard. Where a feature links out to a third party (for
example, an OAuth provider sign-in screen, or a payment provider's checkout), that provider may set its
own cookies under its own policy — those are outside our control and are listed here only for
transparency:

| Provider | Where | Purpose |
|---|---|---|
| [OAUTH PROVIDER, e.g. GitHub] | Sign-in only | Authentication session on the provider's own domain |
| [PAYMENT PROVIDER] | Billing checkout only | Fraud prevention, payment processing |

---

## 5. How to control cookies

- **Cookie banner:** where required by law, optional cookies are off until you accept them; rejecting
  them does not degrade the core Service.
- **Browser settings:** all major browsers let you block or delete cookies. Blocking strictly
  necessary cookies will prevent you from signing in to ARCH.
  - Chrome: Settings → Privacy and security → Cookies
  - Firefox: Settings → Privacy & Security → Cookies and Site Data
  - Safari: Settings → Privacy → Manage Website Data
  - Edge: Settings → Cookies and site permissions
- **Do Not Track / Global Privacy Control:** we honour GPC signals for optional analytics where our
  analytics supports it.
- **Withdraw consent:** clear the `arch.consent` value or contact [PRIVACY EMAIL] and we will reset
  your preferences.

---

## 6. Retention of cookie-derived data

Analytics data derived from cookies is retained in aggregate form for **[26] months** and is not used
to identify individuals. Session cookies expire with your session. See the
[Privacy Policy](PRIVACY-POLICY.md) §3 for retention of other data.

---

## 7. Changes

We will update this policy when our cookie usage changes and will note the new "Last updated" date.
Material changes (for example, introducing a new category of cookie) will be announced on the Service
or by email to Organization OWNERS before they take effect.

---

## 8. Contact

| Purpose | Contact |
|---|---|
| Cookie and privacy questions | [PRIVACY EMAIL] |
| Grievance officer | [DPO NAME / DESIGNATION], [DPO EMAIL] |

---

*Owner: Founders (with counsel) · Review cadence: 90 days, or whenever the product's cookie usage
changes — whichever comes first*
