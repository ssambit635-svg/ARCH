# ARCH today: simple facts, features, and limits

*Plain-language product notes and copy that can be used in ARCH. Checked against this repository on 2026-10-11.*

## Short description you can use

> ARCH helps software teams handle service problems in one place. It brings alerts, responders, incident notes, and customer updates together. You run it on your own infrastructure. Its built-in assistant offers suggestions for people to review; it does not promise a correct answer or fix problems on its own.

## Current facts and stats

| What | Current fact |
|---|---|
| Product stage | Early access, version **0.3.0**. Test it privately before relying on it for production response. |
| Team roles | **4**: owner, admin, responder, and viewer. |
| Incident steps | **4**: investigating, identified, monitoring, and resolved. Incidents can be reopened. |
| Service states | **4**: operational, degraded, outage, and maintenance. |
| How it runs | A self-hosted web app with PostgreSQL. A separate worker handles background email and model-training jobs. |
| AI test result | The model guide reports about **77%** accuracy when sorting **342 public incident write-ups into 22 types** in an offline test. This is a narrow test—not an overall AI score or a promise about results on your team's incidents. Refresh the public corpus with `npm run model:fetch-public`, then rerun `npm run model:eval` before publishing this number. |

### Live workspace numbers

The signed-in dashboard shows numbers for the **selected organization**:

- Open incidents, with the critical open count when relevant.
- Incidents resolved in the last 7 days.
- Services marked degraded or outage, and the total number of services.
- Number of team members.
- Recent incidents and recent recorded activity.

These are workspace numbers, not ARCH-wide customer or usage totals. The repository does not provide verified global counts for customers, users, incidents handled, production uptime, or time saved. Marketing previews use sample data.

## Features available now

- Create an organization, invite teammates, search and filter the member roster, assign roles, and revoke pending invitations.
- Open incidents by hand or receive alerts from monitoring tools through secure webhooks you configure.
- Assign an incident, change its status, add notes, and keep a timeline of decisions.
- Organize work by project and service; show what depends on what, record changes, and set service goals (SLOs).
- Publish a customer-facing status page with customer-safe incident updates.
- Keep an audit history of important changes.
- Ask ARCH for incident summaries, triage suggestions, customer-update drafts, postmortem drafts, and help using the workspace.
- Use code-assist features to review supplied code and suggest fixes. For a connected GitHub repository, a human-approved, sandbox-verified fix can open a pull request; ARCH does not merge or deploy it.
- Connect GitHub when configured, and use the beta API and Python command-line tool.

## Limits to explain clearly

- **ARCH is early access.** It is not a managed service with a published uptime promise. The person running it is responsible for deployment, database backups, security settings, email delivery, and monitoring.
- **No seat quota or billing gate is enforced in the app.** Owners and admins can invite members; seat counts in `docs/product/PRICING.md` are unvalidated planning hypotheses, not current product limits.
- **ARCH works alongside monitoring tools.** Your monitors still detect problems and send alerts; ARCH helps your team coordinate the response.
- **The built-in AI is small and limited.** It uses ARCH's own local model, patterns, and workspace information—not a general-purpose AI service. It can be wrong, especially when there is little incident history. People must check its suggestions before acting.
- **AI does not make an unreviewed change to your GitHub repository or deploy code.** It can suggest safe edits to pasted code. A connected-repository fix is tested in a sandbox and needs human approval before ARCH opens a pull request.
- **Integrations need setup.** A GitHub sign-in does not automatically give ARCH permission to change repositories. Email, webhooks, GitHub access, and the background worker each need the right configuration.
- **The product metrics document contains goals, not measured business results.** Do not present those targets as actual customer, reliability, or growth statistics.
- **Pricing and legal documents in this repository are drafts.** They are not published pricing, support, or uptime commitments.

## Safe wording

Good: **“Self-hosted incident-response workspace with human-reviewed assistance.”**

Avoid claims such as **“always available,” “automatically fixes incidents,” “77% accurate at solving incidents,”** or a specific customer count unless those claims have been separately measured and approved. The 77% figure above is only an offline test of incident-category sorting.

## Source notes

- Version and release status: [`README.md`](../../README.md), [`package.json`](../../package.json).
- Dashboard numbers and features: [`src/app/dashboard/page.tsx`](../../src/app/dashboard/page.tsx).
- Native AI and its offline test: [`docs/engineering/ARCH-MODEL.md`](../engineering/ARCH-MODEL.md), [`scripts/arch-model/eval.ts`](../../scripts/arch-model/eval.ts).
- Product metric targets: [`METRICS.md`](METRICS.md).
