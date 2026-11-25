---
name: gitpublish-prd-and-tickets
description: Use when publishing or syncing a local PRD and its tickets to GitHub Issues.
---

# GitPublish PRD and Tickets

Publish or sync a local PRD and its constituent ticket markdown files to GitHub Issues using parallel batch concurrency, semantic keys (`01.1.1.1`, `02.1`), intra-PRD and cross-PRD dependency links, parent PRD updates, taxonomy labels, and duplicate-free reconciliation across updates, splits, and deletions.

## Core Directives

1. **Source Purity & Zero Disk Mutation**:
   - Local files under `docs/specs/` (`PRD.md` and `tickets/*.md`) MUST remain pure semantic files and MUST NEVER be modified on disk by the publish script.
   - All key-to-issue transformations (`01.1` -> `#138 (01.1)`, standalone `PRD 01` -> `#37 (PRD 01)`, parent references) and local workspace `file:///` links -> GitHub `blob/`/`tree/` URLs MUST compile ephemerally in memory or OS tempdir exclusively for GitHub API upload, keeping clean semantic keys and local links intact for `conduct-deep-reviewing-loop`.
2. **Parallel Execution**: Execute in-place ticket updates and independent creations concurrently using the worker pool (`--concurrency <N>`, default: `6`).
3. **Batch Multi-Epic Sync**: Pass `--all` to discover, pre-scan, and sync all Epics under `docs/specs/` in one run.
4. **Idempotent Reconciliation**:
   - Matching Key (`01.1` -> `01.1`): Update existing issue in place (`gh issue edit`) without duplicates.
   - New Key (split child `01.1.1` or new `05.2`): Create issue (`gh issue create`).
   - Orphaned Key (removed or split `01.1`): Close stale remote issue as not planned with a closing comment (`gh issue close --reason "not planned" --comment "..."`).
5. **Topological Publishing**: Publish prerequisite tickets before dependent tickets so downstream issues receive valid upstream GitHub issue IDs.
6. **Taxonomy & Review-State Auto-Labels**:
   - Parent PRD: `epic`, `epic-<key>` (e.g. `epic,epic-02`, `epic,epic-09.1`).
   - Child Tickets: `ticket`, `epic-<key>` (e.g. `ticket,epic-02`, `ticket,epic-09.1`).
   - Unreviewed Draft Flag (`to-be-reviewed`): Applied to **both** Parent PRD and all Child Tickets when `PRD.md` has `Review Status: TO_BE_REVIEWED` (or missing/placeholder `Reviewed-At-Commit`, or `--to-be-reviewed` / `!TBR`), and automatically removed when re-syncing after `Review Status: REVIEWED` (or `--reviewed`). Legacy PRDs lacking `Review Status` with a valid `Reviewed-At-Commit` SHA preserve existing `to-be-reviewed` state unless overridden by CLI flag.
7. **Script-First + Minimal Manual Cleanup (Cost & Safety Boundary)**:
   - Always run `publish-epic.js` for bulk compilation, no-op skipping (`[UNCHANGED]`), parallel updates, topological creation, and dot-split orphan closure (`03` -> `03.1, 03.2`); NEVER manually read all ticket files or loop `gh issue create`/`edit` for bulk epic sync.
   - Reserve manual `gh` calls strictly for semantic transitions that filesystem key diffing cannot safely infer:
     1. **Superseded PRD after `!SPL`** (`<NN>` split into `<NN>.1`, `<NN>.2`): run `gh issue list --label epic-<NN> --state open` and close those superseded issues (`gh issue close --reason "not planned" --comment "Superseded by #<NN.1>, #<NN.2>"`).
     2. **Non-dot ticket merge/renumbering** (e.g. `07 + 08 -> 05`): append a cross-link comment pointing to `#<newId>` on the closed issue if the updated Parent PRD checklist is insufficient.

## Workflow

1. Pre-scan sibling PRDs under `docs/specs/` and query remote `epic`/`ticket` issues (`gh issue list --state all`) to build the cross-Epic key-to-issue map without mutating disk.
2. Ephemerally compile and create/update the parent PRD issue on GitHub (syncing `epic`, `epic-<key>`, and `to-be-reviewed`).
3. Ephemerally compile and run concurrent in-place updates for modified matching tickets (skipping `[UNCHANGED]` issues).
4. Ephemerally compile and topologically create new tickets.
5. Close open orphaned issues concurrently as `not planned` (linking any dot-split child `#id`s created/matched in steps 3-4) and update the Parent PRD checklist.
6. Output the JSON key-to-issue mapping, summary table (`Epic | Parent Issue | Review Status | Tickets`), and unblocked frontier ready for local tracking or `implement-a-ticket`, leaving local files untouched (if publishing post-`!SPL` epics, close stale `epic-<NN>` issues manually per Directive 7).

## CLI Usage

```bash
# Dry run simulation on single Epic
node <skill-dir>/scripts/publish-epic.js docs/specs/<epic-dir>/PRD.md --dry-run

# Reconcile and publish single Epic (concurrency pool of 8, zero disk mutation)
node <skill-dir>/scripts/publish-epic.js docs/specs/<epic-dir>/PRD.md --concurrency 8

# Batch sync all Epics across the workspace (auto-applies/removes `to-be-reviewed` from Review Status)
node <skill-dir>/scripts/publish-epic.js docs/specs/ --all --concurrency 8

# Force review-state label override on legacy PRDs
node <skill-dir>/scripts/publish-epic.js docs/specs/<epic-dir>/PRD.md --to-be-reviewed
node <skill-dir>/scripts/publish-epic.js docs/specs/<epic-dir>/PRD.md --reviewed

# Target specific repo or parent issue
node <skill-dir>/scripts/publish-epic.js docs/specs/<other-epic-dir>/PRD.md --parent-id 94 --repo <owner>/<repo>
```

## Domain Terms and Tag Commands

- **`!TBR` (To Be Reviewed)**: Force `--to-be-reviewed` on target publish/sync even if `Review Status` is missing or already stamped (Default: auto-detected from `PRD.md`; Timing: `Start-time`).
  - **Agent Action**: Pass `--to-be-reviewed` when invoking `<skill-dir>/scripts/publish-epic.js`.
