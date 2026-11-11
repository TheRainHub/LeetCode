---
slug: model-evaluation
title: Evaluating LLM systems
path: ai-engineering
module: ai-reliability
order: 1
minutes: 50
depth: full
practice: conceptual
summary: Building evaluation sets, choosing metrics (precision/recall, calibration, task success), code-based vs model-graded vs human grading, statistical honesty with small samples, and regression testing prompts.
prerequisites: [structured-outputs]
problems: []
objectives:
  - Build a representative, labelled evaluation set including edge cases and adversarial inputs
  - Choose metrics that match the cost of errors (precision, recall, F1, calibration, task success)
  - Use code-based, model-graded and human grading appropriately and validate LLM judges
  - Report results honestly, with sample sizes and uncertainty, and run evals as regression tests
readings:
  - title: "Anthropic docs — Define success criteria and build evaluations"
    url: https://platform.claude.com/docs/en/test-and-evaluate/develop-tests
    kind: docs
  - title: "Anthropic engineering — Demystifying evals for AI agents"
    url: https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
    kind: article
  - title: "Google ML Crash Course — Classification: precision and recall"
    url: https://developers.google.com/machine-learning/crash-course/classification/precision-and-recall
    kind: docs
interview:
  - q: "How would you evaluate an LLM classifier that flags vulnerable code paths?"
    a: "Build a labelled set from real historical cases with ground truth, stratified by class and difficulty; measure precision and recall per class (especially recall on 'affected'), confusion matrix, calibration of confidence, cost and latency. Inspect errors qualitatively and add them to the set; re-run on every change."
  - q: "Your experiment shows 92% accuracy on 25 examples. What do you say?"
    a: "That it's a small sample: a 95% confidence interval is roughly ±10 percentage points, and accuracy can hide class imbalance — report the confusion matrix and the specific misses (especially false negatives), describe how examples were chosen, and treat it as directional evidence, not a production guarantee."
  - q: "Can you use an LLM to grade outputs?"
    a: "Yes, for open-ended criteria, with a clear rubric, structured scores and reasoning, and ideally reference answers. But validate the judge against human labels on a sample (agreement rate), watch for biases (verbosity, position, self-preference), and prefer code-based checks wherever possible."
selfAssessment:
  - I can compute precision/recall from a confusion matrix
  - I can design an eval set for one of my projects
  - I can communicate small-sample results honestly
completion:
  - Score at least 70% on the quiz
  - Explain an evaluation design in interview mode
quiz:
  - q: "95 of 100 alerts are 'not affected'. A model that always answers 'not affected' has accuracy:"
    options: ["50%", "95% — yet recall on 'affected' is 0%", "5%", "100%"]
    answer: 1
    why: "Accuracy is misleading under class imbalance."
  - q: "Recall on the positive class = "
    options: ["TP / (TP + FP)", "TP / (TP + FN)", "TN / (TN + FP)", "(TP + TN) / total"]
    answer: 1
    why: "Precision is TP / (TP + FP)."
  - q: "A model is well calibrated when:"
    options: ["It's always confident", "Among predictions made with ~80% confidence, about 80% are correct", "Its outputs are JSON", "It never refuses"]
    answer: 1
    why: "Calibration makes confidence usable for routing to humans."
  - q: "Changing a prompt should be accepted when:"
    options: ["One example looks better", "It improves (or doesn't regress) metrics on the evaluation set, with errors reviewed", "It's shorter", "The model agrees"]
    answer: 1
    why: "Treat evals as regression tests."
explain:
  prompt: "Describe how you'd evaluate an LLM-based system you built (or the vulnerability triage agent), including how you'd report results."
  rubric:
    - "Defines success criteria and error costs"
    - "Labelled, representative dataset; edge cases; avoiding leakage"
    - "Metrics: per-class precision/recall, calibration, plus cost/latency; grading method"
    - "Honest reporting: sample size, uncertainty, error analysis; regression runs"
  model: "I'd start by defining what success means and which errors are expensive — for vulnerability triage, missing a real vulnerability is far worse than a false alarm, so recall on 'affected' is the key metric. I'd collect historical alerts with ground-truth labels from engineers, covering different ecosystems, reachable and unreachable usages and tricky cases, and keep them out of prompt examples to avoid leakage. Metrics: confusion matrix, precision and recall per class, calibration of the stated confidence, validity of cited evidence checked by code, plus cost and latency per alert. For reasoning quality I might use a model-graded rubric validated against a human-labelled sample. When reporting, I'd give the sample size and an uncertainty range, list every false negative with an explanation, and be clear that a small experiment is directional. Finally the set runs automatically whenever the prompt, tools or model change."
cards:
  - q: "Precision vs recall"
    a: "Precision = TP/(TP+FP) (how many flagged are right). Recall = TP/(TP+FN) (how many real ones found)."
  - q: "LLM-as-judge caveats"
    a: "Validate against humans; biases (verbosity, position, self-preference); clear rubric."
  - q: "Small-sample honesty"
    a: "Report n, uncertainty, confusion matrix, specific failures; call it directional."
---

## Explanation

### Success criteria

Specific and measurable: "recall ≥ 0.95 on affected alerts with precision ≥ 0.6", "p95 latency < 60 s", "cost < $X per alert". Tie metrics to error costs.

### Datasets

- Real examples beat synthetic ones; add synthetic edge cases deliberately.
- Stratify by class and difficulty; include adversarial inputs (prompt injection, ambiguous cases).
- Keep a held-out set; avoid leaking eval cases into prompts/examples.
- Grow it from production failures.

### Metrics

- Classification: confusion matrix, precision, recall, F1, per-class metrics.
- Calibration: reliability of confidence scores (bucket and compare).
- Generation: exact match / structured checks, rubric scores, faithfulness to sources.
- Agents: task success rate, steps, cost, latency, tool error rate; trajectories, not just final answers.

### Grading methods

| Method | Use | Caveat |
|---|---|---|
| Code-based | exact fields, schema, evidence exists | limited to checkable properties |
| Model-graded | open-ended quality with rubric | validate vs humans; biases |
| Human | ground truth, nuanced judgement | slow, expensive, needs guidelines |

### Statistical honesty

With n = 25 and 23 correct, accuracy is 92% with a 95% interval of roughly 75–98%. Report n, intervals, and individual failures. Run multiple samples per input when outputs vary.

## Worked examples

Confusion matrix for 40 alerts: TP 8, FN 2, FP 5, TN 25 → recall 0.80, precision 0.62, accuracy 0.83. The two false negatives deserve the most attention — what evidence did the agent miss?

InterviewOS's own evaluation prompt follows similar principles: anchored 1–5 scales, null when a dimension wasn't exercised, explicit instructions not to inflate scores, and evidence citations.

## Common misconceptions

- **"Accuracy is the metric."** — Not with imbalance or asymmetric costs.
- **"A few good demos prove it works."** — Demos are cherry-picked by nature.
- **"Model-graded evals are objective."** — They're another model with biases.

## Practical exercises

1. Compute precision, recall and F1 for the worked example and explain which matters most.
2. Design a 30-case eval set for one of your projects; write the labelling guidelines.
3. Write down how you would describe your own project's experimental evaluation honestly in an interview (sample size, what was measured, limitations).
