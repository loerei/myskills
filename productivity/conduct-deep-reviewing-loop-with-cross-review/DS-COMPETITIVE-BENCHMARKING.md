# Competitive ML & Benchmarking: Simplex OOF Ensembling & Latent Blending

Audits mathematical formulations, loss engineering, Out-of-Fold (OOF) ensembling, Probit Rank-Gauss latent projection, and distribution-free probability calibration for competitive tabular challenges (e.g. Kaggle / algorithmic benchmarks).

> **Scope Constraint & Executive Consulting Ban**:
> Techniques in this document are **strictly prohibited** in Applied Business Consulting, PoC projects, and executive presentation deliverables. They are reserved exclusively for pure algorithmic competitions where metric maximization on a fixed test set is the sole objective.

---

## 1. Simplex-Constrained Out-of-Fold Ensemble Learning

Heuristic "Guess-Blending" (manually guessing weights like `0.50 * m1 + 0.30 * m2 + 0.20 * m3`) is mathematically ungrounded and prone to leaderboard overfitting. All ensembling must be solved as an optimization problem on Out-of-Fold predictions:

- [ ] **Simplex Constraint Formulation**:
  Enforce non-negative weights that sum to unity ($\mathbf{w} \in \Delta^{M-1}$):
  $$\min_{\mathbf{w}} \; \mathcal{L}_{\text{eval}}\left(y_{\text{oof}}, \sum_{i=1}^{M} w_i \cdot g(p_i)\right) \quad \text{subject to} \quad w_i \ge 0, \; \sum_{i=1}^{M} w_i = 1$$
- [ ] **Step-Function Zero-Gradient Guard (Critical Implementation Requirement)**:
  Rank metrics (ROC-AUC, Spearman $\rho$) and thresholded metrics (F1, Accuracy) are **piecewise-constant step functions**. Their finite-difference gradients are identically zero almost everywhere. Calling gradient-based solvers (`scipy.optimize.minimize(..., method="SLSQP")` or `"L-BFGS-B"`) directly on `-roc_auc_score` immediately terminates at iteration 0 without updating weights!
  Mandate either:
  1. **Derivative-Free Solvers**: Use `method="Nelder-Mead"` or `"Powell"` with softmax parametrization or projection onto the simplex.
  2. **Differentiable Convex Surrogates**: Optimize a smooth surrogate loss (e.g. Log-Loss or pairwise logistic ranking loss on latent scores) with L2 regularization toward uniform weights ($\lambda \|\mathbf{w} - \frac{1}{M}\mathbf{1}\|_2^2$).

---

## 2. Probit / Rank-Gauss Latent Space Projection

When combining heterogeneous model families (LightGBM, CatBoost, ExtraTrees, Neural Networks), raw probability distributions exhibit divergent scale and dispersion. Blending raw probabilities degrades tail discrimination:

- [ ] **Rank-Gauss Latent Projection**: Map each model's validation predictions $p_i$ to uniform percentiles and project onto standard normal Probit space:
  $$u_i = \text{clip}\left(\frac{\text{rank}(p_i) - 0.5}{N}, \epsilon, 1 - \epsilon\right), \quad z_i = \Phi^{-1}(u_i) = \sqrt{2} \, \text{erf}^{-1}(2u_i - 1)$$
- [ ] **Inductive ECDF Test Interpolation**: Never compute unaligned test ranks on small batches. Fit an empirical cumulative distribution function ($\text{ECDF}$) on validation predictions and evaluate it on test samples before applying $\Phi^{-1}$.
- [ ] **Variance-Normalized Blend Emission**: Normalize the ensemble latent variance before mapping back to probabilities or rankings:
  $$z_{\text{blend}} = \frac{\sum w_i z_i}{\sigma_{\text{blend}}}, \quad p_{\text{blend}} = \Phi(z_{\text{blend}})$$

---

## 3. Loss Engineering & Probability Calibration

- [ ] **Distribution-Free Venn-ABERS Probability Calibration (IVAP / CVAP)**: For log-loss or Brier score minimization, reject single Isotonic Regression (which emits degenerate $0.0/1.0$ probabilities causing infinite log-loss on unseen test rows) and Platt scaling (rigid sigmoid assumption). Prefer Inductive Venn-ABERS Predictors (IVAP) or Cross Venn-ABERS (CVAP) to generate well-calibrated regularized point probabilities.
- [ ] **Bayes Prior-Shift Inversion on Class-Weighted Models**: If training with positive class weighting (`scale_pos_weight = w`), predicted probabilities shift by $+\ln(w)$ in log-odds space. If proper probabilities are required, mandate inverting the prior shift before evaluation:
  $$p_{\text{true}} = \frac{p_{\text{weighted}}}{p_{\text{weighted}} + w(1 - p_{\text{weighted}})} = \sigma\left(\text{logit}(p_{\text{weighted}}) - \ln(w)\right)$$

---

## Concrete Anti-Patterns

### Anti-Pattern 1: SLSQP Gradient Optimization on Step Metric (ROC-AUC)

```python
# BAD: SLSQP gradient optimizer stalls immediately on piecewise-constant ROC-AUC
def blend_bad(y_oof, preds_matrix):
    def loss(weights):
        w = weights / np.sum(weights)
        blend = preds_matrix @ w
        return -roc_auc_score(y_oof, blend) # Gradient is identically 0.0 almost everywhere!

    res = scipy.optimize.minimize(loss, x0=[0.5, 0.5], method="SLSQP")
    return res.x / np.sum(res.x)

# GOOD: Derivative-free Nelder-Mead with softmax simplex reparameterization
def blend_nelder_mead_simplex(y_oof: np.ndarray, preds_matrix: np.ndarray) -> np.ndarray:
    n_models = preds_matrix.shape[1]

    def objective(theta: np.ndarray) -> float:
        exp_theta = np.exp(theta - np.max(theta))
        weights = exp_theta / np.sum(exp_theta)
        blend = preds_matrix @ weights
        return -float(roc_auc_score(y_oof, blend))

    init_theta = np.zeros(n_models)
    res = scipy.optimize.minimize(objective, x0=init_theta, method="Nelder-Mead")

    opt_theta = res.x - np.max(res.x)
    opt_weights = np.exp(opt_theta) / np.sum(np.exp(opt_theta))
    return opt_weights
```
