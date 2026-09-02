# Reviewer Choice Rationale

| Role Identifier | Selection Status (INCLUDED / EXCLUDED) | Technical Rationale |
| :--- | :--- | :--- |
| `Architect` | `INCLUDED` | Mandatory Core Reviewer. Evaluates system architecture, structural integrity, modularity, and high-level contract consistency. |
| `Progress` | `EXCLUDED` | Excluded per explicit user override and single-ticket refinement scope. |
| `Readiness` | `EXCLUDED` | Excluded per explicit user override. |
| `Security` | `EXCLUDED` | Excluded per explicit user override. |
| `DataMigration` | `EXCLUDED` | Excluded per explicit user override. |
| `Testability` | `EXCLUDED` | Excluded per explicit user override. |
| `Logic` | `INCLUDED` | Mandatory Core Reviewer. Evaluates semantic correctness, state machine transitions, algorithmic flows, and invariant preservation. |
| `Edgecase` | `INCLUDED` | Explicitly selected by user override. Audits boundary conditions, failure modes, race conditions, and error recovery paths. |
| `Performance` | `EXCLUDED` | Excluded per explicit user override. |
| `Observability` | `EXCLUDED` | Excluded per explicit user override. |
| `UXUI` | `EXCLUDED` | Excluded per explicit user override. |
