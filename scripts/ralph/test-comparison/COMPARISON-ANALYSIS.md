# Test Quality Comparison: GLM vs Claude

## Test Comparison for US-005 (Script Review & Edit UI)

### Summary

| Aspect | GLM-4.7-flash | Claude |
|--------|---------------|--------|
| Tests written | 8 | 9 |
| Uses mocks | Yes (heavily) | No (real endpoints) |
| Error handling tests | 0 | 1 |
| Selector flexibility | Single data-testid | Multiple fallbacks |
| Comments | Minimal | Detailed |
| Test isolation | Relies on mocks | More realistic |

---

## GLM Test Analysis

### Strengths
1. **Direct mapping to acceptance criteria** - One test per AC
2. **Fast execution** - Uses mocks so no real API calls
3. **Simple selectors** - `getByTestId('script-editor')`
4. **Clean structure** - Easy to read

### Weaknesses
1. **Heavy mocking** - Tests the mocks, not the real system
   ```typescript
   // GLM mocks the API response
   await page.route('**/api/projects/' + projectId + '/script', route => {
     route.fulfill({
       status: 200,
       body: JSON.stringify({ content: scriptContent })
     });
   });
   ```
   **Problem**: If the real API returns a different structure, test still passes!

2. **Hardcoded expectations** - Test assumes specific text
   ```typescript
   await expect(wordCountDisplay).toHaveText(/15/);
   ```
   **Problem**: If script has 16 words, test fails even though feature works.

3. **Wrong URL check** - Test AC6 has a bug
   ```typescript
   await expect(page).toHaveURL(/\/api\/projects\/proj-12345\/script/);
   ```
   **Problem**: Page URL won't be the API URL! This test would fail.

4. **No error handling tests** - What if API fails? No test for that.

5. **Fake project ID** - `proj-12345` won't exist in database
   ```typescript
   const projectId = 'proj-12345';
   ```
   **Problem**: Without mocks, this would 404.

---

## Claude Test Analysis

### Strengths
1. **Realistic project ID** - UUID format matches real data
   ```typescript
   const testProjectId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
   ```

2. **Flexible selectors** - Fallbacks if data-testid missing
   ```typescript
   const scriptEditor = page.locator('[data-testid="script-editor"], textarea[name="script"]');
   ```

3. **Real API verification** - Intercepts actual API calls
   ```typescript
   const savePromise = page.waitForResponse(
     response => response.url().includes('/api/') &&
                 response.url().includes('script') &&
                 response.request().method() === 'PUT'
   );
   ```

4. **Error handling test** - Tests empty script edge case
   ```typescript
   test('handles empty script gracefully', async ({ page }) => {
     await scriptEditor.fill('');
     // Verify error shown or button disabled
   });
   ```

5. **Detailed comments** - Explains what each test is checking

### Weaknesses
1. **May fail if data doesn't exist** - Needs seed data
2. **Slower execution** - Real API calls take time
3. **More complex** - Harder to understand at a glance

---

## Key Issues Found in GLM Tests

### Issue 1: Mock creates false confidence
```typescript
// GLM's approach
await page.route('**/api/projects/' + projectId + '/script', route => {
  route.fulfill({
    status: 200,
    body: JSON.stringify({ content: scriptContent })
  });
});
```

**Problem**: The mock always returns the same data. If the real API:
- Returns `{ script: content }` instead of `{ content: ... }` → Test passes, but real code breaks
- Has authentication → Test passes, real code gets 401
- Has rate limiting → Test passes, real code fails

### Issue 2: Hardcoded word count
```typescript
await expect(wordCountDisplay).toHaveText(/15/);
// Later...
await expect(wordCountDisplay).toHaveText(/18/);
```

**Problem**: Test assumes specific word count. Very brittle.

### Issue 3: URL assertion bug
```typescript
test('AC6: Save Changes button...', async ({ page }) => {
  await saveButton.click();
  await expect(page).toHaveURL(/\/api\/projects\/proj-12345\/script/);
  // ^ BUG: Page stays on same URL, only API is called!
});
```

This test would **fail** in reality because clicking Save doesn't change the page URL.

---

## Recommendations for GLM Communication

### Current Prompt Issues

The current prompt in `openrouter-reviewer.js` says:
```
1. Use Playwright test syntax...
2. Each acceptance criterion should have at least one test
3. Use realistic test data (not "test123" or "example.com")
```

**GLM ignored #3** - Used `proj-12345` anyway.

### Improved Prompt for GLM

```
Write Playwright tests for this user story.

CRITICAL RULES:
1. NO MOCKING - Do NOT use page.route() to mock API responses.
   Tests should hit real endpoints to verify actual behavior.

2. REALISTIC DATA - Use UUID format for IDs: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
   Do NOT use 'test-123' or 'proj-12345' or similar.

3. FLEXIBLE SELECTORS - Always provide fallbacks:
   BAD:  page.getByTestId('script-editor')
   GOOD: page.locator('[data-testid="script-editor"], textarea[name="script"]')

4. ERROR HANDLING - Include at least one test for error cases:
   - What if API fails?
   - What if data is empty/invalid?
   - What if user does something unexpected?

5. ASSERTIONS - Use relative assertions where possible:
   BAD:  expect(wordCount).toHaveText('15 words')
   GOOD: expect(wordCount).toMatch(/\d+ words/)

6. VERIFY ACTIONS - After button clicks, verify the RESULT, not the action:
   BAD:  await expect(page).toHaveURL(/api\/.../) // Page URL won't change!
   GOOD: await expect(page.locator('.success')).toBeVisible()
```

---

## Quality Rating

| Test Suite | Quality Score | Notes |
|------------|---------------|-------|
| GLM-generated | 5/10 | Would pass with mocks, fail in real environment |
| Claude-written | 7/10 | More realistic, but needs seed data |

### What GLM does better:
- Faster to generate
- Simpler code
- Direct AC mapping

### What Claude does better:
- More robust selectors
- Error handling coverage
- Real API verification
- Detailed documentation

---

## Conclusion

**GLM tests are good for scaffolding, but need refinement.**

Recommended workflow:
1. GLM generates initial test structure
2. Claude reviews and improves:
   - Remove excessive mocking
   - Add selector fallbacks
   - Add error handling tests
   - Fix any bugs (like the URL assertion)

This combines GLM's speed with Claude's depth.
