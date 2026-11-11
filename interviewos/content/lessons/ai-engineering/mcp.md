---
slug: mcp
title: Model Context Protocol (MCP)
path: ai-engineering
module: ai-agents
order: 3
minutes: 30
depth: concise
practice: conceptual
summary: A standard protocol for connecting AI applications to tools, resources and prompts — hosts, clients and servers, transports, and the security model.
prerequisites: [tool-calling]
problems: []
objectives:
  - Explain MCP's roles (host, client, server) and primitives (tools, resources, prompts)
  - Describe transports (stdio, streamable HTTP) and when each is used
  - Identify security concerns (untrusted servers, tool poisoning, authorization, least privilege)
readings:
  - title: "Model Context Protocol — Introduction"
    url: https://modelcontextprotocol.io/
    kind: docs
  - title: "Model Context Protocol — Specification"
    url: https://modelcontextprotocol.io/specification/
    kind: docs
interview:
  - q: "What problem does MCP solve?"
    a: "Without a standard, every AI application needs custom integrations for every tool/data source (M×N). MCP defines a common protocol so a server exposing tools/resources once can be used by any MCP-capable host (IDE, chat app, agent), and hosts get many integrations without bespoke code."
  - q: "What are the security risks of MCP servers?"
    a: "A server's tool descriptions and outputs flow into the model's context, so a malicious or compromised server can inject instructions or exfiltrate data via other tools; servers may hold powerful credentials. Mitigate by installing trusted servers only, least-privilege scopes, user confirmation for sensitive actions, OAuth-based authorization for remote servers, and auditing."
selfAssessment:
  - I can explain host/client/server and the three primitives
  - I can name MCP security risks
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "In MCP, 'resources' are:"
    options: ["Executable actions", "Data the server exposes for context (files, records) identified by URIs", "Prompt templates", "CPU limits"]
    answer: 1
    why: "Tools are actions; prompts are reusable templates."
  - q: "The stdio transport is typically used for:"
    options: ["Remote multi-tenant servers", "Local servers launched as subprocesses by the host", "Browsers", "Databases"]
    answer: 1
    why: "Remote servers use HTTP-based transport."
  - q: "MCP messages are based on:"
    options: ["gRPC", "JSON-RPC 2.0", "GraphQL", "SOAP"]
    answer: 1
    why: "Requests, responses and notifications in JSON-RPC."
explain:
  prompt: "Explain what MCP is and how you'd expose an internal service (e.g. a developer portal catalog) to AI assistants through it."
  rubric:
    - "Roles: host app, client connection, server exposing capabilities"
    - "Primitives: tools (actions), resources (data), prompts"
    - "Design: read-only tools/resources for catalog lookup, schemas, pagination"
    - "Security: auth, least privilege, untrusted content, logging"
  model: "MCP is an open protocol that standardises how AI applications connect to external capabilities. A host application such as an IDE or chat assistant runs an MCP client per server; servers expose tools the model can call, resources that provide context data, and prompt templates, over JSON-RPC via stdio for local servers or HTTP for remote ones. To expose a developer portal catalog I'd write an MCP server with read-only tools like search_entities and get_entity returning owners, docs links and dependencies with clear descriptions and schemas, and resources for individual entity documents. Remote access would use OAuth so the assistant acts with the user's permissions, results would be paginated and trimmed, and every call logged. Write actions, if any, would require explicit confirmation."
cards:
  - q: "MCP primitives"
    a: "Tools (actions), resources (context data), prompts (templates)."
  - q: "MCP roles"
    a: "Host (AI app) ↔ client (per connection) ↔ server (capabilities)."
---

## Explanation

- **Host**: the AI application (IDE, desktop chat, agent runtime).
- **Client**: maintains a 1:1 connection to a server inside the host.
- **Server**: exposes **tools**, **resources**, **prompts**; can also request sampling/elicitation from the client depending on capabilities.
- **Protocol**: JSON-RPC 2.0 with capability negotiation at initialisation.
- **Transports**: stdio (local subprocess), streamable HTTP (remote).
- **Security**: trust model is the user's choice of servers; tool descriptions/outputs are untrusted input to the model; OAuth for remote servers; least privilege; confirmations.

## Worked examples

A local Git MCP server exposes `git_log`, `git_diff` as tools; a docs server exposes markdown files as resources (`docs://handbook/onboarding`). The host lets the model call tools when relevant and shows the user each sensitive call.

## Common misconceptions

- **"MCP is a model feature."** — It's an application-level protocol; any model with tool use can benefit.
- **"MCP servers are safe because they're local."** — Local servers can still read files and run commands.

## Practical exercises

1. Sketch an MCP server for InterviewOS exposing read-only tools like `list_due_reviews` and `get_topic_status`.
2. List what a malicious MCP server could do and how a host should mitigate it.
