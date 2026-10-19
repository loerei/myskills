# Data Splitting, Leakage Prevention, Feature Views, and Train-Serve Parity

Audits cross-validation topology, preprocessing/target/transductive leakage prevention, DataFrame index-alignment safety, model-family-tailored feature views & MNAR handling, boundary ratio semantics, and train-serve / train-test distribution parity. Pair grounded Python/NumPy/Pandas/Scikit-Learn/PyTorch code remediations with atomic Given/When/Then acceptance criteria.

## Domain Audit Checklist

### 1. Preprocessing, Target & Transductive Leakage Prevention
- [ ] **Fold-Isolated Stateful Preprocessing (`fit` on Train Only)**: Verify that all stateful transformations (`StandardScaler`, `RobustScaler`, `QuantileTransformer`, `SimpleImputer`, `KNNImputer`, `Ridge`/linear feature imputers, `PCA`, `SVD`, `TF-IDF`, quantile binners, outlier clippers) call `.fit(X_train)` strictly inside each cross-validation fold (or strictly on the training split) and call `.transform(X_val)` / `.transform(X_test)`. Strictly reject calling `.fit_transform()` on the full concatenated or unsplit dataset prior to train/validation splitting.
- [ ] **Strict Inductive Isolation (No Concatenated `train + test` Bleed)**: Reject concatenating `train` and `test` DataFrames (`df_all = pd.concat([train, test])`) to compute entity/peer group aggregations, missing-value imputations, or unsupervised regressions, which leaks test-set feature values into training rows (Transductive Test-to-Train Leakage) and breaks single-sample production inference. Compute peer/group lookup tables strictly on training splits and map onto validation/test splits.
- [ ] **Out-of-Fold (OOF) Supervised Feature Engineering & Dynamic Fold Scaling**:
  - Verify that any feature transformation utilizing the target variable `y` (Bayesian target encoding, weight-of-evidence, supervised stacking predictions, OOF residual features, or peer target aggregations) computes validation fold values using only in-fold training targets with Bayesian smoothing ($m > 0$).
  - **Dynamic Fold-Count Divisor**: When accumulating test-set encodings or predictions across $K$ folds inside a CV loop, divide by the dynamic splitter fold count (`divisor = float(cv.get_n_splits())` or `len(folds)`), **NEVER** by a hardcoded literal (`/ 10.0` or `/ 5.0`) that scales test features down by $50\%\text{–}90\%$ when run with fewer folds (e.g. 5-fold CV or 1-fold fast probing).
- [ ] **Post-Split Resampling & Augmentation (`SMOTE`, Oversampling)**: Confirm synthetic oversampling, undersampling, and data augmentation are applied strictly to `X_train, y_train` inside each fold—never to validation or test splits.

### 2. Cross-Validation & Split Topology Alignment
- [ ] **Entity Group Isolation (`GroupKFold` / `StratifiedGroupKFold`)**: When multiple rows belong to the same underlying entity (`user_id`, `customer_id`, `patient_id`, `session_id`, `borrower_id`), reject random `KFold` or `StratifiedKFold`; mandate `GroupKFold` or `StratifiedGroupKFold` grouped by entity ID. Furthermore, reject peer-target features that leak labels across repeat entity rows in CV while defaulting to a static global prior on $>95\%$ of cold-start test entities.
- [ ] **Temporal Ordering & Lookahead Prevention (`TimeSeriesSplit` / Purged Walk-Forward)**: For time-series, financial, event-log, or forecasting datasets, reject random shuffling (`shuffle=True`); mandate chronological splitting (`TimeSeriesSplit` or walk-forward validation) with an explicit purge/embargo gap when rolling-window features or lagged labels span split boundaries.
- [ ] **Stratification on Skewed Targets**: For classification tasks with imbalanced class distributions, enforce `StratifiedKFold` (or `StratifiedGroupKFold`) so every fold preserves the global positive class prior.

### 3. Model-Tailored Feature Views, Index Alignment & MNAR Preservation
- [ ] **Model-Family-Tailored Feature Subsets / Views (Ban on Monolithic Feature Dumping across Heterogeneous Models)**:
  When a multi-model pipeline trains $\ge 2$ distinct model families (e.g. GBDTs, CatBoost, ExtraTrees/Random Forests, Additive GAMs/EBMs, Linear/Kernel models, and Deep Neural Networks), **REJECT** feeding an identical, one-size-fits-all monolithic feature matrix into every model family. Feeding a single unadapted feature pack across all models both violates family-specific mathematical inductive biases and causes prediction correlation collapse ($\rho \to 1$). Mandate **Per-Model / Per-Family Feature Views (`FeatureView` / subset selectors)**:
  1. **Gradient Boosted Trees (`LightGBM`, `XGBoost`) View**: Retain native `NaN`s for optimal Missingness Not At Random (MNAR) split routing, retain informative non-linear ratios/interactions, and prune exact/affine collinear clones that dilute `colsample_bytree`.
  2. **Oblivious / Categorical Trees (`CatBoost`) View**: Expose raw high-cardinality categorical columns (`cat_features`) directly so CatBoost computes native Ordered Target Statistics and on-the-fly categorical combinations, rather than forcing it to rely solely on static pre-computed GBDT target encodings.
  3. **Neural Networks (`MLP`, `MetricNet`, `TabNet`), Linear/Kernel & `ExtraTrees` View**: Provide a dedicated, de-collinearized ($|r| \le 0.95$) feature subset with fold-isolated finite imputation + explicit `*_IS_NAN` binary indicators, and apply `RankGauss` (`QuantileTransformer(output_distribution="normal")`) or `RobustScaler`/`StandardScaler` normalization (since Neural/Linear inner products and ExtraTrees uniform random cut-points are severely degraded by raw outliers, unscaled ratios, collinear noise, and `NaN`s).
  4. **Generalized Additive Models (`EBM`, `GAM`, `Spline`) View**: Select a compact, low-collinearity base feature subset without pre-multiplied 3-way/4-way interaction bloat so the additive model cleanly learns univariate shape functions $f_i(x_i)$ and pairwise interactions $f_{ij}(x_i, x_j)$.
  5. **Subspace Diversity across Ensemble Constituents**: Partition or weight feature subsets across constituent models so individual models specialize in distinct signal subspaces rather than memorizing the exact same dominant features.
- [ ] **Positional Array Slicing vs. Pandas Index Alignment `NaN` Collapse**: When constructing `X_train` and `X_test` DataFrames from sliced arrays or Series (`vals[n_train:]`) while passing `index=raw_test.index` (`[0, ..., n_test - 1]`), a sliced `pd.Series` retains its offset index (`[n_train, ..., n_total - 1]`). Pandas aligns by index label rather than position, silently filling **100% of test rows with `NaN`**! Mandate converting Series to positional NumPy arrays (`.to_numpy()` / `.values.ravel()`) before slicing or DataFrame construction, and assert `X_test[col].isna().mean() < 1.0` and `X_test[col].nunique(dropna=True) > 1`.
- [ ] **Zero-vs-`NaN` & $k=0$ vs. $k=1$ Ratio Boundary Semantics**:
  - **Denominator Clamping Distortion**: Reject formulas like `income / np.maximum(1.0, count)` when `count` is a discrete count ($0, 1, 2, \dots$), because `np.maximum(1.0, 0)` maps `count == 0` and `count == 1` to the exact same denominator (`1.0`), conflating zero-count entities with single-count entities! Instead, use `np.where(count > 0, income / count, np.nan)` or `income / (count + 1.0)`.
  - **Nullable Boolean Flag Conflation**: Reject boolean equality expressions on nullable columns (`(df["col"] == 0).astype(float)`) that evaluate `NaN` (unobserved/untracked) to `0.0` (`False`), conflating unobserved entities with active non-zero entities (`col > 0`). Preserve `NaN` when the source column is `NaN`, or emit a dedicated `*_IS_NAN` flag.
- [ ] **Dataset Schema Existence Verification (No Silent Constant-Zero Columns)**: Verify every raw column or prefix pattern (`df.get("COL")`, `[c for c in df.columns if ...]`) against the actual dataset schema on disk. Reject silent fallbacks that emit constant `0.0` columns when expected columns do not exist in the dataset.

## Concrete Anti-Patterns

### Anti-Pattern 1: Pandas Series Slicing Index Misalignment (100% Test `NaN` Collapse) & Hardcoded Fold Divisor

```python
# BAD 1: Slicing a pandas Series (vals[n_tr:]) keeps index [n_tr..N-1]; passing index=raw_test.index [0..n_te-1]
# causes pandas index alignment to fill 100% of test rows with NaN!
# BAD 2: Hardcoding `/ 10.0` instead of `/ float(skf.n_splits)` scales test encodings by 50% under 5-fold CV!
def build_features_bad(raw_train: pd.DataFrame, raw_test: pd.DataFrame, y_tr: np.ndarray, skf: StratifiedKFold):
    df_all = pd.concat([raw_train, raw_test], ignore_index=True)
    n_tr = len(raw_train)
    features_all = {"ratio_flag": (df_all["A"] <= df_all["B"]).astype(np.float32)}  # pd.Series with index 0..N-1

    te_acc = np.zeros(len(raw_test), dtype=np.float32)
    for tr_idx, val_idx in skf.split(raw_train, y_tr):
        means = raw_train.iloc[tr_idx].groupby("cat")["target"].mean()
        te_acc += raw_test["cat"].map(means).fillna(0.0).values / 10.0  # BUG: hardcoded 10.0!

    X_test = pd.DataFrame({col: vals[n_tr:] for col, vals in features_all.items()}, index=raw_test.index) # 100% NaN!
    X_test["cat_te"] = te_acc
    return X_test

# GOOD: Positional NumPy array conversion (.to_numpy()), dynamic fold divisor, and distribution parity assertions
def build_features_safe(raw_train: pd.DataFrame, raw_test: pd.DataFrame, y_tr: np.ndarray, skf: StratifiedKFold):
    n_splits = float(skf.get_n_splits())
    oof_te = np.zeros(len(raw_train), dtype=np.float32)
    te_acc = np.zeros(len(raw_test), dtype=np.float32)
    global_prior = float(np.mean(y_tr))

    for tr_idx, val_idx in skf.split(raw_train, y_tr):
        tr_df = raw_train.iloc[tr_idx]
        stats = tr_df.groupby("cat")["target"].agg(["count", "mean"])
        smoothed = (stats["count"] * stats["mean"] + 20.0 * global_prior) / (stats["count"] + 20.0)
        oof_te[val_idx] = raw_train.iloc[val_idx]["cat"].map(smoothed).fillna(global_prior).to_numpy(dtype=np.float32)
        te_acc += (raw_test["cat"].map(smoothed).fillna(global_prior).to_numpy(dtype=np.float32) / n_splits)

    X_train = pd.DataFrame(
        {"ratio_flag": (raw_train["A"].to_numpy() <= raw_train["B"].to_numpy()).astype(np.float32), "cat_te": oof_te},
        index=raw_train.index,
    )
    X_test = pd.DataFrame(
        {"ratio_flag": (raw_test["A"].to_numpy() <= raw_test["B"].to_numpy()).astype(np.float32), "cat_te": te_acc},
        index=raw_test.index,
    )
    return X_train, X_test
```
- **Acceptance Criterion**: *Given* `raw_train` and `raw_test` with independent `[0..N-1]` indices and a `StratifiedKFold(n_splits=5)` splitter, *when* `build_features_safe` executes, *then* `X_test["ratio_flag"]` contains zero `NaN`s with `nunique() == 2`, and `X_test["cat_te"].mean()` matches `X_train["cat_te"].mean()` within `atol=1e-2` regardless of whether `n_splits` is `1`, `5`, or `10`.

### Anti-Pattern 2: Monolithic Feature Pack & Global Median Imputation Across Heterogeneous Models

```python
# BAD: Dumping one globally median-imputed 400-column feature matrix into LightGBM, CatBoost, EBM, and Neural Net!
# Destroys MNAR NaN routing in LightGBM, strips raw categoricals from CatBoost, and floods EBM/Neural Net with collinear interactions.
def prepare_all_models_bad(df: pd.DataFrame) -> pd.DataFrame:
    return df.fillna(df.median())

# GOOD: Model-family-specific Feature Views tailored to each model's mathematical inductive bias
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import QuantileTransformer

class MultiModelFeatureRouter:
    def __init__(self, base_continuous_cols: list[str], interaction_cols: list[str], raw_cat_cols: list[str]):
        self.base_cols = base_continuous_cols
        self.interaction_cols = interaction_cols
        self.raw_cat_cols = raw_cat_cols

    def view_for_gbdt(self, df: pd.DataFrame) -> pd.DataFrame:
        """Preserves native NaNs for MNAR tree routing across base + non-collinear interaction features."""
        cols = self.base_cols + self.interaction_cols
        out = df[cols].replace([np.inf, -np.inf], np.nan).copy()
        return out.clip(-1e6, 1e6).astype(np.float32)

    def view_for_catboost(self, df: pd.DataFrame) -> pd.DataFrame:
        """Provides base continuous features + raw high-cardinality categoricals for native Ordered TS."""
        out = self.view_for_gbdt(df)
        for c in self.raw_cat_cols:
            out[c] = df[c].astype(str).fillna("__MISSING__")
        return out

    def view_for_gam_ebm(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prunes pre-multiplied 3-way interactions so additive splines learn clean main & pairwise effects."""
        return df[self.base_cols].replace([np.inf, -np.inf], np.nan).clip(-1e6, 1e6).astype(np.float32)

    def fit_transform_neural_view(
        self, train_df: pd.DataFrame, eval_df: pd.DataFrame, seed: int = 42
    ) -> tuple[np.ndarray, np.ndarray]:
        """Fold-isolated finite imputation + missingness flags + RankGauss normalization on de-collinearized subset."""
        tr_base = train_df[self.base_cols].replace([np.inf, -np.inf], np.nan)
        ev_base = eval_df[self.base_cols].replace([np.inf, -np.inf], np.nan)

        nan_cols = [c for c in self.base_cols if tr_base[c].isna().any()]
        tr_flags = tr_base[nan_cols].isna().to_numpy(dtype=np.float32)
        ev_flags = ev_base[nan_cols].isna().to_numpy(dtype=np.float32)

        imputer = SimpleImputer(strategy="median")
        qt = QuantileTransformer(output_distribution="normal", random_state=seed)
        tr_norm = qt.fit_transform(imputer.fit_transform(tr_base)).astype(np.float32)
        ev_norm = qt.transform(imputer.transform(ev_base)).astype(np.float32)
        return np.hstack([tr_norm, tr_flags]), np.hstack([ev_norm, ev_flags])
```
- **Acceptance Criterion**: *Given* a multi-model pipeline training GBDT, CatBoost, EBM GAM, and a Neural Network, *when* feature views are routed via `MultiModelFeatureRouter`, *then* `view_for_gbdt` retains native `NaN`s, `view_for_catboost` retains raw string categoricals, `view_for_gam_ebm` excludes pre-multiplied higher-order interaction columns, and `fit_transform_neural_view` outputs finite zero-`NaN` RankGauss-normalized arrays with explicit missingness indicators fitted strictly on `train_df`.

## Failure Modes & Mitigations

- **Monolithic Feature Pack Correlation Collapse**: Route model-family-specific feature subsets (`view_for_gbdt`, `view_for_catboost`, `view_for_gam_ebm`, `fit_transform_neural_view`) rather than feeding one identical feature matrix to all models.
- **100% Test-Set `NaN` Collapse from Series Slicing**: Convert all sliced Series to 1D NumPy arrays (`.to_numpy()`) before constructing `X_train` and `X_test` DataFrames with custom indices.
- **Scale Shift on Non-10-Fold Runs**: Divide accumulated test encodings by `float(cv.get_n_splits())`, never by a hardcoded literal.
- **MNAR Signal Destruction in Tree Models**: Preserve native `NaN` values in GBDT feature views; apply finite imputation only inside neural/linear model views.
- **Transductive Test-to-Train Leakage**: Never concatenate `train` and `test` before computing peer/entity imputations or unsupervised regressions.
