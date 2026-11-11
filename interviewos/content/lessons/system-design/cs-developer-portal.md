---
slug: cs-developer-portal
title: "Case study: Internal developer portal"
path: system-design
module: sd-case-studies
order: 6
minutes: 45
depth: full
practice: conceptual
summary: Designing an internal developer portal like Backstage — software catalog ingestion, plugin architecture, search, scaffolding templates, auth/permissions and keeping metadata fresh.
prerequisites: [sd-requirements, component-architecture]
problems: []
objectives:
  - Design a software catalog with ingestion from Git, ownership and relations
  - Explain a plugin architecture (frontend and backend plugins) and its trade-offs
  - Address freshness of metadata, search, permissions and scaffolding (golden paths)
readings:
  - title: "Backstage — Architecture overview"
    url: https://backstage.io/docs/overview/architecture-overview
    kind: docs
  - title: "Backstage — Software Catalog overview"
    url: https://backstage.io/docs/features/software-catalog/
    kind: docs
  - title: "Backstage — Plugins introduction"
    url: https://backstage.io/docs/plugins/
    kind: docs
interview:
  - q: "How does a software catalog stay up to date?"
    a: "Metadata lives next to code (e.g. catalog-info.yaml in each repo); the portal discovers and periodically re-processes these files (and integrates with sources like Git providers, cloud, CI) through processors/providers, validating and resolving relations. Ownership by teams keeps accountability; stale/orphaned entities are surfaced."
  - q: "What are the trade-offs of a plugin architecture?"
    a: "Pros: teams extend the portal independently, features ship without changing the core, consistent shell/navigation. Cons: version compatibility and upgrades, inconsistent quality/UX across plugins, performance of loading many plugins, security boundaries for backend plugins."
selfAssessment:
  - I can draw the main components of a developer portal
  - I can explain catalog ingestion and plugin extension points
completion:
  - Score at least 70% on the quiz
  - Do a system design mock on this prompt
quiz:
  - q: "Storing service metadata as YAML in each repository mainly provides:"
    options: ["Faster builds", "Ownership and freshness through code review and colocated changes", "Encryption", "Smaller repos"]
    answer: 1
    why: "Metadata changes with the code it describes."
  - q: "A Backstage backend plugin typically:"
    options: ["Renders React components", "Exposes APIs and integrates with external systems on behalf of the frontend, holding credentials server-side", "Replaces the catalog", "Runs in the browser"]
    answer: 1
    why: "Secrets stay on the server; the frontend calls the plugin's API."
  - q: "Software templates (scaffolder) in a portal are used to:"
    options: ["Store logs", "Create new services from golden-path templates with CI, catalog entries and repos set up", "Monitor latency", "Replace Kubernetes"]
    answer: 1
    why: "Standardisation at creation time."
explain:
  prompt: "Design an internal developer portal for a company with ~500 services."
  rubric:
    - "Users and use cases: discover services/owners, docs, create new services, see CI/deploy status"
    - "Catalog: entity model, ingestion from repos, relations, validation, refresh"
    - "Plugin architecture: frontend/backend plugins, proxying with server-side credentials"
    - "Search, permissions, performance/caching of integrations, adoption metrics"
  model: "The core use cases are finding a service and its owner, reading its docs and APIs, seeing deploy and CI status, and creating new services the standard way. The heart is a software catalog: entities like components, APIs, systems, groups and users, described in YAML files living in each repository. A catalog backend discovers those files through the Git provider, validates them, resolves relations such as ownership and dependencies, stores them in PostgreSQL and refreshes them periodically or on webhook events. Features are plugins: frontend plugins add pages and entity tabs, backend plugins expose APIs and integrate with systems like CI, Kubernetes or ArgoCD while holding credentials server-side. Integrations are cached because external APIs are slow or rate-limited. Search indexes catalog entities and docs. Permissions come from the identity provider and catalog ownership. With 500 services, data freshness and ownership quality matter more than raw scale, so I'd report entities missing owners or failing validation and track adoption through usage metrics."
cards:
  - q: "Catalog ingestion"
    a: "Discover catalog-info.yaml in repos → validate/process → resolve relations → store → periodic refresh."
  - q: "Why backend plugins"
    a: "Keep credentials server-side, aggregate/caches external APIs, enforce permissions."
---

## Explanation

### Components (Backstage-style)

```text
browser (app shell + frontend plugins)
   → backend (catalog, search, scaffolder, auth, proxy, backend plugins)
       → PostgreSQL (catalog entities, search index or external search)
       → integrations: Git provider, CI, Kubernetes/ArgoCD, cloud, docs storage
```

### Software catalog

Entity kinds (Component, API, System, Domain, Resource, Group, User), metadata/spec, relations (ownedBy, dependsOn, providesApi). Ingestion via locations (repos), processors and entity providers; errors surfaced to owners.

### Plugins

Frontend plugins: routes, entity page tabs/cards, navigation. Backend plugins: REST APIs, scheduled tasks, integrations. Extension points keep the core stable.

### Cross-cutting

- **Auth & permissions**: SSO, ownership-based policies.
- **Freshness**: refresh intervals, webhooks, validation dashboards.
- **Performance**: cache external calls, paginate catalog queries, lazy-load plugins.
- **Adoption**: golden-path templates, TechDocs, usage analytics.
- **Migrations/upgrades**: keeping plugins compatible across framework versions.

## Worked examples

This case study relates to the Backstage work listed in your **My Engineering Experience** section (UI/navigation improvements, plugins, migration). Use it to explain the system around your contribution — and be precise about which parts you personally changed, without adding details you can't back up.

## Common misconceptions

- **"A portal is just a wiki."** — The value is structured, owned, automatically refreshed metadata plus integrations.
- **"Centralise all metadata in one big file."** — Ownership and freshness suffer.

## Practical exercises

1. Write a `catalog-info.yaml` for one of your projects with owner, system and API relations.
2. Run a system design mock with this prompt and include your own experience where it's accurate.
