# Reference: Jet Engine Co-Engineer Guide

## 1. The Core Ideology: Explain Through the Idea of Tech Terms

Never explain a technical label by throwing another technical label at the reader. Explain the **underlying physical idea, operational intent, and behavioral mechanics** using real system entities (`RAM`, `disk`, `network`, `requests`, `counters`).

### Translating Software Artifacts into Behavioral Actions

| Technical Concept / Code Artifact | What NOT to Say (Jargon / Code Snippet) | What to Say Instead (The Literal Action) |
| :--- | :--- | :--- |
| **In-Memory Map / Cache** | `Heap Map<string, object>`, `Key-Value Store` | *The fast counter stored in temporary RAM* |
| **Rate Limiter / Guard** | `TokenBucketLimiter.isAllowed()`, `Middleware` | *The check verifying if a user exceeded their allowed requests* |
| **Async Pause / I/O Yield** | `await flushToDisk()`, `Microtask queue yield` | *Waiting 50ms for a slow disk save before updating RAM* |
| **Reconciliation / GC** | `State reconciliation loop`, `Garbage collection` | *Reading the destination list and asking source to delete leftovers* |
| **Race Condition** | `Non-atomic concurrent read-modify-write` | *Two requests reading the same count before either writes back* |
| **Deadlock** | `Circular resource lock acquisition failure` | *Two operations holding each other's keys and both waiting* |
| **Cache Invalidation** | `Cache invalidation / eviction TTL` | *Throwing away the fast RAM copy when the main database changes* |
| **AST / Parsing Drift** | `AST representation out of sync with disk` | *Looking at an old cached copy in memory instead of the actual file on disk* |
| **Backpressure** | `TCP flow control / reactive streams backpressure` | *Telling the sender to pause because incoming requests are piling up* |
| **Atomic Transaction** | `ACID atomic transaction boundary` | *Bundling 5 steps together so if step 4 fails, steps 1-3 undo instantly* |

---

## 2. Diagram Node Labels & Topology Patterns

Diagrams must communicate topography and movement at a glance. Do NOT turn Mermaid boxes into code dumps or fake anthropomorphic metaphors:

### A. Labeling Anti-Patterns vs Good Behavioral Labels
| Element | ❌ BAD (Reading Code Aloud / AST Dump) | ✔ GOOD (Real Entity & Behavioral Action) |
| :--- | :--- | :--- |
| **Condition Node** | `if (user.activeConnections >= config.MAX_LIMIT)` | `Gateway checks: Does user already have 10 open connections?` |
| **State Buffer Node** | `this.pendingQueue = new Array(capacity = 50)` | `RAM Queue Buffer (Holds up to 50 pending jobs in memory)` |
| **Action Node** | `await this.store.flushToDisk()` | `❌ PAUSE: Wait 50ms for disk save (RAM not updated yet!)` |
| **Mutation Node** | `await db.insert(record); notifyChannel.emit(event);` | `1. Writes record to database table<br/>2. Immediately pushes live alert down socket` |
| **Error / Retry Node** | `catch (e) { this.retryCount++; retryQueue.push(job); }` | `On connection failure: Bumps retry count to 1 and re-queues job` |

### B. Graph Topology Patterns: Fall-Through vs Clean Guard
| Flow Pattern | ❌ BAD (Misleading Parallel Fork) | ✔ GOOD (True Sequential Fall-Through) |
| :--- | :--- | :--- |
| **Missing Return / Fall-Through** | `Diamond --> BranchA`<br/>`Diamond --> BranchB` | `Diamond -- Yes --> Action 1 --> Action 2 (Continues sequentially)`<br/>`Diamond -- No --> Action 2` |

---

## 3. The 3 Explanation Styles Compared

| Dimension | Style 1: Abstract Jargon (Opaque) | Style 2: Detached Metaphor (Distorted) | Style 3: Jet Engine Infant (Optimal) |
| :--- | :--- | :--- | :--- |
| **Language** | `"Unidirectional sync without garbage collection."` | `"The pizza delivery guy dropped the box."` | `"The computer copies from A to B, but never checks B to delete old files."` |
| **Target Entities** | Abstract CS concepts | Unrelated real-world objects (pizza, toys) | **The actual files, paths, databases, and code branches** |
| **Understanding** | Only accessible to domain experts | Feels accessible, but distorts how the code actually works | **100% accurate mental model in plain English** |
| **Actionability** | User cannot reason about the fix | User cannot map pizza to their code | **User can immediately collaborate on the exact solution** |

---

## 4. Multi-Mode Case Studies: Applying the Frameworks

### Mode A: Architecture Planning (Live Notification System)

* **Step 1 (The Punchline):**  
  We should use Server-Sent Events (SSE) instead of WebSockets because the server only needs to push one-way alerts to the browser, and SSE runs over plain HTTP without needing a separate connection server.
* **Step 2 (Physical Mechanics & Visualization):**  

```mermaid
flowchart LR
    Backend["Backend Service"] -->|"1. Plain HTTP Alert (text/event-stream)"| Browser["Browser Client (Listening Socket)"]
```

  1. The browser initiates a standard HTTP request and leaves the socket open.
  2. Whenever a notification occurs, the backend flushes a UTF-8 text line down that open socket.
  3. The browser immediately receives the line without needing two-way heartbeat tunnels.
* **Step 3 (Point of Friction / Tradeoff):**  
  WebSockets keeps a two-way tunnel open and requires custom ping/pong heartbeats. For simple one-way notifications, that extra machinery adds maintenance overhead without providing any two-way benefits.
* **Step 4 (Concrete Decision & Next Action):**  
  We create a single `/api/events` endpoint in `src/server.ts` and connect the frontend with `EventSource`. Do you want to review the endpoint code?

---

### Mode B: Technical Debate / Tradeoff (JSON Column vs SQL Table)

* **Step 1 (The Punchline):**  
  We should put `status` and `user_id` in separate SQL columns and only keep custom user tags in a `metadata` JSON column, because filtering inside JSON across 100,000 rows forces the database to read every single row from disk.
* **Step 2 (Physical Mechanics & Visual Contrast):**  

```mermaid
flowchart TD
    subgraph RELATIONAL["Relational Column: Jump via Index"]
        IndexTree["Sorted Index Tree"] -->|"2ms direct lookup"| RelTarget["Target Rows (10 rows read)"]
    end

    subgraph JSON_BLOB["JSON Column: Read Everything from Disk"]
        FullScan["Disk Read: 100,000 Entire Rows"] -->|"Unpack JSON text per row"| JsonTarget["Target Rows (High CPU Spike)"]
    end
```

  1. **Relational Path:** The database traverses a pre-sorted index tree on disk (reading ~3 index pages), directly locates the 10 matching row pointers, and reads only those 10 rows into RAM. Total time: ~2ms.
  2. **JSON Blob Path:** Because keys inside JSON are unstructured text, the database has no index pointers. It must read all 100,000 table rows from disk into memory, parse the text of every row, and check the string value. Total time: ~450ms with 100% CPU usage.
* **Step 3 (Point of Friction / Tradeoff):**  
  Putting all fields in JSON saves 5 minutes of schema migration today, but causes database CPU to spike to 100% as soon as table size grows past 10,000 records.
* **Step 4 (Concrete Decision & Next Action):**  
  We define explicit SQL columns for `id`, `status`, and `user_id`, and keep `metadata` JSON only for unstructured custom tags. Shall we write the database migration script?

---

### Mode C: System Debugging (Concurrent State Overwrite in Rate Limiter)

* **Step 1 (The Punchline):**  
  The rate limiter allowed all 20 concurrent requests instead of capping at 5 because the system paused to wait for a slow disk save before recording the first request in RAM, causing all 19 subsequent requests to check an empty RAM counter and independently mark themselves as request #1.
* **Step 2 (Physical Mechanics & Visual Contrast):**  

#### Diagram A: Broken Flow (Inverted Order Creates a Stale Memory Window)
```mermaid
flowchart TD
    subgraph INCOMING["1. 20 Requests Arrive Simultaneously"]
        Req1["Request #1 (Arrives 1ms earlier)"]
        ReqRest["Requests #2 through #20 (Right behind)"]
    end

    subgraph BROKEN["2. Broken Flow: Inverted Order of Operations"]
        Check1["Request 1: Reads RAM -> Empty"]
        Wait1["❌ PAUSE: Waits 50ms for disk save<br/>(RAM NOT UPDATED YET!)"]
        
        CheckRest["Requests 2-20: Read RAM<br/>(Still sees empty RAM because Req 1 paused!)"]
        PassRest["All 19 requests allowed through<br/>-> All write 'Count = 1' into RAM"]
        
        Wake1["50ms later: Req 1 finishes disk save<br/>-> Also writes 'Count = 1'"]
    end

    Req1 --> Check1 --> Wait1
    ReqRest --> CheckRest --> PassRest
    Wait1 -.-> Wake1
```

#### Diagram B: Clean Architecture (Immediate Synchronous RAM Update)
```mermaid
flowchart TD
    subgraph FIXED["Clean Flow: Immediate RAM Write"]
        CleanCheck["Incoming Request: Checks RAM Counter"]
        CleanInc["1. Immediately increment counter in RAM"]
        CleanFlush["2. Trigger background disk write without waiting"]
        CleanAllow["3. Allow request through if count <= 5"]

        CleanCheck --> CleanInc --> CleanFlush --> CleanAllow
    end
```

* **Step 3 (Point of Friction / Gap):**  
  The physical sequence of operations was inverted:
  - *Correct:* Update counter in RAM immediately $\rightarrow$ Trigger background disk save without waiting.
  - *Current (Broken):* Wait for disk save $\rightarrow$ Only then write counter to RAM.
  The 50ms pause created a blind window where incoming callers acted on stale RAM state.
* **Step 4 (Concrete Decision & Next Action):**  
  We reverse the order: write the updated counter into RAM synchronously first, and let the disk save run in the background without blocking the request path.

---

### Mode D: Layered System Explanation ("Just Explain" with Visual Contrast)

* **Task:** *"Explain how this background job ingestion and processing service works."*

* **1. The Raw Core Idea (Why does this exist?):**  
  Web servers crash when 5,000 users upload files at once, so this service acts as an **in-memory staging buffer**: it absorbs incoming jobs into fast RAM, spills excess payloads to an emergency disk file when RAM is full, and worker threads process jobs continuously in the background.

* **2. High-Level Movement & Visual Contrast:**  

#### Diagram A: Current Reality (Sequential Fall-Through Causes Duplicate Processing)
```mermaid
flowchart TD
    subgraph BROKEN_INGEST["Current Reality: Sequential Fall-Through"]
        CheckBuffer{"Buffer Check:<br/>Does RAM Queue hold >= 100 jobs?"}
        SpillToDisk["1. Write payload to Emergency Disk Spillover file"]
        FallThrough["❌ MISSING RETURN:<br/>Execution falls through to next line!"]
        PushToRAM["2. Push payload directly into RAM Worker Queue"]
        DuplicateResult["RESULT: Payload saved on Disk AND pushed to RAM<br/>(Worker processes same job twice!)"]

        CheckBuffer -->|"Yes (RAM Buffer Full)"| SpillToDisk --> FallThrough --> PushToRAM --> DuplicateResult
        CheckBuffer -->|"No (Has Room)"| PushToRAM
    end
```

#### Diagram B: Intended Clean Architecture (Mutually Exclusive Storage Guard)
```mermaid
flowchart TD
    subgraph CLEAN_INGEST["Intended Design: Mutually Exclusive Storage Guard"]
        CheckBufferClean{"Buffer Check:<br/>Is RAM Queue full?"}
        SpillClean["Write payload to Emergency Disk File<br/>-> RETURN & EXIT INGESTION"]
        PushRAMClean["Push payload into RAM Worker Queue<br/>-> FINISH INGESTION"]

        CheckBufferClean -->|"Yes (Full)"| SpillClean
        CheckBufferClean -->|"No (Room)"| PushRAMClean
    end
```

* **3. Real Operational Boundaries:**  
  1. *Threshold Desynchronization:* The ingest handler checks a 100-job threshold, but the internal RAM buffer allows up to 200 items before throwing out-of-memory errors.
  2. *Missing Guard:* When RAM is full, the handler writes to disk but fails to return early, accidentally pushing the job into RAM as well.
* **4. Progressive Depth Check-in:**  
  Does this surface layer give you the mental model you need, or do you want to drill into:
  - **(A)** How worker threads drain the emergency disk spillover file once RAM clears, or
  - **(B)** Gating the ingestion handler with an explicit early return branch?
