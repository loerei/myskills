---
name: deslop
description: Use when asked to edit, clean, or deslop human-facing technical text.
---

# Deslop

Clean and tighten human-facing technical documentation by stripping corporate slop, marketing buzzwords, and redundant filler while preserving developer utility and architectural clarity. For machine-consumed text (prompts, system rules, schemas), use write-for-ai instead.

## Directives

1. **Maximize technical signal, eliminate marketing puffery**: Strip self-congratulatory adjectives (`robust`, `seamless`, `cutting-edge`, `blazing-fast`, `enterprise-grade`, `intelligent`) and pompous verbs (`utilize`, `leverage`, `orchestrate`, `streamline`). State plainly what the software does, how it works, and how to use it.
2. **Preserve practical human context**: Unlike AI-facing text, human technical documents require context. MUST preserve problem statements ("why this exists"), architectural trade-offs, quickstart setup commands, prerequisite dependencies, configuration tables, and concrete code examples.
3. **Use natural technical voice**: Write in clear, direct active voice. Do NOT inject RFC 2119 imperatives (`MUST`, `NEVER`, `ALWAYS`) into general user-facing documentation unless the document is an official RFC or protocol specification.
4. **Eliminate introductory throat-clearing and staged openings**: Cut conversational filler (`In today's fast-paced world`, `Look no further`, `Without further ado`, `Let's dive into`). Start directly with the technical concept, installation step, or usage syntax.
5. **Eliminate title tautology**: NEVER repeat the header text in the first sentence beneath it (e.g. `## Installation\nThis section explains how to install...` -> `## Installation\nInstall via npm:`).
6. **Ground claims in verifiable facts**: Replace vague claims (`designed for extreme scalability`) with concrete architectural facts or benchmarks (`processes 5,000 requests/sec with p99 latency under 20ms`). If no benchmark exists, state the mechanism directly (`uses an in-memory ring buffer`).
7. **Preserve domain and API terms**: Keep exact commands, flag names, types, configuration keys, and error names unchanged.

## Workflows

### 1. Deslop Existing Documentation
1. Read the document to identify core technical purpose, prerequisites, and developer workflows.
2. Strip buzzwords, corporate fluff, empty superlatives, and conversational padding.
3. Cut redundant restatements of headers, tautological sentences, and hollow promises.
4. Verify all code blocks, installation steps, configuration keys, and parameter tables remain functional and intact.
5. Return the cleaned text with a concise summary of cuts made.

### 2. Draft New Technical Documentation
1. State what the project or module does in 1-2 clear, active sentences.
2. Provide immediate installation and minimal runnable Quickstart example.
3. Document core concepts, configuration options, and API signatures plainly.
4. Note limitations, trade-offs, or prerequisites without defensive hedging.

## Subdoc Reference

- Deslop vocabulary reference, before/after case studies, and Noise Checklist: see [REFERENCE.md](REFERENCE.md).
