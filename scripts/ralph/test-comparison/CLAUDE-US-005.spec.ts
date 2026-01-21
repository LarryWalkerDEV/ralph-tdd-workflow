import { test, expect } from '@playwright/test';

/**
 * US-005: Script Review & Edit UI
 * Tests for the script editing page that allows users to review and edit
 * generated scripts before proceeding to media generation.
 *
 * Written by: Claude (for comparison with GLM-generated tests)
 */

test.describe('US-005 - Script Review & Edit UI', () => {
  // Use a real-looking project ID from the database pattern
  const testProjectId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

  test.beforeEach(async ({ page }) => {
    // Navigate to the script edit page
    await page.goto(`/projects/${testProjectId}/script`);

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('displays script content in an editable textarea', async ({ page }) => {
    // AC1: Script displayed in editable textarea component
    const scriptEditor = page.locator('[data-testid="script-editor"], textarea[name="script"]');

    await expect(scriptEditor).toBeVisible();
    await expect(scriptEditor).toBeEditable();

    // Verify it has content (not empty)
    const content = await scriptEditor.inputValue();
    expect(content.length).toBeGreaterThan(0);
  });

  test('highlights audio tags with distinct colors', async ({ page }) => {
    // AC2: Audio tags [whispers], [laughs], etc. highlighted in different color

    // Look for the rich text editor or highlighted spans
    const highlightedTags = page.locator('.audio-tag, [data-tag-type]');

    // Should have at least some highlighted tags if script contains them
    const tagCount = await highlightedTags.count();

    if (tagCount > 0) {
      // Verify the first tag has a background color (indicating highlighting)
      const firstTag = highlightedTags.first();
      const bgColor = await firstTag.evaluate(el =>
        window.getComputedStyle(el).backgroundColor
      );

      // Should not be transparent or white
      expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(bgColor).not.toBe('rgb(255, 255, 255)');
    }
  });

  test('shows section navigation sidebar with all script sections', async ({ page }) => {
    // AC3: Section navigation sidebar shows HOOK, CREDIBILITY, BODY, CLOSE sections
    const sidebar = page.locator('[data-testid="section-nav"], .script-sections');

    await expect(sidebar).toBeVisible();

    // Check for all required sections
    const requiredSections = ['HOOK', 'CREDIBILITY', 'BODY', 'CLOSE'];

    for (const section of requiredSections) {
      const sectionLink = sidebar.getByText(section, { exact: false });
      await expect(sectionLink).toBeVisible();
    }
  });

  test('displays and updates word count in real-time', async ({ page }) => {
    // AC4: Word count displayed and updates in real-time
    const wordCount = page.locator('[data-testid="word-count"], .word-count');
    const scriptEditor = page.locator('[data-testid="script-editor"], textarea[name="script"]');

    await expect(wordCount).toBeVisible();

    // Get initial word count
    const initialText = await wordCount.textContent();
    const initialCount = parseInt(initialText?.match(/\d+/)?.[0] || '0');

    // Add some words
    await scriptEditor.focus();
    await scriptEditor.press('End');
    await scriptEditor.type(' Adding five more words here.');

    // Wait for debounce
    await page.waitForTimeout(500);

    // Verify word count increased
    const newText = await wordCount.textContent();
    const newCount = parseInt(newText?.match(/\d+/)?.[0] || '0');

    expect(newCount).toBeGreaterThan(initialCount);
  });

  test('displays estimated duration based on word count', async ({ page }) => {
    // AC5: Estimated duration displayed based on word count
    const duration = page.locator('[data-testid="estimated-duration"], .duration-estimate');

    await expect(duration).toBeVisible();

    // Should show time format (e.g., "2:30" or "2 min 30 sec")
    const durationText = await duration.textContent();
    expect(durationText).toMatch(/\d+.*\d*.*(?:min|sec|:)/i);
  });

  test('saves changes to database when Save button clicked', async ({ page }) => {
    // AC6: Save Changes button updates script in database
    const saveButton = page.locator('[data-testid="save-button"], button:has-text("Save")');
    const scriptEditor = page.locator('[data-testid="script-editor"], textarea[name="script"]');

    // Make a change
    await scriptEditor.focus();
    await scriptEditor.press('End');
    const timestamp = Date.now();
    await scriptEditor.type(` [edited-${timestamp}]`);

    // Intercept the save API call
    const savePromise = page.waitForResponse(
      response => response.url().includes('/api/') &&
                  response.url().includes('script') &&
                  response.request().method() === 'PUT'
    );

    // Click save
    await saveButton.click();

    // Wait for API response
    const response = await savePromise;
    expect(response.status()).toBe(200);

    // Should show success indicator
    const successIndicator = page.locator('.save-success, [data-testid="save-success"]');
    await expect(successIndicator).toBeVisible({ timeout: 5000 });
  });

  test('navigates to generation page when Proceed button clicked', async ({ page }) => {
    // AC7: Proceed to Generation button navigates to /projects/[id]/generate
    const proceedButton = page.locator(
      '[data-testid="proceed-button"], button:has-text("Proceed"), button:has-text("Generate")'
    );

    await expect(proceedButton).toBeVisible();
    await proceedButton.click();

    // Should navigate to the generate page
    await expect(page).toHaveURL(new RegExp(`/projects/${testProjectId}/generate`));
  });

  test('handles empty script gracefully', async ({ page }) => {
    // Error handling: What happens with empty script?
    const scriptEditor = page.locator('[data-testid="script-editor"], textarea[name="script"]');
    const saveButton = page.locator('[data-testid="save-button"], button:has-text("Save")');

    // Clear the script
    await scriptEditor.fill('');

    // Try to save
    await saveButton.click();

    // Should show validation error or prevent save
    const error = page.locator('.error, [data-testid="validation-error"]');
    const isDisabled = await saveButton.isDisabled();

    // Either show error OR disable save button
    const hasError = await error.isVisible().catch(() => false);
    expect(hasError || isDisabled).toBe(true);
  });
});
