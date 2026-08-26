# Progress Subdocument: Feature WBS & Granular Slicing

## Domain Audit Checklist

### 1. Work Breakdown Structure (WBS) Slicing
- [ ] Vertical Slicing: Verify that tasks are broken down vertically across layers (UI, API, Data, Tests) rather than horizontally by technical stack.
- [ ] PR Line Count Thresholds: Ensure no individual PR proposal exceeds 400 lines of modified code (excluding auto-generated code and lockfiles).

### 2. Tracer-Bullet Granularity
- [ ] End-to-End Skeleton First: Confirm initial task phases deliver a fully connected end-to-end tracer bullet with minimal mock functionality before building complex edge cases.
- [ ] Independent Value Delivery: Ensure each ticket delivers a testable unit of functionality that can be merged safely behind feature flags.

### 3. Dependency DAG Structure
- [ ] Dependency Ordering: Verify that ticket dependency structures are explicitly specified as a Directed Acyclic Graph (DAG) with no blocking loops.
- [ ] Critical Path Identification: Confirm the critical path is explicitly identified in the work plan to guide task prioritization.

### 4. Prerequisite Structural Isolation ($S \to B$) & Kent Beck's 4 Decision Gates
- [ ] **Prerequisite Structural Isolation ($S \to B$)**: Ensure that structural refactoring / tidying changes ($S$) are isolated into dedicated prerequisite tickets preceding behavioral feature changes ($B$). NEVER permit mixing refactorings and features in the same ticket or PR.
- [ ] **Tidying Economics & Decision Gates**: Verify that task sequencing honors Kent Beck's 4 Decision Gates based on change frequency and urgency:

| Trigger Condition | Decision Gate | Action Route |
| :--- | :---: | :--- |
| Structural change directly makes behavioral change easy or understandable. | **First** | Perform Tidying ($S$) now $\rightarrow$ Commit $\rightarrow$ Perform Behavior Change ($B$). |
| Code structure is messy, but behavioral change is urgent and area will be edited again soon. | **After** | Perform Behavior Change ($B$) now $\rightarrow$ Tidy ($S$) immediately after. |
| Structural change is large (> 1 hour), but time budget is severely constrained. | **Later** | Log Tidying task in backlog $\rightarrow$ Proceed directly with Behavior Change ($B$). |
| Code area is stable, deprecated, or will never be touched again. | **Never** | Leave code intact $\rightarrow$ Perform minimal direct change or leave untouched. |

## Concrete Anti-Patterns

### Anti-Pattern 1: Horizontal Layer Task Decomposition
BAD (Horizontal Layering):
- Ticket 1: Create all DB Schemas for Feature X.
- Ticket 2: Write all backend endpoints for Feature X.
- Ticket 3: Build all frontend views for Feature X.
(Result: Zero testable functionality until Ticket 3 completes; huge integration risk.)

GOOD (Vertical Slicing):
- Ticket 1: Minimal DB schema, API endpoint, and UI component for Core Action A (Tracer Bullet).
- Ticket 2: Add validation rules and schema fields for Secondary Action B.
- Ticket 3: Add edge-case handling and UI error display.

### Anti-Pattern 2: Mixing Refactoring and Feature Implementation in the Same PR
BAD (Mixed Refactoring and Feature):
- Single ticket: "Refactor OrderService and implement Japan Tier Discounts" (750 lines diff; high review fatigue and risky git bisect).

GOOD (Tidy First Order):
- Ticket 1: [Refactor] Extract PricingStrategy interface from OrderService (Tidying S - 120 lines diff).
- Ticket 2: [Feature] Implement JapanSpecialTierStrategy via PricingStrategy seam (Behavior B - 95 lines diff).

## Failure Modes & Mitigations

- Big-Bang Integration Failure: Enforce feature flagging for all intermediate PR merges into main branches.
- PR Stalls via Review Fatigue: Enforce strict PR size limits; require automated splitting of PRs that exceed line thresholds.
