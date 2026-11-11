---
slug: rag
title: Retrieval-augmented generation (RAG)
path: ai-engineering
module: ai-agents
order: 4
minutes: 45
depth: full
practice: conceptual
summary: Grounding answers in your data — chunking, embeddings and vector search, hybrid retrieval and reranking, prompt assembly with citations, and evaluating retrieval and answers separately.
prerequisites: [llm-apis]
problems: []
objectives:
  - Explain the RAG pipeline (ingest, chunk, embed, index, retrieve, rerank, generate with citations)
  - Choose chunking and retrieval strategies (dense, sparse/BM25, hybrid) and know their failure modes
  - Evaluate retrieval (recall@k) and generation (faithfulness, answer quality) separately
readings:
  - title: "Lewis et al. — Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks"
    url: https://arxiv.org/abs/2005.11401
    kind: paper
  - title: "Anthropic — Introducing Contextual Retrieval"
    url: https://www.anthropic.com/news/contextual-retrieval
    kind: article
  - title: "pgvector (GitHub)"
    url: https://github.com/pgvector/pgvector
    kind: docs
interview:
  - q: "Why use RAG instead of fine-tuning to add company knowledge?"
    a: "RAG keeps knowledge in an updatable index (fresh data, deletions honoured), can cite sources, respects per-user permissions at retrieval time, and is cheaper to iterate. Fine-tuning is better for teaching style/format or narrow behaviours, not for frequently changing facts."
  - q: "Your RAG bot gives wrong answers. How do you debug it?"
    a: "Separate retrieval from generation: check whether the right chunks were retrieved for failing questions (recall@k on a labelled set). If not, fix chunking, embeddings, hybrid search, query rewriting or metadata filters. If yes, fix the prompt (answer only from context, cite, say when unknown) or the model. Build an evaluation set from real questions."
selfAssessment:
  - I can draw the RAG pipeline
  - I can explain hybrid search and reranking
  - I can design an evaluation for a RAG system
completion:
  - Score at least 70% on the quiz
  - Explain RAG debugging in interview mode
quiz:
  - q: "Pure vector (dense) search tends to struggle with:"
    options: ["Paraphrases", "Exact identifiers, codes and rare terms (e.g. error code E1042)", "Semantic similarity", "Long documents only"]
    answer: 1
    why: "Hybrid with BM25 keyword search covers exact matches."
  - q: "Permissions in an enterprise RAG system should be enforced:"
    options: ["By asking the model not to reveal secrets", "At retrieval time by filtering documents the user may access", "After generation", "Not at all"]
    answer: 1
    why: "Never put unauthorised content into the context."
  - q: "Recall@k measures:"
    options: ["Answer fluency", "Whether relevant chunks appear in the top k retrieved results", "Latency", "Token cost"]
    answer: 1
    why: "If retrieval misses, generation can't be faithful."
explain:
  prompt: "Design a RAG assistant that answers questions over a company's engineering documentation."
  rubric:
    - "Ingestion: parsing, chunking with metadata, embeddings, index (vector + keyword), refresh/deletes"
    - "Query: rewriting, hybrid retrieval, permission filters, reranking"
    - "Generation: grounded prompt, citations, 'I don't know' behaviour"
    - "Evaluation: retrieval recall, faithfulness, answer quality; monitoring feedback"
  model: "Ingestion pulls docs from their sources, parses them into sections and chunks them along headings with some overlap, attaching metadata like title, URL, owner, update date and access groups; each chunk gets an embedding and goes into a vector index plus a keyword index — pgvector and Postgres full-text search is enough at moderate scale — with incremental refresh and deletion when docs change. At query time I may rewrite the question using the conversation, run hybrid retrieval filtered by the user's permissions, rerank the top results and pass the best few chunks to the model with instructions to answer only from them, cite the sources, and say when the answer isn't in the documents. I'd evaluate with a set of real questions labelled with the documents that answer them: retrieval recall at k, then answer faithfulness and correctness graded by rubric with human spot checks. In production I'd collect thumbs-up/down and unanswered questions to find gaps in the docs."
cards:
  - q: "RAG pipeline"
    a: "Ingest → chunk → embed → index → retrieve (hybrid) → rerank → generate with citations."
  - q: "Debug RAG"
    a: "Check retrieval first (recall@k), then generation faithfulness."
---

## Explanation

### Pipeline

1. **Ingest** documents (parse PDFs/HTML/markdown), keep metadata and ACLs.
2. **Chunk** along structure (headings), a few hundred tokens with overlap; add context (document title/section) to chunks.
3. **Embed** chunks; store in a vector index (pgvector, dedicated vector DBs) plus a keyword index (BM25).
4. **Retrieve**: hybrid search, metadata/permission filters, top-k.
5. **Rerank** with a cross-encoder or LLM for precision.
6. **Generate**: context in tagged blocks, instructions to answer from context and cite; "not found" path.

### Failure modes

Bad chunking (answers split across chunks), missing exact-match retrieval, stale index, too many irrelevant chunks, model ignoring context, permission leaks.

### Evaluation

Labelled question → relevant-doc pairs; retrieval metrics (recall@k, MRR); generation metrics (faithfulness/groundedness, correctness, citation accuracy); online feedback.

## Worked examples

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE chunks (id bigserial PRIMARY KEY, doc_id bigint, content text, embedding vector(1024), tsv tsvector);
-- dense candidates
SELECT id FROM chunks ORDER BY embedding <=> $1 LIMIT 20;
-- keyword candidates
SELECT id FROM chunks WHERE tsv @@ plainto_tsquery($2) ORDER BY ts_rank(tsv, plainto_tsquery($2)) DESC LIMIT 20;
-- merge (e.g. reciprocal rank fusion) → rerank → top 5 into the prompt
```
(The embedding dimension depends on the embedding model you choose.)

## Common misconceptions

- **"RAG eliminates hallucinations."** — It reduces them; models can still misread or ignore context.
- **"Vector DB = RAG."** — Retrieval quality depends far more on chunking, hybrid search and evaluation.

## Practical exercises

1. Build a tiny RAG over InterviewOS lesson files with Postgres full-text search only, then add embeddings and compare.
2. Write 20 evaluation questions with expected source lessons and measure recall@5.
