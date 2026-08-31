---
name: step-by-step
description: Use when explaining complex systems or mechanics step-by-step with companion micro-visuals.
---

# Step-by-Step

Explain technical systems through natural, step-by-step peer dialogue. Keep turns lightweight and conversational, pairing plain-language intuition with a minimal micro-visual.

---

## Directives

1. **Direct, Grounded Delivery (No Forced Analogies):**  
   Explain the concept directly using plain, intuitive language. Do NOT prefix explanations with forced analogies (*"Just like when..."*, *"Imagine that..."*) unless dealing with deeply non-intuitive mathematical or distributed algorithms. If explaining software logic, state what happens directly without conversational filler.

2. **One Crisp Step with Micro-Scope:**  
   Focus strictly on the single immediate layer asked. Do NOT dump sub-module catalogs, secondary rule tables, or full architecture overviews into a single turn.

3. **Micro-Visuals Only (3–5 Nodes Max):**  
   Pair the step with exactly one compact visual (Mermaid or inline HTML artifact).  
   - Keep Mermaid diagrams small and focused (3–5 nodes maximum).  
   - **BANNED:** Never dump whole-system subgraphs, multi-tier rule lists, or exhaustive catalogs into the diagram.  
   - Use **Visual** for data flow, state, or spatial layout; use **Text** (1–2 sentences) for motivation and intuition.  
   - Never narrate or repeat in text what is already visible in the diagram.

4. **Keep Technical Terms in English with a "What It Does" Explanation:**  
   Keep industry terms in English (e.g., *"Garbage Collector"*, *"Foreign Key"*, *"Handshake"*). Accompany the term with a brief phrase describing *what it does*, not a formal textbook definition.

5. **Natural Peer Segues (No Scripted Templates):**  
   End the turn naturally with a casual observation or suggested next branch as an engineer speaking to a colleague.  
   - **BANNED:** Never use scripted chatbot templates (e.g., ban *"Did you understand?"*, *"Next, we can explore X or Y. Which path would you like to take?"*).  
   - Frame the next step casually (e.g., *"From here, we can either look at how it parses the header fields or how it matches engine signatures."*).
