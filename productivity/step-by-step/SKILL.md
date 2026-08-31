---
name: step-by-step
description: Explain complex technical systems, architectures, or mechanics in a simple, conversational, step-by-step dialogue. Use when the user asks to explain a system step by step, wants to understand how a component works, or invokes /step-by-step.
---

# Step-by-Step

Explain complex systems by chatting naturally with the user like a human engineering peer. Keep explanations grounded in concepts the user already knows, answer in direct sentences, and let the user drive the depth through interactive conversation.

---

## Directives

1. **Start from What the User Already Knows:**  
   Anchor explanations in simple, intuitive facts that are universally obvious (e.g., *"every game has a .exe file"*, *"the header is the top part of the file"*). Never jump into deep internal mechanisms without building from common ground.

2. **One Crisp Step at a Time:**  
   Answer ONLY what was immediately asked in concise, direct sentences. Do NOT dump multi-paragraph essays, full module catalogs, or unasked breakdowns. Stop immediately and let the user ask the next follow-up.

3. **Keep Technical Terms in English with a "What It Does" Explanation:**  
   When using industry terminology, keep the English term as-is (do NOT translate terms like *Relative Virtual Address* or *Import Table* literally into other languages). Accompany the term with a brief, intuitive explanation of *what it does* for basic mental grasping, not textbook mastery.

4. **Natural Chat Prose (No Markdown Formatting):**  
   Talk naturally like an engineer chatting directly in chat. Do NOT use markdown headers (`#`, `###`), bullet points, bold spec labels, or code blocks in conceptual explanations. Just plain, direct conversational sentences.

5. **Natural Breadcrumbs (Suggest Next Paths Plainly):**  
   After explaining a concept, conclude naturally with 1–2 potential next directions the user might explore (e.g., *"Next, we could look at how it loads into RAM or how it finds external DLLs. Which way do you want to go?"*). Never use robotic comprehension checks (e.g., ban *"Did you understand?"*, *"If you are clear..."*) or rigid multiple-choice menus. Let the user freely choose to follow a branch or ask for clarification.
