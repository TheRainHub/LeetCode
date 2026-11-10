---
slug: sd-security
title: Security in system design
path: system-design
module: sd-building-blocks
order: 7
minutes: 40
depth: concise
practice: conceptual
summary: Authentication and authorization, secrets management, encryption in transit and at rest, input validation, multi-tenancy isolation, rate limiting and the OWASP Top 10.
prerequisites: [tls]
problems: []
objectives:
  - Design authentication (sessions vs tokens, OAuth2/OIDC) and authorization (RBAC/ABAC, object-level checks)
  - Protect data with encryption, secrets management and least privilege
  - Identify common web/API vulnerabilities and mitigations (OWASP Top 10, OWASP API Top 10)
readings:
  - title: "OWASP Top 10"
    url: https://owasp.org/www-project-top-ten/
    kind: docs
  - title: "OWASP API Security Top 10"
    url: https://owasp.org/www-project-api-security/
    kind: docs
  - title: "OWASP Cheat Sheet Series"
    url: https://cheatsheetseries.owasp.org/
    kind: docs
interview:
  - q: "Sessions vs JWTs?"
    a: "Server sessions: opaque id in a cookie, state on the server — easy revocation, needs shared store. JWTs: self-contained signed claims — stateless verification, but hard to revoke before expiry, so use short lifetimes + refresh tokens. For browsers, HttpOnly Secure SameSite cookies either way; never store tokens where XSS can read them if avoidable."
  - q: "What's broken object level authorization (BOLA)?"
    a: "An API that checks the user is logged in but not that they may access the specific object id requested (GET /invoices/123 returns another customer's invoice). Fix: authorization check on every object access, scoped queries (WHERE tenant_id = current tenant), and tests for it."
selfAssessment:
  - I can design authn/authz for a multi-tenant SaaS
  - I can list five OWASP risks with mitigations
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "Secrets such as database passwords should be:"
    options: ["In the git repository", "In a secrets manager/injected at runtime, rotated, with least-privilege access", "In the frontend bundle", "In logs for debugging"]
    answer: 1
    why: "InterviewOS reads its API key from server-side env only for this reason."
  - q: "SQL injection is prevented primarily by:"
    options: ["Escaping quotes manually", "Parameterised queries / query builders", "HTTPS", "Rate limiting"]
    answer: 1
    why: "Keep data and code separate."
  - q: "SSRF (server-side request forgery) risk appears when:"
    options: ["Users upload CSS", "The server fetches URLs supplied by users (webhooks, previews) without restricting destinations", "Using TLS", "Using cookies"]
    answer: 1
    why: "Block internal ranges/metadata endpoints, allowlist hosts."
explain:
  prompt: "Explain the security design for a multi-tenant SaaS API."
  rubric:
    - "Authentication via OIDC; secure session/token handling"
    - "Authorization: tenant isolation in every query, RBAC, object-level checks"
    - "Data protection: TLS, encryption at rest, secrets manager, least privilege"
    - "Input validation, rate limiting, audit logs, dependency scanning"
  model: "Users authenticate through OIDC with the company's identity provider; the API receives short-lived access tokens or uses HttpOnly secure cookies for the web app. Every request resolves the tenant and user, and authorization happens at the data access layer: all queries are scoped by tenant id — optionally enforced with PostgreSQL row-level security — plus role checks for actions and object-level checks for each resource id. Traffic uses TLS, data is encrypted at rest, and secrets live in a secrets manager with rotation; services get least-privilege credentials. All input is validated against schemas, queries are parameterised, user-supplied URLs are restricted to prevent SSRF, and rate limits apply per tenant and key. Security-relevant actions are audit-logged and dependencies and images are scanned in CI."
cards:
  - q: "BOLA (broken object level authorization)"
    a: "Missing per-object authorization; fix with scoped queries and checks on every access."
  - q: "Token storage in browsers"
    a: "Prefer HttpOnly, Secure, SameSite cookies; short-lived tokens; CSRF protection when using cookies."
---

## Explanation

- **AuthN**: passwords (hashed with Argon2/bcrypt), MFA, OIDC/OAuth2 (authorization code + PKCE), sessions vs JWTs.
- **AuthZ**: RBAC/ABAC, object-level checks, tenant scoping, deny by default; Postgres row-level security as defence in depth.
- **Data**: TLS everywhere, encryption at rest, field-level encryption for sensitive data, data minimisation and retention (GDPR).
- **Secrets**: never in code or client bundles; secrets manager, rotation, scoped credentials.
- **Input**: validate with schemas, parameterised queries, output encoding (XSS), CSRF protection with cookies, SSRF allowlists, file upload scanning.
- **Abuse**: rate limiting, bot protection, account lockout with care.
- **Supply chain**: dependency scanning, pinned versions, signed images.
- **Audit**: who did what, when; tamper-evident logs.

## Worked examples

InterviewOS keeps the Anthropic API key server-side only, validates every action's input with Zod, and never executes user code in the Next.js server process — Java/Python run only via a locally generated harness you execute yourself, and TypeScript runs in a browser Web Worker.

## Common misconceptions

- **"HTTPS makes the app secure."** — It protects transport only.
- **"Internal services don't need auth."** — Zero-trust: authenticate service-to-service too.
- **"JWT = secure session."** — Revocation and storage need careful design.

## Practical exercises

1. Threat-model the booking platform: list assets, entry points, and the top five threats.
2. Check one of your APIs for object-level authorization on every endpoint.
