# Intent Engineer Skill (v3.0)

**Triggers:** `/intent-engineer`, `discover requirements`, `intent discovery`, `analyze feature intent`

This skill performs deep intent discovery before PRD creation, ensuring comprehensive understanding of:
- User personas and their jobs-to-be-done
- System constraints and non-functional requirements
- Risk factors and mitigation strategies
- Success metrics and KPIs

---

## Purpose

Intent Engineering is Phase -2 of the v3.0 workflow. It runs BEFORE PRD creation to ensure we understand:

1. **WHO** needs this feature (personas)
2. **WHAT** problem it solves (problem statement)
3. **WHY** it matters (business value)
4. **CONSTRAINTS** limiting the solution
5. **RISKS** that could derail success
6. **METRICS** that define success

---

## Output

Creates `scripts/ralph/INTENT.md` with structured discovery.

---

## Workflow

### Step 1: Initial Context Gathering

Use AskUserQuestion to gather initial context:

```javascript
AskUserQuestion({
  questions: [
    {
      question: "What is the main problem this feature solves?",
      header: "Problem",
      options: [
        { label: "User efficiency", description: "Saves time or reduces effort" },
        { label: "New capability", description: "Enables something not possible before" },
        { label: "Bug/Issue fix", description: "Corrects existing behavior" },
        { label: "Integration", description: "Connects with external system" }
      ],
      multiSelect: false
    },
    {
      question: "Who is the primary user of this feature?",
      header: "User",
      options: [
        { label: "End user", description: "Customer-facing functionality" },
        { label: "Admin", description: "Administrative/back-office" },
        { label: "Developer", description: "API or integration" },
        { label: "System", description: "Automated/scheduled process" }
      ],
      multiSelect: false
    },
    {
      question: "What's the timeline expectation?",
      header: "Timeline",
      options: [
        { label: "MVP (1-3 stories)", description: "Minimal viable version" },
        { label: "Feature (4-10 stories)", description: "Complete feature set" },
        { label: "Epic (10+ stories)", description: "Large multi-phase work" }
      ],
      multiSelect: false
    }
  ]
})
```

### Step 2: Deep Dive Questions

Based on Step 1 answers, ask follow-up questions:

**For User Efficiency problems:**
- What's the current workflow?
- What's the biggest time sink?
- What would success look like quantitatively?

**For New Capability:**
- What alternatives exist today?
- What's blocked without this capability?
- How will success be measured?

**For Integration:**
- What external system?
- What data flows in/out?
- What authentication is needed?

### Step 3: Constraint Discovery

Probe for constraints:

```javascript
AskUserQuestion({
  questions: [
    {
      question: "Are there technical constraints to consider?",
      header: "Tech",
      options: [
        { label: "Existing stack only", description: "Must use current tech" },
        { label: "Performance critical", description: "Speed/latency matters" },
        { label: "Mobile-first", description: "Must work on mobile" },
        { label: "No constraints", description: "Flexible on approach" }
      ],
      multiSelect: true
    },
    {
      question: "Are there regulatory or compliance requirements?",
      header: "Compliance",
      options: [
        { label: "GDPR/Privacy", description: "Data protection rules" },
        { label: "Security", description: "Auth, encryption, audit" },
        { label: "Accessibility", description: "WCAG compliance" },
        { label: "None specific", description: "No special requirements" }
      ],
      multiSelect: true
    }
  ]
})
```

### Step 4: Risk Assessment

Identify potential risks:

- **Technical Risks:** Complex integration, performance concerns, scalability
- **Timeline Risks:** Dependencies, learning curves, external blockers
- **Business Risks:** User adoption, value realization, scope creep

### Step 5: Success Metrics

Define measurable success criteria:

- **Quantitative:** Response time < 200ms, 90% test coverage
- **Qualitative:** User satisfaction, developer experience
- **Business:** Adoption rate, reduced support tickets

---

## INTENT.md Template

```markdown
# Intent Engineering: [Feature Name]

**Date:** [ISO date]
**Status:** Complete

---

## Problem Statement

[2-3 sentence clear problem description]

**Problem Type:** [Efficiency / New Capability / Bug Fix / Integration]
**Impact:** [High / Medium / Low]

---

## User Personas

### Primary Persona: [Name]
- **Role:** [Job title / user type]
- **Goal:** [What they want to achieve]
- **Pain Points:** [Current frustrations]
- **Success Criteria:** [What would delight them]

### Secondary Persona (if any): [Name]
- **Role:** [Job title / user type]
- **Goal:** [What they want to achieve]

---

## Constraints

### Technical
- [ ] Must use existing tech stack
- [ ] Performance: [specific requirements]
- [ ] Mobile support: [required / optional]

### Compliance
- [ ] GDPR/Privacy: [requirements]
- [ ] Security: [requirements]
- [ ] Accessibility: [requirements]

### Business
- [ ] Budget: [if relevant]
- [ ] Timeline: [if relevant]
- [ ] Dependencies: [other features/teams]

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| [Risk 1] | [H/M/L] | [H/M/L] | [Strategy] |
| [Risk 2] | [H/M/L] | [H/M/L] | [Strategy] |

---

## Success Metrics

### Quantitative
- [ ] [Metric 1]: [Target value]
- [ ] [Metric 2]: [Target value]

### Qualitative
- [ ] [Metric 1]: [Description]
- [ ] [Metric 2]: [Description]

### Business
- [ ] [Metric 1]: [Target value]
- [ ] [Metric 2]: [Target value]

---

## Scope Boundaries

### In Scope
- [Feature 1]
- [Feature 2]

### Out of Scope (for this iteration)
- [Feature X] - [reason]
- [Feature Y] - [reason]

---

## Dependencies

- [ ] [Dependency 1]: [Status]
- [ ] [Dependency 2]: [Status]

---

## Decisions Made

| ID | Decision | Rationale | Date |
|----|----------|-----------|------|
| D-001 | [Decision] | [Why] | [Date] |

---

## Next Steps

After intent engineering, proceed to:
1. `/prd` - Create detailed PRD
2. `/user-story-generator` - Generate Gherkin user stories
3. `/ralph` - Convert to prd.json
```

---

## Integration with v3.0 Workflow

After running `/intent-engineer`:

1. Output is saved to `scripts/ralph/INTENT.md`
2. PRD skill reads INTENT.md for context
3. INTENT data is included in prd.json v3.0 schema

The intent section in prd.json:

```json
{
  "version": "3.0",
  "intent": {
    "problem_statement": "...",
    "user_personas": [
      { "name": "...", "role": "...", "goal": "..." }
    ],
    "constraints": {
      "technical": [...],
      "compliance": [...],
      "business": [...]
    },
    "risks": [
      { "description": "...", "probability": "H/M/L", "impact": "H/M/L", "mitigation": "..." }
    ],
    "success_metrics": {
      "quantitative": [...],
      "qualitative": [...],
      "business": [...]
    }
  }
}
```

---

## Error Handling

**If user provides minimal input:**
Ask follow-up questions to flesh out requirements.

**If constraints conflict:**
Present trade-offs and ask user to prioritize.

**If risks seem too high:**
Recommend scope reduction or phased approach.

---

## DO NOT

- Skip questions and assume answers
- Create PRD without completing intent discovery
- Ignore compliance requirements
- Underestimate risks
