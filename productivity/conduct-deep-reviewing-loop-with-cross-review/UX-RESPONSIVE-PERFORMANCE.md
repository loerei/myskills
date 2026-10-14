# Layout Shift, Loading States, Optimistic UI, and Progress Revealing

Audits Cumulative Layout Shift (CLS) prevention, loading state hierarchy, optimistic UI boundaries, and staleness-based progress timeouts.

> [!IMPORTANT]
> **Strict Code Ban for UXUI Reports**: The `BAD` code snippets below illustrate buggy patterns to detect when reading a target Directive Artifact. When writing `<review_dir>/reports/UXUI.md`, you **MUST NOT** output concrete CSS, HTML, or JSX code snippets; state all remediations as **Abstract Behavioral Specifications** with testable **Acceptance Criteria (Given/When/Then)** as shown in the `GOOD` blocks.

## Domain Audit Checklist

### 1. Visual Stability & Layout Shift Protections (CLS)
- [ ] **Dimension Reservations**: Verify dynamic images, embeds, and async lazy-loaded elements reserve explicit width/height dimensions, intrinsic aspect-ratio boxes, or `contain-intrinsic-size` on off-screen dynamic items to guarantee visual layout stability (`CLS = 0`).
- [ ] **Data Fetching & Loading Hierarchy (Top Progress Line / Spinner vs. Skeleton)**: To prevent layout jumps without causing jarring skeleton shimmer flashes on fast local/desktop loads ($<200\text{ms}$), default to slim top-edge progress lines or lightweight inline spinners over heavy skeleton blocks, unless explicit skeleton placeholders are established by codebase convention.
- [ ] **Empty In-Flow Container Hierarchy (3-Tier Precedence)**: When containers dynamically appear or clear their contents (e.g. empty toolbars, contextual action bars), follow the 3-tier precedence: (1) `Context.md` directives > (2) existing codebase conventions > (3) Default: smooth animated accordion transitions (e.g. grid fractional row expansion with opacity easing, respecting `prefers-reduced-motion: reduce`) rather than abrupt non-animated display toggles, strictly preserving error recovery controls in `catch` blocks.
- [ ] **Scrollbar & Stacking Stability**: Verify overlays and dynamic drawers reserve stable scrollbar gutters (`scrollbar-gutter: stable`) to eliminate horizontal layout jumps without custom JS padding hacks, and use verified design system elevation tokens (`--zIndex-*`) or local stacking context isolation (`isolation: isolate`) rather than magic integer z-indices.
- [ ] **Declarative Transitions & Reflow Prevention**: Verify dynamic elements transitioning between states use declarative CSS transitions/animations (or `@starting-style` / `transition-behavior: allow-discrete`) rather than brittle `setTimeout` chains, and prevent forced synchronous reflows by using CSS Container Queries (`@container`) or batching all DOM geometry reads before scheduling writes in `requestAnimationFrame()`.

### 2. Micro-Interaction Responsiveness & Optimistic UI
- [ ] **Immediate Input Feedback ($<100\text{ms}$)**: Ensure interactive elements supply immediate visual active/pending state feedback within $<100\text{ms}$ of user touch, click, or keyboard activation.
- [ ] **Optimistic Updates & Ephemeral Toast Undo**: Confirm optimistic UI mutations update state immediately, revalidate in the background (SWR), and roll back automatically with an error toast if backend processing fails. For non-destructive list item removals, collapse the item immediately and provide a floating Undo toast without leaving a stalled in-place placeholder slot. **NEVER use optimistic updates for irreversible destructive actions** (permanent file deletions, binary overwrites, schema migrations, irreversible database writes).

### 3. Long-Running Progress & Staleness Timeouts
- [ ] **Quantitative Progress Revealing ($>2\text{s}$)**: Verify operations taking $>2\text{s}$ provide deterministic quantitative progress (`processed / total`, percentage, bytes/items) and a user-accessible Cancel/Abort action instead of an opaque indeterminate spinner.
- [ ] **Staleness-Based Timeout (Inactivity vs. Wall-Clock)**: Confirm timeouts abort strictly on progress staleness (zero forward delta over a configurable inactivity window) rather than an arbitrary total elapsed wall-clock duration that aborts healthy, actively progressing jobs.

## Concrete Anti-Patterns

### Anti-Pattern 1: Un-Optimistic Async Mutate Delay on Non-Destructive Action

```jsx
// BAD (In Target DA): UI blocks for 800ms network roundtrip on a simple reversible toggle
function LikeButton({ postId }) {
  const [liked, setLiked] = useState(false);
  const handleLike = async () => {
    await api.post(`/posts/${postId}/like`); // 800ms delay before visual feedback
    setLiked(true);
  };
  return <button onClick={handleLike}>{liked ? 'Liked' : 'Like'}</button>;
}
```
- **GOOD (Required Abstract Behavioral Spec for `UXUI.md`)**:
  - **Specification**: For reversible, non-destructive toggle actions, transition the visual state optimistically within $<100\text{ms}$ of user activation while dispatching the async request in the background; if the request fails, revert the visual state to its prior value and display an actionable error toast.
  - **Acceptance Criterion**: *Given* an unliked item, *when* the user activates the Like toggle, *then* the button immediately reflects the Liked state before the network promise settles; *if* the request rejects, *then* the button reverts to Unliked and an error notification toast is displayed.

### Anti-Pattern 2: Arbitrary Wall-Clock Timeout Penalizing Active Progress (Slowness vs. Staleness)

```javascript
// BAD (In Target DA): Fixed 30s wall-clock timeout aborts a large file job that is actively progressing at 85%
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(new Error("Operation timed out")), 30000);
await processLargePayload(file, { signal: controller.signal, onProgress: (pct) => updateUI(pct) });
```
- **GOOD (Required Abstract Behavioral Spec for `UXUI.md`)**:
  - **Specification**: Replace the fixed total wall-clock timer with a rolling staleness watchdog that resets its inactivity timer whenever a positive progress delta (`processed > lastProcessed`) is reported, aborting only when zero forward progress occurs for the configured inactivity window, and expose a user-initiated Cancel action alongside quantitative progress (`processed / total`).
  - **Acceptance Criterion**: *Given* a batch operation exceeding 30s total duration that emits progress deltas every 2s under a 10s staleness threshold, *when* the job executes, *then* the operation completes without premature timeout; *when* progress emission stalls with zero delta for $>10\text{s}$, *then* the watchdog aborts the operation and surfaces a staleness timeout error with retry/cancel controls.

### Anti-Pattern 3: Abrupt Non-Animated In-Flow Container Toggling & Lost Error Recovery

```javascript
// BAD (In Target DA): Abruptly toggling display: none causes layout jumps and hides recovery buttons in catch
if (overrideMissing) {
  toolbar.style.display = 'none'; // Jumps layout, hides recovery path
}
```
- **GOOD (Required Abstract Behavioral Spec for `UXUI.md`)**:
  - **Specification**: Transition dynamic in-flow containers smoothly between collapsed and expanded states (respecting `prefers-reduced-motion: reduce` by disabling motion transitions when active), and keep error recovery/retry actions mounted and accessible whenever a `catch` or error state occurs.
  - **Acceptance Criterion**: *Given* a dynamic toolbar container, *when* it transitions between empty and populated states, *then* height and opacity animate smoothly (or transition instantly under `prefers-reduced-motion: reduce`) without abrupt layout jumps, and error states always retain a focusable Retry control.

### Anti-Pattern 4: Imperative JavaScript Animation Timers (`setTimeout`)

```jsx
// BAD (In Target DA): Imperative setTimeout chains attempting to sync unmount with CSS animation duration
useEffect(() => {
  if (!isOpen) {
    setIsVisible(false);
    const t2 = setTimeout(() => setShouldRender(false), 300); // Drifts out of sync with CSS/reduced-motion
    return () => clearTimeout(t2);
  }
}, [isOpen]);
```
- **GOOD (Required Abstract Behavioral Spec for `UXUI.md`)**:
  - **Specification**: Eliminate imperative `setTimeout` mount/unmount synchronization timers. Drive enter/exit transitions declaratively via CSS transition lifecycle events (`transitionend` / `animationend` or discrete transition rules) with immediate completion under `prefers-reduced-motion: reduce`.
  - **Acceptance Criterion**: *Given* an overlay closing transition, *when* the exit transition completes (or immediately when `prefers-reduced-motion: reduce` is enabled), *then* unmount coordination triggers deterministically without hardcoded `setTimeout` durations.

### Anti-Pattern 5: Forced Synchronous Layout (Layout Thrashing in Resize Loops)

```javascript
// BAD (In Target DA): Interleaving DOM geometry reads (offsetHeight) and style writes inside a loop forces reflow per item
window.addEventListener('resize', () => {
  document.querySelectorAll('.dynamic-card').forEach((card) => {
    const parentHeight = card.parentElement.offsetHeight; // Forced synchronous reflow read
    if (parentHeight > 400) card.style.height = `${parentHeight / 2}px`; // Style write invalidates layout
  });
});
```
- **GOOD (Required Abstract Behavioral Spec for `UXUI.md`)**:
  - **Specification**: Eliminate interleaved DOM geometry reads and style writes in resize loops. Express responsive container sizing declaratively using CSS Container Queries (`@container`), or when JavaScript measurement is mandatory, batch all geometry reads in a single pass before applying all style writes inside a single `requestAnimationFrame` callback.
  - **Acceptance Criterion**: *Given* a grid of dynamic cards resizing across viewport changes, *when* layout adaptation occurs, *then* zero interleaved DOM read-after-write cycles occur within the same frame.

## Failure Modes & Mitigations

- **Cumulative Layout Shifts (`CLS > 0`)**: Reserve intrinsic dimensions (`contain-intrinsic-size`, aspect ratio) on dynamic media/containers and use smooth accordion transitions on collapsible in-flow slots.
- **Optimistic State Drift**: Pair optimistic mutations with automatic error rollback and background SWR revalidation; never apply optimistic UI to destructive writes.
- **Wall-Clock Timeout Killing Healthy Jobs**: Use rolling staleness watchdogs reset by forward progress deltas (`processed / total`).
- **Animation Timer Drift**: Replace `setTimeout` unmount timers with declarative CSS transitions and `prefers-reduced-motion: reduce` support.
- **Frame Drops from Layout Thrashing**: Use CSS `@container` queries or batch all DOM reads prior to `requestAnimationFrame` writes.
- **Horizontal Jump on Modal Open**: Reserve stable scrollbar gutters (`scrollbar-gutter: stable`) on root/scrollable containers.
