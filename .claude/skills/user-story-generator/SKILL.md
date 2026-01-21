# User Story Generator Skill (v3.0)

**Triggers:** `/user-story-generator`, `generate user stories`, `convert to gherkin`, `create bdd scenarios`

This skill converts PRD acceptance criteria into proper Gherkin-format user stories with Given/When/Then scenarios.

---

## Purpose

Gherkin user stories provide:
1. **Clear behavior specification** in plain English
2. **Test automation foundation** (can map directly to Playwright tests)
3. **Stakeholder communication** (non-technical readable)
4. **Living documentation** that evolves with the code

---

## Input

Reads from:
- `tasks/prd-{feature}.md` - PRD document with acceptance criteria
- `scripts/ralph/INTENT.md` - Intent engineering output (v3.0)

---

## Output

Creates `scripts/ralph/USER-STORIES.md` with Gherkin scenarios.

Updates `scripts/ralph/prd.json` to include `user_stories` for each story.

---

## Gherkin Format

### Standard Structure

```gherkin
Feature: [Feature Name]
  As a [user persona]
  I want [capability]
  So that [business value]

  Background:
    Given [common precondition]

  Scenario: [Scenario Name]
    Given [context/precondition]
    And [additional context]
    When [action taken]
    And [additional action]
    Then [expected outcome]
    And [additional outcome]

  Scenario Outline: [Parameterized Scenario]
    Given [context with <variable>]
    When [action with <variable>]
    Then [outcome with <variable>]

    Examples:
      | variable | expected |
      | value1   | result1  |
      | value2   | result2  |
```

### Keywords

- **Given** - Precondition (setup state)
- **When** - Action (user does something)
- **Then** - Outcome (expected result)
- **And** - Additional step in same category
- **But** - Negative case in Then
- **Background** - Common Given steps for all scenarios

---

## Workflow

### Step 1: Read PRD

```bash
# Find the PRD file
ls tasks/prd-*.md
cat tasks/prd-{feature}.md
```

Extract:
- Feature description
- User personas (from INTENT.md)
- Acceptance criteria per story

### Step 2: Generate Feature Block

For each task/epic in the PRD:

```gherkin
Feature: [Task Name from PRD]
  As a [primary persona from INTENT.md]
  I want [feature capability]
  So that [business value from INTENT.md]
```

### Step 3: Convert Acceptance Criteria to Scenarios

For each acceptance criterion, create a scenario:

**Example PRD Criterion:**
```
- Form displays headline input field (required, max 200 characters)
```

**Converted Gherkin:**
```gherkin
Scenario: Headline input field validation
  Given I am on the create page
  When I view the headline input field
  Then the field should be visible
  And the field should be required
  And the field should have a max length of 200 characters

Scenario: Headline exceeds max length
  Given I am on the create page
  When I enter a headline with 201 characters
  Then I should see a validation error
  And the error message should mention the character limit
```

### Step 4: Add Edge Cases

For each scenario, consider:
- **Happy path** (main success scenario)
- **Error cases** (validation failures)
- **Edge cases** (boundary conditions)
- **Empty states** (no data scenarios)

### Step 5: Generate Scenario Outlines for Similar Cases

When multiple similar scenarios exist, use Scenario Outline:

```gherkin
Scenario Outline: Form validation errors
  Given I am on the create page
  When I enter "<input>" in the <field> field
  And I click submit
  Then I should see error message "<error>"

  Examples:
    | field     | input              | error                    |
    | headline  |                    | Headline is required     |
    | headline  | [201 chars]        | Max 200 characters       |
    | duration  | 5                  | Must be 15, 18, or 20    |
```

### Step 6: Write to USER-STORIES.md

Create comprehensive document with all features and scenarios.

### Step 7: Update prd.json

Add `user_stories` array to each story:

```json
{
  "id": "US-003",
  "title": "Headline Input Form",
  "user_stories": [
    {
      "scenario": "Headline input field validation",
      "given": ["I am on the create page"],
      "when": ["I view the headline input field"],
      "then": [
        "the field should be visible",
        "the field should be required",
        "the field should have a max length of 200 characters"
      ]
    },
    {
      "scenario": "Headline exceeds max length",
      "given": ["I am on the create page"],
      "when": ["I enter a headline with 201 characters"],
      "then": [
        "I should see a validation error",
        "the error message should mention the character limit"
      ]
    }
  ]
}
```

---

## USER-STORIES.md Template

```markdown
# User Stories (Gherkin Format)

**Project:** [Project Name]
**Generated:** [ISO date]
**Source PRD:** tasks/prd-{feature}.md

---

## Feature: [Feature 1 Name]

As a [persona]
I want [capability]
So that [value]

### Background

```gherkin
Given the application is running
And I am logged in as a [role]
```

### Scenarios

#### US-001: [Story Title]

```gherkin
Scenario: [Happy path scenario]
  Given [precondition]
  When [action]
  Then [outcome]

Scenario: [Error scenario]
  Given [precondition]
  When [invalid action]
  Then [error outcome]
```

#### US-002: [Story Title]

```gherkin
Scenario Outline: [Parameterized scenario]
  Given [context with <param>]
  When [action with <param>]
  Then [outcome with <expected>]

  Examples:
    | param   | expected |
    | value1  | result1  |
    | value2  | result2  |
```

---

## Feature: [Feature 2 Name]

[Continue for all features...]

---

## Scenario Summary

| Story ID | Scenarios | Happy Path | Error Cases | Edge Cases |
|----------|-----------|------------|-------------|------------|
| US-001   | 4         | 1          | 2           | 1          |
| US-002   | 3         | 1          | 1           | 1          |
| Total    | 7         | 2          | 3           | 2          |
```

---

## Best Practices

### DO

- Use present tense ("I am", not "I was")
- Use first person ("I", "me") for user actions
- Use third person ("the system", "it") for system actions
- Keep steps atomic (one action per step)
- Use meaningful scenario names
- Include both positive and negative cases
- Add data examples where relevant

### DO NOT

- Include implementation details ("click the button with id=submit")
- Use technical jargon in Given/When/Then
- Create overly complex scenarios (max 10 steps)
- Skip error/edge cases
- Duplicate scenarios across features

---

## Mapping to Playwright Tests

Gherkin scenarios map directly to test structure:

```gherkin
Scenario: User submits valid form
  Given I am on the contact page
  When I fill in the form with valid data
  And I click submit
  Then I should see a success message
```

Becomes:

```typescript
test('User submits valid form', async ({ page }) => {
  // Given I am on the contact page
  await page.goto('/contact');

  // When I fill in the form with valid data
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="message"]', 'Hello');

  // And I click submit
  await page.click('button[type="submit"]');

  // Then I should see a success message
  await expect(page.locator('.success')).toBeVisible();
});
```

---

## Integration with v3.0 Workflow

1. Run after PRD creation
2. Output feeds into test scaffolding
3. prd.json v3.0 includes Gherkin data
4. Test scaffolder uses scenarios for test generation

---

## Error Handling

**If PRD not found:**
```
PRD file not found. Please run /prd first or specify path:
/user-story-generator tasks/prd-myfeature.md
```

**If acceptance criteria unclear:**
Ask clarifying questions about expected behavior.

**If scenarios overlap:**
Consolidate into Scenario Outline with Examples.
