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
- [ ] **Jensen's Inequality Bias Correction on Log Targets (Duan's Smearing Estimator)**: When regressing on log-transformed targets $z = \ln(y)$ (or $\ln(1+y)$) with MSE loss, the naive inverse transform $\exp(\hat{z})$ estimates conditional median $\text{Med}(Y \mid X)$, underestimating conditional mean $\mathbb{E}[Y \mid X]$ by $10\text{–}15\%$ due to Jensen's inequality ($\mathbb{E}[\exp(\epsilon)] > 1$). When evaluating on raw scale $Y$ (RMSE, MAE, total revenue), mandate multiplying by Duan's non-parametric smearing estimator $\hat{S}_{\text{Duan}} = \frac{1}{N_{\text{oof}}}\sum \exp(e_{\text{oof}, i})$, or use Tweedie/Gamma/Poisson deviance with log link directly on $Y$.
- [ ] **Bayes Prior-Shift Inversion on Class-Weighted Models**: Prohibit setting `scale_pos_weight != 1.0`, `class_weight="balanced"`, or `pos_weight` when evaluation metrics are strictly proper scoring rules (Log-Loss, Brier Score) or rank metrics (ROC-AUC), as positive class weighting distorts predicted probabilities by shifting log-odds by $+\ln(w)$ (e.g. $p=0.05 \to 0.3448$). If class weighting is required for fixed-threshold F1 tuning, mandate inverting the Bayes prior shift before probability emission: $p_{\text{recovered}} = \frac{p_{\text{weighted}}}{p_{\text{weighted}} + w(1 - p_{\text{weighted}})} = \sigma(\text{logit}(p_{\text{weighted}}) - \ln(w))$.
- [ ] **Distribution-Free Venn-ABERS Probability Calibration (IVAP / CVAP)**: For safety-critical or probability-scoring applications (Log-Loss, Brier Score), reject single Isotonic Regression (which overfits small calibration splits and emits $0/1$ probabilities causing infinite Log-Loss) and Platt scaling (rigid sigmoid assumption). Prefer inductive Venn-ABERS predictors (IVAP) or cross Venn-ABERS (CVAP) which fit dual isotonic regressions to output multi-probabilistic bounds $(p_0, p_1)$ and regularized point probabilities $p = \frac{p_1}{1 - p_0 + p_1} \in (0, 1)$ with finite-sample validity.

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

# GOOD: Compute true Out-of-Fold Smoothed Weight of Evidence with fold isolation and prune affine/exact duplicates
import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold

def compute_oof_and_eval_smoothed_woe(
    s_train: pd.Series,
    y_train: np.ndarray,
    s_eval: pd.Series,
    cv: StratifiedKFold,
    smoothing: float = 10.0,
) -> tuple[np.ndarray, np.ndarray]:
    """Computes leakage-free Out-of-Fold Smoothed Weight of Evidence for train and maps to eval."""
    oof_woe = np.zeros(len(s_train), dtype=np.float32)
    eval_woe_acc = np.zeros(len(s_eval), dtype=np.float32)
    n_splits = float(cv.get_n_splits())

    def _fit_woe_map(s_tr: pd.Series, y_tr: np.ndarray) -> pd.Series:
        df_tmp = pd.DataFrame({"cat": s_tr.values, "y": y_tr})
        pos_total = max(float(np.sum(y_tr == 1)), 1.0)
        neg_total = max(float(np.sum(y_tr == 0)), 1.0)
        n_cats = max(int(s_tr.nunique(dropna=True)), 1)
        grouped = df_tmp.groupby("cat", observed=False)["y"].agg(pos="sum", total="count")
        grouped["neg"] = grouped["total"] - grouped["pos"]
        dist_pos = (grouped["pos"] + smoothing / n_cats) / (pos_total + smoothing)
        dist_neg = (grouped["neg"] + smoothing / n_cats) / (neg_total + smoothing)
        return np.log(dist_pos / dist_neg)

    for tr_idx, val_idx in cv.split(s_train, y_train):
        woe_map = _fit_woe_map(s_train.iloc[tr_idx], y_train[tr_idx])
        oof_woe[val_idx] = s_train.iloc[val_idx].map(woe_map).fillna(0.0).to_numpy(dtype=np.float32)
        eval_woe_acc += s_eval.map(woe_map).fillna(0.0).to_numpy(dtype=np.float32) / n_splits

    return oof_woe, eval_woe_acc
```
- **Acceptance Criterion**: *Given* a categorical series `s_train` and binary target `y_train`, *when* `compute_oof_and_eval_smoothed_woe` executes across K-fold CV, *then* `oof_woe` is computed strictly out-of-fold without in-fold target leakage, categories with empirical default rate above the global prior produce positive log-odds (`> 0.0`), unseen categories map to `0.0`, and the assembled feature matrix contains zero exact or affine duplicate columns (`|r| == 1.0`).

### Anti-Pattern 3: Heuristic "Guess-Blending" or Zero-Gradient `SLSQP` on Step-Function `roc_auc_score`

```python
# BAD 1 (Guess-Blend): Arbitrary hardcoded weights guessed by hand on raw uncalibrated probabilities!
blend_bad = 0.50 * lgb_preds + 0.30 * cat_preds + 0.20 * nn_preds

# BAD 2 (Zero-Gradient Trap): Calling gradient-based SLSQP on piecewise-constant roc_auc_score!
# Finite-difference gradients are 0.0 everywhere, so minimize() exits at step 0 with initial weights!
res_dead = minimize(lambda w: -roc_auc_score(y_oof, Z_oof @ w), x0=w0, method="SLSQP")

# GOOD: Inductive Probit Rank-Gauss projection + Variance Normalization + Logit space branching + Simplex Coordinate / Powell Optimization
import numpy as np
from scipy.optimize import minimize
from scipy.special import expit, logit, softmax
from scipy.stats import norm, rankdata
from sklearn.metrics import log_loss, roc_auc_score

def inductive_probit_rank_transform(
    oof_preds: np.ndarray,
    test_preds: np.ndarray,
    eps: float = 1e-6,
) -> tuple[np.ndarray, np.ndarray]:
    """Maps OOF predictions to Probit space and inductively interpolates test predictions via OOF ECDF."""
    n = len(oof_preds)
    oof_ranks = (rankdata(oof_preds, method="average") - 0.5) / n
    u_oof = np.clip(oof_ranks, eps, 1.0 - eps)

    # Inductive ECDF mapping: sort OOF predictions to interpolate arbitrary test batch sizes (even N_test == 1)
    sort_idx = np.argsort(oof_preds)
    sorted_oof_p = oof_preds[sort_idx]
    sorted_oof_u = u_oof[sort_idx]
    u_test = np.clip(np.interp(test_preds, sorted_oof_p, sorted_oof_u), eps, 1.0 - eps)

    return norm.ppf(u_oof).astype(np.float64), norm.ppf(u_test).astype(np.float64)

def fit_oof_probit_ensemble_safe(
    oof_dict: dict[str, np.ndarray],
    test_dict: dict[str, np.ndarray],
    y_oof: np.ndarray,
    metric_mode: str = "roc_auc",  # "roc_auc" (rank) or "log_loss" (calibrated probability)
    l2_reg: float = 1e-4,
    eps: float = 1e-6,
) -> tuple[dict[str, float], np.ndarray, np.ndarray]:
    model_names = list(oof_dict.keys())
    m = len(model_names)
    uniform_w = np.full(m, 1.0 / m, dtype=np.float64)

    if metric_mode == "log_loss":
        # Preserve prior base-rate calibration by blending in clamped Logit (log-odds) space
        Z_oof = np.column_stack([logit(np.clip(oof_dict[k], eps, 1.0 - eps)) for k in model_names])
        Z_test = np.column_stack([logit(np.clip(test_dict[k], eps, 1.0 - eps)) for k in model_names])

        def loss_obj(w: np.ndarray) -> float:
            w_norm = w / np.sum(w)
            p_blend = expit(Z_oof @ w_norm)
            return float(log_loss(y_oof, p_blend)) + l2_reg * float(np.sum((w_norm - uniform_w) ** 2))

        res = minimize(
            loss_obj,
            x0=uniform_w,
            method="SLSQP",
            bounds=[(0.0, 1.0)] * m,
            constraints={"type": "eq", "fun": lambda w: np.sum(w) - 1.0},
        )
        opt_w = res.x / np.sum(res.x)
        weights_map = {name: float(opt_w[idx]) for idx, name in enumerate(model_names)}
        return weights_map, expit(Z_oof @ opt_w), expit(Z_test @ opt_w)

    # Rank-based optimization (ROC-AUC) using Inductive Probit Rank-Gauss projection
    pairs = [inductive_probit_rank_transform(oof_dict[k], test_dict[k], eps=eps) for k in model_names]
    Z_oof = np.column_stack([p[0] for p in pairs])
    Z_test = np.column_stack([p[1] for p in pairs])

    def penalized_auc(w: np.ndarray) -> float:
        return float(roc_auc_score(y_oof, Z_oof @ w)) - l2_reg * float(np.sum((w - uniform_w) ** 2))

    best_w = uniform_w.copy()
    best_obj = penalized_auc(best_w)

    # Fixed Coordinate Line-Search: freeze base_w during each coordinate's alpha grid sweep
    for _ in range(3):
        for i in range(m):
            base_w = best_w.copy()
            for alpha in np.linspace(0.0, 1.0, 101):
                cand_w = (1.0 - alpha) * base_w
                cand_w[i] += alpha
                cand_w /= cand_w.sum()
                score = penalized_auc(cand_w)
                if score > best_obj:
                    best_obj = score
                    best_w = cand_w

    res = minimize(
        lambda theta: -penalized_auc(softmax(theta)),
        x0=np.log(np.maximum(best_w, 1e-6)),
        method="Powell",
        options={"maxiter": 500},
    )
    opt_w = softmax(res.x)
    if penalized_auc(opt_w) < penalized_auc(best_w):
        opt_w = best_w

    # Variance-stabilized Probit score shifted by empirical prior probit for downstream threshold stability
    oof_latent = Z_oof @ opt_w
    test_latent = Z_test @ opt_w
    latent_std = max(float(np.std(oof_latent)), 1e-6)
    prior_shift = float(norm.ppf(np.clip(np.mean(y_oof), eps, 1.0 - eps)))

    oof_blend = norm.cdf((oof_latent / latent_std) + prior_shift)
    test_blend = norm.cdf((test_latent / latent_std) + prior_shift)
    weights_map = {name: float(opt_w[idx]) for idx, name in enumerate(model_names)}
    return weights_map, oof_blend, test_blend
```
- **Acceptance Criterion**: *Given* Out-of-Fold predictions from $M \ge 2$ heterogeneous models (`oof_dict`) on data with prior $\bar{y} < 0.15$ and test predictions with arbitrary batch size (including $N_{\text{test}} = 1$), *when* `fit_oof_probit_ensemble_safe` executes, *then* test predictions are inductively interpolated without collapsing to $0.5000$, weights sum to $1.0$, variance shrinkage is normalized by $\sigma_{\text{blend}}$, and the ensemble achieves higher ROC-AUC and lower Log-Loss than any individual constituent.

### Anti-Pattern 4: Distorted Probabilities from `scale_pos_weight` & Miscalibrated Post-Processing

```python
# BAD 1: Blindly setting scale_pos_weight = 10.0 for Log-Loss evaluation shifts predicted probabilities 7x too high!
# BAD 2: Fitting single IsotonicRegression on small calibration splits emits 0.0 or 1.0, causing infinite Log-Loss!

# GOOD: Invert Bayes prior shift and apply Inductive Venn-ABERS (IVAP) for calibrated probabilities with finite bounds
import numpy as np
from sklearn.isotonic import IsotonicRegression

def invert_scale_pos_weight(p_weighted: np.ndarray, scale_pos_weight: float, eps: float = 1e-7) -> np.ndarray:
    """Recovers true posterior probabilities from predictions shifted by scale_pos_weight."""
    p = np.clip(p_weighted, eps, 1.0 - eps)
    w = float(scale_pos_weight)
    return p / (p + w * (1.0 - p))

def calibrate_inductive_venn_abers(
    s_cal: np.ndarray,
    y_cal: np.ndarray,
    s_test: np.ndarray,
    grid_size: int = 256,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Fast Inductive Venn-ABERS Predictor (IVAP) computing multi-probabilistic bounds (p0, p1)
    and regularized point probability p = p1 / (1 - p0 + p1) without infinite log-loss.
    """
    s_cal = np.asarray(s_cal, dtype=np.float64).ravel()
    y_cal = np.asarray(y_cal, dtype=np.float64).ravel()
    s_test = np.asarray(s_test, dtype=np.float64).ravel()

    if len(s_test) > grid_size:
        grid = np.unique(np.quantile(s_test, np.linspace(0.0, 1.0, grid_size)))
    else:
        grid = np.unique(s_test)

    p0_grid = np.empty(len(grid), dtype=np.float64)
    p1_grid = np.empty(len(grid), dtype=np.float64)
    iso0 = IsotonicRegression(y_min=0.0, y_max=1.0, out_of_bounds="clip")
    iso1 = IsotonicRegression(y_min=0.0, y_max=1.0, out_of_bounds="clip")

    for idx, x_val in enumerate(grid):
        s_aug = np.append(s_cal, x_val)
        p0_grid[idx] = iso0.fit(s_aug, np.append(y_cal, 0.0)).predict([x_val])[0]
        p1_grid[idx] = iso1.fit(s_aug, np.append(y_cal, 1.0)).predict([x_val])[0]

    p0 = np.interp(s_test, grid, p0_grid)
    p1 = np.interp(s_test, grid, p1_grid)
    p_point = p1 / np.maximum(1.0 - p0 + p1, 1e-12)
    return p_point, p0, p1
```
- **Acceptance Criterion**: *Given* predictions shifted by `scale_pos_weight = w`, *when* `invert_scale_pos_weight` and `calibrate_inductive_venn_abers` execute, *then* probability mean converges to empirical prior $\bar{y}$, and regularized Venn-ABERS probabilities satisfy $0.0 < p < 1.0$ strictly without producing infinite Log-Loss.

## Failure Modes & Mitigations

- **Base-Rate Shift & Variance Shrinkage in Probit Ensembles**: Never map raw linear combinations directly through `norm.cdf`; normalize by $\sigma_{\text{blend}}$, shift by prior probit $\Phi^{-1}(\bar{y})$, and use Logit space for Log-Loss optimization.
- **Transductive Test Batch Collapse**: Never rank test sets independently in Probit projection; learn ECDF on OOF predictions and interpolate test predictions via `np.interp`.
- **Log Target Underestimation (Jensen's Inequality)**: Never take naive $\exp(\hat{z})$ for conditional mean; multiply by Duan's smearing estimator $\hat{S}_{\text{Duan}} = \frac{1}{N}\sum \exp(e_{\text{oof}, i})$ or use Tweedie/Gamma loss directly on raw $Y$.
- **Distorted Probabilities from Class Weighting**: Invert the Bayes prior shift $\sigma(\text{logit}(p) - \ln(w))$ before reporting probabilities or computing Log-Loss.
- **Heuristic Guess-Blending**: Replace hardcoded manual ensemble weights with simplex-constrained OOF optimization ($w_i \ge 0, \sum w_i = 1$) over Probit Rank-Gauss $\Phi^{-1}(\text{rank}(p_i))$ projections.
- **Zero-Gradient Optimizer Stall on `roc_auc_score`**: Never pass piecewise-constant rank metrics (`roc_auc_score`, `f1_score`) to gradient-based solvers (`SLSQP`, `L-BFGS-B`); use derivative-free simplex/coordinate solvers (`Powell`, `Nelder-Mead`, coordinate line search) or smooth differentiable surrogates.
- **Silent $(B, B)$ Loss Broadcasting**: Always normalize 1D target and prediction shapes via `.view(-1)` or `.squeeze(-1)` and assert `preds.shape == targets.shape`.
- **Degenerate Self-Fit / Identity Mapping**: Never fit `IsotonicRegression` or calibrators with `y == X`; verify non-zero difference between input and transformed output.
- **Collinear Feature Bloat**: Audit multi-layer feature pipelines for exact duplicates ($\text{diff} = 0$) and affine clones ($|r| = 1.0$ such as `COUNT` + `FREQ` or `MISSING` + `AVAIL`).
