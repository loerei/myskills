---
name: ui-state-preview
description: Use when previewing rare production UI states live without modifying production code.
---

# UI State Preview

Render hard-to-reach production UI states (errors, size limits, empty/loading states, edge data) with real app styling and layout without touching production code.

## Invariants

1. **Zero production edits**: NEVER edit production source files to force a preview state.
2. **Real app fidelity**: ALWAYS render through the real app/page entrypoint with its root stylesheets, theme attributes (`data-theme` / `html` / `body` classes), i18n, and surrounding layout shell. NEVER mount an isolated leaf component with missing theme variables or hardcoded fallback colors.
3. **Outer-boundary injection**: Trigger the target state by stubbing the outermost I/O seam (HTTP, IPC, bridge API, or storage) rather than patching internal component logic.
4. **Ephemeral isolation**: Place any temporary harness files in a gitignored scratch directory (e.g. `.scratch/`) and stop temporary dev servers when done.

## Strategy Selection

| Condition | Action |
| :--- | :--- |
| App has a local dev server (web or desktop renderer) | Start the real dev server and inject boundary stubs at runtime (e.g., Playwright `page.route` / `addInitScript`, MSW, or a dev-only preload stub) against the real page URL. |
| Repo already configures Storybook, Ladle, or Histoire | Mount the full page/shell in a temporary story using the app's root theme/CSS and mocked boundary callbacks. |
| Dev server cannot run standalone | Build a scratch entry in `.scratch/` that imports the app's real root CSS/theme setup and page shell with mocked boundary callbacks. |

## Recovery

If the preview shows wrong theme colors, broken layout, or unstyled defaults, inspect the app's real HTML/root entrypoint for missing global stylesheets, theme bootstrap scripts, or root `data-theme` / class attributes, and include them before presenting the preview.
