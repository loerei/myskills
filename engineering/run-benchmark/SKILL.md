---
name: run-benchmark
description: Use when running multi-variant A/B/C benchmarks, spawning dry-run subagents, or compiling benchmark reports.
---

# Run Benchmark

## Workflow

1. **Spawn Isolated Dry-Run Subagents**: Parse prompt variants from the benchmark suite and spawn one subagent per variant via `invoke_subagent`:
   - `TypeName`: `"self"`
   - `Workspace`: `"branch"` (prevents file locks and race conditions)
   - `Prompt`: Prefix every benchmark sheet prompt verbatim with:
     `[DRY RUN ONLY - NO MCP SERVERS ALLOWED - NO GLOBAL DOCS - DO NOT CALL WRITE/PATCH/EDIT TOOLS - PROJECT ROOT: <path>] [RULE: Only output the proposed diff. Do NOT write or patch any files on disk.]`
2. **Collect Session Logs**: Once all subagents finish, call `chronicle` (`get_session_benchmarks` / `query_transcript` with `sessionId` and `output`) to save each subagent log (e.g. `<benchmark-dir>/logs/task1-a.md`).
3. **Compile Benchmark Report**: Update the consolidated report (e.g. `benchmark-report.md`):
   - **Table Columns**: `| Metric | Baseline (A) | Variant (B) | Variant (C) | Delta (B vs A) | Delta (C vs A) |`
   - **Rows**: `Task Achievement`, `Agent Steps`, `Tool Calls`, `Execution Time`, `Cumulative Input`, `Peak Context`.
   - **Task Achievement**: Per task record `1` (modified correct file & logic) or `0` (wrong file/project or wrong logic); in summary tables report average percentage (e.g. `71.4% (5/7)`).
   - **Deltas**: Compute `((Variant - A) / A) * 100` with bold `-%` or `+%`; include multiplier (e.g. `13.6x`) for Time and Tokens.
   - **Chart (Optional)**: If the project includes a chart script, update metrics and regenerate the comparison chart.

## Failure Recovery

| Failure / Condition | Recovery Action |
| :--- | :--- |
| Subagent modifies target repo (missing `DRY RUN` prefix or tool guard) | Run `git restore <file>` immediately, discard session, and re-run. |
| `chronicle` returns `"Cannot bind parameter"` on `session_id` | Re-call using camelCase `sessionId`. |
