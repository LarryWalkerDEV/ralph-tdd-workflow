# Ralph Workflow Learnings

This file contains patterns learned from previous workflow iterations.
Patterns marked as **BLOCK-PATTERN** will automatically block builds that contain them.

---

## How Patterns Work

When the Learning Enforcer hook is active, it scans all source files during Edit/Write operations.
If a BLOCK-PATTERN signature is matched, the edit is **blocked** with exit code 2.

### Pattern Format

To add a new pattern, use this format (outside of code blocks):

    ## BLOCK-PATTERN: BP-XXX
    **Signature**: `your-regex-pattern`
    **Solution**: How to fix the issue
    **Context**: Why this pattern is problematic

The enforcer regex requires: `## BLOCK-PATTERN:` followed by ID, `**Signature**:` with backtick-wrapped regex, and `**Solution**:`.

---

## Active Block Patterns

### Mock Data in Production Code

## BLOCK-PATTERN: BP-001
**Signature**: `mock\s*[:=]\s*(true|['"])`
**Solution**: Remove mock flags. Use environment variables (NEXT_PUBLIC_USE_MOCKS) for feature flags
**Context**: Mock data in production code causes validation failures. Tests should mock at the API level, not with inline flags.

## BLOCK-PATTERN: BP-002
**Signature**: `fake[-_]?(data|response|result)`
**Solution**: Use actual API responses or test fixtures from __fixtures__/ directory
**Context**: Fake data patterns indicate incomplete implementation that will fail integration tests.

## BLOCK-PATTERN: BP-003
**Signature**: `TODO:\s*remove|HACK:|FIXME:\s*temp`
**Solution**: Complete the implementation before marking story as done
**Context**: Temporary code markers indicate incomplete work that should not pass validation.

### API Integration Anti-Patterns

## BLOCK-PATTERN: BP-004
**Signature**: `setTimeout\(\s*\(\)\s*=>\s*\{[^}]*resolve`
**Solution**: Use actual async operations or proper test utilities like waitFor()
**Context**: Artificial delays hide timing issues and make tests flaky.

## BLOCK-PATTERN: BP-005
**Signature**: `process\.env\.[A-Z_]+\s*\|\|\s*['"][^'"]{30,}['"]`
**Solution**: Use .env.local for long default values, not inline fallbacks
**Context**: Long inline fallbacks often contain secrets or test data that shouldn't be in code.

### Test Anti-Patterns

## BLOCK-PATTERN: BP-006
**Signature**: `test\.skip|describe\.skip|it\.skip`
**Solution**: Remove skipped tests or fix them. Do not leave skipped tests in codebase
**Context**: Skipped tests indicate technical debt and reduce test coverage metrics.

## BLOCK-PATTERN: BP-007
**Signature**: `expect\([^)]+\)\.toBe\(true\)\s*//\s*always`
**Solution**: Use meaningful assertions that actually test behavior
**Context**: Always-true assertions provide no value and hide bugs.

---

## Informational Patterns (Warnings Only)

These patterns are logged but do not block builds.

### Performance Concerns

**Pattern**: `await.*for.*of|forEach.*await`
**Warning**: Sequential async operations may be slow. Consider Promise.all() for parallel execution.

### Security Concerns

**Pattern**: `dangerouslySetInnerHTML`
**Warning**: Ensure content is properly sanitized before rendering.

**Pattern**: `eval\(|new Function\(`
**Warning**: Dynamic code execution can be a security risk. Ensure input is trusted.

---

## How to Add New Patterns

1. Identify a pattern that caused validation failures
2. Add a new BLOCK-PATTERN section with:
   - Unique ID (BP-XXX format)
   - Regex signature (escape special characters)
   - Clear solution description
   - Context explaining when/why it was learned
3. Test the pattern: `node .claude/hooks/validators/learning-enforcer.js test BP-XXX "test content"`

---

## Pattern History

| ID | Added | Story | Issue |
|----|-------|-------|-------|
| BP-001 | v3.0 | - | Mock data patterns causing false positives |
| BP-002 | v3.0 | - | Fake response objects breaking integration |
| BP-003 | v3.0 | - | Incomplete code passing validation |
| BP-004 | v3.0 | - | Artificial delays hiding async bugs |
| BP-005 | v3.0 | - | Inline secrets and test data |
| BP-006 | v3.0 | - | Skipped tests reducing coverage |
| BP-007 | v3.0 | - | Meaningless assertions |

---

## Commands

```bash
# List all patterns
node .claude/hooks/validators/learning-enforcer.js list

# Test a pattern
node .claude/hooks/validators/learning-enforcer.js test BP-001 "const mock = true"

# Manually check a file
node .claude/hooks/validators/learning-enforcer.js path/to/file.ts
```
