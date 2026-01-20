# Validation Framework

This document defines the EXACT validation criteria for each test category.
Validators MUST check against these criteria - no exceptions.

---

## Test Categories

Every story falls into one or more categories. Each category has specific, measurable validation goals.

### Category 1: UI Component Tests

**Goal:** Verify component renders correctly and handles user interaction.

| Check | How to Validate | Pass Criteria |
|-------|-----------------|---------------|
| Component renders | `agent-browser snapshot` | Element exists in accessibility tree |
| Correct text displayed | `agent-browser snapshot` | Text matches expected value |
| Styling applied | Screenshot comparison | No visual regression |
| Responsive layout | Resize viewport + snapshot | Elements reflow correctly |

**Playwright Test Template:**
```typescript
test('component renders correctly', async ({ page }) => {
  await page.goto('/path');
  await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
  await expect(page.getByText('Expected Text')).toBeVisible();
});
```

---

### Category 2: Button/Action Tests

**Goal:** Verify buttons trigger correct actions and provide feedback.

| Check | How to Validate | Pass Criteria |
|-------|-----------------|---------------|
| Button clickable | `agent-browser click @button` | No error thrown |
| Loading state shown | Snapshot during action | Loading indicator visible |
| Success feedback | Snapshot after action | Success message/state visible |
| Error handling | Trigger error + snapshot | Error message displayed |

**Playwright Test Template:**
```typescript
test('button triggers action', async ({ page }) => {
  await page.goto('/path');

  // Click and wait for response
  const responsePromise = page.waitForResponse('/api/endpoint');
  await page.getByRole('button', { name: 'Submit' }).click();
  const response = await responsePromise;

  // Verify API called
  expect(response.status()).toBe(200);

  // Verify feedback shown
  await expect(page.getByText('Success')).toBeVisible();
});
```

---

### Category 3: API Integration Tests

**Goal:** Verify frontend correctly calls API and handles response.

| Check | How to Validate | Pass Criteria |
|-------|-----------------|---------------|
| API endpoint called | Intercept network request | Request made to correct URL |
| Correct payload sent | Inspect request body | Payload matches expected |
| Response handled | Check UI after response | Data displayed correctly |
| Error response handled | Mock error response | Error UI shown |

**Playwright Test Template:**
```typescript
test('API integration works', async ({ page }) => {
  // Intercept API call
  await page.route('/api/data', route => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({ items: [{ id: 1, name: 'Test' }] })
    });
  });

  await page.goto('/path');

  // Trigger API call
  await page.getByRole('button', { name: 'Load Data' }).click();

  // Verify data displayed
  await expect(page.getByText('Test')).toBeVisible();
});
```

---

### Category 4: Form Validation Tests

**Goal:** Verify form validates input and shows appropriate errors.

| Check | How to Validate | Pass Criteria |
|-------|-----------------|---------------|
| Required field error | Submit empty form | Error message shown |
| Invalid format error | Enter invalid data | Specific error shown |
| Valid submission | Enter valid data + submit | Form submits successfully |
| Field formatting | Enter data + blur | Value formatted correctly |

**Playwright Test Template:**
```typescript
test('form validation works', async ({ page }) => {
  await page.goto('/form');

  // Test required field
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('This field is required')).toBeVisible();

  // Test invalid format
  await page.getByLabel('Email').fill('invalid');
  await page.getByLabel('Email').blur();
  await expect(page.getByText('Invalid email format')).toBeVisible();

  // Test valid submission
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Success')).toBeVisible();
});
```

---

### Category 5: Image/Media Tests

**Goal:** Verify images load, display correctly, and handle errors.

| Check | How to Validate | Pass Criteria |
|-------|-----------------|---------------|
| Image loads | Check img naturalWidth > 0 | Image not broken |
| Correct dimensions | Measure rendered size | Matches expected |
| Alt text present | Check alt attribute | Descriptive alt text |
| Fallback on error | Break image URL | Fallback shown |

**Playwright Test Template:**
```typescript
test('image displays correctly', async ({ page }) => {
  await page.goto('/gallery');

  // Wait for image to load
  const img = page.getByRole('img', { name: 'Product photo' });
  await expect(img).toBeVisible();

  // Verify image loaded (not broken)
  const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
  expect(naturalWidth).toBeGreaterThan(0);

  // Verify alt text
  await expect(img).toHaveAttribute('alt', /product/i);
});
```

---

### Category 6: Navigation/Routing Tests

**Goal:** Verify navigation works and URLs are correct.

| Check | How to Validate | Pass Criteria |
|-------|-----------------|---------------|
| Link navigates | Click + check URL | URL changes correctly |
| Back button works | Navigate + go back | Returns to previous page |
| Direct URL access | Navigate directly to URL | Page loads correctly |
| 404 handling | Navigate to invalid URL | 404 page shown |

**Playwright Test Template:**
```typescript
test('navigation works', async ({ page }) => {
  await page.goto('/');

  // Click navigation link
  await page.getByRole('link', { name: 'About' }).click();
  await expect(page).toHaveURL('/about');

  // Verify page content
  await expect(page.getByRole('heading', { name: 'About Us' })).toBeVisible();

  // Test back button
  await page.goBack();
  await expect(page).toHaveURL('/');
});
```

---

### Category 7: State Persistence Tests

**Goal:** Verify data persists correctly (localStorage, API, etc.)

| Check | How to Validate | Pass Criteria |
|-------|-----------------|---------------|
| Data saved | Check storage/API | Data matches input |
| Data loads on refresh | Refresh + check UI | Previous data shown |
| Data cleared on logout | Logout + check | Data removed |

**Playwright Test Template:**
```typescript
test('state persists', async ({ page }) => {
  await page.goto('/settings');

  // Change setting
  await page.getByLabel('Theme').selectOption('dark');
  await page.getByRole('button', { name: 'Save' }).click();

  // Refresh page
  await page.reload();

  // Verify setting persisted
  await expect(page.getByLabel('Theme')).toHaveValue('dark');
});
```

---

## Validation Execution Order

For each story, validators MUST run checks in this order:

```
1. PLAYWRIGHT TESTS (Functional)
   ├── Run: npx playwright test e2e/<story>.spec.ts
   ├── Output: JSON report
   └── Gate: ALL tests must pass

2. BROWSER VALIDATOR (Structural)
   ├── Run: agent-browser commands
   ├── Check: Accessibility tree matches expected structure
   └── Gate: All elements present and accessible

3. VISUAL CHECK (Optional - for UI stories)
   ├── Take screenshot: verification/<story>_verified.png
   ├── Compare: Against baseline if exists
   └── Gate: No unexpected visual changes
```

---

## Checkpoint Values

Each checkpoint MUST contain one of:

| Value | Meaning |
|-------|---------|
| `PASS` | All checks passed |
| `FAIL:<reason>` | Failed with specific reason |
| `SKIP:<reason>` | Skipped with justification |

Example checkpoint file content:
```
PASS
2024-01-20T10:30:00.000Z
Tests: 5 passed, 0 failed
```

Or for failure:
```
FAIL:API endpoint returns 500
2024-01-20T10:30:00.000Z
Tests: 3 passed, 2 failed
- test_api_call: Expected 200, got 500
- test_error_display: Error message not shown
```

---

## Parallel Validation Rules

Stories can be validated in parallel IF:
- They don't share state (different pages/features)
- They don't depend on each other's output

Stories MUST be validated sequentially IF:
- Story B uses data created by Story A
- Story B navigates from Story A's page

This is defined in `prd.json` via the `depends_on` field.
