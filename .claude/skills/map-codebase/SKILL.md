# Map Codebase Skill

**Triggers:** `/map-codebase`, `analyze codebase`, auto-triggered by task-orchestrator

This skill creates comprehensive codebase documentation using 7 parallel Explore agents.

---

## Caching

**Check if mapping exists and is fresh:**

```bash
if [ -f ".planning/codebase/STACK.md" ]; then
  # Check if file is less than 30 days old
  find .planning/codebase/STACK.md -mtime -30 -print | grep -q . && echo "FRESH" || echo "STALE"
else
  echo "MISSING"
fi
```

**If FRESH:** Skip mapping, use existing docs
**If STALE or MISSING:** Run full mapping

---

## Parallel Agent Launch

Launch 7 Explore agents IN PARALLEL (single message):

```javascript
// All 7 in ONE message = parallel execution
Task({
  subagent_type: "Explore",
  description: "Analyze tech stack",
  prompt: `Analyze the tech stack of this codebase.

  Output to: .planning/codebase/STACK.md

  Include:
  - Framework (Next.js, React, etc.)
  - Language (TypeScript, JavaScript)
  - Database (Supabase, PostgreSQL, etc.)
  - Styling (Tailwind, CSS Modules, etc.)
  - Key dependencies from package.json
  - Build tools and scripts`
})

Task({
  subagent_type: "Explore",
  description: "Analyze architecture",
  prompt: `Analyze the architecture patterns.

  Output to: .planning/codebase/ARCHITECTURE.md

  Include:
  - Project structure pattern (App Router, Pages Router)
  - Data flow patterns
  - State management approach
  - API patterns (Server Actions, API Routes)
  - Multi-tenancy patterns if present`
})

Task({
  subagent_type: "Explore",
  description: "Analyze file structure",
  prompt: `Analyze the file/folder structure.

  Output to: .planning/codebase/STRUCTURE.md

  Include:
  - Root directory organization
  - Source code locations
  - Component organization
  - Utility/helper locations
  - Configuration files`
})

Task({
  subagent_type: "Explore",
  description: "Analyze conventions",
  prompt: `Analyze coding conventions.

  Output to: .planning/codebase/CONVENTIONS.md

  Include:
  - Naming conventions
  - File naming patterns
  - Component patterns
  - Import/export patterns
  - UI text language (German, English, etc.)`
})

Task({
  subagent_type: "Explore",
  description: "Analyze testing setup",
  prompt: `Analyze the testing setup.

  Output to: .planning/codebase/TESTING.md

  Include:
  - Test framework (Playwright, Jest, Vitest)
  - Test file locations
  - Test patterns and helpers
  - Test user data
  - E2E vs unit test separation`
})

Task({
  subagent_type: "Explore",
  description: "Analyze integrations",
  prompt: `Analyze external integrations.

  Output to: .planning/codebase/INTEGRATIONS.md

  Include:
  - External APIs
  - Authentication providers
  - Storage services
  - Payment providers
  - Any AI/ML integrations`
})

Task({
  subagent_type: "Explore",
  description: "Analyze concerns",
  prompt: `Identify technical concerns.

  Output to: .planning/codebase/CONCERNS.md

  Include:
  - Technical debt
  - Known issues
  - Deprecated patterns
  - Performance concerns
  - Security considerations`
})
```

---

## Output Files

After completion, `.planning/codebase/` should contain:

| File | Purpose |
|------|---------|
| `STACK.md` | Tech stack and dependencies |
| `ARCHITECTURE.md` | Patterns and data flow |
| `STRUCTURE.md` | File/folder organization |
| `CONVENTIONS.md` | Coding standards |
| `TESTING.md` | Test setup and patterns |
| `INTEGRATIONS.md` | External services |
| `CONCERNS.md` | Tech debt and issues |

---

## Checkpoint

After all agents complete:

```bash
mkdir -p .claude/planning_checkpoints
echo "Mapped: $(date -Iseconds)" > .claude/planning_checkpoints/codebase_mapped
```

---

## Usage in PRD Skill

The PRD skill references these docs instead of investigating code:

```markdown
Based on .planning/codebase/ARCHITECTURE.md, this project uses...
Based on .planning/codebase/CONVENTIONS.md, German UI text is required...
```

This allows PRD creation WITHOUT reading source code.
