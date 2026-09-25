# ARCH Model License (model card)

> Our own license for the ARCH model — what it is, who owns what, and what you may do with it.
> Written for operators and customers, not lawyers; counsel should still review before you sell.
> Companion documents: [`TRAINING-DATA-LICENSES.md`](./TRAINING-DATA-LICENSES.md) (third-party
> data) and the repository root [`LICENSE`](../../LICENSE) (the product itself).

## 1. What "the ARCH model" is

ARCH does not ship a big language model. Each organization's model is a small JSON artifact
(classifiers + a retrieval index, a few hundred KB) produced by `src/server/ai/arch-model/train.ts`
from four kinds of input:

| Component | Content | Ownership / license |
|---|---|---|
| **Pattern library** (`knowledge.ts`) | 22 failure categories, ~50 failure patterns, severity examples | **Original ARCH content** — proprietary, per the repository `LICENSE` |
| **The organization's own incidents** | redacted titles + timeline notes + approved postmortems | **The organization's data.** The trained artifact belongs to that organization; ARCH claims no rights over it |
| **Public postmortems** (optional download) | short snippets + links to published write-ups | Third-party — see `TRAINING-DATA-LICENSES.md` |
| **Code-fix / code-review corpora** (optional download) | SWE-bench (MIT), ManySStuBs4J, github-codereview (MIT), CodeReviewer (Apache-2.0) | Third-party — see `TRAINING-DATA-LICENSES.md` |

So: **the code and the built-in knowledge are ARCH's; your incidents are yours; third-party
snippets stay under their own licenses.** The artifact is a derived database, not a redistribution
of any source — it holds clipped snippets and source URLs, never full documents or repositories.

## 2. What you may do with it

For an organization that runs ARCH (self-hosted or managed):

1. **Use** the trained model to produce drafts inside that organization's workspace.
2. **Retrain, roll back and audit** it — the registry (`arch_model_versions`) is yours to operate.
3. **Export** it (it is plain JSON) for backup or inspection.

You may **not**:

1. Publish, resell or redistribute trained artifacts or the pattern library outside the
   organization (the third-party snippets inside inherit their sources' licenses, and the
   pattern library is proprietary).
2. Use the model's output as if it were authoritative: every output is a **draft** (see §3).

## 3. Acceptable use — the safeguards are part of the license

The model is licensed for use **only** with ARCH's safety layer in place:

- **Draft-only.** Summaries, triage, status updates, postmortems and code patches are suggestions.
  They change nothing until a human (RESPONDER or above) approves them; approvals are recorded.
- **Human approval for code fixes.** Patches are displayed as text and posted to the timeline as
  text — ARCH never applies a patch to a repository by itself.
- **Tenant isolation.** A model is trained on, and served to, exactly one organization.
- **Audit trail.** Every training run, promotion, activation and rollback is written to the audit
  log, including which version served when.
- **Redaction.** Secrets, credentials and emails are stripped before data reaches training or
  inference; Code Assist never stores the code it reviews.

Removing these safeguards voids the license to use the model.

## 4. Capabilities and limitations (be honest with your users)

- The native model is **extractive**: it classifies, retrieves and fills templates from facts it
  was trained on. It does not invent numbers, but it can pick a wrong similar incident — a human
  must review every draft.
- Measured accuracy is displayed next to a majority-class baseline on `/dashboard/model`; below
  ~10 resolved incidents, severity accuracy is not measured.
- Code diagnostics cover known error signatures and ~35 review rules — heuristics, not a compiler,
  fuzzer or security scanner.
- Promotion gate: a retrained version only replaces the active one when it scores better on
  held-out evaluation; otherwise it is kept in the registry as `REJECTED`.

## 5. No warranty

THE MODEL AND ITS OUTPUTS ARE PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL
THE OWNER BE LIABLE FOR ANY CLAIM OR DAMAGES ARISING FROM THE USE OF THE MODEL OR ITS OUTPUTS.
Incident decisions remain the operator's responsibility.

## 6. Versioning of this license

This is version 1 of the ARCH Model License, effective 2026-09-25, matching model format
`arch-native-1` and artifact format 1. Changes to the artifact format or the training corpus
sources bump the "verified" dates in `TRAINING-DATA-LICENSES.md` and this document.
