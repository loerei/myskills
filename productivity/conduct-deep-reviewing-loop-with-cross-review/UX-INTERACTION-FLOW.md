# Form State Feedback and Accessible Interaction Flows

Audits form state completeness, WCAG keyboard/screen-reader ergonomics, focus continuity, icon clarity, and event coordination.

> [!IMPORTANT]
> **Strict Code Ban for UXUI Reports**: The `BAD` code snippets below illustrate buggy patterns to detect when reading a target Directive Artifact. When writing `<review_dir>/reports/UXUI.md`, you **MUST NOT** output concrete CSS, HTML, or JSX code snippets; state all remediations as **Abstract Behavioral Specifications** with testable **Acceptance Criteria (Given/When/Then)** as shown in the `GOOD` blocks.

## Domain Audit Checklist

### 1. Form Validation & User Guidance
- [ ] **Explicit Four-State Coverage**: Verify interactive forms explicitly specify all four states: `Idle`, `Submitting`, `Success`, and `Error`.
- [ ] **Contextual Error Messages**: Keep submit buttons actionable/focusable and associate validation error summaries with inputs via `aria-invalid="true"` and `aria-describedby` (`role="alert"`) rather than silently disabling submit controls without explanation.

### 2. Accessible Ergonomics (WCAG Standards)
- [ ] **Keyboard Navigation & Modal Focus Return**: Confirm all interactive visual controls receive keyboard focus in logical sequential order, modals trap focus while open, and closing a modal returns focus deterministically to its invoking trigger.
- [ ] **ARIA Roles & Attributes**: Verify screen-reader attributes (`aria-expanded`, `aria-invalid`, `aria-describedby`, `aria-activedescendant`) dynamically update to match component state changes.
- [ ] **In-Flight Focus Continuity**: For buttons initiating async jobs, require `aria-disabled="true"` with in-flight interaction blocking rather than native HTML `disabled` (which causes browsers to blur the control and evict focus to `document.body`).
- [ ] **Vector Icon Accessibility & Parity**: Require clean vector SVGs (`currentColor`, explicit dimensions, and `aria-hidden="true"` when paired with text, or `aria-label` on icon-only controls). Strictly reject raw emoji characters (`📁`, `⚙️`, `🗑️`, `⭐`) as interface icons.
- [ ] **Icon-Only Controls & Tooltips**: In space-constrained toolbars or row action slots, allow icon-only controls ONLY for universally recognized canonical actions (e.g. settings gear, trash delete, close) paired with both `aria-label` and a visual hover/focus tooltip. Require visible text labels on non-canonical domain actions (e.g. "Rebase Branch") and unconfirmed destructive actions.
- [ ] **Browser-Safe Event Coordination (Ban on `stopPropagation()`)**: Reject specifications prescribing `event.stopPropagation()` or `event.stopImmediatePropagation()`. Coordinate nested interactive elements (e.g. buttons, checkboxes, or links inside a clickable row/card) while preserving event bubbling to `document` listeners via:
  1. **Parent Target Filtering (Mandatory when children include native checkboxes, radio inputs, links, or submit buttons)**: The parent container's click/keydown handler ignores events whose target matches an interactive descendant (`event.target.closest('button, a, input, select, textarea, [role="button"], [data-interactive]')`), preserving both native browser default behavior and document bubbling.
  2. **Preventable Event Contracts (Valid for custom non-native `type="button"` actions)**: The child action invokes `event.preventDefault()` and the parent handler exits early when `event.defaultPrevented` is true. NEVER prescribe `event.preventDefault()` on native checkboxes, radio buttons, links, or submit buttons where it cancels the browser's native toggle/navigation action.
- [ ] **Stable List Focus & Roving Tabindex**: Enforce immutable entity keys (`key={item.id}`) and WAI-ARIA roving `tabindex` / `aria-activedescendant` state machines on dynamic collections, strictly rejecting post-render `setTimeout` DOM re-querying (`querySelector`) focus hacks.
- [ ] **Reusable Component Primitive Ergonomics**: When the target DA specifies reusable UI primitives or component library controls, verify support for both Controlled (`value` + `onChange`) and Uncontrolled (`defaultValue`) state contracts, and require forwarding the underlying DOM element reference (`ref` / `forwardRef`) so host consumers can manage focus and layout measurements.

## Concrete Anti-Patterns

### Anti-Pattern 1: Uninformative Silent Form Failure

```jsx
// BAD (In Target DA): Button disables silently without explaining why input fields are invalid.
function SubmitForm({ isValid }) {
  return <button disabled={!isValid}>Submit</button>;
}
```
- **GOOD (Required Abstract Behavioral Spec for `UXUI.md`)**:
  - **Specification**: Keep the Submit control focusable in the tab order (`aria-disabled` or active validation trigger) and associate the control with an inline error summary container via `aria-describedby` (`role="alert"`) that renders explicit field recovery instructions upon invalid submission attempts.
  - **Acceptance Criterion**: *Given* a form with invalid input fields, *when* the user navigates to and activates the Submit button via keyboard or pointer, *then* focus remains anchored, submission is blocked, and an accessible alert summary linked via `aria-describedby` announces the specific field validation errors.

### Anti-Pattern 2: Focus Eviction via Native HTML `disabled` on Active Elements

```jsx
// BAD (In Target DA): Native disabled on focused button instantly blurs focus to document.body
async function handleAction(e) {
  const btn = e.currentTarget;
  btn.disabled = true; // Browser fires blur and dumps focus to body
  await performAsyncOperation();
  btn.disabled = false; // Focus is lost from tab order
}
```
- **GOOD (Required Abstract Behavioral Spec for `UXUI.md`)**:
  - **Specification**: Replace native HTML `disabled` during in-flight async operations with `aria-disabled="true"` and an in-flight interaction guard (ignoring duplicate click/Enter/Space activations while pending), preserving `document.activeElement` on the invoking button across the async boundary.
  - **Acceptance Criterion**: *Given* keyboard focus is on the action button, *when* the user triggers the async operation, *then* the button sets `aria-disabled="true"`, retains `document.activeElement` throughout execution, blocks duplicate triggers, and clears `aria-disabled` upon settlement.

### Anti-Pattern 3: Raw Emoji Icons in UI Controls

```jsx
// BAD (In Target DA): Raw emoji icon lacks theme styling, scales poorly, and renders inconsistently across OSes
function OpenFolderButton() {
  return <button className="icon-btn">📁 Open Folder</button>;
}
```
- **GOOD (Required Abstract Behavioral Spec for `UXUI.md`)**:
  - **Specification**: Replace raw emoji glyphs with inline vector SVG primitives or icon library components bound to theme text color (`currentColor`) with explicit width/height dimensions and `aria-hidden="true"` alongside the visible text label.
  - **Acceptance Criterion**: *Given* the button renders across light and dark themes, *when* inspected in the DOM, *then* the icon is a vector `<svg aria-hidden="true">` inheriting `currentColor` with zero raw emoji characters.

### Anti-Pattern 4: Unlabeled or Ambiguous Icon-Only Controls

```jsx
// BAD (In Target DA): Icon-only button on ambiguous domain action without accessible name, text, or tooltip
function RebaseButton() {
  return (
    <button className="icon-btn" onClick={handleRebase}>
      <svg className="icon" aria-hidden="true">...</svg>
    </button>
  );
}
```
- **GOOD (Required Abstract Behavioral Spec for `UXUI.md`)**:
  - **Specification**: Retain an explicit visible text label (e.g. `"Rebase Branch"`) on non-canonical domain actions. For canonical icon-only controls in dense toolbars or table rows (e.g. trash delete, settings gear), require both an `aria-label` attribute and a visual tooltip triggered on pointer hover and keyboard focus.
  - **Acceptance Criterion**: *Given* a toolbar containing domain and canonical actions, *when* rendered, *then* non-canonical domain actions display visible text labels, and every canonical icon-only button exposes a non-empty `aria-label` and displays a tooltip on hover and `:focus-visible`.

### Anti-Pattern 5: Indiscriminate `stopPropagation()` Event Swallowing

```jsx
// BAD (In Target DA): stopPropagation breaks document dismiss listeners, global shortcuts, and telemetry
function TableRowCard({ item, onSelectRow }) {
  return (
    <div className="row-card" onClick={() => onSelectRow(item.id)}>
      <input type="checkbox" onClick={(e) => e.stopPropagation()} />
      <button onClick={(e) => { e.stopPropagation(); performItemDelete(item.id); }}>Delete</button>
    </div>
  );
}
```
- **GOOD (Required Abstract Behavioral Spec for `UXUI.md`)**:
  - **Specification**: Prohibit `event.stopPropagation()` on nested row controls. Configure the parent row click/keydown handler to ignore events whose target matches an interactive descendant control (`event.target.closest('button, a, input, select, textarea, [role="button"], [data-interactive]')`), or check `event.defaultPrevented` for custom non-native `type="button"` actions, ensuring child checkboxes and buttons execute cleanly while events bubble to `document`.
  - **Acceptance Criterion**: *Given* a clickable row containing a child checkbox and Delete button, *when* the user activates the child checkbox or Delete button, *then* the child action executes (checkbox toggles or delete fires), the parent row selection handler does not trigger, and document-level click listeners receive the bubbled event.

### Anti-Pattern 6: Focus Loss from Destructive Re-renders (`key={index}` & `setTimeout` Focus Hacks)

```jsx
// BAD (In Target DA): Volatile index keys and post-render timeout querySelector focus hacks
function UserList({ users }) {
  const [userList, setUserList] = useState(users);
  const handleDelete = (userId) => {
    setUserList(prev => prev.filter(u => u.id !== userId));
    setTimeout(() => {
      document.querySelector('.user-item-btn')?.focus(); // Brittle post-render focus query
    }, 150);
  };
  return (
    <ul>
      {userList.map((user, index) => (
        <li key={index}><button className="user-item-btn" onClick={() => handleDelete(user.id)}>Remove</button></li>
      ))}
    </ul>
  );
}
```
- **GOOD (Required Abstract Behavioral Spec for `UXUI.md`)**:
  - **Specification**: Bind list items to immutable entity identifiers (`key={user.id}`) to preserve DOM node identity across mutations, and manage composite keyboard focus via a deterministic WAI-ARIA roving `tabindex` state machine that synchronously transfers focus to the next surviving item (or empty-state fallback) without `setTimeout` DOM queries.
  - **Acceptance Criterion**: *Given* keyboard focus is on item $k$ in a list keyed by stable entity IDs, *when* item $k$ is removed, *then* surviving sibling DOM nodes are retained without remounting and keyboard focus transfers synchronously to item $k+1$ (or $k-1$) with zero `setTimeout` delays.

## Failure Modes & Mitigations

- **Double Form Submission & Focus Loss**: Guard in-flight triggers via `aria-disabled="true"` and state flags rather than native HTML `disabled`.
- **Screen Reader Focus Traps**: Return focus deterministically to the invoking trigger element when closing dialogs or popovers.
- **Inconsistent Emoji Rendering**: Replace raw emoji characters with vector SVGs bound to `currentColor`.
- **Ambiguous Icon-Only Controls**: Require visible text labels on domain actions; require `aria-label` + hover/focus tooltips on canonical icon-only controls.
- **Swallowed Global Shortcuts & Dismiss Events**: Ban `stopPropagation()`; use parent `event.target.closest(...)` filtering or custom `defaultPrevented` coordination.
- **Focus Loss on List Mutation**: Use immutable entity keys (`key={item.id}`) and roving `tabindex` state machines instead of post-render `querySelector` timers.
