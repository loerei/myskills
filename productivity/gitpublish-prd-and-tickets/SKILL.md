---
name: gitpublish-prd-and-tickets
description: Use when publishing, syncing, or pushing a local PRD and its modular tickets to GitHub Issues.
---

# GitPublish PRD and Tickets

Publish or synchronize a local PRD and its constituent ticket markdown files to GitHub Issues with parallel batch concurrency. Resolves semantic keys (`01.1.1.1`, `02.1`), maps dependencies across both intra-PRD and cross-PRD references, updates parent PRD links, attaches standardized taxonomy labels, and handles in-place updates, splits, and deletions with zero duplicates.

## Directives

1. **High-Performance Parallel Execution**: Runs in-place ticket updates and non-dependent ticket creations concurrently using an internal worker pool (`--concurrency <N>`, default: 6).
2. **Batch Multi-Epic Synchronization**: Supports `--all` flag to discover, pre-scan, and synchronize all Epics under `docs/specs/` in a single command.
3. **Idempotent Reconciliation**:
   - **Matching Key (`01.1` $\to$ `01.1`)**: Executes in-place update (`gh issue edit`) on the existing GitHub issue without creating duplicates.
   - **New Key (Split child `01.1.1` or added `05.2`)**: Creates a new issue (`gh issue create`).
   - **Orphaned Key (Old `01.1` removed or split)**: Automatically comments and closes the stale remote issue (`gh issue close`).
4. **Topological Publishing**: Publishes tickets in topological order so that prerequisite tickets receive GitHub issue IDs before dependent tickets.
5. **Dynamic Key Resolution**: Automatically maps semantic ticket keys (e.g. `01.1.1.1` $\to$ `#138 (01.1.1.1)`) across all ticket bodies and the parent PRD.
6. **Standardized Taxonomy Auto-Labels**:
   - **Parent PRD**: `epic`, `epic-<num>` (e.g. `epic,epic-02`)
   - **Child Tickets**: `ticket`, `epic-<num>` (e.g. `ticket,epic-02`)

---

## Workflow

```mermaid
flowchart TD
    Start["Run publish-epic.js"] --> PreScan["1. Pre-scan sibling PRDs (Build Cross-Epic Map)"]
    PreScan --> Parent["2. Create or Update Parent PRD Issue (#ID)"]
    Parent --> Reconcile["3. Idempotent Reconciliation:<br/>• Detect Match vs New vs Orphaned"]
    Reconcile --> CloseOrphan["Close Orphaned Issues concurrently"]
    CloseOrphan --> ParallelEdit["4. Concurrent In-Place Updates (Pool size: 6)"]
    ParallelEdit --> SeqNew["5. Sequential Topological Creation of New Tickets"]
    SeqNew --> UpdatePRD["6. Update Parent PRD Body with Live Issue Table"]
    UpdatePRD --> Done["Output Mapping Summary & Frontier"]
```

---

## CLI Usage

```bash
# Dry run simulation on single Epic
node <skill-dir>/scripts/publish-epic.js docs/specs/02-codebase-readiness-multios/PRD.md --dry-run

# Reconcile & publish single Epic (concurrency pool of 8)
node <skill-dir>/scripts/publish-epic.js docs/specs/02-codebase-readiness-multios/PRD.md --concurrency 8

# Batch synchronize ALL 5 Epics across the workspace
node <skill-dir>/scripts/publish-epic.js docs/specs/ --all

# Target specific repo or parent issue
node <skill-dir>/scripts/publish-epic.js docs/specs/03-virtual-nested-folders-and-workspaces/PRD.md --parent-id 94 --repo loerei/YumeShelf
```

---

## Output

Outputs a JSON mapping of all published tickets (`"01.1.1.1": 138`) and the immediate unblocked implementation frontier ready for `/implement-a-ticket`.
