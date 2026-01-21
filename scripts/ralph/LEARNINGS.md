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

### Paid API Safety Patterns (Added 2026-01-21 - US-028 $50 Disaster)

## BLOCK-PATTERN: BP-008
**Signature**: `reuseExistingServer:\s*true`
**Solution**: Set `reuseExistingServer: false` to ensure TEST_MODE env vars are applied to new server
**Context**: When true, Playwright reuses the existing dev server which does NOT have TEST_MODE set. During US-028 testing, this caused 5000+ real kie.ai API calls ($50 burned). The fix is to force Playwright to start a fresh server with TEST_MODE=true.

## BLOCK-PATTERN: BP-009
**Signature**: `for\s*\([^)]+\)\s*\{[^}]*api\.kie\.ai|\.forEach[^}]*api\.kie\.ai|while[^{]*\{[^}]*api\.kie\.ai`
**Solution**: Add MAX_ITEMS_DEV=5 limit and TEST_MODE check before any loop calling kie.ai
**Context**: Loops calling paid APIs without limits caused thousands of image generations. ALWAYS: (1) Test ONE call manually, (2) Wait for callback, (3) Verify result, (4) THEN enable loops with hard limits.

## BLOCK-PATTERN: BP-010
**Signature**: `for.*segment.*createImageTask|\.map.*createImageTask`
**Solution**: Add `if (segments.length > MAX_IMAGES_DEV && !PRODUCTION) throw new Error()`
**Context**: The generate-images route loops through script segments calling createImageTask for each. Without a limit, a 500-word script creates 38 API calls. In US-028, test scripts with 1800s audio created 360 images per test.

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
| BP-008 | 2026-01-21 | US-028 | reuseExistingServer: true caused $50 in API calls |
| BP-009 | 2026-01-21 | US-028 | Loops calling paid APIs without limits |
| BP-010 | 2026-01-21 | US-028 | createImageTask loops without MAX_ITEMS check |

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

---

## Subagent Implementation Guide

This section documents how to correctly create and configure Claude Code subagents.

### Critical Format Requirement

**The `description` field MUST be a single line with `\n` escape sequences for newlines.**

#### WRONG - Multiline YAML (Agent will NOT register):
```yaml
---
name: my-agent
description: "Use this agent when...

Examples:

<example>
Context: Some context.
user: \"Do something\"
</example>"
model: sonnet
---
```

#### CORRECT - Single line with \n escapes (Agent WILL register):
```yaml
---
name: my-agent
description: "Use this agent when...\n\nExamples:\n\n<example>\nContext: Some context.\nuser: \"Do something\"\n</example>"
model: sonnet
---
```

### Why This Matters

- Claude Code parses agent YAML at session startup
- Multiline description fields are not properly parsed
- Agents with multiline descriptions will NOT appear in Task tool's available agents
- The fix requires converting all newlines to `\n` escape sequences

### Full Agent Template

```yaml
---
name: agent-name-lowercase-with-hyphens
description: "First sentence describes when to use this agent. More detail here.\n\nExamples:\n\n<example>\nContext: When this scenario occurs.\nuser: \"User says this\"\nassistant: \"I'll use the agent-name agent to do X.\"\n<Task tool call to agent-name>\n</example>\n\n<example>\nContext: Another scenario.\nuser: \"Another request\"\nassistant: \"Let me launch agent-name to handle this.\"\n<Task tool call to agent-name>\n</example>"
model: sonnet
color: blue
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
disallowed_tools:
  - SomeToolToBlock
hooks:
  post_tool_use:
    - tools: [Edit, Write]
      command: "node .claude/hooks/validators/some-validator.js"
  stop:
    - command: "node .claude/hooks/validators/completion-check.js"
---

System prompt content goes here after the closing ---.

This is what the agent sees as its instructions.
```

### Available Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique ID (lowercase, hyphens only) |
| `description` | Yes | **SINGLE LINE with \n** - when to use this agent |
| `model` | No | `sonnet`, `opus`, `haiku`, or omit to inherit |
| `color` | No | Terminal output color |
| `tools` | No | Allowed tools (inherits all if omitted) |
| `disallowed_tools` | No | Tools to block |
| `hooks` | No | Lifecycle hooks (pre/post tool use, stop) |

### Subagent Behavior Rules

1. **Isolated context** - Each invocation starts fresh, no conversation history
2. **Primary agent prompts subagent** - You don't prompt subagents directly
3. **Description triggers delegation** - Claude uses description to decide when to call
4. **No nesting** - Subagents cannot spawn other subagents
5. **No skill inheritance** - Must explicitly list skills in config

### Testing New Agents

After creating an agent file in `.claude/agents/`:

1. **Restart Claude Code** - Agents are loaded at session startup
2. **Verify registration**: Try invoking with Task tool
3. **If not registered**: Check description is single-line with `\n`

### Debugging Checklist

If agent doesn't appear in Task tool's available list:

- [ ] Is description on ONE LINE with `\n` for newlines?
- [ ] Are all quotes inside description escaped with `\"`?
- [ ] Is the file in `.claude/agents/` directory?
- [ ] Does the file have `.md` extension?
- [ ] Is YAML frontmatter between `---` markers?
- [ ] Did you restart Claude Code after creating the file?

### Converting Multiline to Single-Line

Use this pattern to convert:

```
Original:
description: "Line one.

Line two.

Line three."

Fixed:
description: "Line one.\n\nLine two.\n\nLine three."
```

### History

| Date | Issue | Resolution |
|------|-------|------------|
| 2026-01-21 | whitebox-validator and conflict-resolver not registering | Converted multiline descriptions to single-line with \n escapes |
| 2026-01-21 | US-028 burned $50 on 5000+ kie.ai images | Added BP-008, BP-009, BP-010 patterns; Added API Safety Guide below |

---

## API Key Safety Guide (Learned from US-028 Disaster)

### The Incident: $50 Burned in US-028 Testing

On 2026-01-21, approximately 5000 images were generated through kie.ai without proper TEST_MODE protection, resulting in ~$50 in unexpected API charges.

### Root Cause Chain

```
1. .env.local MISSING TEST_MODE=true
2. playwright.config.ts had reuseExistingServer: true
3. Dev server (npm run dev) started WITHOUT TEST_MODE
4. Playwright tests ran against existing server
5. TEST_MODE env vars from playwright.config NEVER applied
6. Every /api/start-image-generation call = REAL API calls
7. 234 tests × varying image counts = 5000+ images
```

### Understanding Async APIs (kie.ai, ElevenLabs)

```
┌─────────────────────────────────────────────────────────────┐
│  ASYNC API PATTERN - MONEY IS CHARGED ON STEP 1!           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STEP 1: POST createTask                                    │
│  → Returns taskId immediately                               │
│  → MONEY IS CHARGED NOW (cannot cancel!)                    │
│  → ~$0.01 per image for kie.ai                              │
│                                                             │
│  STEP 2: Wait for callback OR poll recordInfo               │
│  → kie.ai processes the request                             │
│  → POSTs result to your callBackUrl when done               │
│                                                             │
│  STEP 3: Get result                                         │
│  → state: "success" → resultUrls contains image URLs        │
│  → state: "fail" → failCode/failMsg explain why             │
│                                                             │
│  ⚠️ THE CALLBACK DOES NOT GIVE YOU YOUR MONEY BACK        │
│  ⚠️ IT JUST TELLS YOU WHEN PROCESSING IS COMPLETE          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### The 5 Safety Rules

#### Rule 1: TEST_MODE Must Be Default ON

```bash
# .env.local - ALWAYS include this
TEST_MODE=true
```

Only set `TEST_MODE=false` when you INTENTIONALLY want real API calls.

#### Rule 2: Verify Single Call Before Loops

```
CORRECT ORDER:
1. Make ONE API call (curl, Postman, or test script)
2. Wait for callback to arrive
3. Verify the result is correct
4. ONLY THEN enable loop/batch processing

WRONG ORDER:
1. Write loop that calls API 50 times
2. Run tests
3. Wonder why you have $50 charge
```

#### Rule 3: Hard Limits in Code

```typescript
// REQUIRED pattern in any API-calling code:
const MAX_IMAGES_DEV = 5;

if (!process.env.PRODUCTION && segments.length > MAX_IMAGES_DEV) {
  console.warn(`DEV LIMIT: Capping at ${MAX_IMAGES_DEV} images`);
  segments = segments.slice(0, MAX_IMAGES_DEV);
}
```

#### Rule 4: Force Fresh Server for Tests

```typescript
// playwright.config.ts - CRITICAL FIX
webServer: {
  reuseExistingServer: false,  // ← MUST be false
  env: {
    TEST_MODE: 'true',
  },
},
```

#### Rule 5: Add Startup Warning

```typescript
// At top of any API route using paid services:
if (process.env.TEST_MODE !== 'true') {
  console.error('⚠️ WARNING: TEST_MODE is OFF - REAL API CALLS WILL BE MADE');
  console.error('⚠️ Set TEST_MODE=true in .env.local to prevent charges');
}
```

### Pre-Flight Checklist

Before running ANY test that might call paid APIs:

```
□ Is TEST_MODE=true in .env.local?
□ Is reuseExistingServer: false in playwright.config.ts?
□ Did I test ONE call manually first?
□ Did I wait for and verify the callback?
□ Are there hard limits (MAX_IMAGES_DEV) in the code?
□ Is there a spending alert on the API account?
```

### Emergency Response

If you suspect runaway API calls:

1. **IMMEDIATELY** revoke API key at provider dashboard
2. Check spending in API dashboard
3. Kill all Node processes: `pkill -f node` or Task Manager
4. Verify TEST_MODE in .env.local
5. Check recent code changes for loops calling APIs
