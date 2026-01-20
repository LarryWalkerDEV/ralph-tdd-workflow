# Ralph Skill

**Triggers:** `/ralph`, `convert prd`, `create prd.json`, `setup ralph loop`

This skill converts a PRD markdown file to prd.json format and generates E2E test templates.

---

## CRITICAL: TDD APPROACH

**Tests are written FIRST, before any implementation.**

This skill:
1. Reads PRD markdown
2. Creates prd.json with stories
3. **Generates E2E test templates** (tests that WILL FAIL initially)
4. Initializes STATE.md
5. Removes planning_mode flag
6. Outputs fresh-window command

---

## Workflow

### Step 1: Read PRD

```bash
cat tasks/prd-{feature-name}.md
```

Parse:
- User stories (US-001, US-002, etc.)
- Acceptance criteria
- Test categories
- Technical considerations

### Step 2: Create prd.json (v2.1 format)

```json
{
  "project": "[Project Name]",
  "version": "2.1",
  "created": "[YYYY-MM-DD]",
  "branchName": "ralph/{feature-name}",
  "description": "[Feature description]",
  "currentTask": "T001",

  "testUser": {
    "email": "e2e-test@example.test",
    "password": "TestPassword123!",
    "plan": "pro"
  },

  "decisions": [],

  "completedTasks": [],

  "tasks": [
    {
      "id": "T001",
      "name": "[Feature Name]",
      "status": "pending",
      "priority": "high",
      "e2eTestFile": "e2e/t001-{feature-name}.spec.ts",
      "stories": [
        {
          "id": "US-001",
          "title": "[Story title]",
          "description": "As a [user], I want [action], so that [benefit]",
          "acceptanceCriteria": [
            "[Criterion 1]",
            "[Criterion 2]",
            "Typecheck passes",
            "Data persists after page refresh"
          ],
          "priority": 1,
          "passes": false,
          "depends_on": [],
          "test_categories": ["form-validation", "api-integration"],
          "page_path": "/[path]",
          "checkpoints": {
            "tests_written": false,
            "build_complete": false,
            "playwright_validated": false,
            "browser_validated": false
          }
        }
      ]
    }
  ],

  "config": {
    "max_attempts_per_story": 5,
    "parallel_build": true,
    "parallel_validate": true,
    "dev_server_url": "http://localhost:3000",
    "test_timeout_ms": 30000
  }
}
```

### Step 3: Generate E2E Test Templates

**For each story, create test file that will FAIL initially:**

```typescript
// e2e/t001-{feature-name}.spec.ts
import { test, expect } from '@playwright/test';

test.describe('[Feature Name]', () => {

  test.beforeEach(async ({ page }) => {
    // Setup - navigate to page
    await page.goto('[page_path]');
  });

  // US-001: [Story Title]
  test('US-001: [acceptance criterion 1]', async ({ page }) => {
    // Arrange
    // TODO: Setup test data

    // Act
    // TODO: Perform user action

    // Assert
    // TODO: Verify expected result

    // Verify persistence
    await page.reload();
    // TODO: Verify data persists
  });

  test('US-001: [acceptance criterion 2]', async ({ page }) => {
    // ...
  });

  // US-002: [Story Title]
  test('US-002: [acceptance criterion 1]', async ({ page }) => {
    // ...
  });

});
```

**Test Pattern:** Input → Action → Verify → Reload → Verify Persistence

### Step 4: Initialize STATE.md

```markdown
# Ralph Workflow State

Last updated: [timestamp]

## Current Progress

| Story | Tests | Build | Playwright | Browser | Validated | Attempts |
|-------|-------|-------|------------|---------|-----------|----------|
| US-001 | ⏳ | - | - | - | ❌ | 0 |
| US-002 | ⏳ | - | - | - | ❌ | 0 |

## Resume Point

| Field | Value |
|-------|-------|
| **Current Task** | T001 |
| **Last Story** | None |
| **Next Story** | US-001 |
| **Phase** | test-write |
| **Blocker** | None |

## Decisions Made

(None yet - will be populated during implementation)
```

### Step 5: Remove Planning Mode

```bash
rm .claude/planning_mode
```

### Step 6: Output Fresh-Window Command

```
---

## Ralph Loop Ready

**Files created:**
- `scripts/ralph/prd.json` - Stories with acceptance criteria
- `scripts/ralph/STATE.md` - Progress tracking
- `e2e/t001-{feature-name}.spec.ts` - E2E test templates (will fail initially)

**TDD Workflow:**
1. Tests exist and will FAIL (no implementation yet)
2. Builder agent will implement code to make tests PASS
3. Builder CANNOT modify tests (hook enforced)
4. Validators will verify both tests and browser behavior

---

**To start the Ralph loop:**

1. **Open a NEW Claude Code window** (fresh context)
2. **Paste this command:**

\`\`\`bash
echo "Ralph loop active" > .claude/workflow_active && node .claude/hooks/ralph-guard.js start && cat scripts/ralph/AGENTS.md && echo "---STATE---" && cat scripts/ralph/STATE.md && echo "---PROMPT---" && cat scripts/ralph/prompt.md && echo "---PRD---" && cat scripts/ralph/prd.json
\`\`\`

3. Follow the instructions that appear

---

**STOP HERE. Do NOT implement in this window.**

The fresh window will have:
- Full 200k token context
- Active hooks enforcing TDD rules
- No planning context pollution
```

---

## Dependencies Between Stories

If story B requires story A:

```json
{
  "id": "US-002",
  "depends_on": ["US-001"],
  ...
}
```

**Rules:**
- Stories with empty `depends_on` can run in parallel
- Stories with dependencies wait for their dependencies
- Circular dependencies are INVALID (error)

---

## Decimal Story IDs (for hotfixes)

If urgent fix needed during implementation:

```json
{
  "id": "US-001.1",
  "title": "Hotfix: [urgent issue]",
  "insertedAt": "[date]",
  "reason": "Blocker discovered during US-001"
}
```

Original stories keep their IDs. Hotfixes get decimal IDs.

---

## Decision Tracking

When architectural decisions are made during planning:

```json
{
  "decisions": [
    {
      "id": "D-001",
      "decision": "Use React Hook Form for validation",
      "rationale": "Better performance than Formik, supports Zod",
      "madeIn": "PRD phase",
      "date": "2024-01-20"
    }
  ]
}
```

This prevents fresh context windows from re-debating solved issues.
