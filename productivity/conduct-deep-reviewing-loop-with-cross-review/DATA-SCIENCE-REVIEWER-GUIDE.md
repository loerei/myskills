---
name: data-science-reviewer-guide
description: Use when auditing statistical validity, leakage, feature hygiene, business actionability, or visualization contracts.
---

# Data Science Reviewer Guide

Audits statistical validity, cross-validation topology, preprocessing and target leakage prevention, train-serve parity, model-tailored feature views, numerical stability, deterministic reproducibility, business actionability, and visualization contracts in Directive Artifacts (DA).

## 1. Core Review Protocol & Constraints

- **Clean-Slate Isolation**: Audit target DA(s) solely against codebase ground-truth, `<review_dir>/Context.md`, and this guide. NEVER inspect git history, `<review_dir>/host/`, or sibling roles' reports.
- **Track-Aware Review Routing**:
  - **Identify Track Intent**: Determine whether the target DA is an **Applied Business Consulting / PoC** project (e.g. telecom retention, financial risk, operational forecasting) or an **Algorithmic Competition / Benchmark** (e.g. Kaggle metric maximization).
  - **Enforce Track Invariants**:
    - If **Applied Business ML**: Enforce the **Two-Tier Gate** (Model Validity -> Business Actionability) and unit economics. Enforce strict bans on uninterpretable multi-layer stacking or opaque deep neural ensembles that violate executive presentation budgets.
    - If **Competitive Benchmarking**: Permit simplex-constrained ensembling, Probit Rank-Gauss blending, and multi-model stacking, while isolating these techniques from production or executive-facing deliverables.
    - If **Visualization / Dashboard**: Enforce the Python-to-Frontend data contract (`schemaVersion: 1`), 4-state component lifecycles, and layout stability (`CLS = 0`).
- **Single-Pass Exhaustiveness**: Scan the entire DA end-to-end and report all data/target leakage paths, split topology misalignments, uncalibrated decision thresholds, non-actionable feature leaks, missing business cost-benefit matrices, and UI layout shifts in one pass. Write `<review_dir>/reports/DataScience.md` directly via `write_to_file`.
- **Empirical Verification (`<review_dir>/sandbox/DataScience/`)**:
  - Author self-contained verification scripts in `<review_dir>/sandbox/DataScience/verify_<name>.py` to test index alignment, cost-benefit profit curves, tensor broadcasting, or CV split disjointness under a 15-second timeout. NEVER mutate repository source files.

## 2. Miss-Probability Gate (Headless AI Implementer Baseline)

Assume the implementer is an AI coding agent operating in headless CI that writes production code and tests directly from ticket text without exploratory manual inspection:

| Defect Behavior for Headless AI Implementer | Classification |
| :--- | :--- |
| Silently passes unit/shape tests while causing target/preprocessing leakage, missing entity `.shift(1)` causal gates, group/temporal split contamination, 100% test `NaN` collapse via index misalignment, optimizing default 0.5 threshold instead of business profit curve, treating non-intervenable demographic features as operational business levers, omitting baseline model benchmarks, or hardcoding un-normalized blend weights | **Blocking Defect** (MUST include `Why This Would Be Missed` and code remediation). |
| Produces an immediate syntax error, shape crash, missing import, or failing test assertion with an obvious single-line fix | **Suggestion Only** (NEVER mark as Blocking Defect). |
| Modeling or consulting requirement violates mathematical, statistical, or hardware bounds, or lacks target business data with zero viable in-scope paths | **`STATUS: INFEASIBLE`** (takes overall status precedence; include `Infeasibility Proof`). |

---

## 3. Mandatory Audit Checklist

1. **Common Foundations & Data Leakage Prevention**:
   - Are stateful transformers fitted strictly within training splits (`fit` on train, `transform` on val/test)?
   - Does split topology align with the data generating process (`GroupKFold` for repeated entities, `TimeSeriesSplit` with purge/embargo for temporal records, `StratifiedKFold` for imbalanced targets)?
   - Are temporal rolling features protected by an explicit `.shift(1)` entity causal gate?
   - Are sliced Series converted to positional NumPy arrays (`.to_numpy()`) before DataFrame assembly to prevent 100% test `NaN` collapse?
   - Are RNG seeds comprehensively initialized across Python, NumPy, PyTorch, and CUDA?
   - *Details: see [DS-COMMON-FOUNDATIONS.md](DS-COMMON-FOUNDATIONS.md).*

2. **Applied Business ML & Strategy Consulting Track**:
   - Does the solution satisfy the **Two-Tier Gate**: passing statistical validity (Gate 1) before verifying business actionability and ROI (Gate 2)?
   - Is decision thresholding tuned against an explicit **Cost-Benefit Matrix** ($C_{FP}, C_{FN}, B_{TP}, B_{TN}$) and profit curve rather than naive 0.5 accuracy or F1?
   - Does customer targeting prioritize top risk cohorts using cumulative gains and decile lift analysis?
   - Are feature importances explicitly filtered for **intervenable operational levers** (pricing, equipment upgrades, service quality) versus immutable traits (age, gender)?
   - Does model architecture include a simple, interpretable baseline (e.g. Logistic Regression) alongside primary tabular models (GBDT)? Are multi-layer stacking ensembles and MoE architectures rejected?
   - Does the deliverable fit within the executive presentation budget (e.g. 15-slide cap) with a clear narrative thread: Market Context -> EDA Evidence -> Model Signal -> Operational Action -> Quantified ROI?
   - *Details: see [DS-APPLIED-BUSINESS-ML.md](DS-APPLIED-BUSINESS-ML.md).*

3. **Data Exploration & Visualization Track**:
   - Does data flow from Python to frontend via versioned, pre-aggregated JSON envelopes (`schemaVersion: 1`), banning direct parsing of 100k raw CSV rows in Node.js/browser?
   - Do UI chart components declare explicit aspect ratios (`aspect-ratio: 16 / 9`) and min-heights to enforce zero cumulative layout shift (`CLS = 0`)?
   - Are all component views handling the complete 4-state lifecycle (`Idle`, `Loading`, `Success`, `Error` with retry)?
   - Are specialized ML plots (SHAP beeswarm, ROC/PR curves) exported as clean vector SVGs?
   - Are domain findings strictly partitioned into verified empirical `Facts` and testable `Hypotheses`?
   - *Details: see [DS-VISUALIZATION.md](DS-VISUALIZATION.md).*

4. **Competitive Benchmarking Track (Kaggle / Algorithm Challenges)**:
   - For pure metric optimization, does ensembling use **Simplex-Constrained Out-of-Fold Optimization** over heuristic guess-blending?
   - Are derivative-free solvers (Nelder-Mead, Powell) used for piecewise-constant step metrics (ROC-AUC, F1)?
   - Are model predictions projected onto standard normal Probit Rank-Gauss space ($\Phi^{-1}(\text{rank}(p_i))$) before blending?
   - Is ensembling strictly isolated from executive consulting presentations where model simplicity and feature attribution are mandatory?
   - *Details: see [DS-COMPETITIVE-BENCHMARKING.md](DS-COMPETITIVE-BENCHMARKING.md).*

---

## 4. Domain Subdocuments Routing Table

Execute `view_file` on subdocuments matching the target DA's execution path:

| Subsystem Archetype | Trigger Condition (When to Load) | Subdocument |
| :--- | :--- | :--- |
| **Universal Foundations** | DA touches dataset splitting, cross-validation, leakage, feature matrices, tensor ops, or reproducibility | [`DS-COMMON-FOUNDATIONS.md`](DS-COMMON-FOUNDATIONS.md) |
| **Applied Business Consulting** | DA touches business PoC, churn/retention, ROI quantification, cost-benefit tuning, intervenability, or executive slides | [`DS-APPLIED-BUSINESS-ML.md`](DS-APPLIED-BUSINESS-ML.md) |
| **EDA & Visualization** | DA touches data aggregation, JSON export, UI chart components, layout stability, or SVG plots | [`DS-VISUALIZATION.md`](DS-VISUALIZATION.md) |
| **Competitive Benchmarking** | DA touches Kaggle/competition pipelines, simplex blending, Probit rank ensembling, or metric optimization | [`DS-COMPETITIVE-BENCHMARKING.md`](DS-COMPETITIVE-BENCHMARKING.md) |

---

## 5. Verdict Rules & Standard Output Protocol

Write evaluation to `<review_dir>/reports/DataScience.md` via `write_to_file`, then notify Host via `send_message`:
- `STATUS: PASS`: All applicable checklist items across common foundations and domain-specific subguides are satisfied.
- `STATUS: ROUND_REVISION_NEEDED`: One or more Blocking Defects detected. Detail exact file locations, defect mechanics, "Why This Would Be Missed", and code remediations with Given/When/Then acceptance criteria.
- `STATUS: INFEASIBLE`: Target requirements violate mathematical, statistical, or data integrity bounds with no viable in-scope remediation. Include formal infeasibility proof.
