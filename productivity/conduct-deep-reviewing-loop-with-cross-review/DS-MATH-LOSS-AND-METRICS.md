# Loss Functions, Evaluation Metrics, Feature Deduplication, and Ensemble Learning

Audits mathematical loss formulations, gradient signs, tensor broadcasting semantics, numerical stability, non-degenerate mathematical feature transforms, cross-layer feature deduplication/collinearity, objective-metric alignment, probability calibration, and simplex-constrained Out-of-Fold (OOF) ensemble learning. Pair grounded Python/NumPy/SciPy/PyTorch code remediations with atomic Given/When/Then acceptance criteria.

## Domain Audit Checklist

### 1. Mathematical Loss Formulation & Tensor Shape Integrity
- [ ] **Explicit Tensor Shape Contracts (Preventing Implicit $B \times B$ Broadcasting)**: In PyTorch, NumPy, and JAX loss/metric functions, verify 1D/2D tensor shapes are explicitly aligned (`preds.view(-1)` vs `targets.view(-1)`) before elementwise arithmetic. Reject unvalidated operations between $(B, 1)$ model outputs and $(B,)$ target vectors that silently broadcast into a $(B, B)$ outer matrix before `.mean()`, corrupting gradients while returning a scalar loss without raising an exception.
- [ ] **Loss Sign & Margin Symmetry Verification**: Verify custom loss functions (margin ranking losses, angular/ArcFace/contrastive losses, focal/asymmetric losses, KL/Wasserstein divergences) apply the correct mathematical sign and penalty direction across both positive ($y=1$) and negative ($y=0$) classes (verifying that loss decreases monotonically as predictions move toward the true class target and increases when predictions move away).
- [ ] **Numerical Stability & Domain Clamping**:
  - Combine sigmoid/softmax with cross-entropy (`F.binary_cross_entropy_with_logits`, `F.cross_entropy`, `scipy.special.expit` / `logit`) rather than computing `torch.log(torch.sigmoid(x))` which underflows to $-\infty$.
  - Clamp cosine similarities to $[-1.0 + \epsilon, 1.0 - \epsilon]$ before `torch.acos` / `np.arccos` (since floating-point dot products like `1.0000001` produce `NaN` values and $\pm 1.0$ has infinite derivative $-\frac{1}{\sqrt{1 - x^2}}$).
  - Clamp probabilities to $[\epsilon, 1 - \epsilon]$ (e.g. $[10^{-6}, 1 - 10^{-6}]$) before applying $\text{logit}(p) = \log\frac{p}{1-p}$, Probit $\Phi^{-1}(p)$, or $\log(p)$.
  - Normalize embedding vectors row-wise with safe zero-norm floor (`z / np.maximum(np.linalg.norm(z, axis=1, keepdims=True), 1e-12)`) before spherical/cosine distance computations.
- [ ] **Empty-Batch & Degenerate Subset Guards**: For pairwise ranking losses (pairwise AUC, triplet, contrastive) or group metrics, guard batches where all samples belong to a single class (`len(pos) == 0 or len(neg) == 0`) by returning a zero scalar connected to the computation graph (`0.0 * scores.sum()`) so `.backward()` never crashes with `RuntimeError` or `ZeroDivisionError`.

### 2. Non-Degenerate Feature Mathematics & Matrix Deduplication
- [ ] **Ban Degenerate Self-Fitting & Vacuous Identity Transforms (`f(x) == x`)**:
  - Reject fitting monotonic calibrators, isotonic regressions, or projections where the target argument is identical to or already a strictly monotonic function of the input (`IsotonicRegression().fit(x, x)`), which mathematically reduces to the identity mapping $f(x) = x$ and creates an exact $r = 1.00000$ duplicate of the input feature.
  - Verify mathematical transforms implement their true formula matching their feature name (e.g. Weight of Evidence must compute log-odds ratio $\text{WoE}_c = \ln\frac{P(X=c \mid Y=1)}{P(X=c \mid Y=0)}$, and `*_LOGIT` features must apply $\ln\frac{p}{1-p}$ rather than storing raw probabilities in $[0, 1]$).
- [ ] **Cross-Layer Feature Deduplication & Collinearity Control**:
  - In multi-module or multi-layer feature pipelines, audit the combined feature matrix for **exact duplicates** ($\max_i |f_A(i) - f_B(i)| = 0$) and **exact affine/linear duplicates** ($|r| = 1.00000$, such as emitting both `CAT_COUNT` and `CAT_FREQ = CAT_COUNT / N`, both `MISSING_COUNT` and `AVAIL_COUNT = K - MISSING_COUNT`, both `FLAG` and `1 - FLAG`, or linear unit rescalings like `DAYS` and `-DAYS / 365.25`).
  - Consolidate competing parallel imputers/regressions (e.g. two separate modules each fitting their own Ridge/linear regression to reconstruct the same missing variable) into a single canonical feature module so tree feature sub-sampling (`colsample_bytree`) is not diluted by redundant clones and linear/neural matrices remain well-conditioned.

### 3. Objective–Metric Alignment & Principled OOF Ensemble Learning (Ban on Guess-Blending)
- [ ] **Metric-Consistent Optimization & Elimination of Vacuous Post-Processing**: Confirm the training loss, validation early-stopping metric, and post-processing strategy match the evaluation metric. When the evaluation metric is strictly rank-based (ROC-AUC, Spearman $\rho$, Kendall $\tau$), reject single-model strictly monotonic post-processing transforms (such as power scaling $p^\gamma$ or positive linear rescaling) that alter zero pairwise orderings ($0.0$ metric impact).
- [ ] **Simplex-Constrained Out-of-Fold Ensemble Learning over Heuristic Guess-Blending**:
  - **Ban Heuristic "Guess-Blending"**: Strictly reject hardcoded, manually guessed ensemble weights (e.g. `0.50 * m1 + 0.30 * m2 + 0.20 * m3` or ad-hoc leaderboard trial weights) lacking a mathematical optimization objective on Out-of-Fold (`y_oof`) predictions.
  - **Probit / Rank-Gauss Latent Alignment ($\Phi^{-1}(\text{rank}(p_i))$)**: For rank or classification ensembling across heterogeneous model families (GBDTs, CatBoost, ExtraTrees, GAMs, Neural Networks), map each model's prediction vector $p_i$ to a uniform rank $u_i = \text{clip}\!\left(\frac{\text{rank}(p_i) - 0.5}{N}, \epsilon, 1 - \epsilon\right)$ and project onto the standard normal Probit (Rank-Gauss) latent space $z_i = \Phi^{-1}(u_i)$ (`scipy.stats.norm.ppf`), which normalizes disparate model dispersions to $\mathcal{N}(0, 1)$ while preserving tail confidence, and solve the simplex-constrained optimization problem on Out-of-Fold predictions:
    $$\min_{\mathbf{w}} \; -\text{AUC}\!\left(y_{\text{oof}}, \sum_{i=1}^{M} w_i \cdot \Phi^{-1}\!\big(\text{rank}(p_i)\big)\right) \quad \text{subject to} \quad w_i \ge 0, \; \sum_{i=1}^{M} w_i = 1$$
    *(or generally $\min_{\mathbf{w} \in \Delta^{M-1}} \mathcal{L}_{\text{eval}}\!\big(y_{\text{oof}}, \sum_{i=1}^M w_i \cdot g(p_i)\big)$ for the task's evaluation objective).*
  - **Step-Function Zero-Gradient Guard (Critical Implementation Requirement)**: Empirical `roc_auc_score` (and F1/NDCG/Accuracy) is a **piecewise-constant step function** whose finite-difference gradient $\nabla_{\mathbf{w}} \text{AUC}$ is **identically zero almost everywhere**. Calling gradient-based solvers (`scipy.optimize.minimize` with `method="SLSQP"` or `"L-BFGS-B"`) directly on `-roc_auc_score` immediately terminates at iteration 0 without updating $\mathbf{w}$! Mandate either:
    1. **Derivative-Free Simplex / Coordinate / Dirichlet Optimization** directly on the exact OOF metric (e.g. `method="Powell"` or `"Nelder-Mead"` with softmax/simplex projection, iterative Coordinate Line-Search over simplex pairs, or Dirichlet/Optuna sampling), **OR**
    2. **Differentiable Convex Surrogate Optimization** (`SLSQP` / `L-BFGS-B` minimizing regularized Log-Loss / Pairwise Smooth AUC Surrogate on $\mathbf{Z}_{\text{probit}}\mathbf{w}$) with L2 shrinkage toward uniform weights ($\lambda \|\mathbf{w} - \frac{1}{M}\mathbf{1}\|_2^2$) or nested OOF evaluation to prevent weight overfitting.

## Concrete Anti-Patterns

### Anti-Pattern 1: Silent $(B, 1)$ vs $(B,)$ Broadcasting & Unclamped `arccos` `NaN` Explosion

```python
# BAD 1: logits has shape (B, 1) while targets has shape (B,); (logits - targets) broadcasts to (B, B)!
# BAD 2: torch.acos on unclipped dot product > 1.0 (e.g. 1.0000001 from fp32 rounding) yields NaN loss & gradients!
def bad_angular_loss(embeddings: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
    cos_sim = embeddings @ weight_vector  # shape (B, 1)
    theta = torch.acos(cos_sim)           # NaN when |cos_sim| > 1.0; infinite grad at |cos_sim| == 1.0
    return ((theta - targets) ** 2).mean() # Broadcasts (B, 1) - (B,) -> (B, B)!

# GOOD: Explicit 1D flattening (.view(-1)) and safe [-1 + eps, 1 - eps] clamping before acos
import torch
import torch.nn.functional as F

def safe_angular_loss(
    embeddings: torch.Tensor,
    weight_vector: torch.Tensor,
    targets: torch.Tensor,
    eps: float = 1e-6,
) -> torch.Tensor:
    emb_norm = F.normalize(embeddings, p=2, dim=-1, eps=1e-12)
    w_norm = F.normalize(weight_vector, p=2, dim=-1, eps=1e-12)
    cos_sim = (emb_norm @ w_norm).view(-1)
    y = targets.view(-1).to(cos_sim.dtype)
    if cos_sim.shape != y.shape:
        raise ValueError(f"Shape mismatch: cos_sim {cos_sim.shape} vs targets {y.shape}")
    theta = torch.acos(torch.clamp(cos_sim, -1.0 + eps, 1.0 - eps))
    return ((theta - y) ** 2).mean()
```
- **Acceptance Criterion**: *Given* `embeddings` of shape `(32, 128)` with collinear rows producing raw fp32 dot products of `1.0000002` and `targets` of shape `(32, 1)` or `(32,)`, *when* `safe_angular_loss` executes `.backward()`, *then* shapes flatten to `(32,)` without $(32, 32)$ broadcasting, loss and gradients are finite (`torch.isfinite(loss).all()`), and zero `NaN` values occur.

### Anti-Pattern 2: Degenerate `IsotonicRegression.fit(x, x)` Identity Mapping & Affine Feature Clones

```python
# BAD 1: Fitting IsotonicRegression(X=smooth_prob, y=smooth_prob) is a vacuous identity mapping f(x) = x!
# BAD 2: Emitting both COUNT and FREQ = COUNT / N (or MISSING and AVAIL = 3 - MISSING) creates |r| = 1.0 clones!
iso = IsotonicRegression(out_of_bounds="clip")
iso.fit(smooth_prob.values, smooth_prob.values)  # BUG: y == X -> returns smooth_prob unchanged!

# GOOD: Compute true Smoothed Weight of Evidence ln(P(X=c|Y=1) / P(X=c|Y=0)) and prune affine/exact duplicates
import numpy as np
import pandas as pd

def compute_smoothed_woe(
    s_train: pd.Series,
    y_train: np.ndarray,
    s_eval: pd.Series,
    smoothing: float = 10.0,
) -> np.ndarray:
    df_tmp = pd.DataFrame({"cat": s_train.values, "y": y_train})
    pos_total = max(float(np.sum(y_train == 1)), 1.0)
    neg_total = max(float(np.sum(y_train == 0)), 1.0)
    n_cats = max(int(s_train.nunique(dropna=True)), 1)

    grouped = df_tmp.groupby("cat")["y"].agg(pos="sum", total="count")
    grouped["neg"] = grouped["total"] - grouped["pos"]

    dist_pos = (grouped["pos"] + smoothing / n_cats) / (pos_total + smoothing)
    dist_neg = (grouped["neg"] + smoothing / n_cats) / (neg_total + smoothing)
    woe_map = np.log(dist_pos / dist_neg)
    return s_eval.map(woe_map).fillna(0.0).to_numpy(dtype=np.float32)
```
- **Acceptance Criterion**: *Given* a categorical series `s_train` and binary target `y_train`, *when* `compute_smoothed_woe` executes, *then* categories with empirical default rate above the global prior produce positive log-odds (`> 0.0`), categories below the global prior produce negative log-odds (`< 0.0`), unseen categories map to `0.0`, and the assembled feature matrix contains zero exact or affine duplicate columns (`|r| == 1.0`).

### Anti-Pattern 3: Heuristic "Guess-Blending" or Zero-Gradient `SLSQP` on Step-Function `roc_auc_score`

```python
# BAD 1 (Guess-Blend): Arbitrary hardcoded weights guessed by hand on raw uncalibrated probabilities!
blend_bad = 0.50 * lgb_preds + 0.30 * cat_preds + 0.20 * nn_preds

# BAD 2 (Zero-Gradient Trap): Calling gradient-based SLSQP on piecewise-constant roc_auc_score!
# Finite-difference gradients are 0.0 everywhere, so minimize() exits at step 0 with initial weights!
res_dead = minimize(lambda w: -roc_auc_score(y_oof, Z_oof @ w), x0=w0, method="SLSQP")

# GOOD: Probit Rank-Gauss projection \Phi^{-1}(rank(p_i)) + Derivative-Free Simplex Coordinate / Powell Optimization on OOF AUC
import numpy as np
from scipy.optimize import minimize
from scipy.special import expit, softmax
from scipy.stats import norm, rankdata
from sklearn.metrics import roc_auc_score

def to_probit_rank(preds: np.ndarray, eps: float = 1e-6) -> np.ndarray:
    """Maps 1D predictions to \Phi^{-1}((rank(p) - 0.5) / N) in standard normal Probit space."""
    n = len(preds)
    u = np.clip((rankdata(preds, method="average") - 0.5) / n, eps, 1.0 - eps)
    return norm.ppf(u).astype(np.float64)

def fit_oof_probit_ensemble(
    oof_dict: dict[str, np.ndarray],
    test_dict: dict[str, np.ndarray],
    y_oof: np.ndarray,
    l2_reg: float = 1e-4,
) -> tuple[dict[str, float], np.ndarray, np.ndarray]:
    model_names = list(oof_dict.keys())
    m = len(model_names)
    Z_oof = np.column_stack([to_probit_rank(oof_dict[k]) for k in model_names])
    Z_test = np.column_stack([to_probit_rank(test_dict[k]) for k in model_names])
    uniform_w = np.full(m, 1.0 / m, dtype=np.float64)

    # Coordinate line-search + derivative-free Powell refinement on simplex (w_i >= 0, sum(w) == 1)
    best_w = uniform_w.copy()
    best_auc = float(roc_auc_score(y_oof, Z_oof @ best_w))

    for _ in range(3):
        for i in range(m):
            for alpha in np.linspace(0.0, 1.0, 101):
                cand_w = (1.0 - alpha) * best_w
                cand_w[i] += alpha
                cand_w /= cand_w.sum()
                score = float(roc_auc_score(y_oof, Z_oof @ cand_w)) - l2_reg * float(np.sum((cand_w - uniform_w) ** 2))
                if score > best_auc:
                    best_auc = score
                    best_w = cand_w

    def obj_logits(theta: np.ndarray) -> float:
        w = softmax(theta)
        auc = float(roc_auc_score(y_oof, Z_oof @ w))
        return -auc + l2_reg * float(np.sum((w - uniform_w) ** 2))

    res = minimize(obj_logits, x0=np.log(np.maximum(best_w, 1e-6)), method="Powell", options={"maxiter": 500})
    opt_w = softmax(res.x)
    if float(roc_auc_score(y_oof, Z_oof @ opt_w)) < float(roc_auc_score(y_oof, Z_oof @ best_w)):
        opt_w = best_w

    weights_map = {name: float(opt_w[idx]) for idx, name in enumerate(model_names)}
    oof_blend = norm.cdf(Z_oof @ opt_w)
    test_blend = norm.cdf(Z_test @ opt_w)
    return weights_map, oof_blend, test_blend
```
- **Acceptance Criterion**: *Given* Out-of-Fold predictions from $M \ge 2$ heterogeneous models (`oof_dict`) and binary labels `y_oof`, *when* `fit_oof_probit_ensemble` executes, *then* each constituent is projected via $\Phi^{-1}(\text{rank}(p_i))$, the learned weight vector $\mathbf{w}^*$ satisfies $w_i \ge 0$ and $\sum_{i=1}^M w_i = 1.0$ (`np.isclose(sum(weights_map.values()), 1.0)`), and the optimized OOF ROC-AUC is greater than or equal to both the uniform average and the best single constituent model without stalling on zero gradients.

## Failure Modes & Mitigations

- **Heuristic Guess-Blending**: Replace hardcoded manual ensemble weights with simplex-constrained OOF optimization ($w_i \ge 0, \sum w_i = 1$) over Probit Rank-Gauss $\Phi^{-1}(\text{rank}(p_i))$ projections.
- **Zero-Gradient Optimizer Stall on `roc_auc_score`**: Never pass piecewise-constant rank metrics (`roc_auc_score`, `f1_score`) to gradient-based solvers (`SLSQP`, `L-BFGS-B`); use derivative-free simplex/coordinate solvers (`Powell`, `Nelder-Mead`, coordinate line search) or smooth differentiable surrogates.
- **Silent $(B, B)$ Loss Broadcasting**: Always normalize 1D target and prediction shapes via `.view(-1)` or `.squeeze(-1)` and assert `preds.shape == targets.shape`.
- **Degenerate Self-Fit / Identity Mapping**: Never fit `IsotonicRegression` or calibrators with `y == X`; verify non-zero difference between input and transformed output.
- **Collinear Feature Bloat**: Audit multi-layer feature pipelines for exact duplicates ($\text{diff} = 0$) and affine clones ($|r| = 1.0$ such as `COUNT` + `FREQ` or `MISSING` + `AVAIL`).
