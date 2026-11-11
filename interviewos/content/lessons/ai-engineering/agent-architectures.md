---
slug: agent-architectures
title: Agent architectures and workflows
path: ai-engineering
module: ai-agents
order: 2
minutes: 45
depth: full
practice: conceptual
summary: From single calls to workflows (chaining, routing, parallelisation, evaluator-optimizer) to autonomous agents and multi-agent systems — when each is justified and how to keep them controllable.
prerequisites: [tool-calling]
problems: []
objectives:
  - Distinguish deterministic workflows from autonomous agents and choose the simplest that works
  - Explain common patterns (prompt chaining, routing, parallelisation, orchestrator-workers, evaluator-optimizer)
  - Manage context, memory, budgets and stopping conditions in agent loops
readings:
  - title: "Anthropic — Building effective agents"
    url: https://www.anthropic.com/engineering/building-effective-agents
    kind: article
  - title: "Anthropic engineering — How we built our multi-agent research system"
    url: https://www.anthropic.com/engineering/multi-agent-research-system
    kind: article
  - title: "Anthropic engineering — Effective context engineering for AI agents"
    url: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
    kind: article
interview:
  - q: "When should you build an agent instead of a fixed workflow?"
    a: "When the steps can't be predicted in advance and the model must decide what to do based on intermediate results (open-ended investigation, coding tasks). If the steps are known, a workflow (chain/route) is cheaper, faster, more predictable and easier to test. Start simple and add autonomy only where it measurably helps."
  - q: "What are the main risks of autonomous agents?"
    a: "Compounding errors over many steps, runaway cost/latency, loops, acting on injected instructions, unclear stopping, and hard-to-reproduce behaviour. Mitigate with budgets, checkpoints, human approval for risky actions, good tools, tracing and evaluations."
selfAssessment:
  - I can choose a workflow pattern for a given task
  - I can explain context management for long-running agents
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "Classifying support tickets and sending each category to a specialised prompt is:"
    options: ["An autonomous agent", "Routing", "RAG", "Fine-tuning"]
    answer: 1
    why: "A workflow pattern with predictable structure."
  - q: "An evaluator-optimizer loop:"
    options: ["Trains the model", "Has one LLM generate and another critique against criteria, iterating until it passes or a limit is hit", "Measures latency", "Is a database"]
    answer: 1
    why: "Useful when quality criteria are clear."
  - q: "A long-running agent's context fills up with old tool outputs. Common remedy:"
    options: ["Ignore it", "Compaction/summarisation, external memory (notes/files) and trimming stale tool results", "Restart from scratch each step", "Use a bigger temperature"]
    answer: 1
    why: "Context engineering keeps the relevant information in view."
explain:
  prompt: "Explain how you'd decide between a workflow and an agent for an LLM feature, using a concrete example."
  rubric:
    - "Defines workflow (predefined steps) vs agent (model-directed loop)"
    - "Criteria: predictability of steps, need for adaptivity, cost/latency, risk"
    - "Concrete example and chosen pattern"
    - "Controls: budgets, evals, human checkpoints"
  model: "A workflow runs predefined steps where the LLM fills in parts — classify, then extract, then summarise — while an agent lets the model choose the next action in a loop with tools until it decides it's done. I start with the simplest option and only add autonomy when the steps genuinely can't be known in advance. For example, generating release notes from merged pull requests is a workflow: fetch PRs, summarise each, group by category and format, with predictable cost and easy tests. Investigating whether a vulnerability affects a repository is agent-shaped, because which files to read depends on what earlier searches found. Even then I constrain it: read-only tools, a step and token budget, a structured final answer, tracing, an evaluation set, and human review before any decision with consequences."
cards:
  - q: "Workflow vs agent"
    a: "Workflow: predefined steps. Agent: model chooses actions in a loop."
  - q: "Workflow patterns"
    a: "Chaining, routing, parallelisation, orchestrator-workers, evaluator-optimizer."
---

## Explanation

### Spectrum

1. **Single call** (+ retrieval/tools) — most features.
2. **Workflows**: prompt chaining (with gates), routing, parallelisation (sectioning/voting), orchestrator-workers, evaluator-optimizer.
3. **Agents**: loop of think → act (tool) → observe, until done or budget hit.
4. **Multi-agent**: lead agent delegating to sub-agents with separate contexts (good for broad, parallel research; costly).

### Controlling agents

- Clear goal and stopping criteria; step/token/time budgets.
- Good tools (see Tool calling); environment feedback (tests, linters) to ground progress.
- **Context engineering**: keep the context small and relevant; compaction, notes/memory files, sub-agents for isolated subtasks.
- Human-in-the-loop checkpoints for risky actions.
- Tracing, evaluation sets, cost monitoring.

## Worked examples

A coding agent that fixes failing tests works because the environment gives objective feedback (tests pass/fail). An agent that "improves the codebase" with no criteria tends to wander — define a measurable goal or use a workflow.

## Common misconceptions

- **"Agents are always better than workflows."** — They trade predictability and cost for flexibility.
- **"Multi-agent systems are more reliable."** — They multiply cost and coordination failures; use when parallelism pays off.

## Practical exercises

1. For five LLM features you know, label each as single call, workflow pattern or agent, and justify.
2. Add a budget and stopping condition to a simple agent loop you've written.
