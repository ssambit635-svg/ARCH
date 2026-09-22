# ARCH — Customer onboarding guide

**Version:** 1.0 · **Owner:** Support · **Last reviewed:** 2026-09-23
**Target:** from signup to a working incident process in **under 60 minutes**, without a call.

> If a step here takes longer than it should, that is a product bug. Tell us and we will fix the
> product, not the document.

---

## The 6-step checklist

| # | Step | Time | Done when |
|---|---|---|---|
| 1 | Create your organization | 2 min | You are OWNER of an org with a slug |
| 2 | Invite the people who need to be in the room | 5 min | At least two members with correct roles |
| 3 | Model what you run (project + services) | 10 min | Each customer-facing thing you monitor is a service |
| 4 | Connect one alert source | 10 min | A test webhook created a real incident |
| 5 | Build and publish the status page | 15 min | A colleague opened the link on their phone |
| 6 | Run a drill, then tell your customers | 15 min | A practice incident ran end to end |

Total: about an hour, and the last step is the one people skip and regret.

---

## Step 1 — Create your organization

**Do:** Sign up, name the organization, choose the slug (this appears in your status page URL and is
worth two minutes of thought — `acme` reads better than `acme-inc-2026`).

**Naming conventions that age well:**
- Organization: the customer-facing company name.
- Project: the product or platform, e.g. `Checkout`, `Mobile API`, `Internal Tools`.
- Service: something you would tell a customer about, e.g. `Checkout API`, `Payments`, `Web app`.

**Avoid:** environment names in customer-facing services (`checkout-prod-2`), and the word
"miscellaneous". You will run an incident in "miscellaneous" one day and nobody will know what it means.

---

## Step 2 — Invite your team

Roles, in one line each:

| Role | Who gets it | Can do |
|---|---|---|
| **OWNER** | Founder / CTO | Everything, including billing and deleting the organization |
| **ADMIN** | Engineering manager, tooling lead | People, integrations, publishing the status page, projects |
| **RESPONDER** | Everyone on call, support lead | Create, assign, update and resolve incidents |
| **VIEWER** | Stakeholders, auditors, sales, customer success | Read-only — incidents, status pages, audit log |

**Rules of thumb:**
- Give RESPONDER to anyone who might be paged. Because seats are not the constraint, there is no
  reason to hold back — the person who could help at 3 a.m. should already be in the room.
- Keep OWNER to two or three people. Every organization should have at least two.
- Give VIEWER to anyone currently asking "what's going on?" on Slack.

**Verify:** can your second member log in and see the same incidents you do — and *only* your org's?

---

## Step 3 — Model what you run

1. Create one project per product or platform.
2. Add a service for each thing a customer would notice going wrong. Ten services is plenty to start;
   fifty is a sign you are modelling infrastructure rather than customer experience.
3. Set initial status to `OPERATIONAL`.
4. Decide which services appear on the public status page, and what they are called publicly.

**Test:** show the service list to someone on the support team and ask whether the names would make
sense to a customer during an outage. If not, rename them now.

---

## Step 4 — Connect your first alert source

Pick whichever is fastest for you:

**Option A — Generic webhook (works with anything)**
1. Create a webhook endpoint; choose provider `generic`.
2. **Copy the secret immediately** — only its hash is stored, so it can never be shown again.
3. Send a signed test payload and confirm an incident appears.

**Option B — A named provider (GitHub / Sentry / Grafana)**
1. Create the endpoint for that provider.
2. Paste the URL and secret into the provider's webhook settings.
3. Trigger a harmless test event.

**Verify — all four must be true:**
- [ ] A correctly signed request created an incident.
- [ ] An unsigned request was rejected (and created nothing).
- [ ] Sending the same event twice did not create two incidents.
- [ ] The incident's timeline shows where it came from.

**If it fails:** check the secret first (most issues), then the timestamp window (clock skew), then the
payload shape. Ask [SUPPORT EMAIL] with the request ID if it still misbehaves.

---

## Step 5 — Build and publish your status page

1. Create the status page; give it a name your customers would recognise.
2. Attach the customer-facing services, in the order a customer would care about them (start with the
   one whose failure they'd notice first).
3. Set public display names. Internal service names stay internal.
4. **Write your "we are aware" message in advance.** The first public update of a real incident should
   not be composed from scratch at 2 a.m.
5. Publish, then open the link on your phone, on mobile data. It should be readable in under three
   seconds, with no login.
6. Add the link to your support email signature, your marketing footer, and your help-centre home.

**Check before publishing:** no personal data, no customer names, no internal hostnames, no
embarrassing placeholders.

---

## Step 6 — Run a drill, then announce

**The drill (30 minutes, worth every minute):**
1. A RESPONDER creates an incident titled `TEST — drill, no customer impact`.
2. Severity MEDIUM, linked to a real service.
3. Assign it to a teammate.
4. Move it `INVESTIGATING → IDENTIFIED → MONITORING → RESOLVED`, with a public update at each step.
5. Watch what appears on the published status page.
6. Resolve, then review the timeline and the audit log together.

**What the drill exposes (and what to fix):**
- People who don't know their login works → fix now, not during an outage.
- Nobody knows who is on call → name a rotation, even a simple weekly one.
- The status page wording confuses a non-engineer → rewrite it before customers read it.
- Notifications landing in spam → fix the domain and allowlist the sender.

**Then tell your customers:** "Our status is now published at [link] — bookmark it." Include it in
your next release note or support reply. A status page nobody knows about prevents zero emails.

---

## Your first real incident: the 8-line playbook

```
1. Declare it in ARCH immediately — an unlogged incident is an unmanaged one.
2. Assign one owner. Two people driving creates parallel realities.
3. Set severity honestly. Inflating it burns trust; deflating it burns customers.
4. Update the status page before you know the cause. Customer experience, not root cause.
5. Post timeline updates as you go — the post-mortem writes itself this way.
6. Fix, then set MONITORING. Never jump straight to RESOLVED on hope.
7. Resolve, email customers, and verify the status page shows the recovery.
8. Within 5 business days: blameless post-mortem. Actions get an owner and a date, or they die.
```

---

## Habits of teams that get value from ARCH

| Habit | Why it matters |
|---|---|
| Declare incidents even for small things | Severity discipline is learned on small incidents |
| One timeline per incident, no side conversations | The timeline becomes the single truth |
| Someone owns every incident within 5 minutes | Unowned incidents drift |
| Public updates on a stated cadence | Customers forgive downtime; they don't forgive silence |
| Post-mortems within 5 business days | Memory decays fast; action items decay faster |
| Review the audit log monthly | Catches role drift before it becomes a security review finding |
| Run a drill every quarter | The rotation changes; the muscle memory shouldn't expire |

---

## Onboarding for larger teams (25+ engineers)

| Extra step | Why |
|---|---|
| Map roles to your on-call structure | Prevents everyone becoming ADMIN "just in case" |
| Agree severity definitions in writing | Half of incident arguments are about severity, not the fix |
| Template your public update wording | Cuts the first update from 10 minutes to 90 seconds |
| Assign a status page editor (ADMIN) | Keeps publishing intentional, not accidental |
| Decide retention in advance | Retention drives cost and compliance, not just storage |
| Run two drills in the first month | The second drill is the one that finds the real gaps |

---

## Getting help

| Need | Where |
|---|---|
| Configuration help | [SUPPORT EMAIL] |
| Response targets and escalation | [SUPPORT-POLICY.md](SUPPORT-POLICY.md) |
| Common questions | [FAQ.md](FAQ.md) |
| Migration from another tool | [SUPPORT EMAIL] — paid plans include import assistance |
| Security or DPA questions | [LEGAL EMAIL] and [SECURITY-AND-COMPLIANCE.md](../engineering/SECURITY-AND-COMPLIANCE.md) |

---

*Owner: Support · Review cadence: 90 days, or whenever a new customer gets stuck on a step*
