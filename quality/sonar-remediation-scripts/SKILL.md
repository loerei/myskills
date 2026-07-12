---
name: sonar-remediation-scripts
description: >
  Remediate SonarCloud/SonarQube open issues using pre-written Python scripts to automate plan and task checklist creation. Use when working on fixing SonarCloud/SonarQube code quality issues, or when the user asks to fix Sonar issues using scripts.
---

# Sonar Remediation with Automation Scripts

Use this skill to automate the analysis, planning, and task generation for fixing SonarCloud/SonarQube issues in a repository. This skill utilizes existing Python scripts to eliminate manual plan/task editing steps.

---

## 1. Retrieve Issues JSON
1. Use the appropriate MCP tool (`sonarcloud:search_sonar_issues_in_projects` or `sonarqube:search_sonar_issues_in_projects`) with project key(s) to fetch the open issues.
2. Locate the system-generated path where the tool output is saved (e.g. `C:\Users\<user>\.gemini\antigravity\brain\<session-id>\.system_generated\steps\<step-id>\output.txt`). Let's refer to this path as `<issues_json_path>`.

---

## 2. Execute Automation Scripts
Run the following commands using the pre-written scripts bundled with this skill (located at `.agents/skills/sonar-remediation-scripts/scripts/`):

### A. Analyze & Report
Analyze the issues, print statistics to the console, and generate a detailed report:
```powershell
python .agents/skills/sonar-remediation-scripts/scripts/count_issues.py "<issues_json_path>" "<session_dir>\scratch\issues_details.md"
```

### B. Generate Implementation Plan
Create the implementation plan automatically:
```powershell
python .agents/skills/sonar-remediation-scripts/scripts/generate_plan.py "<issues_json_path>" "<session_dir>\implementation_plan.md"
```
*Note: Make sure to update the plan metadata with `request_feedback: true` to prompt the user for approval.*

### C. Generate Task List
Create the `task.md` file listing all issue fixes grouped by file:
```powershell
python .agents/skills/sonar-remediation-scripts/scripts/generate_task.py "<issues_json_path>" "<session_dir>\task.md"
```
*Note: Update the task metadata with `user_facing: true`.*

---

## 3. Surgical Fix & Task Sync Workflow
Once the user approves the implementation plan:
1. **Branch Setup**: Check `task.md` and check out the new branch (e.g., `fix/sonar-issues-all`, `fix/sonar-security`).
2. **File Loop**:
   - For each file listed in `task.md`:
     1. Mark the file's tasks as in progress (`[/]`) in `task.md` using `replace_file_content`.
     2. Open the file and fix the issues surgically using `patch_file` (`patchitright` server).
     3. Mark the file's tasks as completed (`[x]`) in `task.md` using `replace_file_content`.
     4. Proceed to the next file.
3. **Flag APPROVED/ACCEPTED Issues**: If the project has approved theme-specific design exceptions (such as `css:S7924` contrast ratio rules), use the `sonarcloud:change_sonar_issue_status` tool to update their status to `["accept"]` using their unique issue keys.
4. **Verification**: Run local tests/typecheck to verify compile status.
