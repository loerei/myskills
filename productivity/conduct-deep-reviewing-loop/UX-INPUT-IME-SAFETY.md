# Text Input & IME Composition Lifecycle Safety

**TRIGGER GATE**: Load and enforce this subdocument whenever the target DA adds or modifies text `<input>`, `<textarea>`, search/filter inputs, multi-slot/OTP inputs, `[contenteditable]` editors, or keyboard shortcuts (`Enter`, `Escape`, hotkeys) attached to text inputs.

Audits OS Input Method Editor (IME: CJK, Vietnamese Telex/VNI, dead-key) composition lifecycle safety so pre-edit keystrokes, WebKit `compositionend` ordering, and Windows TSF transient delete/replace cycles do not misfire shortcuts, trigger premature UI/filter resets, leak characters across fields, or corrupt rich-text DOM ranges. Pair grounded TSX/JS/DOM remediations with atomic Given/When/Then acceptance criteria.

## Domain Audit Checklist

- [ ] **Shortcut & Submit Guard**: `keydown` handlers triggering actions or shortcuts (e.g., form submit, selection confirm, overlay dismiss, hotkeys) MUST exit early while composing (`native KeyboardEvent.isComposing`, tracked composition flag, or `keyCode === 229`, covering engines such as WebKit where `compositionend` precedes the confirming `Enter` `keydown`).
- [ ] **Transient-Empty Reset / Teardown Grace**: Inputs driving conditional UI, filters, or validation MUST NOT unmount/collapse UI, reset filtered results or selection, swap to empty states, or flash empty/required validation synchronously on transient input-driven `value === ""`; ignore empty transitions while composing, apply a cancellable grace window (~40-60ms) on input-driven empty values, and re-check teardown when `compositionend` finishes empty (OS IMEs such as Windows TSF emit `deleteContentBackward` with `isComposing=false` milliseconds before reopening `compositionstart` with the updated token; explicit Clear actions, `Escape`, and outside-clicks still reset immediately).
- [ ] **Deferred Focus Advance & Normalization**: Multi-slot (e.g., OTP) and masked inputs MUST NOT enforce single-char `maxLength` truncation, regex stripping, or `.focus()` shifts inside `onInput`/`onChange` while composing; preserve raw draft text until `compositionend`, normalize committed characters cleanly, and defer any `.focus()` transfer past the `compositionend` tick (`queueMicrotask` or next animation frame) so OS IME does not leak characters into the next field.
- [ ] **DOM & Selection Isolation (`[contenteditable]`)**: Rich-text / `[contenteditable]` controllers MUST NOT overwrite child text nodes (`textContent` / `innerHTML`) or reset `Selection` / `Range` during active composition, and MUST skip DOM/Selection rewrites whenever DOM text already matches model state.

## Concrete Anti-Patterns

### Anti-Pattern 1: Un-Guarded `Enter` / Shortcut Firing Mid-Composition

```tsx
// BAD: Fires submit/shortcut when confirming CJK Kanji or cancels composition on WebKit where compositionend precedes keydown.
function SearchInputBad({ value, onChange, onSubmit }: InputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit(value);
    }
  };
  return <input value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={handleKeyDown} />;
}

// GOOD: Checks native isComposing, tracked ref, and keyCode === 229 fallback.
function SearchInputSafe({ value, onChange, onSubmit }: InputProps) {
  const isComposingRef = useRef(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229 || isComposingRef.current) {
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit(value);
    }
  };

  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onCompositionStart={() => { isComposingRef.current = true; }}
      onCompositionEnd={() => { isComposingRef.current = false; }}
      onKeyDown={handleKeyDown}
    />
  );
}
```
- **Acceptance Criterion**: *Given* a text input with an active IME composition (or `keyCode === 229` on WebKit post-`compositionend` `Enter`), *when* the user presses `Enter` to confirm the composed candidate, *then* the input commits the text without invoking `onSubmit`.

### Anti-Pattern 2: Synchronous UI/Filter Reset or Teardown on Transient Empty Input

```tsx
// BAD: Windows TSF emits deleteContentBackward (isComposing=false, value="") ~10ms before compositionstart + updated token,
// synchronously unmounting overlays, resetting filtered lists/selection, or flashing required-field errors.
function FilterInputBad({ value, onChange, onResetEmpty, onFilter }: FilterProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    onChange(next);
    if (next.trim().length === 0) {
      onResetEmpty();
      return;
    }
    onFilter(next);
  };
  return <input value={value} onChange={handleChange} />;
}

// GOOD: Ignores empty transitions while composing, buffers input-driven empty resets for 50ms,
// re-checks on compositionend if still empty, and keeps explicit Clear/Escape immediate.
const EMPTY_RESET_GRACE_MS = 50;

function FilterInputSafe({ value, onChange, onResetEmpty, onFilter }: FilterProps) {
  const isComposingRef = useRef(false);
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearGrace = () => {
    if (graceTimerRef.current) {
      clearTimeout(graceTimerRef.current);
      graceTimerRef.current = null;
    }
  };

  useEffect(() => clearGrace, []);

  const scheduleEmptyReset = () => {
    clearGrace();
    graceTimerRef.current = setTimeout(() => {
      graceTimerRef.current = null;
      if (!isComposingRef.current) onResetEmpty();
    }, EMPTY_RESET_GRACE_MS);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    onChange(next);
    if (next.trim().length === 0) {
      if (!isComposingRef.current) scheduleEmptyReset();
      return;
    }
    clearGrace();
    onFilter(next);
  };

  const handleClearNow = () => {
    clearGrace();
    onChange("");
    onResetEmpty();
  };

  return (
    <>
      <input
        value={value}
        onChange={handleChange}
        onCompositionStart={() => { isComposingRef.current = true; clearGrace(); }}
        onCompositionEnd={(e) => {
          isComposingRef.current = false;
          if (e.currentTarget.value.trim().length === 0) scheduleEmptyReset();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape" && !e.nativeEvent.isComposing && e.keyCode !== 229 && !isComposingRef.current) {
            handleClearNow();
          }
        }}
      />
      <button type="button" onClick={handleClearNow}>Clear</button>
    </>
  );
}
```
- **Acceptance Criterion**: *Given* an active filtered, overlay, or validated UI driven by non-empty input, *when* Windows TSF emits transient `change("")` followed within `15ms` by `compositionstart` or non-empty `change`, *then* active UI, filter/selection state, and child mount state remain intact with zero flash, while an explicit Clear/`Escape` resets synchronously and a sustained or `compositionend`-finalized empty input resets after the `<= 50ms` grace window.

### Anti-Pattern 3: Synchronous `.focus()` Jump or `maxLength={1}` in Multi-Slot Inputs Mid-Composition

```tsx
// BAD: maxLength=1 truncates IME pre-edit text and immediate .focus() forces OS IME to flush into box k and leak into box k+1.
function OtpBoxBad({ digits, setDigits, refs }: OtpProps) {
  return digits.map((d, i) => (
    <input
      key={i}
      maxLength={1}
      value={d}
      onChange={(e) => {
        const next = [...digits];
        next[i] = e.target.value.slice(-1);
        setDigits(next);
        if (next[i]) refs.current[i + 1]?.focus();
      }}
    />
  ));
}

// GOOD: Holds raw draft while composing, commits on !isComposing/compositionend, and defers .focus() past the compositionend tick.
function OtpBoxSafe({ digits, drafts, setDigits, setDrafts, refs }: OtpProps) {
  const composingIdxRef = useRef<number | null>(null);

  const commitSlot = (i: number, raw: string) => {
    // Picks latest non-whitespace char on append-overwrite; multi-char paste distribution is handled separately.
    const ch = Array.from(raw).filter((c) => !/\s/.test(c)).at(-1) ?? "";
    const next = [...digits];
    next[i] = ch;
    setDigits(next);
    setDrafts(next);
    if (ch && i < digits.length - 1) {
      queueMicrotask(() => refs.current[i + 1]?.focus());
    }
  };

  return drafts.map((val, i) => (
    <input
      key={i}
      value={val}
      onCompositionStart={() => { composingIdxRef.current = i; }}
      onCompositionEnd={(e) => {
        composingIdxRef.current = null;
        commitSlot(i, e.currentTarget.value);
      }}
      onChange={(e) => {
        const isComposing = composingIdxRef.current === i || Boolean((e.nativeEvent as InputEvent).isComposing);
        if (isComposing) {
          const nextDrafts = [...drafts];
          nextDrafts[i] = e.target.value;
          setDrafts(nextDrafts);
          return;
        }
        commitSlot(i, e.target.value);
      }}
    />
  ));
}
```
- **Acceptance Criterion**: *Given* a 6-slot OTP input under active IME composition on slot `k`, *when* intermediate composition `change` events fire before `compositionend`, *then* slot `k` preserves raw draft characters without advancing `.focus()`, and *when* `compositionend` finalizes the character, *then* slot `k` commits the normalized value and focus shifts to slot `k+1` on a microtask/frame after `compositionend`.

### Anti-Pattern 4: Rewriting `[contenteditable]` DOM Text or Selection During Active Composition

```tsx
// BAD: Unconditionally overwrites textContent and resets Selection on every render, severing the browser's live IME composition range.
useLayoutEffect(() => {
  const el = editorRef.current;
  if (!el) return;
  el.textContent = modelText;
  restoreCaret(el, caretRef.current);
}, [modelText]);

// GOOD: Holds model updates during composition, syncs once on compositionend, and skips DOM/Selection rewrites when DOM matches model.
function RichEditorSafe({ modelText, setModelText }: EditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const isComposingRef = useRef(false);

  useLayoutEffect(() => {
    const el = editorRef.current;
    if (!el || isComposingRef.current) return;
    if ((el.textContent ?? "") !== modelText) {
      el.textContent = modelText;
    }
  }, [modelText]);

  return (
    <div
      ref={editorRef}
      contentEditable
      onCompositionStart={() => { isComposingRef.current = true; }}
      onCompositionEnd={(e) => {
        isComposingRef.current = false;
        setModelText(e.currentTarget.textContent ?? "");
      }}
      onInput={(e) => {
        if (isComposingRef.current || (e.nativeEvent as InputEvent).isComposing) return;
        setModelText(e.currentTarget.textContent ?? "");
      }}
    />
  );
}
```
- **Acceptance Criterion**: *Given* a `[contenteditable]` input with an active IME composition, *when* `input` or `compositionupdate` events fire, *then* controller state waits until `compositionend` and executes zero `textContent`/`innerHTML` overwrites or `Selection` resets while `isComposing` is true.
