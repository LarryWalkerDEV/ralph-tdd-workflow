# Ralph TDD Workflow v4.0 - Upgrade Reference

## Overview

v4.0 introduces **External AI Review with Vision** and **Evidence-Based Validation** to prevent Claude from "marking its own homework."

### Key Changes from v3.0

| Feature | v3.0 | v4.0 |
|---------|------|------|
| Test Writing | Claude writes tests | **Gemini 3 Flash writes tests** (via OpenRouter) |
| Validation | Claude runs validators | Claude collects evidence, **Gemini 3 reviews with VISION** |
| Evidence | None | **Screenshots + test output + code snippets** |
| Visual Verification | None | **Gemini 3 SEES screenshots** - catches fakes |
| Token Efficiency | All Claude | Heavy work = Claude, Reviews = cheap Gemini |

### Why Gemini 3?

After testing GLM-4.7-flash, Gemini 2.5 Flash, and Gemini 3 Flash Preview:

| Model | Quality | Cost | Vision | Winner |
|-------|---------|------|--------|--------|
| GLM-4.7-flash | 7/10 | $0.01/1M | ❌ No | Budget option |
| Gemini 2.5 Flash | 8/10 | $0.30/1M | ✅ Yes | - |
| **Gemini 3 Flash** | **8.5/10** | ~$0.30/1M | ✅ **Yes** | **🏆 Best** |

Gemini 3 produces the cleanest tests (106 lines vs 170) AND has vision to verify screenshots.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      RALPH v4.0                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Gemini 3 Flash Preview (via OpenRouter):                   │
│  ├── Writes independent tests (no mocking!)                 │
│  ├── Reviews evidence with VISION (sees screenshots)        │
│  └── Approves/rejects with detailed feedback                │
│                                                             │
│  Claude Code (has the tools):                               │
│  ├── Playwright (run tests)                                 │
│  ├── Chrome automation (take screenshots)                   │
│  ├── Database access (query results)                        │
│  ├── Implementation (code writing)                          │
│  └── Evidence collection                                    │
│                                                             │
│  The Flow:                                                  │
│  1. Gemini 3 writes tests (no mocks, no fake data)          │
│  2. Claude implements code to make tests pass               │
│  3. Claude collects evidence (screenshots, logs, code)      │
│  4. Gemini 3 reviews with VISION → PASS / FAIL + feedback   │
│  5. If FAIL → Claude fixes → back to step 3                 │
│  6. If PASS → mark-story-pass → next story                  │
│                                                             │
│  ⚠️ Claude CANNOT cheat - Gemini SEES the screenshots!      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Why This Architecture?

### Problem: Claude Marking Its Own Homework

```
OLD FLOW (v3.0):
  Claude writes tests → Claude implements → Claude validates

  Risk: Claude may unconsciously write tests that match its
        implementation patterns, missing edge cases.
```

### Solution: Separation of Concerns

```
NEW FLOW (v4.0):
  GLM writes tests (no knowledge of Claude's implementation)
       ↓
  Claude implements (must satisfy GLM's tests)
       ↓
  Claude collects EVIDENCE (can't fake screenshots)
       ↓
  GLM reviews evidence (independent judgment)
```

**Key Insight:** Claude can't fake:
- Real Playwright test output
- Real browser screenshots
- Real database query results
- Real network request logs

---

## Iterative Self-Refinement

### Why First Attempt is Suboptimal

Claude's first pass:
- Makes it "work"
- Takes shortcuts
- Minimal error handling
- Happy path only

After refinement:
- Better code structure
- Proper error handling
- Edge cases covered
- Production-ready

### Mandatory Refinement Passes

```
PHASE 1: Make it work
└── Implement until tests pass
└── Checkpoint: tests_passing

PHASE 2: Make it better (ENFORCED)
└── Prompt: "Review and improve your implementation"
└── Re-run tests (must still pass)

PHASE 3: Make it robust (ENFORCED)
└── Prompt: "Add error handling and edge cases"
└── Re-run tests (must still pass)

PHASE 4: Collect evidence + GLM review
└── Only NOW do we validate externally
```

### Token Efficiency

```
Without refinement:
- Claude implements (rough)
- GLM rejects (quality issues)
- Claude fixes
- GLM rejects (error handling)
- Claude fixes
- GLM approves
= 3 GLM API calls

With refinement:
- Claude implements
- Claude improves (self-prompted)
- Claude hardens (self-prompted)
- GLM approves (first try)
= 1 GLM API call
```

---

## OpenRouter Integration

### Model Selection

Using **GLM-4.7-flash** via OpenRouter:
- Very fast
- Very cheap ($0.01/1M input, $0.01/1M output)
- Good at code review and test writing
- Available at: `https://openrouter.ai/z-ai/glm-4.7-flash`

### API Configuration

```javascript
// .env.local
OPENROUTER_API_KEY=sk-or-v1-xxx

// OpenRouter API endpoint
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Request format
const request = {
  model: 'z-ai/glm-4.7-flash',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]
};
```

---

## Evidence Package

### Structure

```javascript
const evidencePackage = {
  story_id: "US-005",
  title: "Generate image via kie.ai",
  acceptance_criteria: [
    "Image generation API is called",
    "Image is saved to storage",
    "Database record is updated"
  ],

  // Screenshot proof (base64 encoded)
  screenshots: [
    { name: "ui_after_generation.png", base64: "..." },
    { name: "database_record.png", base64: "..." }
  ],

  // Test output (raw terminal)
  playwright_output: `
    Running 5 tests...
    ✓ should call kie.ai API (2.3s)
    ✓ should save image to storage (1.1s)
    ✓ should update database record (0.8s)
    ✓ should display image in UI (1.5s)
    ✓ should handle API errors (0.9s)
    5 passed (6.6s)
  `,

  // Database proof
  db_query: {
    query: "SELECT * FROM images WHERE project_id = 'test-123'",
    result: [
      { id: 1, status: "completed", storage_url: "https://..." }
    ]
  },

  // Network proof
  network_log: [
    { method: "POST", url: "https://api.kie.ai/generate", status: 200 },
    { method: "POST", url: "/api/callback", status: 200 }
  ],

  // Key code snippets
  code_snippets: [
    { file: "app/api/generate/route.ts", lines: "15-45", content: "..." }
  ]
};
```

### Collection Commands

```bash
# Collect evidence for a story
node .claude/hooks/validators/evidence-collector.js collect US-005

# This creates:
# scripts/ralph/evidence/US-005.json
```

---

## GLM Review Process

### Review Request

```javascript
async function glmReview(evidencePackage) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'z-ai/glm-4.7-flash',
      messages: [{
        role: 'user',
        content: `You are a QA reviewer. A developer claims their feature is complete.
Review their EVIDENCE and decide if it's truly working.

STORY: ${evidencePackage.title}

ACCEPTANCE CRITERIA:
${evidencePackage.acceptance_criteria.join('\n')}

EVIDENCE PROVIDED:

1. SCREENSHOTS: [Attached as images]

2. TEST OUTPUT:
\`\`\`
${evidencePackage.playwright_output}
\`\`\`

3. DATABASE QUERY:
Query: ${evidencePackage.db_query.query}
Result: ${JSON.stringify(evidencePackage.db_query.result, null, 2)}

4. NETWORK LOG:
${evidencePackage.network_log.map(n => `${n.method} ${n.url} → ${n.status}`).join('\n')}

5. CODE SNIPPETS:
${evidencePackage.code_snippets.map(c => `// ${c.file}\n${c.content}`).join('\n\n')}

YOUR REVIEW:
- Do screenshots show the feature working?
- Do tests cover all acceptance criteria?
- Is there REAL data in database (not mock/test data)?
- Were REAL API calls made (check network log)?
- Does code look like real implementation (not stubs)?

OUTPUT JSON:
{
  "approved": boolean,
  "confidence": 0-100,
  "checklist": {
    "ui_works": boolean,
    "tests_pass": boolean,
    "real_data": boolean,
    "real_api_calls": boolean,
    "code_quality": boolean
  },
  "concerns": ["any issues found"],
  "feedback": "what to fix if rejected"
}`
      }]
    })
  });

  return JSON.parse(response.choices[0].message.content);
}
```

### Review Commands

```bash
# Request GLM review for a story
node .claude/hooks/validators/openrouter-reviewer.js review US-005

# Output:
# {
#   "approved": true,
#   "confidence": 95,
#   "checklist": { ... },
#   "concerns": [],
#   "feedback": ""
# }
```

---

## v4.0 Workflow (Full)

```
FOR EACH story:

  1. READ AGENTS.md + LEARNINGS.md (MANDATORY)

  2. set-story → creates git checkpoint

  3. GLM WRITES TESTS (test-write phase)
     └── node .claude/hooks/validators/openrouter-reviewer.js write-tests US-XXX
     └── GLM generates Playwright tests based on acceptance criteria
     └── Tests saved to e2e/{story-id}.spec.ts
     └── Checkpoint: tests_written

  4. IMPLEMENT - Pass 1: "Make it work"
     └── tdd-implementer makes tests pass
     └── Re-run tests to verify

  5. IMPLEMENT - Pass 2: "Make it better" (ENFORCED)
     └── Self-prompt: "Review and improve your implementation"
     └── Re-run tests (must still pass)
     └── Checkpoint: refinement_1

  6. IMPLEMENT - Pass 3: "Make it robust" (ENFORCED)
     └── Self-prompt: "Add error handling and edge cases"
     └── Re-run tests (must still pass)
     └── Checkpoint: refinement_2

  7. COLLECT EVIDENCE
     └── node .claude/hooks/validators/evidence-collector.js collect US-XXX
     └── Screenshots via Chrome automation
     └── Playwright test output
     └── Database queries
     └── Network logs
     └── Code snippets

  8. GLM REVIEW
     └── node .claude/hooks/validators/openrouter-reviewer.js review US-XXX
     └── If APPROVED → continue
     └── If REJECTED → record-iteration → back to step 4

  9. CLEANUP (lint, typecheck, prettier)
     └── node ralph-guard.js cleanup US-XXX
     └── Checkpoint: cleanup_complete

  10. mark-story-pass (requires all checkpoints)

  11. NEXT story
```

---

## v4.0 Checkpoints (8 required)

| Checkpoint | Phase | Created By |
|------------|-------|------------|
| `tests_written` | test-write | GLM (via OpenRouter) |
| `build_complete` | build | tdd-implementer |
| `refinement_1` | build | Self-refinement pass 1 |
| `refinement_2` | build | Self-refinement pass 2 |
| `evidence_collected` | validate | evidence-collector |
| `glm_approved` | validate | GLM (via OpenRouter) |
| `whitebox_validated` | validate | whitebox-validator |
| `cleanup_complete` | cleanup | cleanup command |

---

## New Commands

```bash
# GLM test writing
node .claude/hooks/validators/openrouter-reviewer.js write-tests US-XXX

# Evidence collection
node .claude/hooks/validators/evidence-collector.js collect US-XXX

# GLM review
node .claude/hooks/validators/openrouter-reviewer.js review US-XXX

# Check refinement status
node .claude/hooks/ralph-guard.js check-refinement US-XXX

# Force refinement pass
node .claude/hooks/ralph-guard.js require-refinement US-XXX
```

---

## New Files

| File | Purpose |
|------|---------|
| `.claude/hooks/validators/openrouter-reviewer.js` | GLM API integration for tests & reviews |
| `.claude/hooks/validators/evidence-collector.js` | Collects screenshots, logs, code |
| `.claude/hooks/validators/refinement-enforcer.js` | Ensures 3 refinement passes |
| `scripts/ralph/evidence/` | Evidence packages (JSON + images) |
| `scripts/ralph/reviews/` | GLM review results |

---

## Migration from v3.0

1. Add OpenRouter API key to `.env.local`:
   ```
   OPENROUTER_API_KEY=sk-or-v1-xxx
   ```

2. Copy new validators:
   ```bash
   cp .claude/hooks/validators/openrouter-reviewer.js /target/
   cp .claude/hooks/validators/evidence-collector.js /target/
   cp .claude/hooks/validators/refinement-enforcer.js /target/
   ```

3. Update CLAUDE.md with v4 workflow

4. Create evidence directories:
   ```bash
   mkdir -p scripts/ralph/evidence
   mkdir -p scripts/ralph/reviews
   ```

---

## Cost Analysis

### GLM-4.7-flash Pricing (via OpenRouter)

- Input: $0.01 per 1M tokens
- Output: $0.01 per 1M tokens

### Per-Story Costs

| Operation | Input Tokens | Output Tokens | Cost |
|-----------|--------------|---------------|------|
| Write tests | ~2,000 | ~1,500 | ~$0.00004 |
| Review evidence | ~5,000 | ~500 | ~$0.00006 |
| **Total per story** | - | - | **~$0.0001** |

### Project Estimate (34 stories)

- Test writing: $0.00136
- Reviews (assuming 1.5 reviews avg): $0.00306
- **Total project cost: ~$0.01**

Essentially free compared to Claude API costs.

---

## Anti-Cheat Measures

### What Claude Can Fake
- Test results (just print "PASS")
- JSON validation files
- Checkpoint files

### What Claude CANNOT Fake
- Real browser screenshots
- Real Playwright terminal output (timestamps, durations)
- Real database query results
- Real network request logs
- GLM's independent judgment

### GLM Review Checks

1. **Screenshot Verification**
   - Does UI match acceptance criteria?
   - Are there real elements (not placeholders)?

2. **Test Output Verification**
   - Are test names meaningful?
   - Do durations look realistic?
   - Are there actual assertions (not always true)?

3. **Database Verification**
   - Is data realistic (not "test-123")?
   - Are timestamps recent?
   - Do IDs increment properly?

4. **Network Verification**
   - Were real external APIs called?
   - Are status codes appropriate?
   - Do request payloads make sense?

5. **Code Quality Verification**
   - No mock flags in production code
   - No TODO markers
   - Proper error handling

---

## Troubleshooting

### GLM API Errors

```bash
# Check API key
echo $OPENROUTER_API_KEY

# Test API connection
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $OPENROUTER_API_KEY"

# Check rate limits
node .claude/hooks/validators/openrouter-reviewer.js status
```

### Evidence Collection Issues

```bash
# Debug screenshot capture
node .claude/hooks/validators/evidence-collector.js debug-screenshots US-XXX

# Force re-collection
node .claude/hooks/validators/evidence-collector.js collect US-XXX --force
```

### Refinement Not Triggering

```bash
# Check refinement status
node .claude/hooks/ralph-guard.js check-refinement US-XXX

# Force refinement prompts
node .claude/hooks/ralph-guard.js require-refinement US-XXX
```

---

## Summary

v4.0 = v3.0 + External AI Review + Iterative Self-Refinement

- **Tests written by GLM** (not Claude)
- **Evidence reviewed by GLM** (not Claude)
- **3 refinement passes required** (not optional)
- **Token efficient** (heavy work = Claude, reviews = cheap GLM)
- **Unfakeable evidence** (screenshots, logs, network)

This prevents Claude from "marking its own homework" while keeping costs minimal.
