---
name: ui-design
description: Use when designing, styling, auditing, or refactoring web or desktop interfaces and visual hierarchy.
---

# UI Design

Design functional web and desktop interfaces with clear visual hierarchy, calm surfaces, and zero performative clutter.

## Core Principle: Earn Its Pixels

Ask from the user's seat: *"What do I need to see or do on this screen, what is already obvious from context, and what adds visual noise?"* Every container, border, badge, icon, and color must justify its cognitive load. If removing an element loses zero user capability or non-obvious state, delete it.

## Directives

1. **Subtraction Gate (No Unrequested Chrome)**: Render only elements required by the user's task. NEVER invent unrequested summary stat cards, fake notification bells, decorative status dots, breadcrumb trails on flat views, or eyebrow pill tags above headings.
2. **Silent Normal State (No Badge Spam)**: Normal, healthy, or default states MUST remain visually silent. Render a badge, chip, counter, or status dot ONLY for an exception or active state that changes the user's next action (e.g., a `2x` duplicate indicator when `count > 1`, an `Update available` tag, or an active `Running` state). Never badge every row with its category, status, or type when column position or grouping already communicates it.
3. **No Self-Narrating UI**: When a control, heading, or input is clear from its label and placement, omit subtitle explanations (e.g., *"Manage your application settings below"*, *"Use the search bar to filter items"*). Let layout and concise labels speak for themselves.
4. **Functional Color Restraint**:
   - **Neutral Surfaces**: Build depth with quiet neutral steps (off-black `#121212` to `#1e1e1e` in dark mode; warm/cool off-white `#f6f6f7` to `#ffffff` in light mode). Avoid pure `#000000` canvases unless targeting OLED high-contrast themes. Never mix warm and cool grays in the same palette.
   - **Single Functional Accent**: Use ONE primary accent color (`< 80%` saturation) reserved strictly for primary actions, active selection, focus rings, or semantic alerts (`danger`, `warning`, `success`).
   - **Ban Performative AI Palettes**: NEVER use purple/indigo/violet gradients, neon outer glows, multi-color gradient text, or decorative background blobs unless explicitly requested.
5. **Hierarchy Without Card Spam**: Group related elements using whitespace, alignment, or subtle `1px` dividers (`border` / `divide-y`) before reaching for boxed cards. Use bordered/elevated cards only for independently interactive items in a grid (e.g., media tiles, kanban items) or floating overlays. Never nest cards inside cards.
6. **Typography, Alignment & Tokens**:
   - **Theme Tokens First**: Reuse existing CSS custom properties and theme tokens; maintain light/dark mode parity (`color-scheme`) and minimum `4.5:1` body text contrast (`3:1` for large text and icons).
   - **Scannable Type**: Use sentence case for all UI labels, buttons, and headers. Set `font-variant-numeric: tabular-nums` (or monospace) on all counts, file sizes, timestamps, and table numbers. Keep reading width to `60ch-75ch` for prose while letting data tables and media grids use available viewport width.
   - **Optical Alignment & Fluid Sizing**: Align shared baselines across sibling rows or cards. Use fluid CSS (`rem`, `%`, `clamp()`, `100dvh` instead of `100vh`) and consistent-stroke SVG icons (`16px-20px` optically aligned with text). NEVER use emojis as structural UI icons.

---

## Pre-Delivery UI Audit

| Check | Action if Violated |
| :--- | :--- |
| **Badge / Chip Count** | Strip any badge or pill that shows default state, repeats a parent heading, or cannot be acted upon. |
| **Helper Text / Subtitles** | Delete subtitles and helper paragraphs that merely restate the section title or control label. |
| **Color Purpose** | If a non-neutral color does not signal interactivity, selection, or semantic status, reset it to a neutral surface/text token. |
| **Container Nesting** | Flatten card-in-card wrappers into spacing or a single `1px` divider. |
| **Sibling Alignment** | Fix ragged title wraps (`line-clamp`), mismatched icon boxes, or misaligned metadata baselines across grid/list items. |

---

## Workflow

1. **Audit Existing Tokens & Density**: Read the project's theme variables, typography scale, and adjacent screens before writing markup or CSS. Match existing density (compact desktop utility vs. spacious content reader).
2. **Define the Task Spine**: List the 1-3 actions or data points the user came to this view for. Build the layout directly around those items without ceremony.
3. **Subtract Before Polishing**: Run the Pre-Delivery UI Audit table to strip redundant labels, badges, wrappers, and decorative colors before tuning spacing and alignment.
