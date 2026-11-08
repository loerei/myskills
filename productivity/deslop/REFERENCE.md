# Reference: Technical Deslop Guide

## 1. Deslop Reference: Slop vs. Signal

| Category | Bad (Slopped / Corporate / Fluff) | Good (Deslopped / Plain English / Technical Signal) |
| :--- | :--- | :--- |
| **Marketing Superlatives** | `A cutting-edge, next-generation framework for seamless state management.` | `A state management library with automatic dependency tracking.` |
| **Pompous Verbs** | `Leverage our API to orchestrate asynchronous background job execution.` | `Call the queue API to run background tasks.` |
| **Throat-Clearing Openers** | `In today's fast-paced cloud landscape, managing distributed services is hard.` | `Connects services across cloud providers with automatic TLS encryption.` |
| **Header Tautology** | `## Installation\nThis section explains how to install the package.` | `## Installation\nInstall via npm:\n\`\`\`bash\nnpm install my-package\n\`\`\`` |
| **Vague Reliability Claims** | `Engineered with state-of-the-art enterprise resilience.` | `Retries failed requests up to 3 times with exponential backoff.` |
| **Empty Feature Bullet Titles** | `- **Unmatched Velocity**: Delivers blazing-fast throughput.` | `- Processes up to 5,000 events/second per worker.` |
| **Conversational Chaff** | `Without further ado, let's take a deep dive into how routing works.` | `Routing maps URL patterns to request handlers.` |
| **Passive Voice Obfuscation** | `Optimal performance can be achieved when batch size is increased.` | `Set batch_size to 100 to maximize throughput.` |
| **Hollow Security Claims** | `Built from the ground up with military-grade security in mind.` | `Encrypts payload at rest using AES-256-GCM.` |
| **Circular Parameter Description** | `timeout: The timeout value for the operation.` | `timeout: Maximum seconds to wait before throwing RequestTimeoutError. Defaults to 30.` |

---

## 2. Universal Forms of Technical Documentation Slop

| Slop Form | Anti-Pattern | How to Fix |
| :--- | :--- | :--- |
| **Puffery & Superlatives** | Littering docs with `blazing-fast`, `modern`, `intelligent`, `robust`, `seamless`, `next-gen`. | Cut adjectives. State quantitative benchmarks or underlying algorithms. |
| **Conversational Run-Up** | Opening sections with `Let's dive in`, `Here's what you need to know`, `Look no further`. | Cut introductory filler. State the technical fact or step in the first sentence. |
| **Header Echoing** | Writing an introductory sentence that merely rephrases the header above it. | Jump straight to the code snippet, table, or concrete instructions. |
| **Corporate Buzzwords** | Using `leverage`, `orchestrate`, `utilize`, `streamline`, `empower`, `paradigm`, `synergy`. | Replace with plain technical verbs: `use`, `run`, `call`, `send`, `format`, `connect`. |
| **Unbacked Hand-Waving** | Claiming `infinitely scalable` or `highly resilient` without architecture details. | Explain the concurrency model, retry mechanism, or persistence layer. |
| **Defensive Hedging** | `It should usually work in most normal environments if configured properly.` | State exact supported runtimes, OS versions, and required dependencies. |

---

## 3. Before / After Case Studies by Document Type

### A. Project README Hero & Overview

**Before (Corporate Slop):**
```markdown
# FlowSync

FlowSync is a powerful, cutting-edge, and revolutionary event bus engineered from the ground up to seamlessly orchestrate your microservices. In today's fast-paced cloud landscape, modern teams need robust resilience. FlowSync empowers developers to leverage state-of-the-art pub/sub paradigms with unmatched velocity.
```

**After (Deslopped & Grounded):**
```markdown
# FlowSync

An in-memory publish-subscribe event bus for Node.js services with wildcard topic matching and backpressure handling.

- Throughput: Up to 50,000 messages/sec on a single core
- Zero external dependencies
- Built-in dead-letter queue for unhandled message exceptions
```

---

### B. Quickstart / Installation Section

**Before (Conversational Padding & Header Echoing):**
```markdown
## Installation

In this section, we will guide you through the process of getting started with our tool. First and foremost, make sure that you have Node installed on your machine. Without further ado, let's install the package by running the following command:

npm install flow-sync
```

**After (Clean & Direct):**
```markdown
## Installation

Requires Node.js 18 or higher.

```bash
npm install flow-sync
```
```

---

### C. Configuration Options Table

**Before (Tautology & Missing Operational Values):**
```markdown
## Configuration

| Option | Type | Description |
| :--- | :--- | :--- |
| `retries` | Number | The number of retries for the system. |
| `timeout` | Number | Sets the timeout duration. |
| `debug` | Boolean | Whether debug mode is enabled or not. |
```

**After (High-Signal Technical Documentation):**
```markdown
## Configuration

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `retries` | number | `3` | Maximum retry attempts before routing to the dead-letter queue. |
| `timeout` | number | `5000` | Request timeout in milliseconds. Set to `0` to disable timeout. |
| `debug` | boolean | `false` | Emits verbose connection lifecycle events to `stderr`. |
```

---

### D. Architectural Decision / Why Use This

**Before (Sales Pitch):**
```markdown
## Why FlowSync?

Because other event buses are outdated, bloated, and slow. FlowSync was created by visionary engineers who wanted to build the ultimate developer experience. It is the best choice for any team that cares about excellence and future-proof architectures.
```

**After (Objective Trade-offs & Positioning):**
```markdown
## Architecture & Trade-offs

FlowSync stores all event topics in-memory using a prefix trie:
- **Fast routing**: O(k) topic lookup where k is the number of path segments.
- **Trade-off**: Not persistent across process restarts. For durable multi-node clustering, use Redis Streams or Kafka instead.
```

---

## 4. Human-Facing Technical Noise Checklist

- [ ] Superlatives: `cutting-edge`, `revolutionary`, `blazing-fast`, `state-of-the-art`, `next-gen`, `ultra-lightweight`
- [ ] Empty adjectives: `robust`, `seamless`, `powerful`, `intelligent`, `modern`, `enterprise-grade`
- [ ] Pompous verbs: `leverage`, `orchestrate`, `utilize`, `streamline`, `empower`, `operationalize`
- [ ] Conversational run-up: `Let's dive in`, `Without further ado`, `In today's landscape`, `Look no further`
- [ ] Header echoing: first sentence repeats what the section header already stated
- [ ] Unverifiable claims: statements about performance or scalability without numbers, algorithms, or benchmarks
- [ ] Circular descriptions: defining an option by rephrasing its name
- [ ] Defensive hedging: `should normally work`, `usually fine in most cases`
