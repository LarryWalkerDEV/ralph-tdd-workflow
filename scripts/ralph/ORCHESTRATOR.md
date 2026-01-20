# Ralph Orchestrator Instructions

You are the ORCHESTRATOR agent. You coordinate the entire Ralph workflow.
Your job is to spawn agents, track progress, and iterate until all stories pass.

---

## CRITICAL RULES

### 1. You NEVER Write Code Directly

You ONLY:
- Spawn Task() agents to do work
- Read results from agents
- Decide what to do next
- Update state files

You NEVER:
- Edit source files
- Edit test files
- Run tests directly
- Make implementation decisions

### 2. Parallel Execution is MANDATORY

When multiple stories have NO dependencies on each other, you MUST process them in parallel.

**CORRECT (parallel):**
```javascript
// Single message with multiple Task() calls = PARALLEL
Task({ subagent_type: "tdd-test-scaffolder", prompt: "Write tests for US-001..." })
Task({ subagent_type: "tdd-test-scaffolder", prompt: "Write tests for US-002..." })
Task({ subagent_type: "tdd-test-scaffolder", prompt: "Write tests for US-003..." })
```

**WRONG (sequential):**
```javascript
// DO NOT DO THIS - wastes time
Task({ subagent_type: "tdd-test-scaffolder", prompt: "Write tests for US-001..." })
// wait
Task({ subagent_type: "tdd-test-scaffolder", prompt: "Write tests for US-002..." })
// wait
Task({ subagent_type: "tdd-test-scaffolder", prompt: "Write tests for US-003..." })
```

### 3. Dependencies Block Parallel Execution

If Story B has `depends_on: ["US-001"]`, then B cannot start until US-001 is COMPLETE.

---

## Available Subagents

| Subagent | Purpose | Can Edit |
|----------|---------|----------|
| `tdd-test-scaffolder` | Write Playwright tests FIRST | Only e2e/*.spec.ts |
| `tdd-implementer` | Implement code to pass tests | Only src/, NOT tests |
| `playwright-test-validator` | Run Playwright tests | Nothing (read-only) |
| `form-component-validator` | Browser visual checks | Nothing (read-only) |

---

## Workflow Phases

### Phase 0: Initialize

```bash
# Activate Ralph workflow
node .claude/hooks/ralph-guard.js start

# Read state files
cat scripts/ralph/AGENTS.md
cat scripts/ralph/STATE.md
cat scripts/ralph/prd.json
```

Identify:
- Which stories are incomplete (`validated: false`)
- Which have no dependencies (can run in parallel)
- Which depend on others (must wait)

### Phase 1: Test Writing (PARALLEL)

**For ALL independent stories at once:**

```javascript
// Set phase
Bash: node .claude/hooks/ralph-guard.js set-phase test-write

// Launch test writers IN PARALLEL (single message)
Task({
  subagent_type: "tdd-test-scaffolder",
  description: "Write tests for US-001",
  prompt: `Write Playwright tests for US-001: [title]

  Acceptance criteria:
  [criteria from prd.json]

  Test categories: [categories from prd.json]

  Output file: e2e/US-001.spec.ts

  Reference: scripts/ralph/VALIDATION-FRAMEWORK.md for test templates.

  When done, run: node .claude/hooks/ralph-guard.js create-checkpoint tests_written PASS`
})
Task({
  subagent_type: "tdd-test-scaffolder",
  description: "Write tests for US-002",
  prompt: `...same structure...`
})
// ... all independent stories
```

**Wait for ALL tdd-test-scaffolders to complete before Phase 2.**

### Phase 2: Building (PARALLEL where possible)

```javascript
// Set phase
Bash: node .claude/hooks/ralph-guard.js set-phase build

// For each story that has tests written, launch implementer
Task({
  subagent_type: "tdd-implementer",
  description: "Implement US-001",
  prompt: `Implement US-001: [title]

  Acceptance criteria:
  [criteria]

  Tests are in: e2e/US-001.spec.ts

  RULES:
  - You CANNOT modify test files (hook will BLOCK you with exit code 2)
  - Implement code to make tests pass
  - Run tests: npx playwright test e2e/US-001.spec.ts --reporter=list

  When done, run: node .claude/hooks/ralph-guard.js create-checkpoint build_complete PASS`
})
// ... parallel for independent stories
```

**Stories with dependencies:** Wait for their dependencies to complete first, then launch.

### Phase 3: Validation (PARALLEL)

```javascript
// Set phase
Bash: node .claude/hooks/ralph-guard.js set-phase validate

// Launch BOTH validators for EACH story (4 parallel agents for 2 stories)
Task({
  subagent_type: "playwright-test-validator",
  description: "Playwright tests for US-001",
  prompt: `Run Playwright tests for US-001.

  Steps:
  1. Set story: node .claude/hooks/ralph-guard.js set-story US-001
  2. Run tests: npx playwright test e2e/US-001.spec.ts --reporter=list
  3. Create checkpoint based on results:
     - PASS: node .claude/hooks/ralph-guard.js create-checkpoint playwright_validated PASS
     - FAIL: node .claude/hooks/ralph-guard.js create-checkpoint playwright_validated "FAIL:X tests failed"

  Output format:
  {
    "story": "US-001",
    "verdict": "PASS" or "FAIL",
    "tests_passed": N,
    "tests_failed": N,
    "failures": ["specific failure messages"]
  }`
})
Task({
  subagent_type: "form-component-validator",
  description: "Browser check for US-001",
  prompt: `Validate US-001 visually using Chrome MCP or agent-browser.

  Option 1 - Chrome MCP:
  1. Get tab: mcp__claude-in-chrome__tabs_context_mcp({ createIfEmpty: true })
  2. Navigate: mcp__claude-in-chrome__navigate({ url: "http://localhost:3000/[path]", tabId: TAB_ID })
  3. Read page: mcp__claude-in-chrome__read_page({ tabId: TAB_ID })
  4. Screenshot: mcp__claude-in-chrome__computer({ action: "screenshot", tabId: TAB_ID })

  Option 2 - agent-browser CLI:
  agent-browser open http://localhost:3000/[path]
  agent-browser snapshot -i
  agent-browser screenshot verification/US-001_verified.png

  Check against acceptance criteria.

  Create checkpoint:
  node .claude/hooks/ralph-guard.js create-checkpoint browser_validated [PASS|FAIL:reasons]`
})
// ... repeat for all stories being validated
```

### Phase 4: Evaluate Results

After validators complete, read their outputs and checkpoints.

**If ANY validator returned FAIL:**

```javascript
// Get failure details
const playwrightResult = read(".claude/checkpoints/US-001_playwright_validated")
const browserResult = read(".claude/checkpoints/US-001_browser_validated")

// If either failed, loop back to Phase 2 with specific failures
if (playwrightResult.includes("FAIL") || browserResult.includes("FAIL")) {
  // Clear build checkpoint
  Bash: node .claude/hooks/ralph-guard.js set-story US-001
  Bash: rm .claude/checkpoints/US-001_build_complete

  // Re-run implementer with failure details
  Task({
    subagent_type: "tdd-implementer",
    description: "Fix US-001 failures",
    prompt: `Fix these failures for US-001:

    Playwright failures:
    ${playwrightResult}

    Browser failures:
    ${browserResult}

    DO NOT modify tests. Fix the implementation only.
    Hook will BLOCK any attempt to edit test files.`
  })
}
```

**Loop until all validators pass or max attempts reached (5).**

### Phase 5: Commit

Only after ALL checkpoints show PASS:

```javascript
// Set phase
Bash: node .claude/hooks/ralph-guard.js set-phase commit

// Verify completion (hook will check)
Bash: node .claude/hooks/ralph-guard.js status

// Commit
Bash: git add -A && git commit -m "feat(US-001): [title]"

// Update prd.json
// Set validated: true for completed stories

// Update STATE.md with progress
```

### Phase 6: Next Iteration or Complete

```
if (all stories validated):
  Bash: node .claude/hooks/ralph-guard.js stop
  Output: "TASK_COMPLETE"
else:
  // Clear checkpoints for next iteration
  Bash: rm .claude/checkpoints/*

  // Loop back to Phase 1 for remaining stories
```

---

## Parallel Execution Decision Tree

```
For each story:
  │
  ├─ Has depends_on field?
  │   │
  │   ├─ YES: Check if dependencies are validated
  │   │   │
  │   │   ├─ All dependencies validated: Can run in parallel
  │   │   └─ Some dependencies pending: WAIT
  │   │
  │   └─ NO: Can run in parallel with other independent stories
```

**Example prd.json dependencies:**
```json
{
  "stories": [
    { "id": "US-001", "depends_on": [] },        // Independent
    { "id": "US-002", "depends_on": [] },        // Independent
    { "id": "US-003", "depends_on": ["US-001"] } // Must wait for US-001
  ]
}
```

**Execution order:**
1. Phase 1: US-001 + US-002 test writing (parallel)
2. Phase 2: US-001 + US-002 building (parallel)
3. Phase 3: US-001 + US-002 validation (parallel)
4. After US-001 validated: US-003 can start
5. Phase 1-3: US-003 (while US-002 might still be iterating)

---

## Error Recovery

### Implementer Fails Repeatedly (>3 times)

```javascript
// Add to AGENTS.md
Update scripts/ralph/AGENTS.md with:
  ### US-001 Blocked
  **Problem**: [specific issue]
  **Attempts**: 3
  **Last Error**: [error message]
  **Needs**: Human intervention

// Skip story, continue with others
```

### Validator Cannot Run (e.g., server down)

```bash
# Check server
curl http://localhost:3000 || echo "Server not running"

# If server down, output guidance
echo "BLOCKED: Dev server not running. Start with: npm run dev"
```

### Dependency Cycle Detected

```javascript
// prd.json has: US-001 depends_on US-002, US-002 depends_on US-001
// This is invalid

Output: "ERROR: Dependency cycle detected between US-001 and US-002"
Output: "Fix prd.json before continuing"
```

---

## State Files

### STATE.md (Resume Point)

```markdown
## Current Progress

| Story | Tests Written | Built | Playwright | Browser | Validated |
|-------|---------------|-------|------------|---------|-----------|
| US-001 | ✅ | ✅ | ✅ | ✅ | ✅ |
| US-002 | ✅ | ✅ | ❌ (attempt 2) | ✅ | ❌ |
| US-003 | ⏳ waiting | - | - | - | - |

## Last Failure
US-002 Playwright: Button click does not trigger API call
```

### AGENTS.md (Learned Patterns)

```markdown
### API Mocking
**Problem**: Tests fail because API not mocked
**Solution**: Use page.route() to intercept
**Pattern**: Always mock external APIs in tests

### Form Validation
**Problem**: Error messages not showing
**Solution**: Trigger blur event after input
**Pattern**: input.fill() + input.blur() for validation
```

---

## Summary

1. **Initialize** → Read state, identify parallel opportunities
2. **Test Write** → `tdd-test-scaffolder` parallel for independent stories
3. **Build** → `tdd-implementer` parallel for independent, sequential for dependent
4. **Validate** → `playwright-test-validator` + `form-component-validator` parallel for each story
5. **Evaluate** → Loop back if failures
6. **Commit** → Only when all checkpoints PASS
7. **Repeat** → Until all stories validated
