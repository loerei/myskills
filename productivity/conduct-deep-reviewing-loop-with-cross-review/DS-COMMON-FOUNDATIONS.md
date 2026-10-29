# Data Science Common Foundations: Leakage, Validation, & Reproducibility

Universal statistical standards, cross-validation topology, leakage prevention, matrix hygiene, numerical stability, and deterministic reproducibility across both Competitive and Applied Business ML tracks.

---

## 1. Zero Data, Target, & Transductive Leakage

- [ ] **Fold-Isolated Stateful Preprocessing (`fit` on Train Only)**: Fit all stateful transformations (`StandardScaler`, `RobustScaler`, `SimpleImputer`, `PCA`, `TargetEncoder`, quantile binners) strictly on training splits (`fit(X_train)`), applying `.transform()` to validation and test sets. NEVER call `.fit_transform()` on concatenated or unpartitioned datasets.
- [ ] **Strict Inductive Isolation (No Concatenated `train + test` Bleed)**: Reject concatenating training and test DataFrames (`pd.concat([train, test])`) to compute entity lookups, group aggregations, or unsupervised clusters. This leaks test-set distribution statistics into training rows (transductive leakage) and breaks single-sample production inference.
- [ ] **Out-of-Fold (OOF) Supervised Encodings with Dynamic Scaling**:
  - Compute target encodings or supervised stacking predictions strictly out-of-fold with Bayesian smoothing ($m > 0$).
  - When accumulating test-set encodings across folds, divide by the dynamic fold count (`divisor = float(cv.get_n_splits())`), NEVER by a hardcoded literal (`/ 10.0` or `/ 5.0`), which distorts test feature scale when fold counts change.
- [ ] **Strict Causal Feature Engineering for Time Series (`.shift(1)` Gate)**: For longitudinal or event-log datasets, mandate an explicit `.shift(1)` per entity before computing rolling or expanding statistics (`df.groupby(entity)[target].shift(1).rolling(w).mean()`). Ban future lookaheads (`.diff(-k)`) and unshifted global aggregations.
- [ ] **Post-Split Resampling**: Apply synthetic oversampling (`SMOTE`) and data augmentation strictly to in-fold `X_train, y_train`. NEVER resample validation or test splits.

---

## 2. Validation Topology Alignment

- [ ] **Entity Group Isolation (`GroupKFold` / `StratifiedGroupKFold`)**: When rows share an underlying entity (`customer_id`, `patient_id`, `account_id`), mandate `GroupKFold` or `StratifiedGroupKFold`. Ban random `KFold` that leaks repeat entity patterns across folds.
- [ ] **Temporal Ordering & Walk-Forward Validation**: For time-series data, enforce chronological splits (`TimeSeriesSplit` or expanding-window walk-forward) with an explicit purge/embargo gap between training and validation windows to prevent leakage across lagged features.
- [ ] **Stratification on Skewed Targets**: For imbalanced classification tasks, enforce `StratifiedKFold` (or `StratifiedGroupKFold`) to preserve class priors across all folds.

---

## 3. Model-Tailored Feature Views & Matrix Hygiene

- [ ] **Inductive-Bias-Matched Feature Views**: Multi-model pipelines must provide dedicated feature subsets matched to model inductive biases rather than a single monolithic feature dump:
  | Model Family | Feature View Invariants |
  | :--- | :--- |
  | **Tree Ensembles (LightGBM, XGBoost)** | Retain native `NaN`s for informative MNAR split routing; retain non-linear interactions; prune exact/affine collinear copies. |
  | **Categorical Trees (CatBoost)** | Expose raw high-cardinality categorical columns directly as `cat_features` to enable on-the-fly combination and ordered target statistics. |
  | **Neural & Linear Models (MLP, Logistic)** | Require finite imputation + `*_IS_NAN` binary flags, `RankGauss` or `StandardScaler` normalization, and strict de-collinearization ($|r| \le 0.95$). |
  | **Additive Models (EBM, GAM)** | Exclude pre-computed multi-way interaction terms so shape functions $f_i(x_i)$ and pairwise terms $f_{ij}(x_i, x_j)$ remain identifiable. |
- [ ] **Positional Array Slicing vs. Pandas Index Alignment**: Slicing a pandas Series (`s[n_train:]`) retains its original index labels. Passing it to a test DataFrame with `index=test_df.index` causes pandas index alignment to silently insert **100% `NaN`s**! Convert sliced Series to positional NumPy arrays (`.to_numpy()`) before DataFrame assembly.
- [ ] **Ratio Boundary Semantics ($k=0$ vs. $k=1$)**: Reject formulas like `revenue / np.maximum(1.0, count)` when `count` is a discrete count ($0, 1, 2, \dots$), as it maps count 0 and count 1 to the exact same denominator (`1.0`). Use `np.where(count > 0, revenue / count, np.nan)` or `revenue / (count + 1.0)`.
- [ ] **Collinearity & Duplicate Feature Pruning**: Reject exact duplicate columns ($\max |f_A - f_B| = 0$) and affine transformations ($f_B = c \cdot f_A + b$ with $|r| = 1.0$) that dilute tree feature sub-sampling (`colsample_bytree`) or destabilize linear inversion.

---

## 4. Mathematical Formulation & Numerical Stability

- [ ] **Explicit Tensor Shape Contracts (Preventing Implicit $B \times B$ Broadcasting)**: In PyTorch and NumPy loss/metric functions, explicitly flatten 1D vectors (`preds.view(-1)` vs `targets.view(-1)`). Reject unvalidated arithmetic between $(B, 1)$ outputs and $(B,)$ targets that silently broadcasts to $(B, B)$ before `.mean()`.
- [ ] **Domain Clamping & Gradient Stability**:
  - Combine activation with cross-entropy (`F.binary_cross_entropy_with_logits`, `scipy.special.expit`) rather than `torch.log(torch.sigmoid(x))`.
  - Clamp inputs to `arccos` to $[-1 + \epsilon, 1 - \epsilon]$ to avoid `NaN` gradients.
  - Clamp probabilities to $[\epsilon, 1 - \epsilon]$ before computing log-odds (`logit`) or Probit ($\Phi^{-1}$).
- [ ] **Duan's Smearing Estimator for Log Targets**: When regressing on log-transformed targets $z = \ln(y)$ with MSE loss, the naive inverse $\exp(\hat{z})$ under-predicts the conditional mean $\mathbb{E}[Y \mid X]$ due to Jensen's inequality. Multiply predictions by Duan's smearing factor $\hat{S} = \frac{1}{N}\sum \exp(e_i)$, or use Tweedie/Poisson regression with a log link directly on $Y$.

---

## 5. Pipeline Lineage & Deterministic Reproducibility

- [ ] **Comprehensive RNG & Hardware Seeding**: Initialize seeds across `random.seed(seed)`, `np.random.seed(seed)`, `torch.manual_seed(seed)`, `torch.cuda.manual_seed_all(seed)`, and set:
  ```python
  import os, random, numpy as np, torch
  os.environ["PYTHONHASHSEED"] = str(seed)
  os.environ.setdefault("CUBLAS_WORKSPACE_CONFIG", ":4096:8")
  torch.backends.cudnn.deterministic = True
  torch.backends.cudnn.benchmark = False
  ```
- [ ] **Ban Silent Ephemeral Scratch Dependencies**: Reject pipelines that conditionally load precomputed embeddings or arrays from ephemeral directories with silent fallback (`if os.path.exists(".scratch/cache.npy"): ... else: return empty`). Every stage must execute deterministically from raw inputs or fail fast.
- [ ] **Complete Inference Bundle Serialization**: Model persistence must save fitted preprocessing artifacts (scaler parameters, imputation statistics, categorical mappings, and column orders) alongside model weights.

---

## Concrete Anti-Patterns

### Anti-Pattern 1: Pandas Index Alignment Test NaN Collapse & Hardcoded Divisor

```python
# BAD: Retains original Series index, causing 100% NaN on test DataFrame assembly.
# Also hardcodes 10.0 divisor, breaking 5-fold CV.
def build_features_bad(train_df, test_df, y_train, skf):
    df_all = pd.concat([train_df, test_df], ignore_index=True)
    n_train = len(train_df)
    ratio = (df_all["calls"] / np.maximum(1.0, df_all["days"])).astype(np.float32)

    te_acc = np.zeros(len(test_df), dtype=np.float32)
    for tr_idx, val_idx in skf.split(train_df, y_train):
        means = train_df.iloc[tr_idx].groupby("plan")["churn"].mean()
        te_acc += test_df["plan"].map(means).fillna(0.0).values / 10.0  # BUG: hardcoded divisor

    X_test = pd.DataFrame({"call_ratio": ratio[n_train:]}, index=test_df.index) # 100% NaN!
    X_test["plan_te"] = te_acc
    return X_test

# GOOD: Positional NumPy array slicing, dynamic divisor, and schema assertions
def build_features_safe(train_df, test_df, y_train, skf):
    n_splits = float(skf.get_n_splits())
    n_train = len(train_df)

    days_arr = np.concatenate([train_df["days"].to_numpy(), test_df["days"].to_numpy()])
    calls_arr = np.concatenate([train_df["calls"].to_numpy(), test_df["calls"].to_numpy()])
    ratio_arr = np.where(days_arr > 0, calls_arr / days_arr, np.nan).astype(np.float32)

    te_acc = np.zeros(len(test_df), dtype=np.float32)
    for tr_idx, val_idx in skf.split(train_df, y_train):
        means = train_df.iloc[tr_idx].groupby("plan")["churn"].mean()
        te_acc += test_df["plan"].map(means).fillna(train_df.iloc[tr_idx]["churn"].mean()).to_numpy() / n_splits

    X_test = pd.DataFrame(
        {
            "call_ratio": ratio_arr[n_train:],  # Positional slice preserves clean float array
            "plan_te": te_acc,
        },
        index=test_df.index,
    )
    assert X_test["call_ratio"].isna().mean() < 1.0, "Test feature collapsed to 100% NaN"
    assert X_test["plan_te"].nunique() > 1, "Target encoding collapsed to constant"
    return X_test
```
