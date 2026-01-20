# Task Orchestrator Skill

**Triggers:** `/task-orchestrator`, `start workflow`, `new task`, `implement feature`

This skill orchestrates the complete TDD workflow from requirements to implementation.

---

## CRITICAL RULES

1. **DO NOT investigate codebase** - Use existing .planning/codebase/ docs
2. **DO NOT write code** - Only plan and prepare
3. **ASK QUESTIONS FIRST** - Use AskUserQuestion before creating PRD
4. **END with fresh-window command** - User pastes in new window to start Ralph loop

---

## Workflow Phases

### Phase -1: Codebase Mapping (if needed)

Check if codebase mapping exists and is fresh:

```bash
# Check if mapping exists and is <30 days old
if [ -f ".planning/codebase/STACK.md" ]; then
  find .planning/codebase/STACK.md -mtime -30 | grep -q . && echo "FRESH" || echo "STALE"
else
  echo "MISSING"
fi
```

**If MISSING or STALE:** Run `/map-codebase` skill first (7 parallel Explore agents)

**CHECKPOINT:** Create `.claude/planning_checkpoints/codebase_mapped`

---

### Phase 0: Create Planning Mode Flag

```bash
# Block code edits during planning
mkdir -p .claude
echo "Planning started: $(date -Iseconds)" > .claude/planning_mode
```

This activates hooks that BLOCK Edit/Write to source files.

---

### Phase 1: Invoke PRD Skill

Call the `/prd` skill to gather requirements:

```
/prd [feature description from user]
```

The PRD skill will:
1. Ask 3-5 clarifying questions (AskUserQuestion)
2. Wait for answers
3. Generate structured PRD → `tasks/prd-{feature-name}.md`

**DO NOT proceed until PRD is complete.**

---

### Phase 2: Invoke Ralph Skill

Call the `/ralph` skill to convert PRD:

```
/ralph convert tasks/prd-{feature-name}.md
```

The Ralph skill will:
1. Read PRD markdown
2. Convert to prd.json (v2.1 format)
3. **Generate E2E test templates** (TDD: tests FIRST)
4. Initialize STATE.md
5. Remove planning_mode flag

---

### Phase 3: Output Fresh-Window Command

After Ralph skill completes, output:

```
---

## Ralph Loop Ready

The PRD has been converted and tests generated.

**To start the Ralph loop:**

1. Open a NEW Claude Code window (fresh context)
2. Paste this command:

```bash
echo "Ralph loop active" > .claude/workflow_active && cat scripts/ralph/AGENTS.md && echo "---STATE---" && cat scripts/ralph/STATE.md && echo "---PROMPT---" && cat scripts/ralph/prompt.md && echo "---PRD---" && cat scripts/ralph/prd.json
```

3. Follow the instructions that appear

---

**STOP HERE. Do NOT implement in this window.**
```

---

### Phase 4: STOP

**DO NOT:**
- Write any implementation code
- Run tests
- Make any file changes beyond planning artifacts

The implementation happens in a FRESH context window where:
- Hooks are active (workflow_active flag)
- Full 200k context available
- No planning context pollution

---

## Output Format

At the end of this skill, you should have created:

| File | Purpose |
|------|---------|
| `.claude/planning_checkpoints/codebase_mapped` | Confirms mapping done |
| `tasks/prd-{feature}.md` | PRD document |
| `scripts/ralph/prd.json` | Structured stories (v2.1) |
| `scripts/ralph/STATE.md` | Resume point tracker |
| `e2e/{task_id}-{feature}.spec.ts` | E2E test templates |

And output the fresh-window command for user to paste.

---

## Error Handling

**If user hasn't described feature:**
```
I need to know what feature you want to build. Please describe:
1. What should the feature do?
2. Who is it for?
3. Any specific requirements?
```

**If codebase mapping fails:**
```
Codebase mapping failed. Please check:
1. Is this a valid project directory?
2. Are there source files to analyze?
```

**If PRD skill fails:**
```
PRD creation failed. Please provide more details about the feature.
```
