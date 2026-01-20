# CLAUDE.md - Ralph TDD Workflow

## Environment Setup

```bash
# Copy environment template and add your API keys
cp .env.example .env.local
```

**Required Environment Variables** (see `.env.local`):

| Variable | Description | Required |
|----------|-------------|----------|
| `KIE_API_KEY` | kie.ai API key for AI services | Yes |

---

## Quick Start

```bash
# 1. Start Ralph workflow (activates hooks)
node .claude/hooks/ralph-guard.js start

# 2. Read state files
cat scripts/ralph/AGENTS.md
cat scripts/ralph/STATE.md
cat scripts/ralph/prd.json

# 3. Follow ORCHESTRATOR.md instructions
cat scripts/ralph/ORCHESTRATOR.md
```

---

## Subagents Available

| Subagent | Purpose | Hooks | Restrictions |
|----------|---------|-------|--------------|
| `tdd-test-scaffolder` | Write Playwright tests FIRST | - | Cannot edit src/ |
| `tdd-implementer` | Implement code to pass tests | `post_tool_use`, `stop` | Cannot edit tests (BLOCKED) |
| `playwright-test-validator` | Run Playwright tests | `stop` | Cannot edit anything |
| `form-component-validator` | Browser visual/accessibility checks | `stop` | Cannot edit anything |

### Invoking Subagents

```javascript
// Write tests first (TDD Red phase)
Task({
  subagent_type: "tdd-test-scaffolder",
  description: "Write tests for US-001",
  prompt: "Create Playwright tests for [story details]..."
})

// Implement code (TDD Green phase)
Task({
  subagent_type: "tdd-implementer",
  description: "Implement US-001",
  prompt: "Make tests pass for [story details]..."
})

// Run Playwright tests
Task({
  subagent_type: "playwright-test-validator",
  description: "Validate US-001 tests",
  prompt: "Run tests for US-001 and create checkpoint..."
})

// Browser visual validation
Task({
  subagent_type: "form-component-validator",
  description: "Browser validate US-001",
  prompt: "Validate form at /contact visually..."
})
```

---

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  RALPH TDD WORKFLOW                                             │
│                                                                 │
│  Phase 1: TEST WRITING (Parallel for independent stories)      │
│  ├── Task(tdd-test-scaffolder) for US-001                      │
│  ├── Task(tdd-test-scaffolder) for US-002                      │
│  └── Tests MUST fail initially (no implementation)             │
│                                                                 │
│  Phase 2: BUILDING (Parallel where no dependencies)            │
│  ├── Task(tdd-implementer) for US-001                          │
│  ├── Task(tdd-implementer) for US-002                          │
│  └── Implementers CANNOT modify tests (hook BLOCKS)            │
│                                                                 │
│  Phase 3: VALIDATION (Both validators parallel per story)      │
│  ├── Task(playwright-test-validator) for US-001                │
│  ├── Task(form-component-validator) for US-001                 │
│  └── Real tests + Real browser checks                          │
│                                                                 │
│  Phase 4: ITERATE OR COMMIT                                    │
│  ├── If FAIL: Loop back to Phase 2 with failure details        │
│  └── If PASS: Commit and move to next story                    │
└─────────────────────────────────────────────────────────────────┘
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

**Exit code 2 = BLOCKED.** Cannot be bypassed by prompting.

### Hook Files

| Validator | Runs When | Purpose |
|-----------|-----------|---------|
| `build-validator.js` | After every Edit/Write by tdd-implementer | BLOCKS test edits, checks TypeScript |
| `build-complete-validator.js` | When tdd-implementer stops | Verifies build checkpoint |
| `test-validator.js` | After every Write by tdd-test-scaffolder | BLOCKS source edits |
| `test-complete-validator.js` | When tdd-test-scaffolder stops | Verifies test file created |
| `playwright-validator-check.js` | When playwright-test-validator stops | Verifies tests ran |
| `browser-validator-check.js` | When form-component-validator stops | Verifies screenshot taken |

---

## Browser Automation

### Option 1: Chrome MCP (Built-in)
Used by `form-component-validator` automatically:
```javascript
mcp__claude-in-chrome__tabs_context_mcp({ createIfEmpty: true })
mcp__claude-in-chrome__navigate({ url: "http://localhost:3000/path", tabId: TAB_ID })
mcp__claude-in-chrome__read_page({ tabId: TAB_ID })
mcp__claude-in-chrome__computer({ action: "screenshot", tabId: TAB_ID })
```

### Option 2: agent-browser CLI
```bash
agent-browser open http://localhost:3000/contact
agent-browser snapshot -i              # Get accessibility tree with refs
agent-browser click @e2                # Click by ref
agent-browser fill @e3 "test@test.com" # Fill input
agent-browser screenshot verification/US-001.png
```

---

## Key Files

| File | Purpose |
|------|---------|
| `.claude/hooks/ralph-guard.js` | Cross-platform hook enforcement |
| `.claude/hooks/validators/*.js` | Individual validators |
| `.claude/agents/*.md` | Subagent definitions with hooks |
| `scripts/ralph/prd.json` | Stories with acceptance criteria |
| `scripts/ralph/STATE.md` | Progress tracking |
| `scripts/ralph/AGENTS.md` | Learned patterns |
| `scripts/ralph/ORCHESTRATOR.md` | Workflow instructions |
| `scripts/ralph/VALIDATION-FRAMEWORK.md` | Test category templates |

---

## Commands

```bash
# Workflow control
node .claude/hooks/ralph-guard.js start          # Activate hooks
node .claude/hooks/ralph-guard.js stop           # Deactivate hooks
node .claude/hooks/ralph-guard.js status         # Show current state

# Phase management
node .claude/hooks/ralph-guard.js set-phase test-write
node .claude/hooks/ralph-guard.js set-phase build
node .claude/hooks/ralph-guard.js set-phase validate
node .claude/hooks/ralph-guard.js set-phase commit

# Story tracking
node .claude/hooks/ralph-guard.js set-story US-001
node .claude/hooks/ralph-guard.js create-checkpoint tests_written PASS
node .claude/hooks/ralph-guard.js create-checkpoint build_complete PASS
node .claude/hooks/ralph-guard.js create-checkpoint playwright_validated PASS
node .claude/hooks/ralph-guard.js create-checkpoint browser_validated PASS
node .claude/hooks/ralph-guard.js clear-checkpoints
```

---

## Parallel Execution Rules

**MUST be parallel (single message, multiple Task calls):**
- Multiple tdd-test-scaffolders for independent stories
- Multiple tdd-implementers for independent stories
- Both validators (playwright-test-validator + form-component-validator) for each story

**MUST be sequential:**
- Stories with dependencies (check `depends_on` in prd.json)
- Phases (test-write → build → validate → commit)

---

## Iteration Loop

```
attempts = 0
while (not validated && attempts < 5):
    run playwright-test-validator
    run form-component-validator (parallel)
    if (all PASS):
        validated = true
    else:
        run tdd-implementer with failure details
        attempts++

if (attempts >= 5):
    escalate to human
```

---

## Testing Framework Categories

See `scripts/ralph/VALIDATION-FRAMEWORK.md` for detailed test templates.

| Category | What It Tests |
|----------|---------------|
| ui-component | Renders, displays text, styling |
| button-action | Click triggers action, feedback shown |
| api-integration | Calls API, handles response/errors |
| form-validation | Required fields, format validation |
| image-media | Loads, displays, fallbacks |
| navigation | Routes work, back button, 404 |
| state-persistence | Data saves and loads |

---

## Docker Commands

```bash
# Start dev server in container
docker compose up dev

# Run all Playwright tests
docker compose up test

# Run specific story tests
STORY_ID=US-001 docker compose up test-story

# Shell into container
docker compose run --rm dev bash
```

---

## DO NOT

- Start implementing without activating Ralph: `node .claude/hooks/ralph-guard.js start`
- Modify tests during build phase (hook will BLOCK with exit 2)
- Mark complete without running validators
- Skip reading AGENTS.md (will repeat mistakes)
- Process dependent stories in parallel
- Use old agent names (test-writer, builder, playwright-validator, browser-validator)
