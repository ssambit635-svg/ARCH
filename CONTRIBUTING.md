# Contributing to ARCH

Thanks for helping improve ARCH. This repository contains the working early-access application, its tests, and product and operations documentation. For local setup and production preparation, start with [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md); for current product facts and limits, see [`docs/product/CURRENT-STATUS.md`](docs/product/CURRENT-STATUS.md).

## Before you start

- Check the current implementation and open issues before proposing a new feature.
- For a product or scope change, explain the user problem, compatibility impact, and operational cost.
- For a security concern, do **not** open a public issue. Follow [`SECURITY.md`](SECURITY.md).
- Do not add customer metrics, availability claims, compliance claims, plan limits, or provider support without verified evidence and an explicit product decision.

## Development and verification

Use Node.js 20.19 or newer. The full setup, database options, and environment variables are documented in [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).

Before requesting review, run the checks relevant to your change. The standard suite is:

```bash
npm run db:generate
npm run typecheck
npm test
npm run build
```

`npm test` provisions an isolated PostgreSQL test database and runs tests serially. For API changes, also run `npm run smoke:api` against a running local app. For `clients/python` changes, run `pytest clients/python/tests`. Never use production data or commit local environment files, generated corpora, model artifacts, or credentials.

## Engineering requirements

Follow [`AGENTS.md`](AGENTS.md) and the current implementation. In particular:

1. Resolve tenant and role context on the server; never trust client-supplied organization IDs or permissions.
2. Enforce tenant scoping and permissions on every protected read and write.
3. Validate external input with the existing Zod schemas and keep business rules in services.
4. Preserve audit and incident event records when changing incident workflows.
5. Keep secrets and customer content out of logs, responses, screenshots, test fixtures, and commits.
6. Make interactive UI keyboard-operable, labelled, responsive, and complete with loading, empty, and error states.
7. Update the relevant documentation and [`CHANGELOG.md`](CHANGELOG.md) with shipped behaviour in the same pull request.

A documentation/code contradiction is a defect. Do not copy roadmap ideas into status docs as though they are shipped functionality.

## Pull requests

Keep changes focused and describe:

- the user or engineering problem;
- what changed and any migrations or configuration required;
- tests and build checks run, including anything not run;
- important risks, compatibility notes, and intentionally deferred scope.

Use conventional commit subjects when committing: `feat(scope): ...`, `fix(scope): ...`, `docs(scope): ...`, `test(scope): ...`, `refactor(scope): ...`, or `chore(scope): ...`. Do not include unrelated formatting or generated output.

## Documentation style

Use direct language, explain limits, and distinguish implemented behaviour from planned work. Prefer measured facts over adjectives. Keep docs accurate when implementation, security posture, or deployment requirements change.

## Code of conduct and license

Participation is governed by [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). ARCH is proprietary; see [`LICENSE`](LICENSE). A contribution does not transfer ownership and must be submitted under the repository's terms.

---

Owner: Engineering · Last reviewed: 2026-10-11
