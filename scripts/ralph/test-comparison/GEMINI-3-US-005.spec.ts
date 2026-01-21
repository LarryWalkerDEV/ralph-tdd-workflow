import { test, expect } from '@playwright/test';

test.describe('US-005 - Script Review & Edit UI', () => {
  const projectId = '7f3e1a2b-9c8d-4e5f-a1b2-c3d4e5f6a7b8';
  const projectUrl = `/projects/${projectId}/review`;

  test.beforeEach(async ({ page }) => {
    await page.goto(projectUrl);
  });

  test('Script is displayed in an editable textarea', async ({ page }) => {
    const editor = page.locator('[data-testid="script-editor"], textarea.script-input, .editor-container [contenteditable="true"]');
    await expect(editor).toBeVisible();
    
    const initialValue = await editor.inputValue();
    await editor.fill(initialValue + ' Updated content for verification.');
    const updatedValue = await editor.inputValue();
    expect(updatedValue).toContain('Updated content for verification.');
  });

  test('Audio tags are highlighted with specific styling', async ({ page }) => {
    const editor = page.locator('[data-testid="script-editor"], .script-content-area');
    await editor.fill('This is a test [whispers] and then we [laughs].');
    
    const highlightedTag = page.locator('.audio-tag, [data-tag-type="audio"], span.highlight-whispers');
    await expect(highlightedTag.first()).toBeVisible();
    
    // Verify specific color/style application via class or computed style
    const color = await highlightedTag.first().evaluate((el) => window.getComputedStyle(el).color);
    expect(color).not.toBe('rgb(0, 0, 0)');
  });

  test('Section navigation sidebar displays all required segments', async ({ page }) => {
    const sidebar = page.locator('[data-testid="section-nav"], nav.script-sections, .sidebar-navigation');
    
    const sections = ['HOOK', 'CREDIBILITY', 'BODY', 'CLOSE'];
    for (const section of sections) {
      const sectionLink = sidebar.locator(`text=${section}, [data-section="${section}"]`);
      await expect(sectionLink).toBeVisible();
    }
  });

  test('Word count and estimated duration update in real-time', async ({ page }) => {
    const editor = page.locator('[data-testid="script-editor"], textarea.script-input');
    const wordCountDisplay = page.locator('[data-testid="word-count"], .stats-word-count');
    const durationDisplay = page.locator('[data-testid="duration-estimate"], .stats-duration');

    await editor.fill('One two three four five.');
    await expect(wordCountDisplay).toContainText('5');
    
    const initialDuration = await durationDisplay.innerText();
    
    // Add significant text to trigger duration change
    await editor.fill('This is a much longer sentence designed to ensure that the estimated duration calculation logic triggers a visible change in the UI display element.');
    
    const updatedDuration = await durationDisplay.innerText();
    expect(initialDuration).not.toBe(updatedDuration);
  });

  test('Save Changes button updates script in database', async ({ page }) => {
    const editor = page.locator('[data-testid="script-editor"], textarea.script-input');
    const saveButton = page.locator('[data-testid="save-button"], button:has-text("Save Changes")');
    
    await editor.fill('Database persistence test content ' + Math.random());
    
    const responsePromise = page.waitForResponse(resp => 
      resp.url().includes('/api/projects/') && 
      resp.request().method() === 'PATCH' || resp.request().method() === 'PUT'
    );
    
    await saveButton.click();
    
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    
    const successToast = page.locator('.toast-success, [data-testid="success-message"], text="Saved successfully"');
    await expect(successToast).toBeVisible();
  });

  test('Proceed to Generation button navigates to generation page', async ({ page }) => {
    const proceedButton = page.locator('[data-testid="proceed-button"], button:has-text("Proceed to Generation")');
    
    await proceedButton.click();
    
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/generate`));
  });

  test('Error handling: prevents saving with empty content', async ({ page }) => {
    const editor = page.locator('[data-testid="script-editor"], textarea.script-input');
    const saveButton = page.locator('[data-testid="save-button"], button:has-text("Save Changes")');

    // Clear the editor
    await editor.fill('');
    await saveButton.click();

    const errorMessage = page.locator('.error-message, [role="alert"], text="cannot be empty"');
    await expect(errorMessage).toBeVisible();
    
    // Ensure no successful API call was made for empty data
    page.on('response', response => {
      if (response.url().includes('/api/projects/') && response.request().method() === 'PATCH') {
        expect(response.status()).not.toBe(200);
      }
    });
  });
});
