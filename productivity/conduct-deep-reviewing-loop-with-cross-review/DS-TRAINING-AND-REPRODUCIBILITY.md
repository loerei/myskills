# Training Dynamics, Self-Contained Lineage, and Reproducibility

Audits deep learning and GBDT training loops, train/eval mode switching, gradient accumulation and clipping, mixed-precision (AMP) scaling, batch normalization edge cases, deterministic RNG seeding, artifact serialization parity, and self-contained pipeline lineage (banning silent ephemeral scratch dependencies). Pair grounded Python/PyTorch/GBDT code remediations with atomic Given/When/Then acceptance criteria.

## Domain Audit Checklist

### 1. Training & Evaluation Loop Lifecycle
- [ ] **Explicit `model.train()` vs. `model.eval()` & `torch.no_grad()` Switching**: Verify every training epoch/step explicitly sets `model.train()` and every validation/test inference pass sets `model.eval()` wrapped in `with torch.no_grad():` (or `torch.inference_mode()`), restoring `model.train()` afterward so `Dropout` and `BatchNorm` running statistics are never corrupted during validation or left active during inference.
- [ ] **Optimizer Zero-Grad, Gradient Accumulation & Clipping Order**:
  - Verify `optimizer.zero_grad(set_to_none=True)` is called before forward/backward passes (or at the start of each accumulation window).
  - When accumulating gradients over $K$ micro-batches, divide the micro-batch loss by $K$ (`loss = raw_loss / float(accum_steps)`) and flush remaining un-stepped gradients when `accum_count > 0 and (accum_count == accum_steps or is_last_batch)`.
  - When using Automatic Mixed Precision (`torch.cuda.amp.GradScaler` / `torch.amp.GradScaler`) with gradient clipping, call `scaler.unscale_(optimizer)` **before** `torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm)` so clipping operates on true unscaled gradient magnitudes. Default to `bfloat16` when supported (`torch.cuda.is_bf16_supported()`), disabling `GradScaler`.
  - For per-batch LR schedulers (e.g. `OneCycleLR`), verify `scheduler.step()` is only executed when `scaler.get_scale()` didn't skip `optimizer.step()` due to Inf/NaN.
- [ ] **Decoupled AdamW Parameter Groups (Zero Decay on 1D Biases & Norms)**: For networks trained with `AdamW`, verify that 1D parameters (biases, `LayerNorm`, `BatchNorm`, `GroupNorm` weights) are segregated into a parameter group with `weight_decay = 0.0` so representation capacity is not degraded by L2 penalty.
- [ ] **Comprehensive Hardware Determinism Flags**: Confirm deterministic seed initialization across `random.seed(seed)`, `np.random.seed(seed)`, `torch.manual_seed(seed)`, `torch.cuda.manual_seed_all(seed)`, DataLoader `generator` / `worker_init_fn`, plus low-level CUDA flags: `os.environ["PYTHONHASHSEED"] = str(seed)`, `os.environ["CUBLAS_WORKSPACE_CONFIG"] = ":4096:8"`, `torch.backends.cudnn.deterministic = True`, `torch.backends.cudnn.benchmark = False`, and `torch.use_deterministic_algorithms(True, warn_only=True)`.
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

# GOOD: Proper train/eval toggling, decoupled AdamW, bfloat16/fp16 AMP with safe accumulation & singleton flush, and best-checkpoint restoration
import copy
import os
import random
import numpy as np
import torch
import torch.nn as nn

def seed_everything_deterministic(seed: int = 42) -> None:
    """Enforces comprehensive RNG and CUDA kernel determinism."""
    os.environ["PYTHONHASHSEED"] = str(seed)
    os.environ.setdefault("CUBLAS_WORKSPACE_CONFIG", ":4096:8")
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False
    torch.use_deterministic_algorithms(True, warn_only=True)

def build_decoupled_adamw(model: nn.Module, lr: float = 1e-3, weight_decay: float = 1e-2) -> torch.optim.AdamW:
    """Excludes 1D parameters (biases, LayerNorm/BatchNorm weights) from weight decay penalty."""
    decay_params, no_decay_params = [], []
    for name, param in model.named_parameters():
        if not param.requires_grad:
            continue
        if param.ndim < 2 or "bias" in name or "norm" in name.lower() or "bn" in name.lower():
            no_decay_params.append(param)
        else:
            decay_params.append(param)
    return torch.optim.AdamW(
        [
            {"params": decay_params, "weight_decay": weight_decay},
            {"params": no_decay_params, "weight_decay": 0.0},
        ],
        lr=lr,
    )

def train_and_validate_complete_safe(
    model: nn.Module,
    train_loader: torch.utils.data.DataLoader,
    val_loader: torch.utils.data.DataLoader,
    optimizer: torch.optim.Optimizer,
    criterion: nn.Module,
    device: torch.device,
    scheduler: torch.optim.lr_scheduler.LRScheduler | None = None,
    step_scheduler_per_batch: bool = False,
    max_epochs: int = 20,
    accum_steps: int = 1,
    max_grad_norm: float = 1.0,
) -> nn.Module:
    use_cuda = device.type == "cuda"
    amp_dtype = torch.bfloat16 if (use_cuda and torch.cuda.is_bf16_supported()) else torch.float16
    use_scaler = use_cuda and (amp_dtype == torch.float16)
    scaler = torch.amp.GradScaler("cuda", enabled=use_scaler)

    best_val_loss = float("inf")
    best_state = copy.deepcopy(model.state_dict())
    num_batches = len(train_loader)

    for _ in range(max_epochs):
        model.train()
        optimizer.zero_grad(set_to_none=True)
        accum_count = 0

        for batch_idx, (x, y) in enumerate(train_loader):
            is_last_batch = (batch_idx + 1) == num_batches

            # Safe singleton BatchNorm guard that still flushes any pending accumulated gradients on last batch
            if x.size(0) >= 2:
                x, y = x.to(device), y.to(device)
                with torch.amp.autocast(device.type, dtype=amp_dtype, enabled=use_cuda):
                    raw_loss = criterion(model(x), y)
                    loss = raw_loss / float(accum_steps)
                scaler.scale(loss).backward()
                accum_count += 1

            if accum_count > 0 and (accum_count == accum_steps or is_last_batch):
                scaler.unscale_(optimizer)
                torch.nn.utils.clip_grad_norm_(model.parameters(), max_grad_norm)
                scale_before = scaler.get_scale() if use_scaler else 1.0
                scaler.step(optimizer)
                scaler.update()
                optimizer.zero_grad(set_to_none=True)
                accum_count = 0

                # Only step per-batch scheduler if GradScaler did not skip optimizer.step() due to Inf/NaN
                scale_after = scaler.get_scale() if use_scaler else 1.0
                if scheduler is not None and step_scheduler_per_batch and scale_after >= scale_before:
                    scheduler.step()

        model.eval()
        val_loss_sum, val_count = 0.0, 0
        with torch.inference_mode():
            for vx, vy in val_loader:
                vx, vy = vx.to(device), vy.to(device)
                with torch.amp.autocast(device.type, dtype=amp_dtype, enabled=use_cuda):
                    batch_loss = criterion(model(vx), vy)
                val_loss_sum += float(batch_loss.item()) * vx.size(0)
                val_count += vx.size(0)

        val_loss = val_loss_sum / max(val_count, 1)
        if scheduler is not None and not step_scheduler_per_batch:
            if isinstance(scheduler, torch.optim.lr_scheduler.ReduceLROnPlateau):
                scheduler.step(val_loss)
            else:
                scheduler.step()

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_state = copy.deepcopy(model.state_dict())

    model.load_state_dict(best_state)
    model.eval()
    return model
```
- **Acceptance Criterion**: *Given* a `BatchNorm1d` network trained with `accum_steps = 4` on a dataset with a singleton tail batch, *when* `train_and_validate_complete_safe` executes twice with `seed_everything_deterministic`, *then* pending accumulated gradients flush safely on the last batch without BatchNorm crash, biases and normalization layers have `weight_decay == 0.0`, and model outputs are bit-for-bit identical across runs.

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
- **Gradient Accumulation Residual Loss**: Always flush accumulated gradients on the final micro-batch (`accum_count > 0 and (accum_count == accum_steps or is_last_batch)`) even when singleton tail batches are bypassed.
- **AdamW Representation Degradation on Biases/Norms**: Always exclude 1D parameters (`ndim < 2`, bias, LayerNorm/BatchNorm weights) from weight decay (`weight_decay = 0.0`).
- **Non-Deterministic CUDA Execution**: Set `PYTHONHASHSEED`, `CUBLAS_WORKSPACE_CONFIG=":4096:8"`, `cudnn.deterministic=True`, `cudnn.benchmark=False`, and `use_deterministic_algorithms(True, warn_only=True)`.
