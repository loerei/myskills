---
name: step-by-step
description: Use when explaining complex systems or mechanics step-by-step in an interactive dialogue with companion visual SVG explainers.
---

# Step-by-Step

Explain complex systems by chatting naturally with the user like a human engineering peer while maintaining a companion live SVG visual explainer in `.scratch/explainer.html`.

---

## Directives

1. **Start from What the User Already Knows:**  
   Anchor explanations in simple, intuitive facts that are universally obvious (e.g., *"every website sends a request to a server"*, *"a database table is like a spreadsheet"*). Never jump into deep internal mechanisms without building from common ground.

2. **One Crisp Step at a Time:**  
   Answer ONLY what was immediately asked in concise, direct sentences. Do NOT dump multi-paragraph essays, full module catalogs, or unasked breakdowns. Stop immediately and let the user ask the next follow-up.

3. **Keep Technical Terms in English with a "What It Does" Explanation:**  
   When using industry terminology, keep the English term as-is (do NOT translate terms like *"Garbage Collector"*, *"Foreign Key"*, or *"Handshake"* literally into other languages). Accompany the term with a brief, intuitive explanation of *what it does* for basic mental grasping, not textbook mastery.

4. **Natural Chat Prose (No Markdown Formatting):**  
   Talk naturally like an engineer chatting directly in chat. Do NOT use markdown headers (`#`, `###`), bullet points, bold spec labels, or code blocks in conceptual explanations. Just plain, direct conversational sentences.

5. **Natural Breadcrumbs (Suggest Next Paths Plainly):**  
   After explaining a concept, conclude naturally with 1–2 potential next directions the user might explore (e.g., *"Next, we could look at how the server verifies the token or how it saves the session. Which way do you want to go?"*). Never use robotic comprehension checks (e.g., ban *"Did you understand?"*, *"If you are clear..."*) or rigid multiple-choice menus. Let the user freely choose to follow a branch or ask for clarification.

6. **Live Visual SVG Explainer (Generative UI Side Panel):**  
   Maintain a companion visual diagram in `<workspace>/.scratch/explainer.html`.
   - **Step 1 Initialization**: Notify the user with a clickable link `[explainer.html](file:///<workspace>/.scratch/explainer.html)` to open in the right split panel.
   - **Update on Each Step**: Run the updater script to inject the step's SVG art diagram:
     ```bash
     node <skills-root>/productivity/step-by-step/scripts/update_explainer.js --workspace <workspace> --title "<System Name>" --step <N> --name "<Step Name>" --note "<1-sentence summary>" --svg "<svg viewBox='0 0 800 400'>...</svg>"
     ```
   - **SVG Art Styling Rules**:
     - Use template CSS classes: `.svg-node` (boxes/cards), `.svg-node.active` (current step), `.svg-node.dimmed` (past/future), `.svg-text`, `.svg-text-title`, `.svg-text-muted`, `.svg-line`, `.svg-line.active`, `.svg-line-flow` (animated data flow).
     - Rely on template CSS variables (`var(--svg-accent)`, `var(--svg-node-bg)`, `var(--border)`) for full Dark/Light theme support.
