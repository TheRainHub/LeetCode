---
slug: ci-cd
title: CI/CD and safe deployments
path: backend
module: be-delivery
order: 2
minutes: 40
depth: concise
practice: conceptual
summary: Pipelines that keep main releasable — fast checks, test pyramid, artefact promotion, progressive delivery with canaries and feature flags, and rollback.
prerequisites: [docker-kubernetes]
problems: []
objectives:
  - Design a CI pipeline with fast feedback and reliable gates
  - Explain deployment strategies (rolling, blue/green, canary) and feature-flag-based releases
  - Plan database migrations and rollbacks that don't break running versions
readings:
  - title: "GitHub Actions documentation"
    url: https://docs.github.com/en/actions
    kind: docs
  - title: "Argo CD — Documentation"
    url: https://argo-cd.readthedocs.io/en/stable/
    kind: docs
  - title: "Martin Fowler — Feature Toggles (Pete Hodgson)"
    url: https://martinfowler.com/articles/feature-toggles.html
    kind: article
  - title: "Google SRE Workbook — Canarying releases"
    url: https://sre.google/workbook/canarying-releases/
    kind: book
interview:
  - q: "Deployment vs release?"
    a: "Deploying puts code into production; releasing exposes behaviour to users. Feature flags decouple them, so you can deploy dark, release gradually, target users and turn features off without redeploying."
  - q: "How do you run schema migrations safely with zero downtime?"
    a: "Expand/contract: make backwards-compatible changes first (add nullable column, dual-write), deploy code that uses both, backfill, switch reads, then remove the old column in a later release. Each step works with both old and new app versions running during a rollout."
selfAssessment:
  - I can design a CI pipeline for a TypeScript service
  - I can explain expand/contract migrations
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "A canary release:"
    options: ["Deploys to all servers at once", "Sends a small share of traffic to the new version and compares metrics before expanding", "Runs tests in production only", "Requires two databases"]
    answer: 1
    why: "Automated analysis can promote or roll back."
  - q: "Renaming a column in one step during a rolling deploy:"
    options: ["Is safe", "Breaks old app instances still reading the old name", "Is faster", "Only affects reads"]
    answer: 1
    why: "Use expand/contract."
  - q: "Build once, promote the same artefact to staging and production because:"
    options: ["It's cheaper only", "What you tested is exactly what you ship", "Docker requires it", "It avoids tests"]
    answer: 1
    why: "Rebuilding per environment can introduce differences."
explain:
  prompt: "Describe the pipeline from a merged pull request to a feature being fully released, including how you'd roll it back."
  rubric:
    - "CI: lint, typecheck, tests, build image once, scan, tag by commit"
    - "CD: GitOps/ArgoCD update, staged environments, canary or rolling"
    - "Feature flag for release, gradual rollout with metrics"
    - "Rollback: flag off, revert manifest; backward-compatible migrations"
  model: "On every pull request CI runs lint, type checks and unit tests in parallel, then integration tests; after merge it builds one container image tagged with the commit SHA, scans it and pushes it. CD updates the image tag in the GitOps repository and ArgoCD syncs it to staging, where smoke tests run, and then to production with a rolling or canary rollout watched by error-rate and latency metrics. The new behaviour is behind a feature flag, so it ships dark and is released gradually to internal users, then a percentage of customers. If metrics regress I turn the flag off immediately; if the deploy itself is bad, I revert the GitOps commit. Database migrations follow expand/contract so both versions can run side by side and rollback is safe."
cards:
  - q: "Expand/contract migration"
    a: "Add new (compatible) → dual-write/backfill → switch reads → remove old later."
  - q: "Deploy vs release"
    a: "Deploy = code in prod; release = users see it (feature flags decouple)."
---

## Explanation

### CI

- Fast feedback: lint/typecheck/unit tests in minutes, in parallel; cache dependencies.
- Test pyramid: many unit tests, fewer integration, few end-to-end (critical flows).
- Reproducible builds: lockfiles, pinned base images, build artefact once.
- Gates: required checks, code review, security scanning (deps, secrets, images).

### CD strategies

| Strategy | Pros | Cons |
|---|---|---|
| Rolling | simple, default in K8s | mixed versions during rollout |
| Blue/green | instant switch and rollback | double capacity |
| Canary | limits blast radius, metric-based | needs good metrics and traffic splitting |

### Feature flags

Release toggles, experiment toggles (A/B, e.g. GrowthBook), ops toggles (kill switches), permission toggles. Keep them short-lived; remove stale flags; default to safe values when the flag service is unavailable.

### Migrations

Expand/contract; separate migration jobs from app start; `lock_timeout`; never destructive changes in the same release as code switching away from them.

## Worked examples

```yaml
# .github/workflows/ci.yml (sketch)
on: [pull_request]
jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run lint && npm run typecheck
      - run: npm test
```

## Common misconceptions

- **"CD means deploying without tests."** — It means every change is releasable because tests and gates are automated.
- **"Rollback is always possible."** — Not after irreversible migrations or external side effects; design for roll-forward too.
- **"Feature flags are free."** — They add branches to test and debt to clean up.

## Practical exercises

1. Write a CI workflow for InterviewOS running lint, typecheck, unit tests and build.
2. Plan an expand/contract migration that renames `users.name` to `users.full_name`.
