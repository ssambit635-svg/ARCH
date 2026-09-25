# Training data licenses — ARCH Model (V3)

> **Status:** researched and verified on **2026-09-25** from the sources themselves (GitHub API
> license endpoint, dataset cards, Zenodo record). Licenses change — re-verify before every new
> commercial deployment, and treat this document as engineering due diligence, **not legal
> advice**. If you sell ARCH as a product, have counsel confirm the "commercial use" column.

ARCH trains each organization's model on (1) the organization's **own** resolved incidents, and
(2) optional **shared corpora** an operator downloads with `npm run model:fetch-*`. This file
covers the shared corpora. The license of the trained models themselves is in
[`ARCH-MODEL-LICENSE.md`](./ARCH-MODEL-LICENSE.md).

## How ARCH handles third-party data (the compliance mechanism)

1. **Downloaded at run time, onto the operator's server.** Nothing third-party is committed to the
   repository or shipped with ARCH. The data lives in the git-ignored `model-data/` folder.
2. **Snippets, not copies.** Trained artifacts keep a short clipped snippet (≤ 280 chars) plus the
   source URL per document, so responders can open the original. Full documents, repositories and
   patches are not stored in the model.
3. **Attribution trail.** Every fetch writes/merges `model-data/datasets-manifest.json`, regenerates
   `model-data/THIRD-PARTY-NOTICES.md`, and saves the dataset's license text under
   `model-data/licenses/` whenever it can be fetched.
4. **No redistribution.** Artifacts are per-organization and served only inside that
   organization's dashboard; nothing is published.
5. **No mixing with customer data.** Shared corpora contain no customer data, and one
   organization's incidents never enter another's model (tenant isolation).
6. **Opt-out is trivial.** Delete `model-data/` and retrain; the model falls back to the built-in
   pattern library (original ARCH content) plus the organization's own incidents.

## The datasets

| Dataset | Used for | License (verified 2026-09-25) | Commercial use | Fetcher |
|---|---|---|---|---|
| [SWE-bench](https://github.com/princeton-nlp/SWE-bench) (+ [Verified subset](https://huggingface.co/datasets/SWE-bench/SWE-bench_Verified)) | code-fix knowledge (stack trace → patch) | **MIT** — LICENSE file fetched into `model-data/licenses/swebench-LICENSE.txt` | ✅ allowed; keep the MIT notice (done via the notices file) | `npm run model:fetch-code` |
| [ManySStuBs4J](https://github.com/mast-group/mineSStuBs) ([Zenodo 3653444](https://zenodo.org/records/3653444)) | code-fix knowledge (Java buggy→fixed lines) | Tool repo: **Apache-2.0** (LICENSE fetched). Zenodo dataset record published with the MSR 2020 paper as open data — **check the record page's license line on first download** | ✅ likely; verify Zenodo record terms | `npm run model:fetch-code` |
| [ronantakizawa/github-codereview](https://huggingface.co/datasets/ronantakizawa/github-codereview) | Code Assist / review knowledge | **MIT** per the Hugging Face dataset card (no GitHub repo to cross-check) | ✅ allowed; the comments are humans' opinions on public code | `npm run model:fetch-review` |
| [Microsoft CodeReviewer](https://github.com/microsoft/CodeBERT/tree/master/CodeReviewer) ([model card](https://huggingface.co/microsoft/codereviewer)) | Code Assist / review knowledge | CodeBERT repo: **MIT**; CodeReviewer model card: **Apache-2.0** — ARCH follows the Apache-2.0 obligations (retain notices) | ✅ allowed | `npm run model:fetch-review` |
| [danluu/post-mortems](https://github.com/danluu/post-mortems) | incident knowledge (category classifier, references) | **none — all rights reserved** (no LICENSE file) | ⚠️ review before commercial use. ARCH keeps one-paragraph factual summaries of *publicly published* postmortems + links | `npm run model:fetch-public` |
| [icco/postmortems](https://github.com/icco/postmortems) | incident knowledge | **GPL-3.0** | ⚠️ copyleft. ARCH does not copy the entries' prose — it stores short factual snippets (company, category) + the source URL. Counsel should confirm this is acceptable for your distribution model | `npm run model:fetch-public` |
| [hjacobs/kubernetes-failure-stories](https://github.com/hjacobs/kubernetes-failure-stories) | incident knowledge (Kubernetes) | **none — all rights reserved** (no LICENSE file) | ⚠️ ARCH stores generated one-line index entries (title + tags) + links, not the stories | `npm run model:fetch-public` |
| [saystone/awesome-postmortem](https://github.com/saystone/awesome-postmortem) | incident knowledge (famous outages) | Listed as **CC0** in the repository listing; **no LICENSE file** is present via the GitHub API | ✅ low risk: ARCH stores only the index entry (date + title + company + link); the write-ups stay on the publishers' sites | `npm run model:fetch-public` |

### Notes on the underlying content

- Postmortem corpora are **indexes and summaries of documents their publishers already made
  public** (Cloudflare, Slack, GitLab, AWS, Fastly…). ARCH never scrapes the write-ups themselves.
- SWE-bench instances reference public GitHub issues/PRs; ARCH stores the issue text (clipped) and
  a file-level summary of the gold patch — **not** repository code.
- ManySStuBs4J pairs are single-line code transformations mined from Apache-2.0/oss projects; ARCH
  keeps the buggy line, the fixed line and the bug category.
- Code-review datasets contain reviewer comments on public code; ARCH keeps the comment and a
  clipped diff snippet.

## If you must remove a corpus

```bash
rm model-data/public-incidents.jsonl   # or code-corpus.jsonl / review-corpus.jsonl
npm run model:train                    # or retrain from /dashboard/model
```

The registry keeps old versions until they are superseded; rolling the organization forward
replaces the served artifact. Delete `model-data/` entirely to remove the manifest and notices.
