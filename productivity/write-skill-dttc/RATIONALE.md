# Subdoc Extraction Rationale: write-skill-dttc

## Baseline Audit
- **SKILL.md Size**: ~85 lines | ~5.0 KB
- **Existing Subdocs**: None

## Information Component Analysis

| ID | Information Component | Needed Every Run? | Trigger | Dependencies | Decision |
| :---: | :--- | :---: | :--- | :--- | :--- |
| A | Core Workflow & Decision Tree | YES | Inline Execution Protocol | None | Keep At SKILL.md |
| B | 5-Step Execution Protocol | YES | Primary Execution Path | None | Keep At SKILL.md |
| C | Standard DTTC Section Template | YES | Core Template Definition | None | Keep At SKILL.md |
| D | DTTC Design Reference & Case Studies (Context -> Bad vs Good Solutions) | NO | Heavy Lookup & Reference Material | Component B | Extract to REFERENCE.md |

## Routing Decision
- **Applied Gate**: Gate 1 (Single `REFERENCE.md`)
- **Overlapping Subdocs Principle**: `REFERENCE.md` contains case study patterns comparing raw HITL friction (Bad Approach) vs standardized DTTC tag solutions (Good Approach) using `/conduct-reviewing-loop` as reference. Loaded via progressive disclosure context pointer in `SKILL.md`.
