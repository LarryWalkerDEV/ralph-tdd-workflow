import { test, expect } from '@playwright/test';

test.describe('US-005 - Script Review & Edit UI', () => {
  const projectId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'; // Realistic UUID
  const scriptReviewUrl = `/projects/${projectId}/script-review`;

  test.beforeEach(async ({ page }) => {
    await page.goto(scriptReviewUrl);
    await page.waitForLoadState('networkidle');
  });

  test('1. Script displayed in editable textarea component', async ({ page }) => {
    const scriptTextarea = page.locator('[data-testid="script-textarea"], textarea[name="scriptContent"]');
    await expect(scriptTextarea).toBeVisible();
    const scriptContent = await scriptTextarea.inputValue();
    expect(scriptContent.length).toBeGreaterThan(0);
    expect(scriptContent).toContain('HOOK'); // Assuming initial script has sections
  });

  test('2. Audio tags [whispers], [laughs], etc. highlighted in different color', async ({ page }) => {
    // This test assumes highlighting is done via a span or similar element with a specific class/style
    // We'll check for the presence of such an element containing an audio tag.
    const scriptTextarea = page.locator('[data-testid="script-textarea"], textarea[name="scriptContent"]');
    await scriptTextarea.fill('This is a test script with [whispers] and [laughs].');

    // Assuming the highlighting mechanism renders a span or similar element *within* or *around* the textarea content
    // This might require inspecting the DOM structure after the textarea content is rendered/processed.
    // For a simple textarea, this might mean checking for a specific class on the textarea itself or a sibling element.
    // A more robust solution might involve checking the computed style if the highlighting is done via CSS.
    // For now, we'll check for a common pattern like a span with a specific class.
    // If the highlighting is purely visual within a textarea (e.g., syntax highlighting library),
    // direct DOM inspection might be difficult. We'll check for a common pattern.

    // A more realistic check would be to look for a specific class applied to the highlighted text.
    // Since we cannot directly inspect styles within a textarea's value, we'll assume a visual indicator
    // like a span with a specific class if the UI renders it that way.
    // If the highlighting is done via a library like CodeMirror, we'd look for its specific DOM structure.
    // For a simple textarea, this might be a limitation without more specific UI implementation details.
    // Let's assume a common pattern where a sibling element displays the highlighted version.
    const highlightedElement = page.locator('[data-testid="highlighted-script-preview"] .audio-tag-highlight, .script-highlight-container span.audio-tag');
    await expect(highlightedElement).toBeVisible();
    await expect(highlightedElement).toContainText('[whispers]');
  });

  test('3. Section navigation sidebar shows HOOK, CREDIBILITY, BODY, CLOSE sections', async ({ page }) => {
    const sidebar = page.locator('[data-testid="section-navigation-sidebar"], nav.script-sections');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator('[data-testid="section-link-HOOK"], a[href="#HOOK"]')).toBeVisible();
    await expect(sidebar.locator('[data-testid="section-link-CREDIBILITY"], a[href="#CREDIBILITY"]')).toBeVisible();
    await expect(sidebar.locator('[data-testid="section-link-BODY"], a[href="#BODY"]')).toBeVisible();
    await expect(sidebar.locator('[data-testid="section-link-CLOSE"], a[href="#CLOSE"]')).toBeVisible();
  });

  test('4. Word count displayed and updates in real-time', async ({ page }) => {
    const scriptTextarea = page.locator('[data-testid="script-textarea"], textarea[name="scriptContent"]');
    const wordCountDisplay = page.locator('[data-testid="word-count-display"], .word-count-info span');

    await expect(wordCountDisplay).toBeVisible();
    const initialWordCount = parseInt(await wordCountDisplay.textContent() || '0', 10);
    expect(initialWordCount).toBeGreaterThanOrEqual(0); // Can be 0 if script is empty initially

    await scriptTextarea.fill('One two three four five');
    await expect(wordCountDisplay).toContainText('5');

    await scriptTextarea.fill('One two');
    await expect(wordCountDisplay).toContainText('2');
  });

  test('5. Estimated duration displayed based on word count', async ({ page }) => {
    const scriptTextarea = page.locator('[data-testid="script-textarea"], textarea[name="scriptContent"]');
    const durationDisplay = page.locator('[data-testid="estimated-duration-display"], .duration-info span');

    await expect(durationDisplay).toBeVisible();
    const initialDuration = await durationDisplay.textContent();
    expect(initialDuration).toMatch(/\d+ min/); // e.g., "1 min" or "0 min"

    await scriptTextarea.fill('This is a much longer script to increase the word count significantly. We need enough words to see a change in the estimated duration. Let\'s add more text to make sure the duration updates as expected. This should be enough for a noticeable difference.');
    // Wait for potential debounce or calculation
    await page.waitForTimeout(500); // Give time for calculation to update
    const newDuration = await durationDisplay.textContent();
    expect(newDuration).not.toEqual(initialDuration); // Expect duration to change
    expect(newDuration).toMatch(/\d+ min/);
  });

  test('6. Save Changes button updates script in database', async ({ page }) => {
    const scriptTextarea = page.locator('[data-testid="script-textarea"], textarea[name="scriptContent"]');
    const saveButton = page.locator('[data-testid="save-changes-button"], button[type="submit"]:has-text("Save Changes")');
    const successMessage = page.locator('[data-testid="save-success-message"], .success-notification');

    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeEnabled();

    const newScriptContent = `Updated script content at ${new Date().toISOString()} with a unique identifier: ${Math.random().toString(36).substring(2, 15)}.`;
    await scriptTextarea.fill(newScriptContent);

    // Click save and wait for the API call to complete and success message to appear
    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes(`/api/projects/${projectId}/script`) && resp.status() === 200),
      saveButton.click(),
    ]);

    expect(response.status()).toBe(200);
    await expect(successMessage).toBeVisible();
    await expect(successMessage).toContainText('Script saved successfully');

    // Optionally, navigate away and back to verify persistence (more robust)
    await page.goto('/dashboard');
    await page.goto(scriptReviewUrl);
    await page.waitForLoadState('networkidle');
    const savedScriptContent = await scriptTextarea.inputValue();
    expect(savedScriptContent).toContain(newScriptContent);
  });

  test('7. Proceed to Generation button navigates to /projects/[id]/generate', async ({ page }) => {
    const proceedButton = page.locator('[data-testid="proceed-to-generation-button"], a[href*="/generate"]');
    await expect(proceedButton).toBeVisible();
    await expect(proceedButton).toBeEnabled();

    await proceedButton.click();
    await expect(page).toHaveURL(`/projects/${projectId}/generate`);
  });

  test('8. Error handling: Display error on failed save attempt', async ({ page }) => {
    const scriptTextarea = page.locator('[data-testid="script-textarea"], textarea[name="scriptContent"]');
    const saveButton = page.locator('[data-testid="save-changes-button"], button[type="submit"]:has-text("Save Changes")');
    const errorMessage = page.locator('[data-testid="save-error-message"], .error-notification');

    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeEnabled();

    // To simulate an error, we'll try to trigger a server-side validation error or a network issue.
    // Since we cannot mock, we'll try to submit an empty script if the backend validates against it,
    // or a script that's known to cause an error if such a case exists.
    // For this example, let's assume an empty script might trigger a validation error.
    await scriptTextarea.fill(''); // Attempt to save an empty script

    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes(`/api/projects/${projectId}/script`) && resp.status() >= 400),
      saveButton.click(),
    ]);

    expect(response.status()).toBeGreaterThanOrEqual(400);
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Failed to save script'); // Or specific error message from backend
  });
});
