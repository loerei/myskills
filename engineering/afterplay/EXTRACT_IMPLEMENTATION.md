# Extract Implementation & Atomic Commit Structuring

This subdoc defines Phase 3 of the **Afterplay** workflow: extracting minimal abstractions into clean, production-ready atomic commits.

---

## 1. Minimal Abstraction Extraction Principles

1. **Zero Boilerplate**: Never copy unused adapters, speculative wrapper classes, or dead code from the dirty prototype branch.
2. **Strict File Scoping**: Touch only files directly contributing to the Goal metric.
3. **Atomic Commit Separation**: Always separate production code from development/testing bypass code into distinct commits:
   - **Commit 1 (Production Code)**: `feat: optimize <component> performance to <target>`
   - **Commit 2 (Dev Testing Code)**: `test: dev offline mode bypass (skip login)`

---

## 2. Extraction Protocol

```powershell
# 1. Soft reset combined commits if necessary
git reset HEAD~1

# 2. Stage ONLY production goal files
git add path/to/ProductionFile1.java path/to/ProductionFile2.xml
git commit -m "feat: optimize single-edittext performance to 30ms latency"
git tag -a -f "clean-code-perf-is-perfect-but-scrolling-doesnt-work" -m "clean code production tag"

# 3. Stage dev bypass / test-only files separately
git add path/to/DevBypassFile.java
git commit -m "test: dev offline mode bypass (skip login)"
git tag -a -f "login-bypass-for-test-do-not-take-into-production" -m "test bypass tag"

# 4. Push branch and tags
git push -f origin <branch-name> --tags
```
