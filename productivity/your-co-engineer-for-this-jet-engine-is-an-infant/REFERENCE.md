# Reference: Jet Engine Co-Engineer Guide

## 1. The Core Ideology: Explain Through the Idea of Tech Terms

Never explain a technical label by throwing another technical label at the reader. Explain the **underlying physical idea, operational intent, and behavioral mechanics**.

### Translating Software Artifacts into Behavioral Ideas

| Technical Concept / Code Artifact | What NOT to Say (Jargon / Code Snippet) | What to Say Instead (The Underlying Idea) |
| :--- | :--- | :--- |
| **In-Memory Cache / Map** | `Heap Map<string, object>`, `Key-Value Store` | *The Scratchpad / Memory Notebook in RAM* |
| **Rate Limiter / Guard** | `TokenBucketLimiter.isAllowed()`, `Middleware` | *The Gatekeeper checking permissions and counts* |
| **Async Pause / I/O Yield** | `await flushToDisk()`, `Microtask queue yield` | *Stepping away from the desk to wait for disk storage* |
| **Reconciliation / GC** | `State reconciliation loop`, `Garbage collection` | *Reading the destination list and asking source to delete leftovers* |
| **Race Condition** | `Non-atomic concurrent read-modify-write` | *Two requests reading the same count before either writes back* |
| **Deadlock** | `Circular resource lock acquisition failure` | *Two workers holding each other's keys and both refusing to move* |
| **Cache Invalidation** | `Cache invalidation / eviction TTL` | *Tearing up the quick scratchpad note when the main book changes* |
| **AST / Parsing Drift** | `AST representation out of sync with disk` | *Looking at an old photo in memory instead of the actual file on disk* |
| **Backpressure** | `TCP flow control / reactive streams backpressure` | *Telling the sender to pause because the inbox is overflowing* |
| **Atomic Transaction** | `ACID atomic transaction boundary` | *Bundling 5 steps together so if step 4 fails, steps 1-3 undo instantly* |

---

## 2. Diagram Node Labels: Code Snippets vs Behavioral Ideas

Diagrams must communicate topography and movement at a glance. Do NOT turn Mermaid boxes into code dumps:

| Element | ❌ BAD (Raw Code / Runtime Jargon Dump) | ✔ GOOD (Physical Role & Action Verb) |
| :--- | :--- | :--- |
| **Source Node** | `store.get('rate:user_99') -> undefined` | `Check Memory Notebook -> Notebook is empty` |
| **Action Node** | `await this.store.flushToDisk()` | `❌ PAUSE: Wait 50ms for disk write (left desk)` |
| **Component** | `AsyncStore (this.memory Map in Heap)` | `Notebook in Memory (RAM)` |
| **State Mutation** | `this.store.set('key', { count: 1 }) x19` | `19 requests all write 'Count = 1' into notebook` |

---

## 3. The 3 Explanation Styles Compared

| Dimension | Style 1: Abstract Jargon (Opaque) | Style 2: Detached Metaphor (Distorted) | Style 3: Jet Engine Infant (Optimal) |
| :--- | :--- | :--- | :--- |
| **Language** | `"Unidirectional sync without garbage collection."` | `"The pizza delivery guy dropped the box."` | `"The computer copies from A to B, but never checks B to delete old files."` |
| **Target Entities** | Abstract CS concepts | Unrelated real-world objects (pizza, toys) | **The actual files, paths, databases, and code branches** |
| **Understanding** | Only accessible to domain experts | Feels accessible, but distorts how the code actually works | **100% accurate mental model in plain English** |
| **Actionability** | User cannot reason about the fix | User cannot map pizza to their code | **User can immediately collaborate on the exact solution** |

---

## 4. Multi-Mode Case Studies: Applying the 4-Step Framework

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
* **Step 2 (Physical Mechanics & Visualization):**  

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

### Mode C: System Debugging (Concurrent State Overwrite in Rate Limiting)

* **Step 1 (The Punchline):**  
  The rate limiter allowed all 20 concurrent requests instead of capping at 5 because the gatekeeper paused to wait for a slow disk save before recording the first request in memory, causing all 19 subsequent requests to see an empty notebook and independently mark themselves as request #1.
* **Step 2 (Physical Mechanics & Visualization):**  

```mermaid
flowchart TD
    subgraph INCOMING["1. 20 Requests Arrive Simultaneously"]
        Req1["Request #1 (Arrives 1ms earlier)"]
        ReqRest["Requests #2 through #20 (Right behind)"]
    end

    subgraph GATEKEEPER["2. Gatekeeper Checks & Updates Counter"]
        Check1["Request 1: Reads notebook -> Empty<br/>-> Prepares count = 1"]
        Wait1["❌ PAUSE: Steps away to wait 50ms for disk write<br/>(Has NOT written count = 1 into notebook yet!)"]
        
        CheckRest["Requests 2-20: Read notebook<br/>(Notebook is still empty because Req 1 paused!)"]
        PassRest["All 19 requests allowed through<br/>-> All write 'Count = 1' into notebook"]
        
        Wake1["50ms later: Req 1 finishes disk write<br/>-> Allowed through and also writes 'Count = 1'"]
    end

    subgraph NOTEBOOK["3. Memory Notebook (RAM)"]
        StateEmpty["Initial State: Empty"]
        StateFinal["Final State: Recorded only 1 count!"]
    end

    Req1 --> Check1 --> Wait1
    ReqRest --> CheckRest --> PassRest --> StateFinal
    Wait1 -.->|"Paused waiting for disk"| Wake1 --> StateFinal
    StateEmpty -.-> Check1
    StateEmpty -.-> CheckRest
```

  1. Request 1 arrives and inspects the memory notebook. It finds no prior records for this user.
  2. Before writing *"This user has used 1 request"* into the memory notebook, the system steps away to wait 50ms for a background disk write to finish.
  3. While Request 1 is paused waiting for disk, Requests 2 through 20 arrive. They all check the memory notebook, see that it is still completely empty, and conclude they are each the very first request.
  4. All 19 requests allow themselves through and all write "Count = 1" into the notebook.
  5. Request 1 finishes its disk wait, wakes up, also assumes it is the first request, and overwrites the notebook with "Count = 1" one last time. Result: 20 requests enter, but the notebook only recorded 1.
* **Step 3 (Point of Friction / Gap):**  
  The physical sequence of actions was inverted:
  - *Correct:* Reserve counter in RAM immediately $\rightarrow$ Trigger background disk write without waiting.
  - *Current (Broken):* Wait for disk write $\rightarrow$ Only then write counter to RAM.
  The 50ms pause created a blind window where incoming callers acted on stale memory.
* **Step 4 (Concrete Decision & Next Action):**  
  We reverse the order: write the counter directly into the memory notebook synchronously first, and let the disk save run in the background without blocking the execution path.
