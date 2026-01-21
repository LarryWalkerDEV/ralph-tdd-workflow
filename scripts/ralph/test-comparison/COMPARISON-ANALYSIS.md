# Test Quality Comparison: GLM v2 vs Gemini 3 vs Claude

## Test Comparison for US-005 (Script Review & Edit UI)

**Date:** 2026-01-21
**Models Tested:**
- GLM-4.7-flash (z-ai/glm-4.7-flash) - $0.01/1M tokens
- Gemini 3 Flash Preview (google/gemini-3-flash-preview) - Latest Google model
- Claude Opus 4.5 (local)

### Summary

| Aspect | GLM v2 (improved) | Gemini 3 Flash | Claude |
|--------|-------------------|----------------|--------|
| Tests written | 9 | 7 | 9 |
| Uses mocks | ❌ No | ❌ No | ❌ No (1 exception*) |
| Error handling tests | 1 | 1 | 2 |
| Selector flexibility | ✅ Multiple fallbacks | ✅ Multiple fallbacks | ✅ Multiple fallbacks |
| Real API verification | ✅ waitForResponse | ✅ waitForResponse | ✅ waitForResponse |
| Persistence testing | ❌ No | ❌ No | ✅ Yes (reload verify) |
| Computed style check | ❌ No | ✅ Yes | ❌ No |
| Unique content | ❌ No | ✅ Math.random() | ✅ Date.now() + random |
| Comments | Minimal | Minimal | Balanced |
| Code quality | Clean | **Very Clean** | Clean |
| Lines of code | 126 | **106** | 171 |

\* Claude uses route.abort() only to simulate network failure for error testing - acceptable use

### Overall Ratings

| Model | Score | Cost Efficiency | Best For |
|-------|-------|-----------------|----------|
| GLM v2 | **7/10** | ⭐⭐⭐⭐⭐ Excellent | Quick scaffolding |
| Gemini 3 | **8.5/10** | ⭐⭐⭐⭐ Very Good | **Best balance of quality/cost** |
| Claude | **9/10** | ⭐⭐ Expensive | Final quality assurance |

### 🏆 Winner: Gemini 3 Flash Preview

Gemini 3 produces the **cleanest, most efficient tests** at only 106 lines while maintaining high quality:
- No verbose comments or over-explanation
- Smart computed style verification for highlighting
- Unique content verification with Math.random()
- Proper API response checking

---

## GLM v2 Test Analysis (Improved Prompt)

### Improvements Over Original
The improved prompt successfully eliminated all major issues from the original GLM test:
- ✅ No more mocking (was using page.route() extensively)
- ✅ Realistic UUID format: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
- ✅ Flexible selectors with fallbacks
- ✅ Includes error handling test

### Strengths
1. **Clean, minimal code** - Easy to read and understand
2. **Good selector fallbacks**:
   ```typescript
   const scriptEditor = page.locator('[data-testid="script-editor"], textarea[name="script"]');
   ```
3. **Follows instructions** - Added "Navigation only, no mocking" comment
4. **Error case included** - Tests empty script validation
5. **Real API verification** - Uses waitForResponse correctly:
   ```typescript
   await page.waitForResponse(resp =>
     resp.url().includes('/api/projects') && resp.status() === 200
   );
   ```

### Weaknesses
1. **No persistence verification** - Doesn't reload page to verify save worked
2. **waitForTimeout(500)** - Uses arbitrary delay for debounce (could be flaky)
3. **Missing detail** - Assumes initial word count > 0 without verification
4. **Simple error test** - Only checks button disabled/error state, not actual error message

---

## Gemini 3 Flash Preview Test Analysis

### Strengths
1. **Most concise** - Only 106 lines (shortest of all models)
2. **Smart computed style verification**:
   ```typescript
   const color = await highlightedTag.first().evaluate((el) => window.getComputedStyle(el).color);
   expect(color).not.toBe('rgb(0, 0, 0)');
   ```
3. **Unique content for save verification**:
   ```typescript
   await editor.fill('Database persistence test content ' + Math.random());
   ```
4. **Clean loop for section verification**:
   ```typescript
   const sections = ['HOOK', 'CREDIBILITY', 'BODY', 'CLOSE'];
   for (const section of sections) {
     const sectionLink = sidebar.locator(`text=${section}, [data-section="${section}"]`);
     await expect(sectionLink).toBeVisible();
   }
   ```
5. **Smart error test** - Checks that empty save doesn't return 200:
   ```typescript
   page.on('response', response => {
     if (response.url().includes('/api/projects/') && response.request().method() === 'PATCH') {
       expect(response.status()).not.toBe(200);
     }
   });
   ```

### Weaknesses
1. **No persistence verification** - Doesn't reload page to verify save worked
2. **Missing waitForLoadState** - No `networkidle` wait in beforeEach
3. **Response listener timing** - Adds listener AFTER click (potential race condition)
4. **Fewer tests** - Only 7 tests vs 9 for GLM/Claude

### Verdict
**Best value for test generation** - Produces clean, efficient tests at low cost. The computed style check is a clever addition that other models missed.

---

## Gemini 2.5 Flash Test Analysis (for reference)

### Strengths
1. **Most comprehensive** - Includes persistence verification:
   ```typescript
   // Optionally, navigate away and back to verify persistence (more robust)
   await page.goto('/dashboard');
   await page.goto(scriptReviewUrl);
   await page.waitForLoadState('networkidle');
   const savedScriptContent = await scriptTextarea.inputValue();
   expect(savedScriptContent).toContain(newScriptContent);
   ```
2. **Unique content verification** - Uses timestamp + random ID:
   ```typescript
   const newScriptContent = `Updated script content at ${new Date().toISOString()} with a unique identifier: ${Math.random().toString(36).substring(2, 15)}.`;
   ```
3. **Promise.all pattern** - Elegant API response handling:
   ```typescript
   const [response] = await Promise.all([
     page.waitForResponse(resp => resp.url().includes(`/api/projects/${projectId}/script`)),
     saveButton.click(),
   ]);
   ```
4. **Real error test** - Actually triggers backend validation:
   ```typescript
   await scriptTextarea.fill(''); // Attempt to save an empty script
   // Expects 400+ status from real backend
   ```

### Weaknesses
1. **Over-explained comments** - Lines 21-39 contain excessive reasoning:
   ```typescript
   // This might require inspecting the DOM structure after the textarea content is rendered/processed.
   // For a simple textarea, this might mean checking for a specific class on the textarea itself or a sibling element.
   // A more robust solution might involve checking the computed style if the highlighting is done via CSS.
   // For now, we'll check for a common pattern like a span with a specific class.
   // ... (8 more lines of explanation)
   ```
2. **Hardcoded assumptions** - Assumes specific text patterns:
   ```typescript
   expect(durationText).toMatch(/\d+ min/); // e.g., "1 min" or "0 min"
   ```
3. **waitForTimeout(500)** - Same flaky delay issue as GLM
4. **Different URL path** - Uses `/script-review` vs Claude's `/script`

---

## Claude Test Analysis

### Strengths
1. **Balanced documentation** - Comments explain WHY, not just WHAT
2. **Most selector fallbacks** - Includes aria-labels:
   ```typescript
   const scriptEditor = page.locator(
     '[data-testid="script-editor"], ' +
     'textarea[name="script"], ' +
     'textarea[aria-label*="script" i]'
   );
   ```
3. **Two error tests** - Both validation AND network failure:
   ```typescript
   test('Error: Empty script validation prevents proceeding');
   test('Error: Save failure shows error message');
   ```
4. **Persistence verification** - Reloads and checks
5. **Proper error simulation** - Uses route.abort() (not mock success):
   ```typescript
   await page.route('**/api/**script**', (route) => {
     route.abort('failed');  // Simulate network failure, not fake success
   });
   ```
6. **Defensive assertions** - Handles edge cases:
   ```typescript
   if (initialDuration && initialDuration !== '0' && initialDuration !== '0:00') {
     expect(newDuration).not.toBe(initialDuration);
   }
   ```

### Weaknesses
1. **Most code** - 171 lines vs GLM's 126
2. **TypeScript type import** - Imports unused `Page` type
3. **Most expensive** - Claude costs significantly more than GLM/Gemini

---

## Side-by-Side Code Comparison

### Save Button Test Implementation

**GLM v2** (simplest):
```typescript
test('AC 6: Save Changes button updates script in database', async ({ page }) => {
  const saveButton = page.locator('[data-testid="save-changes"], button:has-text("Save Changes")');
  const successMessage = page.locator('[data-testid="save-success"], .toast-success');

  await saveButton.click();
  await expect(successMessage).toBeVisible();

  await page.waitForResponse(resp =>
    resp.url().includes('/api/projects') && resp.status() === 200
  );
});
```

**Gemini 2.5** (most comprehensive):
```typescript
test('6. Save Changes button updates script in database', async ({ page }) => {
  const newScriptContent = `Updated script content at ${new Date().toISOString()} with a unique identifier: ${Math.random().toString(36).substring(2, 15)}.`;
  await scriptTextarea.fill(newScriptContent);

  const [response] = await Promise.all([
    page.waitForResponse(resp => resp.url().includes(`/api/projects/${projectId}/script`) && resp.status() === 200),
    saveButton.click(),
  ]);

  expect(response.status()).toBe(200);
  await expect(successMessage).toBeVisible();
  await expect(successMessage).toContainText('Script saved successfully');

  // Persistence verification
  await page.goto('/dashboard');
  await page.goto(scriptReviewUrl);
  await page.waitForLoadState('networkidle');
  const savedScriptContent = await scriptTextarea.inputValue();
  expect(savedScriptContent).toContain(newScriptContent);
});
```

**Claude** (balanced):
```typescript
test('AC6: Save Changes persists to database', async ({ page }) => {
  const uniqueContent = `Test script saved at ${Date.now()} - ${Math.random().toString(36).slice(2)}`;
  await scriptEditor.fill(uniqueContent);

  const responsePromise = page.waitForResponse(
    (resp) => resp.url().includes('/api/') && resp.status() >= 200 && resp.status() < 300
  );

  await saveButton.click();
  const response = await responsePromise;
  expect(response.status()).toBeLessThan(300);

  await expect(successIndicator).toBeVisible({ timeout: 5000 });

  // Verify persistence
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(scriptEditor).toContainText(uniqueContent.slice(0, 20));
});
```

---

## Improved Prompt Analysis

### Original Prompt Issues (Pre-improvement)
```
GLM ignored instructions and produced:
- Heavy mocking with page.route()
- Fake IDs like 'proj-12345'
- Wrong URL assertions
- No error handling
```

### Improved Prompt Success ✅
The improved prompt in `openrouter-reviewer.js` fixed all issues:
```
CRITICAL RULES - VIOLATIONS WILL BE REJECTED:
1. ABSOLUTELY NO MOCKING - NEVER use page.route() to mock API responses
2. REALISTIC DATA ONLY - Use UUID format: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
3. FLEXIBLE SELECTORS - Always provide fallbacks
4. TEST RESULTS, NOT ACTIONS - NEVER check if page URL became an API URL
5. INCLUDE ERROR HANDLING TESTS
```

**Result**: GLM v2 test quality improved dramatically, from 5/10 to 7/10.

---

## Cost Analysis

| Model | Input Cost | Output Cost | Est. Cost Per Test |
|-------|------------|-------------|-------------------|
| GLM-4.7-flash | $0.007/1M | $0.007/1M | ~$0.0001 |
| Gemini 2.5 | $0.30/1M | $2.50/1M | ~$0.01 |
| Claude Opus 4.5 | ~$15/1M | ~$75/1M | ~$0.50 |

**Cost ratio**: GLM is ~5000x cheaper than Claude for test generation.

---

## Recommendations

### For v4.0 Ralph Workflow

1. **Use GLM for initial test scaffolding** (cheap, fast, good enough)
2. **Use Gemini for comprehensive tests** (when GLM output needs improvement)
3. **Reserve Claude for review/judgment** (evidence-based pass/fail decisions)

### Optimal Workflow
```
GLM (scaffold) → Gemini (enhance if needed) → Claude (review evidence)
   $0.0001           $0.01                        $0.50
```

### When to Use Each Model

| Scenario | Best Model | Reason |
|----------|------------|--------|
| Quick test scaffolding | GLM | Cheap, fast, follows rules with good prompt |
| Complex UI interactions | Gemini | Better at reasoning through edge cases |
| Evidence review | Claude | Best judgment, can analyze screenshots |
| Final quality gate | Claude | Most reliable for pass/fail decisions |

---

## Conclusion

**The improved prompt works.** All models produce quality tests when given clear, emphatic rules:
- Use "ABSOLUTELY" and "NEVER" for critical rules
- Provide explicit good/bad examples
- Specify format requirements precisely

**Gemini 3 Flash Preview is the new winner** - cleanest code, smart features (computed style check), and good cost efficiency.

**Claude remains best for judgment** - use it to review evidence and make pass/fail decisions, not for bulk test generation.

### Final Ratings

| Model | Quality | Cost | Speed | Code Cleanliness | Overall |
|-------|---------|------|-------|------------------|---------|
| GLM v2 | 7/10 | 10/10 | 10/10 | 7/10 | **7.5/10** |
| Gemini 3 | 8.5/10 | 8/10 | 9/10 | **10/10** | **8.5/10** |
| Claude | 9/10 | 3/10 | 5/10 | 8/10 | **6.5/10** |

### 🏆 Rankings

1. **Gemini 3 Flash Preview** - Best overall (quality + efficiency + cleanliness)
2. **GLM v2** - Best for budget-conscious scaffolding
3. **Claude** - Best for final quality assurance and judgment

### Recommended v4.0 Workflow

```
Gemini 3 (generate) → Claude (review evidence)
    $0.01              $0.50
```

Or for maximum savings:
```
GLM (scaffold) → Gemini 3 (enhance) → Claude (judge)
   $0.0001          $0.01              $0.50
```
