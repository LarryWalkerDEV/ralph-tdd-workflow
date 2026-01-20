# PRD Skill

**Triggers:** `/prd`, `create prd`, `write prd for`, `plan feature`

This skill creates a Product Requirements Document by asking clarifying questions first.

---

## CRITICAL RULES

1. **DO NOT investigate codebase** - Trust user's description
2. **ASK QUESTIONS FIRST** - Use AskUserQuestion tool BEFORE writing PRD
3. **WAIT for answers** - Do not proceed without user input
4. **Output to tasks/ directory** - `tasks/prd-{feature-name}.md`

---

## FORBIDDEN ACTIONS

**When /prd is invoked, you MUST NOT:**
- Use Read tool to explore code
- Use Grep tool to search code
- Use Glob tool to find files
- Use Bash to run commands
- Use Chrome MCP to investigate

**Your FIRST tool call MUST be AskUserQuestion**

---

## Workflow

### Step 1: Ask Clarifying Questions

Use AskUserQuestion to gather requirements:

```javascript
AskUserQuestion({
  questions: [
    {
      question: "What is the primary goal of this feature?",
      header: "Goal",
      options: [
        { label: "Create new data", description: "Add forms, inputs, creation flows" },
        { label: "Display data", description: "Lists, tables, detail views" },
        { label: "Modify data", description: "Edit, update, delete operations" },
        { label: "Integration", description: "Connect to external services" }
      ],
      multiSelect: false
    },
    {
      question: "Who will use this feature?",
      header: "Users",
      options: [
        { label: "All users", description: "Available to everyone" },
        { label: "Authenticated users", description: "Requires login" },
        { label: "Admin only", description: "Restricted to administrators" },
        { label: "Specific roles", description: "Role-based access" }
      ],
      multiSelect: false
    },
    {
      question: "What are the key interactions?",
      header: "Interactions",
      options: [
        { label: "Form submission", description: "User fills form, submits data" },
        { label: "List/grid view", description: "Browse, filter, sort items" },
        { label: "File upload", description: "Upload images, documents" },
        { label: "Real-time updates", description: "Live data, notifications" }
      ],
      multiSelect: true
    }
  ]
})
```

### Step 2: Wait for Answers

**DO NOT proceed until user responds to questions.**

### Step 3: Generate PRD

Based on answers, create structured PRD:

```markdown
# PRD: {Feature Name}

## Overview
[2-3 sentence description based on user input]

## Goals
- [Goal 1 from answers]
- [Goal 2 from answers]
- [Goal 3 from answers]

## User Stories

### US-001: [First user story]
**As a** [user type],
**I want** [action],
**So that** [benefit].

**Acceptance Criteria:**
1. [Specific, testable criterion]
2. [Specific, testable criterion]
3. Typecheck passes
4. Data persists after page refresh

### US-002: [Second user story]
...

## Functional Requirements

### FR-1: [Requirement name]
[Detailed requirement description]

### FR-2: [Requirement name]
...

## Non-Goals
- [What this feature will NOT do]
- [Explicit scope boundaries]

## Technical Considerations
- [API endpoints needed]
- [Database changes]
- [UI components required]

## Test Categories
[Based on VALIDATION-FRAMEWORK.md]
- [ ] UI Component Tests
- [ ] Button/Action Tests
- [ ] API Integration Tests
- [ ] Form Validation Tests
- [ ] State Persistence Tests

## Success Metrics
- [How to measure success]
- [Key performance indicators]

## Open Questions
- [Unresolved items for user to clarify]
```

### Step 4: Save PRD

```bash
mkdir -p tasks
# Save to tasks/prd-{feature-name}.md
```

---

## Story Sizing Rules

**Good stories (one context window):**
- Add single database field + migration
- Add UI component to existing page
- Add filter/sort to existing list
- Create single API endpoint
- Add form validation rule

**Bad stories (split these):**
- "Build entire dashboard" → Split into: schema, queries, components, filters
- "Add authentication" → Split into: schema, middleware, UI, sessions
- "Create reporting system" → Split into: data model, API, UI, export

**Rule:** If you can't describe in 2-3 sentences, split it.

---

## Acceptance Criteria Rules

**MUST be verifiable without human:**

Good:
- "User enters '1500' in price field, clicks Save, value shows after page refresh"
- "Dropdown selection persists to database, loads correctly on reload"
- "Clicking delete removes item from list AND database"
- "Typecheck passes"

Bad:
- "Price field is visible" (only checks UI exists)
- "Button exists" (doesn't verify functionality)
- "Form validates" (too vague)

**REQUIRED for all UI stories:**
1. Input → Action → Database → Reload → Verify
2. "Typecheck passes"
3. "Data persists after page refresh"

---

## Output

After creating PRD, output:

```
PRD created: tasks/prd-{feature-name}.md

Stories created:
- US-001: [title]
- US-002: [title]
- US-003: [title]

Next: Run /ralph to convert to prd.json and generate tests.
```
