# Form State Feedback and Accessible Interaction Flows

Audits form state completeness, WCAG keyboard/screen-reader ergonomics, focus continuity, icon clarity, and event coordination. Pair grounded JSX/TSX/ARIA/event-handler code remediations with atomic Given/When/Then acceptance criteria (never invent unverified token names or magic-pixel offsets).

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

```tsx
// BAD: Button disables silently without explaining why input fields are invalid.
function SubmitFormBad({ isValid }: { isValid: boolean }) {
  return <button disabled={!isValid}>Submit</button>;
}

// GOOD: Keep Submit focusable via aria-disabled and announce validation errors via aria-describedby alert
function SubmitFormSafe({ isValid, errorMsg, onSubmit }: { isValid: boolean; errorMsg?: string; onSubmit: () => void }) {
  return (
    <div>
      {errorMsg && <div id="form-err" role="alert">{errorMsg}</div>}
      <button
        type="submit"
        aria-disabled={!isValid}
        aria-describedby={errorMsg ? "form-err" : undefined}
        onClick={(e) => { if (!isValid) { e.preventDefault(); return; } onSubmit(); }}
      >
        Submit
      </button>
    </div>
  );
}
```
- **Acceptance Criterion**: *Given* a form with invalid fields, *when* the user activates Submit via keyboard or pointer, *then* focus remains anchored on the button, submission is blocked, and `#form-err` (`role="alert"`) announces the validation error via `aria-describedby`.

### Anti-Pattern 2: Focus Eviction via Native HTML `disabled` on Active Elements

```tsx
// BAD: Native disabled on focused button instantly blurs focus to document.body
async function handleActionBad(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.disabled = true; // Browser fires blur and dumps focus to document.body
  await performAsyncOperation();
  e.currentTarget.disabled = false;
}

// GOOD: Preserve document.activeElement across async boundary using aria-disabled and in-flight guard
function ActionButtonSafe({ onAction }: { onAction: () => Promise<void> }) {
  const [pending, setPending] = useState(false);
  const handleClick = async () => {
    if (pending) return;
    setPending(true);
    try { await onAction(); } finally { setPending(false); }
  };
  return <button type="button" aria-disabled={pending} onClick={handleClick}>Run Job</button>;
}
```
- **Acceptance Criterion**: *Given* keyboard focus is on the button, *when* the async operation runs, *then* the button sets `aria-disabled="true"`, retains `document.activeElement` throughout execution, ignores duplicate activations, and resets `aria-disabled="false"` in `finally`.

### Anti-Pattern 3: Raw Emoji Icons & Unlabeled Icon-Only Controls

```tsx
// BAD 1: Raw emoji icon renders inconsistently across OSes and ignores theme currentColor
// BAD 2: Icon-only button on non-canonical domain action ("Rebase") lacks visible text label
function ToolbarBad({ onOpen, onRebase, onDelete }: { onOpen: () => void; onRebase: () => void; onDelete: () => void }) {
  return (
    <div>
      <button onClick={onOpen}>📁 Open Folder</button>
      <button onClick={onRebase}><svg aria-hidden="true" /></button>
      <button onClick={onDelete}><svg aria-hidden="true" /></button>
    </div>
  );
}

// GOOD: Vector SVG bound to currentColor, visible text on domain action, and aria-label + tooltip on canonical icon-only button
function ToolbarSafe({ onOpen, onRebase, onDelete }: { onOpen: () => void; onRebase: () => void; onDelete: () => void }) {
  return (
    <div>
      <button type="button" onClick={onOpen}>
        <svg width="16" height="16" fill="currentColor" aria-hidden="true"><use href="#icon-folder" /></svg>
        <span>Open Folder</span>
      </button>
      <button type="button" onClick={onRebase}>
        <svg width="16" height="16" fill="currentColor" aria-hidden="true"><use href="#icon-git-branch" /></svg>
        <span>Rebase Branch</span>
      </button>
      <button type="button" aria-label="Delete item" title="Delete item" onClick={onDelete}>
        <svg width="16" height="16" fill="currentColor" aria-hidden="true"><use href="#icon-trash" /></svg>
      </button>
    </div>
  );
}
```
- **Acceptance Criterion**: *Given* the toolbar renders, *when* inspected in the DOM, *then* icons use `<svg aria-hidden="true" fill="currentColor">` with zero raw emojis, non-canonical domain actions display visible text labels, and canonical icon-only buttons expose `aria-label` and hover/focus tooltips.

### Anti-Pattern 4: Indiscriminate `stopPropagation()` Event Swallowing

```tsx
// BAD: stopPropagation breaks document-level popover dismiss listeners, global shortcuts, and analytics
function TableRowBad({ item, onSelectRow, onDelete }: { item: { id: string }; onSelectRow: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <div onClick={() => onSelectRow(item.id)}>
      <input type="checkbox" onClick={(e) => e.stopPropagation()} />
      <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}>Delete</button>
    </div>
  );
}

// GOOD: Parent target filtering ignores interactive descendants while preserving native checkbox toggle and document bubbling
const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, [role="button"], [data-interactive]';

function TableRowSafe({ item, onSelectRow, onDelete }: { item: { id: string }; onSelectRow: (id: string) => void; onDelete: (id: string) => void }) {
  const handleRowClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest(INTERACTIVE_SELECTOR)) return;
    onSelectRow(item.id);
  };
  return (
    <div onClick={handleRowClick}>
      <input type="checkbox" aria-label={`Select ${item.id}`} />
      <button type="button" onClick={() => onDelete(item.id)}>Delete</button>
    </div>
  );
}
```
- **Acceptance Criterion**: *Given* a clickable row containing a child checkbox and Delete button, *when* the user activates the checkbox or Delete button, *then* the child action executes, `onSelectRow` does not fire, and `document` click listeners still receive the bubbled event.

### Anti-Pattern 5: Focus Loss from Volatile `key={index}` & `setTimeout` DOM Focus Hacks

```tsx
// BAD: Volatile index keys remount siblings and brittle setTimeout querySelector loses keyboard focus
function UserListBad({ users, onRemove }: { users: { id: string; name: string }[]; onRemove: (id: string) => void }) {
  const handleDelete = (id: string) => {
    onRemove(id);
    setTimeout(() => document.querySelector<HTMLElement>(".user-btn")?.focus(), 150);
  };
  return <ul>{users.map((u, idx) => <li key={idx}><button className="user-btn" onClick={() => handleDelete(u.id)}>{u.name}</button></li>)}</ul>;
}

// GOOD: Stable entity keys (key={u.id}) and synchronous roving tabindex focus handoff via ref map
function UserListSafe({ users, onRemove }: { users: { id: string; name: string }[]; onRemove: (id: string) => void }) {
  const [activeId, setActiveId] = useState<string | undefined>(users[0]?.id);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());

  const handleDelete = (index: number, id: string) => {
    const nextUser = users[index + 1] ?? users[index - 1];
    onRemove(id);
    setActiveId(nextUser?.id);
    if (nextUser) itemRefs.current.get(nextUser.id)?.focus();
  };

  return (
    <ul role="list">
      {users.map((u, idx) => (
        <li key={u.id}>
          <button
            ref={(el) => { if (el) itemRefs.current.set(u.id, el); else itemRefs.current.delete(u.id); }}
            tabIndex={u.id === activeId ? 0 : -1}
            onClick={() => handleDelete(idx, u.id)}
          >
            Remove {u.name}
          </button>
        </li>
      ))}
    </ul>
  );
}
```
- **Acceptance Criterion**: *Given* keyboard focus is on item $k$ in a list keyed by `user.id`, *when* item $k$ is removed, *then* surviving sibling DOM nodes are retained without remounting and focus transfers synchronously to item $k+1$ (or $k-1$) with zero `setTimeout` calls.

## Failure Modes & Mitigations

- **Double Form Submission & Focus Loss**: Guard in-flight triggers via `aria-disabled="true"` and state flags rather than native HTML `disabled`.
- **Screen Reader Focus Traps**: Return focus deterministically to the invoking trigger element when closing dialogs or popovers.
- **Inconsistent Emoji Rendering**: Replace raw emoji characters with vector SVGs bound to `currentColor`.
- **Ambiguous Icon-Only Controls**: Require visible text labels on domain actions; require `aria-label` + hover/focus tooltips on canonical icon-only controls.
- **Swallowed Global Shortcuts & Dismiss Events**: Ban `stopPropagation()`; use parent `event.target.closest(...)` filtering or custom `defaultPrevented` coordination.
- **Focus Loss on List Mutation**: Use immutable entity keys (`key={item.id}`) and roving `tabindex` ref maps instead of post-render `querySelector` timers.
