# Strict WCAG 2.1 AA and WAI-ARIA Authoring Practices Compliance

**REGIME GATE**: Load and enforce this subdocument **ONLY** when `<review_dir>/Context.md` explicitly declares `UX/UI Regime: STRICT_ACCESSIBILITY_COMPLIANCE` (triggered by `!A11Y` / `!WCAG` or ADA/EAA/Section 508-mandated Enterprise, Public SaaS, FinTech, Healthcare, GovTech, or shared UI Component Library targets). **NEVER** apply these requirements to `PRAGMATIC_PRODUCT_UX` targets.

Audits WAI-ARIA Authoring Practices (APG) composite widget keyboard state machines, roving `tabindex` / `aria-activedescendant` focus management, screen-reader semantic ID graphs (`useId()`, `aria-labelledby`, `aria-describedby`, `aria-live`), and WCAG 2.1 AA visual contrast/focus-ring parity.

## Domain Audit Checklist

### 1. WAI-ARIA Composite Widgets & Roving Tabindex State Machines
- [ ] **Single Tab-Stop Composite Navigation (`roving tabindex`)**: For composite widgets (`role="tablist"`, `role="listbox"`, `role="menu"`, `role="menubar"`, `role="toolbar"`, `role="radiogroup"`, `role="treegrid"`), enforce a single tab stop (`tabIndex={isActive ? 0 : -1}`) with cyclic directional arrow-key navigation (`ArrowDown`/`ArrowUp` or `ArrowRight`/`ArrowLeft`), `Home` (first enabled item), and `End` (last enabled item) via deterministic ref maps.
- [ ] **Virtualized Composite Focus (`aria-activedescendant`)**: For virtualized comboboxes, command palettes, or large grids where DOM nodes mount/unmount on scroll, maintain container focus and synchronize `aria-activedescendant={activeOptionId}` with scroll-into-view guarantees.
- [ ] **Modal Focus Trapping & Restoration**: Verify `role="dialog"` / `role="alertdialog"` containers set `aria-modal="true"`, trap `Tab` and `Shift+Tab` cyclically within focusable descendants while open, support `Escape` dismissal, and restore focus to the invoking trigger on close.

### 2. Screen-Reader Semantic Graph & Live Regions
- [ ] **Collision-Free ARIA ID Wiring (`useId()`)**: Generate deterministic instance-scoped IDs (`React.useId()`) to wire dialog titles (`aria-labelledby`), helper/validation descriptions (`aria-describedby`), and custom control labels without hardcoded string ID collisions when multiple instances mount.
- [ ] **Dynamic ARIA State Synchronization**: Confirm interactive disclosures, toggles, tabs, and selection controls synchronize `aria-expanded`, `aria-selected`, `aria-checked`, `aria-pressed`, `aria-invalid`, and `aria-current` with component state transitions.
- [ ] **Polite & Assertive Live Regions**: Announce asynchronous status updates, background filter counts, and toast notifications via `role="status"` (`aria-live="polite"`), and announce blocking validation errors or critical alerts via `role="alert"` (`aria-live="assertive"`).

### 3. Visual Contrast, Focus Indicators & Motion Parity
- [ ] **WCAG 2.1 AA Contrast Floors**: Verify text tokens maintain $\ge 4.5:1$ contrast for normal text and $\ge 3:1$ for large text, icons, and interactive control boundaries across both light and dark themes.
- [ ] **High-Visibility `:focus-visible` Outlines**: Reject `outline: none` unless replaced by a high-contrast tokenized `:focus-visible` indicator ($\ge 2\text{px}$ solid offset outline or equivalent high-contrast ring).
- [ ] **Full Keyboard Parity for Pointer Gestures**: Ensure every hover-revealed action, drag-and-drop reorder operation, or context menu trigger exposes an equivalent keyboard-accessible trigger and announcement path.

## Concrete Anti-Patterns

### Anti-Pattern 1: Unmanaged Tab Stops in WAI-ARIA Composite Tablist / Listbox

```tsx
// BAD (under STRICT_ACCESSIBILITY_COMPLIANCE): Every tab is a separate Tab stop with no Arrow/Home/End roving tabindex
function CategoryTabsBad({ tabs, activeId, onSelect }: { tabs: { id: string; label: string }[]; activeId: string; onSelect: (id: string) => void }) {
  return (
    <div role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={t.id === activeId} onClick={() => onSelect(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// GOOD (under STRICT_ACCESSIBILITY_COMPLIANCE): WAI-ARIA APG roving tabindex with cyclic ArrowLeft/ArrowRight, Home, and End
function CategoryTabsAccessible({ tabs, activeId, onSelect }: { tabs: { id: string; label: string }[]; activeId: string; onSelect: (id: string) => void }) {
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (tabs.length === 0) return;
    let nextIndex: number | null = null;
    if (e.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") nextIndex = 0;
    else if (e.key === "End") nextIndex = tabs.length - 1;

    if (nextIndex !== null) {
      e.preventDefault();
      const nextTab = tabs[nextIndex];
      onSelect(nextTab.id);
      tabRefs.current.get(nextTab.id)?.focus();
    }
  };

  return (
    <div role="tablist" aria-orientation="horizontal">
      {tabs.map((t, idx) => {
        const isSelected = t.id === activeId;
        return (
          <button
            key={t.id}
            ref={(el) => { if (el) tabRefs.current.set(t.id, el); else tabRefs.current.delete(t.id); }}
            type="button"
            role="tab"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelect(t.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
```
- **Acceptance Criterion**: *Given* focus is on the active tab in `role="tablist"`, *when* the user presses `ArrowRight`, `ArrowLeft`, `Home`, or `End`, *then* `tabIndex={0}` and `aria-selected="true"` transition cyclically to the target tab and DOM focus moves synchronously via `tabRefs`.

### Anti-Pattern 2: Unlinked Screen-Reader Modal Headings & Form Validation Alerts

```tsx
// BAD (under STRICT_ACCESSIBILITY_COMPLIANCE): Dialog lacks aria-labelledby linkage and error message is not bound via aria-describedby
function RenameDialogBad({ error }: { error?: string }) {
  return (
    <div role="dialog" aria-modal="true">
      <h2>Rename Workspace</h2>
      <input type="text" />
      {error && <span>{error}</span>}
    </div>
  );
}

// GOOD (under STRICT_ACCESSIBILITY_COMPLIANCE): Collision-free useId() wiring for aria-labelledby, aria-describedby, and role="alert"
function RenameDialogAccessible({ error }: { error?: string }) {
  const titleId = useId();
  const errorId = useId();
  return (
    <div role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <h2 id={titleId}>Rename Workspace</h2>
      <input
        type="text"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      {error && <div id={errorId} role="alert">{error}</div>}
    </div>
  );
}
```
- **Acceptance Criterion**: *Given* the dialog mounts with a validation error, *when* inspected in the accessibility tree, *then* `role="dialog"` references the heading `id` via `aria-labelledby`, the input sets `aria-invalid="true"` and references the error container via `aria-describedby`, and the error container exposes `role="alert"`.

## Failure Modes & Mitigations

- **Fragmented Composite Keyboard Navigation**: Implement WAI-ARIA roving `tabindex` (`0` on active item, `-1` on peers) with `Arrow`, `Home`, and `End` handlers on composite widgets.
- **Duplicate Hardcoded ARIA IDs**: Use `useId()` to generate unique instance-scoped IDs for `aria-labelledby` and `aria-describedby`.
- **Silent Screen-Reader State Changes**: Pair dynamic visual state changes with `aria-expanded`, `aria-selected`, `aria-invalid`, and `role="status"` / `role="alert"` live regions.
- **Invisible Keyboard Focus Ring**: Preserve `:focus-visible` outlines using high-contrast design system tokens.
