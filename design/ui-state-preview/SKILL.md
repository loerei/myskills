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
5. **Dedicated scratch subfolder & two-tier README**: Place each preview inside `.scratch/ui-previews/<preview-name>/` with its own `README.md` (simulated state/stubs, URL, OS-appropriate launch command with `cd <repo-root>`), and maintain a root index at `.scratch/ui-previews/README.md` with a 4-column table (`Preview` linking to `<preview-name>/README.md` | `State` | `URL` | `Launch Command`). Support a configurable port env var (e.g. `PREVIEW_PORT`) with distinct default ports to avoid collisions when multiple previews exist.
6. **Re-launch command**: ALWAYS include the exact OS-appropriate command to restart the preview server (including `cd <repo-root>`) and the exact preview URL in your response.

## Strategy Selection

| Condition | Action |
| :--- | :--- |
| App has a live dev server (e.g. Vite) | Create `.scratch/ui-previews/<name>/index.html` + `entry.tsx` (or a stub-injecting dev proxy) served by the project's dev server that installs outer-boundary stubs (`window.*` bridge, MSW/fetch mock, URL params) and imports the real entrypoint or root shell (prefer direct entrypoint/shell import over duplicating providers or CSS so upstream updates propagate; mirror selectively only if top-level side effects conflict). |
| Repo already configures Storybook, Ladle, or Histoire | Mount the full page/shell in a temporary story under `.scratch/ui-previews/<name>/` (or Storybook's configured preview) using the app's root theme/CSS and mocked boundary callbacks. |
| No live dev server exists | Serve `.scratch/ui-previews/<name>/` via a local watch/reload harness or minimal static server and state clearly that manual refresh is required. |

## Reuse, Recovery & Teardown

- **Sync drifted wrappers before relaunch or on failure**: Before reusing an existing `.scratch/ui-previews/<name>/` preview (or if it errors, renders wrong theme colors, broken layout, or missing state), diff it against the app's current `index.html`, root entrypoint (e.g. `main.tsx`/`App.tsx`), CSS/font imports, theme bootstrap (`data-theme`/classes), and stubbed boundary contracts; update any drifted providers, root markup, assets, or mock signatures before serving.
- **Keep alive until explicit removal**: Keep the preview server running across turns; NEVER stop or delete a preview automatically on task completion. Only when the user explicitly requests removing a preview, stop its server, delete `.scratch/ui-previews/<name>/`, and remove its row from `.scratch/ui-previews/README.md`.
