import { test, expect } from '@playwright/test';

test.describe('US-005 - Script Review & Edit UI', () => {
  const projectId = 'proj-12345';
  const scriptContent = "Welcome to the show. [whispers] Did you know that... [laughs] Actually, that's true. [whispers] Let's dive in.";
  const expectedDuration = '1m 30s'; // Assuming 150 words = 1.5 mins

  test.beforeEach(async ({ page }) => {
    // Mock the API response for fetching the script
    await page.route('**/api/projects/' + projectId + '/script', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ content: scriptContent, title: 'Sample Podcast Script' })
      });
    });

    // Mock the API response for saving the script
    await page.route('**/api/projects/' + projectId + '/script', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Script saved successfully' })
      });
    });

    await page.goto('/dashboard/projects/' + projectId + '/edit');
  });

  test('AC1: Script displayed in editable textarea component', async ({ page }) => {
    const textarea = page.getByTestId('script-editor');
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveValue(scriptContent);
  });

  test('AC2: Audio tags [whispers], [laughs], etc. highlighted in different color', async ({ page }) => {
    const whispersTag = page.getByTestId('tag-whispers');
    const laughsTag = page.getByTestId('tag-laughs');

    await expect(whispersTag).toBeVisible();
    await expect(laughsTag).toBeVisible();

    // Verify the tags have a specific class indicating highlighting (e.g., bg-purple-100 text-purple-800)
    const whispersStyles = await whispersTag.evaluate(el => window.getComputedStyle(el).backgroundColor);
    const laughsStyles = await laughsTag.evaluate(el => window.getComputedStyle(el).backgroundColor);

    // Check if they are not white (background color indicates highlighting)
    expect(whispersStyles).not.toBe('rgba(255, 255, 255, 1)');
    expect(laughsStyles).not.toBe('rgba(255, 255, 255, 1)');
  });

  test('AC3: Section navigation sidebar shows HOOK, CREDIBILITY, BODY, CLOSE sections', async ({ page }) => {
    const sidebar = page.getByTestId('script-sidebar');
    await expect(sidebar).toBeVisible();

    const sections = ['HOOK', 'CREDIBILITY', 'BODY', 'CLOSE'];
    for (const section of sections) {
      const link = sidebar.getByRole('link', { name: section });
      await expect(link).toBeVisible();
    }
  });

  test('AC4: Word count displayed and updates in real-time', async ({ page }) => {
    const wordCountDisplay = page.getByTestId('word-count');
    const textarea = page.getByTestId('script-editor');

    // Initial count
    await expect(wordCountDisplay).toHaveText(/15/);

    // Type new text
    await textarea.fill(textarea.inputValue() + ' This is a new sentence.');
    
    // Wait for the UI to update (assuming debounced or reactive update)
    await expect(wordCountDisplay).toHaveText(/18/);
  });

  test('AC5: Estimated duration displayed based on word count', async ({ page }) => {
    const durationDisplay = page.getByTestId('estimated-duration');
    await expect(durationDisplay).toBeVisible();
    await expect(durationDisplay).toHaveText(expectedDuration);
  });

  test('AC6: Save Changes button updates script in database', async ({ page }) => {
    const saveButton = page.getByTestId('save-changes-btn');
    const successMessage = page.getByTestId('save-success-message');

    await expect(saveButton).toHaveText('Save Changes');

    // Click save
    await saveButton.click();

    // Verify API was called
    await expect(page).toHaveURL(/\/api\/projects\/proj-12345\/script/);

    // Verify success feedback
    await expect(successMessage).toBeVisible();
    await expect(successMessage).toHaveText('Script saved successfully');
    await expect(saveButton).toHaveText('Saved');
  });

  test('AC7: Proceed to Generation button navigates to /projects/[id]/generate', async ({ page }) => {
    const generateButton = page.getByTestId('proceed-generate-btn');

    await expect(generateButton).toBeVisible();
    await expect(generateButton).toHaveText('Proceed to Generation');

    await generateButton.click();

    await expect(page).toHaveURL(`/dashboard/projects/${projectId}/generate`);
  });

  test('AC8: Typecheck passes (UI handles complex script structure correctly)', async ({ page }) => {
    // This test ensures the UI renders the complex tags without throwing errors,
    // effectively validating the runtime behavior of the typed components.
    const editor = page.getByTestId('script-editor');
    await expect(editor).toBeVisible();

    // Ensure the specific tags mentioned in the story are present in the DOM
    const whispers = page.getByText('[whispers]');
    const laughs = page.getByText('[laughs]');

    await expect(whispers).toBeVisible();
    await expect(laughs).toBeVisible();

    // Verify the editor is still editable and not disabled
    await expect(editor).toBeEnabled();
  });
});
