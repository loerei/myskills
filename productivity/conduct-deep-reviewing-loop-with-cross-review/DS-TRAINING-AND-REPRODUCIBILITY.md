# Training Dynamics, Self-Contained Lineage, and Reproducibility

Audits deep learning and GBDT training loops, train/eval mode switching, gradient accumulation and clipping, mixed-precision (AMP) scaling, batch normalization edge cases, deterministic RNG seeding, artifact serialization parity, and self-contained pipeline lineage (banning silent ephemeral scratch dependencies). Pair grounded Python/PyTorch/GBDT code remediations with atomic Given/When/Then acceptance criteria.

## Domain Audit Checklist

### 1. Training & Evaluation Loop Lifecycle
- [ ] **Explicit `model.train()` vs. `model.eval()` & `torch.no_grad()` Switching**: Verify every training epoch/step explicitly sets `model.train()` and every validation/test inference pass sets `model.eval()` wrapped in `with torch.no_grad():` (or `torch.inference_mode()`), restoring `model.train()` afterward so `Dropout` and `BatchNorm` running statistics are never corrupted during validation or left active during inference.
- [ ] **Optimizer Zero-Grad, Gradient Accumulation & Clipping Order**:
  - Verify `optimizer.zero_grad(set_to_none=True)` is called before forward/backward passes (or at the start of each accumulation window).
  - When accumulating gradients over $K$ micro-batches, divide the micro-batch loss by $K$ (`loss = raw_loss / accum_steps`) and flush remaining un-stepped gradients when `len(dataloader) % accum_steps != 0`.
  - When using Automatic Mixed Precision (`torch.cuda.amp.GradScaler` / `torch.amp.GradScaler`) with gradient clipping, call `scaler.unscale_(optimizer)` **before** `torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm)` so clipping operates on true unscaled gradient magnitudes.
- [ ] **BatchNorm Singleton Batch Guard (`batch_size == 1`)**: For networks containing `nn.BatchNorm1d` / `nn.BatchNorm2d`, verify training DataLoaders either set `drop_last=True` (when `len(dataset) % batch_size == 1` is possible), dynamically skip singleton tail batches, or use batch-size-independent normalization (`nn.LayerNorm`, `nn.GroupNorm`) to prevent `ValueError: Expected more than 1 value per channel when training`.
- [ ] **Best-Checkpoint Restoration vs. Last-Epoch Overfit**: When early stopping or validation monitoring is used, verify the training loop snapshots the best model weights (`copy.deepcopy(model.state_dict())` or disk checkpoint) at peak validation score and restores those best weights before generating final validation/test predictions—never returning the overfitted final-epoch weights after patience expires.

### 2. Self-Contained Pipeline Lineage & Deterministic Reproducibility
- [ ] **Ban Silent Ephemeral Scratch Dependencies**: Reject feature builders or training stages that conditionally load precomputed arrays, embeddings, or intermediate caches (`.npy`, `.parquet`, `.pkl`) from untracked/ephemeral scratch directories with silent fallback (`if os.path.exists(".scratch/latents.npy"): ... else: return empty_df`), which silently drops features and changes matrix dimensionality on clean checkouts. Every feature and latent representation must be deterministically computed within the declared pipeline DAG from raw inputs (or fail fast with a clear error if a required upstream stage artifact is absent).
- [ ] **Comprehensive RNG Seeding**: Confirm deterministic seed initialization across `random.seed(seed)`, `np.random.seed(seed)`, `torch.manual_seed(seed)`, `torch.cuda.manual_seed_all(seed)`, DataLoader `generator` / `worker_init_fn`, and tree framework parameters (`random_state` / `seed`, `deterministic=True`, `bagging_seed`, `feature_fraction_seed`).
- [ ] **Complete Inference Bundle Serialization**: Verify model persistence saves not only model weights/trees, but also all fitted preprocessing artifacts (scaler means/stds, imputer statistics, categorical mappings, feature column lists, and post-processing calibration parameters) required to reproduce predictions from raw inputs without out-of-band state.
- [ ] **Hardware-Adaptive Device Placement & Memory Cleanup**: Verify PyTorch modules and tensors resolve device placement via an explicit parameter or `torch.device("cuda" if torch.cuda.is_available() else "cpu")` seam so unit tests execute hermetically on CPU-only CI runners while production runs utilize GPU acceleration.

## Concrete Anti-Patterns

### Anti-Pattern 1: Missing `model.eval()`, Unscaled AMP Gradient Clipping, & Returning Last-Epoch Weights

```python
# BAD: Clips scaled AMP gradients without unscale_(), forgets model.eval() during validation,
# and returns the overfitted final epoch model instead of the best validation checkpoint!
def train_model_bad(model, train_loader, val_loader, optimizer, scaler):
    for epoch in range(20):
        for x, y in train_loader:
            optimizer.zero_grad()
            with torch.amp.autocast("cuda"):
                loss = criterion(model(x), y)
            scaler.scale(loss).backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0) # BUG: clips scaled gradients!
            scaler.step(optimizer)
            scaler.update()
        # BUG: model is still in train() mode with Dropout active and BatchNorm mutating!
        val_preds = [model(vx) for vx, _ in val_loader]
    return model

# GOOD: Proper train/eval toggling, scaler.unscale_() before clip_grad_norm_, and best-checkpoint restoration
import copy
import torch

def train_epoch_and_validate_safe(
    model: torch.nn.Module,
    train_loader: torch.utils.data.DataLoader,
    val_loader: torch.utils.data.DataLoader,
    optimizer: torch.optim.Optimizer,
    criterion: torch.nn.Module,
    device: torch.device,
    max_epochs: int = 20,
    max_grad_norm: float = 1.0,
) -> torch.nn.Module:
    use_amp = device.type == "cuda"
    scaler = torch.amp.GradScaler("cuda", enabled=use_amp)
    best_val_loss = float("inf")
    best_state = copy.deepcopy(model.state_dict())

    for _ in range(max_epochs):
        model.train()
        for x, y in train_loader:
            if x.size(0) < 2:
                continue  # Guard BatchNorm against singleton tail batch
            x, y = x.to(device), y.to(device)
            optimizer.zero_grad(set_to_none=True)
            with torch.amp.autocast(device.type, enabled=use_amp):
                loss = criterion(model(x), y)
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_grad_norm)
            scaler.step(optimizer)
            scaler.update()

        model.eval()
        val_loss_sum, val_count = 0.0, 0
        with torch.no_grad():
            for vx, vy in val_loader:
                vx, vy = vx.to(device), vy.to(device)
                batch_loss = criterion(model(vx), vy)
                val_loss_sum += float(batch_loss.item()) * vx.size(0)
                val_count += vx.size(0)

        val_loss = val_loss_sum / max(val_count, 1)
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_state = copy.deepcopy(model.state_dict())

    model.load_state_dict(best_state)
    model.eval()
    return model
```
- **Acceptance Criterion**: *Given* a `BatchNorm1d` network trained over multiple epochs where validation loss peaks at epoch $k < \text{max\_epochs}$ and the dataset size satisfies $N \equiv 1 \pmod{\text{batch\_size}}$, *when* `train_epoch_and_validate_safe` executes on CPU or CUDA, *then* singleton tail batches do not raise `ValueError`, validation runs under `model.eval()` with `torch.no_grad()`, gradients are unscaled before norm clipping, and the returned model contains the restored `best_state` weights from epoch $k$.

### Anti-Pattern 2: Silent Conditional Loading of Ephemeral `.scratch/` Latents

```python
# BAD: Silently drops 20+ features when untracked .scratch/*.npy files are absent on a clean checkout!
def build_latent_features_bad(n_rows: int, scratch_dir: str = ".scratch") -> pd.DataFrame:
    path = os.path.join(scratch_dir, "precomputed_latents.npy")
    if not os.path.exists(path):
        return pd.DataFrame()  # Silent dimensionality drop!
    arr = np.load(path)
    return pd.DataFrame(arr, columns=[f"LATENT_{i}" for i in range(arr.shape[1])])

# GOOD: Compute deterministic features directly from raw inputs via fit/transform (or fail fast on explicit artifact seam)
from sklearn.decomposition import TruncatedSVD

def build_latent_features_safe(
    X_train: np.ndarray,
    X_eval: np.ndarray,
    n_components: int = 16,
    seed: int = 42,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    svd = TruncatedSVD(n_components=n_components, random_state=seed)
    tr_latents = svd.fit_transform(X_train)
    ev_latents = svd.transform(X_eval)
    cols = [f"SVD_LATENT_{i}" for i in range(n_components)]
    return pd.DataFrame(tr_latents, columns=cols), pd.DataFrame(ev_latents, columns=cols)
```
- **Acceptance Criterion**: *Given* a clean repository environment with `.scratch/` purged, *when* the feature pipeline executes from raw input matrices, *then* all declared latent features are generated deterministically with fixed output column count and zero dependency on untracked files.

## Failure Modes & Mitigations

- **Silent Feature Drop on Clean Checkout**: Never gate feature generation on `os.path.exists(".scratch/...")`; compute features in-pipeline from raw data or fail fast on declared upstream artifacts.
- **Validation Corruption via Active `Dropout` / `BatchNorm`**: Always call `model.eval()` and enter `torch.no_grad()` before validation/test loops.
- **Returning Overfitted Final-Epoch Weights**: Snapshot `copy.deepcopy(model.state_dict())` whenever validation score improves and call `model.load_state_dict(best_state)` before returning.
- **AMP Gradient Explosion / Underflow**: Call `scaler.unscale_(optimizer)` before `clip_grad_norm_`.
- **Singleton Tail-Batch `BatchNorm` Crash**: Set `drop_last=True` on training DataLoader or skip batches with `x.size(0) < 2`.
