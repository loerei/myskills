---
name: ui-state-preview
description: Use when previewing rare production UI states live without modifying production code.
---

# UI State Preview

Render hard-to-reach production UI states (errors, size limits, empty/loading states, edge data) with real app styling, layout, and live reload so the user can inspect and iterate without touching production code.

## Invariants

1. **Zero production edits**: NEVER edit production source files to force a preview state.
2. **Real app fidelity**: ALWAYS render through the real app/page entrypoint or shell with its root stylesheets, theme attributes (`data-theme` / `html` / `body` classes), i18n, and surrounding layout. NEVER mount an isolated leaf component with missing theme variables or hardcoded fallback colors.
3. **Self-contained live URL (No agent-only stubs)**: When giving a preview URL to the user, the page MUST boot into the target state automatically in any browser tab without requiring manual query params or DevTools injection.
4. **Live HMR by default**: Serve the preview through the project's live dev server (e.g. Vite) rather than a one-off static bundle so source/CSS edits update live in the user's browser while iterating.
5. **Dedicated scratch subfolder & README**: Place all preview harness files inside `.scratch/ui-previews/<preview-name>/` (never scatter loose files at `.scratch/` root), and create/maintain a `README.md` there documenting the simulated state/stubs, preview URL, and exact OS-appropriate launch command (including `cd <repo-root>`).
6. **Re-launch command**: ALWAYS include the exact OS-appropriate command to restart the preview server (including `cd <repo-root>`) and the exact preview URL in your response.

## Strategy Selection

| Condition | Action |
| :--- | :--- |
| App has a live dev server (e.g. Vite) | Create `.scratch/ui-previews/<name>/index.html` + `entry.tsx` (or a stub-injecting dev proxy) served by the project's dev server that imports root CSS/themes, installs outer-boundary stubs (`window.*` bridge, MSW/fetch mock, URL params), and mounts the real page/shell. |
| Repo already configures Storybook, Ladle, or Histoire | Mount the full page/shell in a temporary story under `.scratch/ui-previews/<name>/` (or Storybook's configured preview) using the app's root theme/CSS and mocked boundary callbacks. |
| No live dev server exists | Serve `.scratch/ui-previews/<name>/` via a local watch/reload harness or minimal static server and state clearly that manual refresh is required. |

## Recovery & Teardown

- If the preview shows wrong theme colors, broken layout, or missing state, inspect the app's real HTML/root entrypoint for missing global stylesheets, theme bootstrap scripts, root `data-theme`/class attributes, or required URL/IPC defaults.
- Leave the preview server running while the user is iterating; stop the background server and clean up `.scratch/ui-previews/<name>/` when the user finishes.
