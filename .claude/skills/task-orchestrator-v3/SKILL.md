# Task Orchestrator v3.0

**Triggers:** `/task-orchestrator-v3`, `start workflow v3`, `new task v3`, `implement feature v3`

This skill orchestrates the complete Ralph TDD Workflow v3.0 with:
- Intent Engineering phase
- Gherkin user stories
- Whitebox validation
- Per-story cleanup
- Full metrics tracking
- Git checkpoints for rollback

---

## CRITICAL RULES

1. **DO NOT investigate codebase** - Use existing .planning/codebase/ docs
2. **DO NOT write code** - Only plan and prepare
3. **START with Intent Engineering** - Never skip discovery
4. **ASK QUESTIONS FIRST** - Use AskUserQuestion at each phase
5. **END with fresh-window command** - User pastes in new window to start Ralph loop

---

## v3.0 Workflow Phases

```
PLANNING WINDOW (this skill)
├── Phase -2: Intent Engineering → INTENT.md
├── Phase -1: Codebase Mapping → .planning/codebase/*.md
├── Phase 0: Plan Mode (optional)
├── Phase 1: PRD v3 Generation → tasks/prd-{feature}.md
├── Phase 2: User Stories → USER-STORIES.md (Gherkin)
├── Phase 3: Ralph Conversion → prd.json v3.0 + test templates
└── Output: Fresh-window command

EXECUTION WINDOW (ralph-guard-v3 in new window)
├── For each story:
│   ├── 1. set-story + git-checkpoint
│   ├── 2. test-write (learning-enforcer active)
│   ├── 3. build (learning-enforcer active)
│   ├── 4. validate (3 validators in parallel):
│   │   ├── playwright-test-validator (blackbox)
│   │   ├── form-component-validator (blackbox)
│   │   └── whitebox-validator (code analysis)
│   ├── 5. cleanup (lint --fix + typecheck)
│   └── 6. mark-story-pass (6 checkpoints required)
└── Final: documentation + stop
```

---

## Phase -2: Intent Engineering

**ALWAYS START HERE**

```
/intent-engineer
```

This invokes the intent-engineer skill which:
1. Asks clarifying questions about the problem
2. Identifies user personas
3. Documents constraints (technical, compliance, business)
4. Assesses risks
5. Defines success metrics

**Output:** `scripts/ralph/INTENT.md`

**CHECKPOINT:** Create `.claude/planning_checkpoints/intent_complete`

```bash
mkdir -p .claude/planning_checkpoints
echo "Intent engineering complete: $(date -Iseconds)" > .claude/planning_checkpoints/intent_complete
```

---

## Phase -1: Codebase Mapping

Check if codebase mapping exists and is fresh:

```bash
if [ -f ".planning/codebase/STACK.md" ]; then
  find .planning/codebase/STACK.md -mtime -30 | grep -q . && echo "FRESH" || echo "STALE"
else
  echo "MISSING"
fi
```

**If MISSING or STALE:** Run `/map-codebase` skill

**CHECKPOINT:** Create `.claude/planning_checkpoints/codebase_mapped`

---

## Phase 0: Create Planning Mode Flag

```bash
mkdir -p .claude
echo "Planning started: $(date -Iseconds)" > .claude/planning_mode
```

This activates hooks that BLOCK Edit/Write to source files.

---

## Phase 1: PRD v3 Generation

```
/prd [feature description]
```

The PRD skill will:
1. Read INTENT.md for context
2. Ask 3-5 clarifying questions
3. Generate structured PRD with v3.0 enhancements
4. Save to `tasks/prd-{feature-name}.md`

**PRD v3.0 Format Additions:**
- Intent summary section
- Risk register
- Success metrics
- Gherkin story templates

**CHECKPOINT:** Create `.claude/planning_checkpoints/prd_complete`

---

## Phase 2: User Story Generation

```
/user-story-generator tasks/prd-{feature}.md
```

This skill:
1. Reads PRD acceptance criteria
2. Converts to Gherkin Given/When/Then format
3. Adds edge cases and error scenarios
4. Creates `scripts/ralph/USER-STORIES.md`
5. Adds `user_stories` array to each story in prd.json

**CHECKPOINT:** Create `.claude/planning_checkpoints/user_stories_complete`

---

## Phase 3: Ralph Conversion

```
/ralph convert tasks/prd-{feature-name}.md --version 3.0
```

The Ralph skill will:
1. Read PRD markdown
2. Read USER-STORIES.md for Gherkin scenarios
3. Read INTENT.md for metadata
4. Convert to prd.json v3.0 format
5. Generate E2E test templates with Gherkin comments
6. Initialize STATE.md with v3.0 sections
7. Initialize METRICS.json
8. Remove planning_mode flag

**prd.json v3.0 Schema:**

```json
{
  "version": "3.0",
  "project": "...",
  "created": "...",
  "intent": {
    "problem_statement": "...",
    "user_personas": [...],
    "constraints": {...},
    "risks": [...],
    "success_metrics": {...}
  },
  "tasks": [{
    "id": "T001",
    "name": "...",
    "stories": [{
      "id": "US-001",
      "title": "...",
      "acceptanceCriteria": [...],
      "user_stories": [
        {
          "scenario": "...",
          "given": [...],
          "when": [...],
          "then": [...]
        }
      ],
      "checkpoints": {
        "tests_written": false,
        "build_complete": false,
        "playwright_validated": false,
        "browser_validated": false,
        "whitebox_validated": false,
        "cleanup_complete": false
      },
      "metrics": {
        "iterations": 0,
        "git_checkpoint": null
      }
    }]
  }],
  "config": {
    "enable_whitebox": true,
    "enable_learning_enforcer": true,
    "cleanup_per_story": true,
    "max_attempts_per_story": 5
  }
}
```

**CHECKPOINT:** Create `.claude/planning_checkpoints/ralph_conversion_complete`

---

## Phase 4: Output Fresh-Window Command

After all phases complete:

```markdown
---

## Ralph Loop v3.0 Ready

The PRD has been converted with v3.0 enhancements:
- ✅ Intent engineering complete
- ✅ Gherkin user stories generated
- ✅ prd.json v3.0 created
- ✅ Test templates generated
- ✅ Metrics initialized

### v3.0 Features Enabled:
- 6 checkpoints per story (including whitebox, cleanup)
- Git checkpoint before each story (rollback on failure)
- Learning enforcer blocks known-bad patterns
- Per-story cleanup (lint + typecheck)
- Full metrics tracking

**To start the Ralph loop:**

1. Open a NEW Claude Code window (fresh context)
2. Paste this command:

```bash
node .claude/hooks/ralph-guard.js start && echo "=== AGENTS ===" && cat scripts/ralph/AGENTS.md && echo "=== STATE ===" && cat scripts/ralph/STATE.md && echo "=== PROMPT ===" && cat scripts/ralph/prompt.md && echo "=== PRD (first story) ===" && node -e "const prd = require('./scripts/ralph/prd.json'); console.log(JSON.stringify(prd.tasks[0].stories[0], null, 2));"
```

3. Follow the instructions that appear

---

**STOP HERE. Do NOT implement in this window.**

---
```

---

## Phase 5: STOP

**DO NOT:**
- Write any implementation code
- Run tests
- Make any file changes beyond planning artifacts

The implementation happens in a FRESH context window where:
- Ralph hooks are active (workflow_active flag)
- Full 200k context available
- No planning context pollution
- Git checkpoints enabled
- Metrics tracking active

---

## Files Created

| File | Purpose |
|------|---------|
| `.claude/planning_checkpoints/*` | Planning phase gates |
| `scripts/ralph/INTENT.md` | Intent engineering output |
| `tasks/prd-{feature}.md` | PRD document |
| `scripts/ralph/USER-STORIES.md` | Gherkin scenarios |
| `scripts/ralph/prd.json` | v3.0 structured stories |
| `scripts/ralph/STATE.md` | Resume point tracker |
| `scripts/ralph/METRICS.json` | Metrics tracking |
| `scripts/ralph/LEARNINGS.md` | Pattern blockers |
| `e2e/{story_id}.spec.ts` | E2E test templates |

---

## v3.0 Execution Window Workflow

When user pastes command in new window:

### Per-Story Loop

```bash
# 1. Set story + create git checkpoint
node .claude/hooks/ralph-guard.js set-story US-001

# 2. Test-write phase (learning enforcer active)
node .claude/hooks/ralph-guard.js set-phase test-write
# tdd-test-scaffolder writes tests

# 3. Build phase (learning enforcer active)
node .claude/hooks/ralph-guard.js set-phase build
# tdd-implementer writes code

# 4. Validate phase (3 validators in parallel)
node .claude/hooks/ralph-guard.js set-phase validate
# Run in parallel:
#   - playwright-test-validator
#   - form-component-validator
#   - whitebox-validator

# 5. Cleanup phase
node .claude/hooks/ralph-guard.js cleanup US-001
# Runs: lint --fix, tsc --noEmit, mock pattern scan

# 6. Mark complete (requires 6 checkpoints)
node .claude/hooks/ralph-guard.js mark-story-pass US-001
```

### Iteration Loop (on failure)

```bash
attempts=0
while [ $attempts -lt 5 ]; do
  # Run validators...
  if [ validation_passed ]; then
    break
  fi

  # Record iteration in metrics
  node .claude/hooks/validators/metrics-tracker.js iteration US-001 "reason"

  # Re-run implementer with failure details
  attempts=$((attempts + 1))
done

# If still failing after 5 attempts, rollback
if [ $attempts -ge 5 ]; then
  node .claude/hooks/ralph-guard.js rollback US-001
fi
```

---

## Error Handling

**If user hasn't described feature:**
```
I need to know what feature you want to build. Please describe:
1. What should the feature do?
2. Who is it for?
3. Any specific requirements?
```

**If intent engineering skipped:**
```
v3.0 requires intent engineering. Running /intent-engineer first...
```

**If LEARNINGS.md missing:**
Create default with starter patterns.

**If METRICS.json missing:**
Initialize empty metrics structure.

---

## Comparison: v2.0 vs v3.0

| Feature | v2.0 | v3.0 |
|---------|------|------|
| Intent Engineering | No | Yes |
| User Stories | Acceptance criteria only | Gherkin Given/When/Then |
| Validators | 2 (playwright, browser) | 3 (+ whitebox) |
| Checkpoints | 4 | 6 |
| Git Checkpoints | No | Yes (rollback on failure) |
| Learning Enforcer | No | Yes (blocks bad patterns) |
| Per-Story Cleanup | No | Yes (lint + typecheck) |
| Metrics | Basic | Full (iterations, timestamps, failures) |
| Rollback | Manual | Automatic after 5 failures |
