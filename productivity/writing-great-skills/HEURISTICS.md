# Skill Complexity Heuristics

Reference framework for evaluating whether a `SKILL.md` contains extractable complexity.

## Primary Indicators (Mandatory Extraction Triggers)

If a `SKILL.md` contains any of the following, extract the material into sub-documents regardless of overall line count:

- **Heavy Lookup Tables**: Parameter schemas, tool maps, error code tables, reference matrices.
- **Large Templates**: Code scaffolds, prompt templates, configuration snippets.
- **Branch-Specific References**: Rules or checklists serving only one specific execution branch.
- **Long Repeated Checklists**: Multi-item verification lists used across review iterations.

## Secondary Indicator (Audit Threshold)

- **Audit Threshold (`~100 lines` or large byte footprint)**: Secondary trigger to inspect unextracted primary indicators. Purely linear, unbranched prose under the `~150 lines` upper ceiling without primary indicators may remain inline.

## Protocol Reference

To execute subdoc extraction based on these heuristics, invoke the [write-skill-subdocs](../write-skill-subdocs/SKILL.md) skill.
