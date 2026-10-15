# Layout Shift, Loading States, Optimistic UI, and Progress Revealing

Audits Cumulative Layout Shift (CLS) prevention, loading state hierarchy, optimistic UI boundaries, and staleness-based progress timeouts. Pair grounded TSX/JS and structural/tokenized CSS remediations with atomic Given/When/Then acceptance criteria (never invent unverified token names or magic-pixel offsets).

## Domain Audit Checklist

### 1. Visual Stability & Layout Shift Protections (CLS)
- [ ] **Dimension Reservations**: Verify dynamic images, embeds, and async lazy-loaded elements reserve explicit width/height dimensions, intrinsic aspect-ratio boxes, or `contain-intrinsic-size` on off-screen dynamic items to guarantee visual layout stability (`CLS = 0`).
- [ ] **Data Fetching & Loading Hierarchy (Top Progress Line / Spinner vs. Skeleton)**: To prevent layout jumps without causing jarring skeleton shimmer flashes on fast local/desktop loads ($<200\text{ms}$), default to slim top-edge progress lines or lightweight inline spinners over heavy skeleton blocks, unless explicit skeleton placeholders are established by codebase convention.
- [ ] **Empty In-Flow Container Hierarchy (3-Tier Precedence)**: When containers dynamically appear or clear their contents (e.g. empty toolbars, contextual action bars), follow the 3-tier precedence: (1) `Context.md` directives > (2) existing codebase conventions > (3) Default: smooth animated accordion transitions (e.g. grid `0fr -> 1fr` row expansion with opacity easing, respecting `prefers-reduced-motion: reduce`) rather than abrupt non-animated display toggles, strictly preserving error recovery controls in `catch` blocks.
- [ ] **Scrollbar & Stacking Stability**: Verify overlays and dynamic drawers reserve stable scrollbar gutters (`scrollbar-gutter: stable`) to eliminate horizontal layout jumps without custom JS padding hacks, and use verified design system elevation tokens (`--zIndex-*`) or local stacking context isolation (`isolation: isolate`) rather than magic integer z-indices.
- [ ] **Declarative Transitions & Reflow Prevention**: Verify dynamic elements transitioning between states use declarative CSS transitions/animations (`onTransitionEnd`, `@starting-style`, `transition-behavior: allow-discrete`) rather than brittle `setTimeout` chains, and prevent forced synchronous reflows by using CSS Container Queries (`@container`) or batching all DOM geometry reads before scheduling writes in `requestAnimationFrame()`.

### 2. Micro-Interaction Responsiveness & Optimistic UI
- [ ] **Immediate Input Feedback ($<100\text{ms}$)**: Ensure interactive elements supply immediate visual active/pending state feedback within $<100\text{ms}$ of user touch, click, or keyboard activation.
- [ ] **Optimistic Updates & Ephemeral Toast Undo**: Confirm optimistic UI mutations update state immediately, revalidate in the background (SWR), and roll back automatically with an error toast if backend processing fails. For non-destructive list item removals, collapse the item immediately and provide a floating Undo toast without leaving a stalled in-place placeholder slot. **NEVER use optimistic updates for irreversible destructive actions** (permanent file deletions, binary overwrites, schema migrations, irreversible database writes).

### 3. Long-Running Progress & Staleness Timeouts
- [ ] **Quantitative Progress Revealing ($>2\text{s}$)**: Verify operations taking $>2\text{s}$ provide deterministic quantitative progress (`processed / total`, percentage, bytes/items) and a user-accessible Cancel/Abort action instead of an opaque indeterminate spinner.
- [ ] **Staleness-Based Timeout (Inactivity vs. Wall-Clock)**: Confirm timeouts abort strictly on progress staleness (zero forward delta over a configurable inactivity window measured via `performance.now()`) rather than an arbitrary total elapsed wall-clock duration that aborts healthy, actively progressing jobs.

## Concrete Anti-Patterns

### Anti-Pattern 1: Un-Optimistic Async Mutate Delay on Non-Destructive Action

```tsx
// BAD: UI blocks for 800ms network roundtrip on a simple reversible toggle
function LikeButtonBad({ postId }: { postId: string }) {
  const [liked, setLiked] = useState(false);
  const handleLike = async () => {
    await api.post(`/posts/${postId}/like`);
    setLiked(true);
  };
  return <button onClick={handleLike}>{liked ? "Liked" : "Like"}</button>;
}

// GOOD: Optimistic transition (<100ms) with deterministic rollback and error toast on failure
function LikeButtonSafe({ postId, notifyError }: { postId: string; notifyError: (msg: string) => void }) {
  const [liked, setLiked] = useState(false);
  const handleLike = async () => {
    const prev = liked;
    setLiked(!prev);
    try {
      await api.post(`/posts/${postId}/like`, { liked: !prev });
    } catch {
      setLiked(prev);
      notifyError("Failed to update like status. Changes reverted.");
    }
  };
  return <button type="button" aria-pressed={liked} onClick={handleLike}>{liked ? "Liked" : "Like"}</button>;
}
```
- **Acceptance Criterion**: *Given* an unliked item, *when* the user activates the Like toggle, *then* `aria-pressed` and label update immediately before the network promise settles; *if* the request rejects, *then* state reverts to `prev` and an error toast is shown.

### Anti-Pattern 2: Arbitrary Wall-Clock Timeout Penalizing Active Progress (Slowness vs. Staleness)

```typescript
// BAD: Fixed 30s wall-clock timeout aborts a large file job that is actively progressing at 85%
const controller = new AbortController();
setTimeout(() => controller.abort(new Error("Operation timed out")), 30000);
await processLargePayload(file, { signal: controller.signal, onProgress: (pct) => updateUI(pct) });

// GOOD: Rolling staleness watchdog resets on positive progress delta (processed > lastProcessed)
export async function runWithStalenessWatchdog(
  file: Blob,
  inactivityLimitMs: number,
  updateUI: (done: number, total: number) => void
) {
  const controller = new AbortController();
  let lastProcessed = -1;
  let lastProgressMono = performance.now();

  const watchdog = setInterval(() => {
    if (performance.now() - lastProgressMono > inactivityLimitMs) {
      controller.abort(new Error("Stalled: zero progress within inactivity window"));
    }
  }, 1000);

  try {
    await processLargePayload(file, {
      signal: controller.signal,
      onProgress: (processed: number, total: number) => {
        if (processed > lastProcessed) {
          lastProcessed = processed;
          lastProgressMono = performance.now();
        }
        updateUI(processed, total);
      }
    });
  } finally {
    clearInterval(watchdog);
  }
}
```
- **Acceptance Criterion**: *Given* a job exceeding 30s total runtime that emits positive progress deltas every 2s under a 10s inactivity threshold, *when* executed, *then* the job completes without premature abort; *when* progress stalls with zero delta for $>10\text{s}$, *then* `controller.abort` fires.

### Anti-Pattern 3: Abrupt Display Toggling, Imperative `setTimeout` Unmount, & Layout Thrashing

```css
/* GOOD: Smooth grid 0fr -> 1fr accordion with prefers-reduced-motion & @container query (zero JS reflow loop) */
.collapsible-slot {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition: grid-template-rows 200ms ease, opacity 150ms ease;
}
.collapsible-slot[data-expanded="true"] {
  grid-template-rows: 1fr;
  opacity: 1;
}
.collapsible-inner { overflow: hidden; }
@media (prefers-reduced-motion: reduce) {
  .collapsible-slot { transition: none; }
}
```
- **Acceptance Criterion**: *Given* a dynamic toolbar or overlay slot, *when* it expands or collapses, *then* height transitions via `grid-template-rows` (or instantaneously under `prefers-reduced-motion: reduce`) without `setTimeout` unmount timers or interleaved DOM read-after-write loops, while keeping Retry controls mounted on error states.

## Failure Modes & Mitigations

- **Cumulative Layout Shifts (`CLS > 0`)**: Reserve intrinsic dimensions (`contain-intrinsic-size`, `aspect-ratio`) on dynamic media/containers and use smooth `0fr -> 1fr` grid transitions on collapsible in-flow slots.
- **Optimistic State Drift**: Pair optimistic mutations with automatic error rollback and background SWR revalidation; never apply optimistic UI to destructive writes.
- **Wall-Clock Timeout Killing Healthy Jobs**: Use rolling staleness watchdogs reset by forward progress deltas (`processed > lastProcessed`) via `performance.now()`.
- **Animation Timer Drift**: Replace `setTimeout` unmount timers with declarative CSS transitions (`onTransitionEnd`) and `prefers-reduced-motion: reduce` support.
- **Frame Drops from Layout Thrashing**: Use CSS `@container` queries or batch all DOM geometry reads prior to `requestAnimationFrame` writes.
- **Horizontal Jump on Modal Open**: Reserve stable scrollbar gutters (`scrollbar-gutter: stable`) on root/scrollable containers.
