# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Repository Overview

This repository contains the **Ralph TDD Workflow v3.0** - an enforced Test-Driven Development framework for Claude Code. It includes:

1. **ralph-loop/** (root) - The framework implementation with hooks, validators, and agent definitions
2. **workflow-template/** - A ready-to-copy template for new projects using Ralph
3. **tools/agent-browser/** - Headless browser automation CLI for AI agents

---

## v3.0 Features (NEW)

- **Intent Engineering** - Full discovery phase before PRD (personas, constraints, risks, metrics)
- **Whitebox Validation** - Code structure, security, performance, and error handling checks
- **Learning Enforcer** - Blocks known-bad patterns via LEARNINGS.md
- **Per-Story Cleanup** - Lint + typecheck after each story (not just at end)
- **Full Metrics** - Iteration counts, timestamps, failure reasons per story
- **Gherkin User Stories** - Given/When/Then format for testable requirements
- **Git Checkpoints** - Automatic rollback points before each story
- **6 Checkpoints** - Added whitebox_validated and cleanup_complete

### v2.0 Features (Preserved)

- Session State Management - Persistent session tracking for crash recovery
- Audit Trail - Full logging of all workflow actions
- Orphaned Story Detection - Automatically recover from crashes mid-story
- Retry Logic - Automatic retry on rate limits and network errors
- Project Config Detection - `init` command auto-detects project settings
- Coverage Reporting - Unified coverage tracking across all validators
- Conflict Resolver - Subagent for diagnosing stuck iterations

---

## Installing to a New Project

```bash
# From this repository:
cd workflow-template
./install-ralph.sh /path/to/your/project

# Or from the target project:
/path/to/ralph-loop/workflow-template/install-ralph.sh .
```

This installs:
- `.claude/hooks/ralph-guard.js` - Main enforcement hook (v3.0)
- `.claude/hooks/validators/*.js` - All validators including learning-enforcer
- `.claude/agents/*.md` - Subagent definitions (including whitebox-validator)
- `.claude/skills/*` - Skills (including v3.0: intent-engineer, user-story-generator, task-orchestrator-v3)
- `scripts/ralph/` - PRD, state tracking, learnings, metrics

---

## Quick Start

```bash
# Activate Ralph workflow (enables hook enforcement)
node .claude/hooks/ralph-guard.js start

# Check status
node .claude/hooks/ralph-guard.js status

# Stop workflow (BLOCKED until all stories pass)
node .claude/hooks/ralph-guard.js stop
```

---

## Subagents

| Subagent | Purpose | Restrictions |
|----------|---------|--------------|
| `tdd-test-scaffolder` | Write Playwright tests FIRST (Red phase) | Cannot edit src/, app/, components/ |
| `tdd-implementer` | Implement code to pass tests (Green phase) | Cannot edit test files (BLOCKED) |
| `playwright-test-validator` | Run Playwright tests (blackbox) | Cannot edit anything |
| `form-component-validator` | Browser visual/accessibility checks (blackbox) | Cannot edit anything |
| `whitebox-validator` | Code structure, security, performance (v3.0) | Cannot edit anything |
| `conflict-resolver` | Diagnose stuck iterations & validator conflicts | Read-only |

### Invoking Subagents

```javascript
// TDD Red phase - write failing tests
Task({
  subagent_type: "tdd-test-scaffolder",
  description: "Write tests for US-001",
  prompt: "Create Playwright tests for [story]..."
})

// TDD Green phase - implement to pass tests
Task({
  subagent_type: "tdd-implementer",
  description: "Implement US-001",
  prompt: "Make tests pass for [story]..."
})

// Validation - run ALL THREE in parallel (v3.0)
Task({
  subagent_type: "playwright-test-validator",
  description: "Run tests for US-001",
  prompt: "Execute Playwright tests..."
})

Task({
  subagent_type: "form-component-validator",
  description: "Visual validate US-001",
  prompt: "Check UI at /path visually..."
})

Task({
  subagent_type: "whitebox-validator",
  description: "Code quality check US-001",
  prompt: "Analyze code structure, security, performance..."
})
```

---

## v3.0 Workflow Phases

```
PLANNING WINDOW (task-orchestrator-v3)
├── Phase -2: Intent Engineering → INTENT.md
├── Phase -1: Codebase Mapping → .planning/codebase/*.md
├── Phase 0: Plan Mode (optional)
├── Phase 1: PRD v3 Generation → tasks/prd-{feature}.md
├── Phase 2: User Stories → USER-STORIES.md (Gherkin)
├── Phase 3: Ralph Conversion → prd.json v3.0 + test templates
└── Output: Fresh-window command

EXECUTION WINDOW (ralph-guard-v3)
├── For each story:
│   ├── 1. set-story + git-checkpoint (rollback point)
│   ├── 2. test-write (learning-enforcer active)
│   ├── 3. build (learning-enforcer active)
│   ├── 4. validate (3 validators in parallel):
│   │   ├── playwright-test-validator (blackbox)
│   │   ├── form-component-validator (blackbox)
│   │   └── whitebox-validator (NEW - code analysis)
│   ├── 5. cleanup (lint --fix + code-simplifier)
│   └── 6. mark-story-pass (6 checkpoints required)
└── Final: documentation + stop
```

---

## Hook Enforcement

Hooks are ONLY active when Ralph workflow is started.

| Phase | Hook Blocks |
|-------|-------------|
| test-write | Any edit to src/, app/, components/ |
| build | Any edit to e2e/*.spec.ts, *.test.ts (EXIT CODE 2) |
| validate | Any edit to src/ or test files |
| commit | Completion if checkpoints missing |
| **any (v3.0)** | Known-bad patterns from LEARNINGS.md |

**Exit code 2 = BLOCKED.** Cannot be bypassed by prompting.

---

## Commands

```bash
# Workflow control
node .claude/hooks/ralph-guard.js start          # Activate hooks
node .claude/hooks/ralph-guard.js stop           # BLOCKED until all stories pass
node .claude/hooks/ralph-guard.js stop --force   # Force stop (not recommended)
node .claude/hooks/ralph-guard.js status         # Show current state
node .claude/hooks/ralph-guard.js version        # Show version (3.0)

# Progress & Navigation
node .claude/hooks/ralph-guard.js progress       # Show ALL stories status (2/17 etc)
node .claude/hooks/ralph-guard.js next-story     # Get next pending story
node .claude/hooks/ralph-guard.js check-all-complete  # Check if can exit

# Phase management
node .claude/hooks/ralph-guard.js set-phase test-write
node .claude/hooks/ralph-guard.js set-phase build
node .claude/hooks/ralph-guard.js set-phase validate
node .claude/hooks/ralph-guard.js set-phase commit
node .claude/hooks/ralph-guard.js set-phase cleanup
node .claude/hooks/ralph-guard.js set-phase documentation

# Story tracking (v3.0: creates git checkpoint automatically)
node .claude/hooks/ralph-guard.js set-story US-001
node .claude/hooks/ralph-guard.js set-story US-001 --skip-checkpoint  # Skip git checkpoint
node .claude/hooks/ralph-guard.js mark-story-pass US-001  # Requires 6 checkpoints

# Checkpoints (v3.0: 6 required)
node .claude/hooks/ralph-guard.js create-checkpoint tests_written PASS
node .claude/hooks/ralph-guard.js create-checkpoint build_complete PASS
node .claude/hooks/ralph-guard.js create-checkpoint playwright_validated PASS
node .claude/hooks/ralph-guard.js create-checkpoint browser_validated PASS
node .claude/hooks/ralph-guard.js create-checkpoint whitebox_validated PASS      # v3.0
node .claude/hooks/ralph-guard.js create-checkpoint cleanup_complete PASS        # v3.0
node .claude/hooks/ralph-guard.js clear-checkpoints

# v3.0 Git & Recovery
node .claude/hooks/ralph-guard.js git-checkpoint US-001  # Create git checkpoint
node .claude/hooks/ralph-guard.js rollback US-001        # Rollback to checkpoint
node .claude/hooks/ralph-guard.js cleanup US-001         # Run per-story cleanup
node .claude/hooks/ralph-guard.js metrics                # Show metrics summary

# v3.0 Iteration Tracking (auto conflict-resolver)
node .claude/hooks/ralph-guard.js record-iteration US-001 "Validation failed"  # Record failure
node .claude/hooks/ralph-guard.js check-iterations US-001    # Check iteration count
node .claude/hooks/ralph-guard.js clear-iterations US-001    # Reset after conflict resolved

# v3.0 Learnings Enforcement (ENFORCED after >2 iterations)
node .claude/hooks/ralph-guard.js add-learning US-001 "problem" "solution"   # Document learning
node .claude/hooks/ralph-guard.js add-block-pattern US-001 "regex" "fix"     # Add block pattern
node .claude/hooks/ralph-guard.js check-learnings US-001                     # Check if documented

# v3.0 Learning Enforcer (blocks bad patterns)
node .claude/hooks/validators/learning-enforcer.js list           # List block patterns
node .claude/hooks/validators/learning-enforcer.js test BP-001 "mock = true"

# v3.0 Metrics Tracker
node .claude/hooks/validators/metrics-tracker.js summary          # Show summary
node .claude/hooks/validators/metrics-tracker.js story US-001     # Show story metrics
node .claude/hooks/validators/metrics-tracker.js export           # Export JSON

# v2.0 Recovery & Debug (preserved)
node .claude/hooks/ralph-guard.js init                    # Auto-detect project config
node .claude/hooks/ralph-guard.js recover                 # Show recovery info
node .claude/hooks/ralph-guard.js audit                   # Show audit trail log
```

---

## Key Files

| File | Purpose |
|------|---------|
| `.claude/hooks/ralph-guard.js` | Cross-platform hook enforcement (v3.0) |
| `.claude/hooks/validators/*.js` | Individual phase validators |
| `.claude/hooks/validators/learning-enforcer.js` | Blocks known-bad patterns (v3.0) |
| `.claude/hooks/validators/metrics-tracker.js` | Full metrics tracking (v3.0) |
| `.claude/hooks/validators/whitebox-validator-check.js` | Whitebox validation (v3.0) |
| `.claude/agents/*.md` | Subagent definitions with restrictions |
| `.claude/agents/whitebox-validator.md` | Code analysis agent (v3.0) |
| `.claude/skills/*/SKILL.md` | Skill definitions |
| `.claude/skills/intent-engineer/SKILL.md` | Intent discovery (v3.0) |
| `.claude/skills/user-story-generator/SKILL.md` | Gherkin generation (v3.0) |
| `.claude/skills/task-orchestrator-v3/SKILL.md` | Enhanced orchestrator (v3.0) |
| `scripts/ralph/prd.json` | Stories with v3.0 schema |
| `scripts/ralph/STATE.md` | Progress tracking |
| `scripts/ralph/AGENTS.md` | Learned patterns and error solutions |
| `scripts/ralph/LEARNINGS.md` | Block patterns + **Subagent Implementation Guide** |
| `scripts/ralph/METRICS.json` | Full metrics data (v3.0) |
| `scripts/ralph/INTENT.md` | Intent engineering output (v3.0) |
| `scripts/ralph/USER-STORIES.md` | Gherkin scenarios (v3.0) |
| `scripts/ralph/conflicts/` | Auto-generated conflict reports (v3.0) |
| `.claude/story_iterations.json` | Iteration tracking per story (v3.0) |
| `scripts/ralph/migrate-to-v3.js` | Migration script (v3.0) |

---

## prd.json v3.0 Structure

```json
{
  "version": "3.0",
  "project": "...",
  "intent": {
    "problem_statement": "...",
    "user_personas": [...],
    "constraints": {...},
    "risks": [...],
    "success_metrics": {...}
  },
  "tasks": [{
    "id": "T001",
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

### Migrate from v2.x

```bash
node scripts/ralph/migrate-to-v3.js
```

---

## 6-Checkpoint System (v3.0)

| Checkpoint | Validator | Phase |
|------------|-----------|-------|
| `tests_written` | tdd-test-scaffolder | test-write |
| `build_complete` | tdd-implementer | build |
| `playwright_validated` | playwright-test-validator | validate |
| `browser_validated` | form-component-validator | validate |
| `whitebox_validated` | whitebox-validator (NEW) | validate |
| `cleanup_complete` | lint + simplifier (NEW) | cleanup |

---

## Learning Enforcer (v3.0)

The learning enforcer blocks edits that introduce known-bad patterns.

### LEARNINGS.md Format

```markdown
## BLOCK-PATTERN: BP-001
**Signature**: `mock\s*[:=]\s*(true|['"])`
**Solution**: Remove mock flags, use environment variables
```

### Built-in Patterns

| ID | Pattern | Blocks |
|----|---------|--------|
| BP-001 | `mock = true` | Mock flags in production |
| BP-002 | `fake_data` | Fake response objects |
| BP-003 | `TODO: remove` | Incomplete code markers |
| BP-004 | `setTimeout(() => resolve` | Artificial delays |
| BP-005 | `process.env.X \|\| "long..."` | Inline secrets |
| BP-006 | `test.skip` | Skipped tests |
| BP-007 | `expect().toBe(true) // always` | Meaningless assertions |

---

## Learnings Enforcement (v3.0) - ENFORCED

**Learnings are required when a story takes >2 iterations.**

After multiple failed iterations, you MUST document what you learned before marking the story as passed. This prevents repeating the same mistakes.

### How It Works

1. If `iterations > 2`, the system checks if `AGENTS.md` or `LEARNINGS.md` was modified
2. If not modified → `mark-story-pass` is **BLOCKED**
3. You must document the problem and solution before proceeding

### Commands

```bash
# Add a learning (problem + solution)
node .claude/hooks/ralph-guard.js add-learning US-005 "Selector was wrong" "Use data-testid"

# Add a block pattern (prevents future mistakes)
node .claude/hooks/ralph-guard.js add-block-pattern US-005 "mock\\s*=" "Use real data"

# Check if learnings are documented
node .claude/hooks/ralph-guard.js check-learnings US-005
```

### What Gets Recorded

In `AGENTS.md`:
```markdown
## US-005 - 2026-01-21T12:00:00Z
**Iterations**: 4
**Problem**: Selector was wrong
**Solution**: Use data-testid
**Failures**:
  - Attempt 1: Button not found
  - Attempt 2: Wrong element clicked
  - Attempt 3: Timeout
  - Attempt 4: Finally found issue
```

---

## Cleanup Phase (v3.0) - ENFORCED

The cleanup phase runs **after validation passes** and is **required** before marking a story complete.

### What Cleanup Does

1. **ESLint --fix** - Auto-fix linting issues
2. **Prettier** - Format code (if available)
3. **TypeScript check** - Verify no type errors
4. **Mock pattern scan** - Warn about leftover mocks
5. **Code-simplifier reminder** - Prompt to run refactoring agent

### Running Cleanup

```bash
node .claude/hooks/ralph-guard.js cleanup US-005
```

### Cleanup Checkpoint

Creates `cleanup_complete` checkpoint when successful. This is **required** for `mark-story-pass`.

---

## Whitebox Validator (v3.0)

Analyzes code without running it:

| Category | Checks |
|----------|--------|
| Structure | TypeScript compiles, no `any` abuse |
| Security | No hardcoded secrets, SQL injection safe |
| Performance | No N+1 patterns, proper async/await |
| Errors | Try/catch coverage, user-friendly errors |
| Quality | No mock data, no TODO markers |

---

## Metrics Tracking (v3.0)

Per-story metrics:
- `started_at`, `completed_at` timestamps
- `iterations` count
- `failure_reasons[]` with timestamps
- `validators` (attempts per validator)
- `git_checkpoint` commit hash

Aggregate metrics:
- `avg_iterations`, `total_time_ms`
- `common_failures[]` (top 10)

---

## Git Checkpoints (v3.0)

On `set-story US-XXX`:
1. Stage all changes
2. Commit with message "checkpoint: before US-XXX"
3. Save commit hash to mapping file

On 5+ failed iterations:
```bash
node .claude/hooks/ralph-guard.js rollback US-XXX
# Hard resets to checkpoint, clears story checkpoints
```

---

## Iteration Loop (v3.0) - With Auto Conflict-Resolver

```
attempts = 0
while (not validated && attempts < 5):
    run playwright-test-validator  \
    run form-component-validator    > parallel
    run whitebox-validator         /

    if (all PASS):
        run cleanup
        validated = true
    else:
        # RECORD ITERATION (triggers auto conflict-resolver at 5)
        node ralph-guard.js record-iteration US-XXX "reason"

        if (exit code == 3):  # MAX_ITERATIONS_REACHED
            # Auto-generated: scripts/ralph/conflicts/CONFLICT-US-XXX.md
            # MUST invoke conflict-resolver before continuing
            STOP and invoke conflict-resolver
        else:
            run tdd-implementer with failure details
            attempts++
```

### Automatic Conflict-Resolver Trigger

After 5 failed iterations, `record-iteration` automatically:
1. **Generates conflict report**: `scripts/ralph/conflicts/CONFLICT-{story-id}.md`
2. **Rolls back** to git checkpoint
3. **Clears checkpoints** for the story
4. **Exits with code 3** (CONFLICT_RESOLVER_REQUIRED)

The conflict report contains:
- All validator results (PASS/FAIL for each)
- Failure history (last 5 attempts with reasons)
- Acceptance criteria for the story
- Ready-to-use Task() invocation for conflict-resolver

### Commands for Iteration Tracking

```bash
# Record a failed iteration (auto-triggers at 5)
node .claude/hooks/ralph-guard.js record-iteration US-001 "Playwright failed: button not found"

# Check iteration count
node .claude/hooks/ralph-guard.js check-iterations US-001
# Output: Iterations: 3/5, STATUS: OK - 2 attempts remaining

# Reset iterations (after conflict resolved)
node .claude/hooks/ralph-guard.js clear-iterations US-001
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 2 | BLOCKED (cannot proceed, fix required) |
| 3 | CONFLICT_RESOLVER_REQUIRED (max iterations reached) |

---

## Skills (v3.0)

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `/task-orchestrator-v3` | "start workflow v3" | Full v3.0 workflow |
| `/intent-engineer` | "discover requirements" | Intent discovery (NEW) |
| `/user-story-generator` | "generate gherkin" | Gherkin scenarios (NEW) |
| `/task-orchestrator` | "start workflow" | v2.0 workflow |
| `/prd` | "create prd" | Generate PRD document |
| `/ralph` | "convert prd" | Convert PRD to prd.json |
| `/map-codebase` | "map codebase" | 7-agent codebase analysis |

---

## Creating New Subagents

**IMPORTANT: Read `scripts/ralph/LEARNINGS.md` before creating new subagents.**

The LEARNINGS.md file contains the **Subagent Implementation Guide** with:
- Critical YAML format requirements (description MUST be single-line with `\n`)
- Full agent template
- Debugging checklist
- Common mistakes and fixes

### Quick Reference

```yaml
# CORRECT format - description on ONE LINE with \n escapes
description: "Use this agent when...\n\nExamples:\n\n<example>\nuser: \"request\"\n</example>"

# WRONG format - multiline (agent will NOT register)
description: "Use this agent when...

Examples:
..."
```

After creating agent in `.claude/agents/`, **restart Claude Code** to load it.

---

## DO NOT

- Start implementing without activating Ralph: `node .claude/hooks/ralph-guard.js start`
- Modify tests during build phase (hook will BLOCK with exit 2)
- Mark complete without running ALL THREE validators
- Skip whitebox validation (required in v3.0)
- Skip cleanup phase (required in v3.0)
- Use patterns in LEARNINGS.md (enforcer will BLOCK)
- Skip reading AGENTS.md (will repeat mistakes)
- Skip reading LEARNINGS.md when creating subagents (agents won't register)
- Process dependent stories in parallel
- **Exit loop before ALL stories pass** (hook will BLOCK with exit 2)
- Skip marking stories as passed in prd.json (`mark-story-pass`)

---

## Exit Enforcement

**The Ralph loop CANNOT exit until all stories pass.**

```bash
# This will BLOCK if any stories are incomplete:
node .claude/hooks/ralph-guard.js stop
# Output: BLOCKED: Cannot exit Ralph loop - stories incomplete!
#         Progress: 2/17 stories passed

# Check if you can exit:
node .claude/hooks/ralph-guard.js check-all-complete
# Output: INCOMPLETE: 2/17 stories passed (lists pending)
# Or:     COMPLETE: All 17 stories passed
```

Only after `check-all-complete` returns "COMPLETE" can you successfully run `stop`.
