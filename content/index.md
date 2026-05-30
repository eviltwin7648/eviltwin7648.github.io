---
title: Vishal Rai
description: Backend engineer building AI infra & distributed systems.
cssclasses:
  - home-page
---

hi, i'm vishal

backend engineer obsessed with distributed systems, async workflows, and things that don't fall over at 3am.

currently building AI infra — a durable agent execution runtime and an LLM gateway with semantic caching and cost tracking. open to remote backend / AI infra roles.

[Gmail](mailto:vishalrai10342@gmail.com) · [GitHub](https://github.com/eviltwin7648) · [Twitter](https://twitter.com/notvishalrai) · [LinkedIn](https://linkedin.com/in/mrvishalrai)

---

## projects

###  [devfleet](https://github.com/eviltwin7648/devfleet)
**distributed job orchestration and agent coordination runtime.**
immediate, delayed, and cron jobs with exponential backoff. Go agent runtime with `os/exec` and context-aware timeouts. execution state machine (`CREATED → RUNNING → SUCCESS / FAILED / TIMEOUT`). one-time API keys, JWT auth, heartbeat-based worker liveness, horizontal worker scaling.
the kind of infra you build after a job queue loses work silently at the worst possible time.
*Stack:* `Node.js` · `BullMQ` · `Go` · `PostgreSQL` · `Redis` · `Docker`

###  [nexus](https://github.com/eviltwin7648/nexus)
**AI-powered knowledge engine over your codebase and notes.**
ingests, chunks, and embeds documents into pgvector. retrieval-augmented generation with cosine similarity search. designed around the failure modes — chunk boundaries, embedding drift, answer confidence.
*Stack:* `Go` · `pgvector` · `OpenAI Embeddings` · `PostgreSQL` · `RAG`

### llm-gateway *(in progress)*
**LLM reverse proxy with semantic caching, provider fallback, and cost attribution.**
drop-in layer between your app and any OpenAI-compatible endpoint. Redis semantic cache cuts redundant API calls. per-model cost tracking in PostgreSQL. p95 latency metrics. retry with exponential backoff + jitter on provider rate limits.
*Stack:* `Go` · `Redis` · `pgvector` · `PostgreSQL` · `Prometheus`

---

## writings

Here are some selected writings and system design notes from my digital garden:

-  [[Engineering/Databases/Materialized Tables - The "Poor Man's CQRS" That fixed our slow Queries|Materialized Tables: The "Poor Man's CQRS" That Fixed Our Slow Queries]]
-  [[Nexus/AST-aware Chunking|AST-aware Chunking: Improving RAG Retrieval Accuracy]]
-  [[Engineering/Consistent Hashing|Understanding Consistent Hashing]]
-  [[Nexus/RRF - Reciprocal Rank Fusion|Reciprocal Rank Fusion (RRF) for Hybrid Search]]
-  [[Devfleet/Devfleet Shortcomings & bugs|Post-Mortem: Devfleet Shortcomings & Bugs]]

---

## experience

### [**AntarAI**](https://antarai.org/) · Software Engineer (Full-time)
*Apr 2025 – Present · Remote*

---

## education

### **Vivekananda Global University**
*Bachelor of Technology in Computer Science · May 2021 – May 2025 · Jaipur, Rajasthan*

---


## stack

```
languages    Go · TypeScript · SQL
backend      Node.js · Express · Prisma
infra        PostgreSQL · Redis · RabbitMQ · BullMQ · Docker · AWS EC2
AI / LLM     pgvector · OpenAI API · embeddings · RAG
```

---

## homelab

```
arch laptop ——— tailscale ——— titan (ubuntu server)
                                └── docker workloads
```

two machines. one mesh. zero downtime goals.

---

open to remote backend / AI infra roles · async-preferred · IST
