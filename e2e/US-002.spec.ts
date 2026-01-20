import { test, expect } from '@playwright/test';

/**
 * US-002: User Profile - View and Edit
 *
 * Feature: User can view and edit their profile
 * Page: /profile
 *
 * ACCEPTANCE CRITERIA:
 * AC-1: Display user's name and email
 * AC-2: Edit button opens edit mode
 * AC-3: Save button persists changes
 * AC-4: Cancel button discards changes
 *
 * TEST STATUS: All tests will FAIL until implementation exists
 * This is the RED phase of TDD - tests define expected behavior
 */

test.describe('US-002: User Profile', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to profile page before each test
    // Tests will FAIL: /profile page does not exist yet
    await page.goto('/profile');
  });

  // ==========================================================================
  // AC-1: Display user's name and email
  // ==========================================================================
  test.describe('AC-1: Display user information', () => {

    test('should display user name on profile page (AC-1)', async ({ page }) => {
      // VERIFY: User name is visible on the page
      // WILL FAIL: No profile page exists, no name element rendered
      await expect(page.getByTestId('user-name')).toBeVisible();
    });

    test('should display user email on profile page (AC-1)', async ({ page }) => {
      // VERIFY: User email is visible on the page
      // WILL FAIL: No profile page exists, no email element rendered
      await expect(page.getByTestId('user-email')).toBeVisible();
    });

    test('should display both name and email in view mode by default (AC-1)', async ({ page }) => {
      // VERIFY: Profile displays in read-only view mode initially
      // WILL FAIL: No profile page with view mode implemented
      await expect(page.getByTestId('profile-view-mode')).toBeVisible();
      await expect(page.getByTestId('user-name')).toBeVisible();
      await expect(page.getByTestId('user-email')).toBeVisible();
    });

    test('should display name and email as non-editable text in view mode (AC-1)', async ({ page }) => {
      // VERIFY: In view mode, fields are not input elements (read-only display)
      // WILL FAIL: No profile view mode implemented
      const nameElement = page.getByTestId('user-name');
      const emailElement = page.getByTestId('user-email');

      // These should be display elements, not input fields in view mode
      await expect(nameElement).not.toHaveAttribute('contenteditable', 'true');
      await expect(emailElement).not.toHaveAttribute('contenteditable', 'true');
    });
  });

  // ==========================================================================
  // AC-2: Edit button opens edit mode
  // ==========================================================================
  test.describe('AC-2: Edit button functionality', () => {

    test('should display an Edit button on profile page (AC-2)', async ({ page }) => {
      // VERIFY: Edit button exists and is visible
      // WILL FAIL: No Edit button rendered
      await expect(page.getByRole('button', { name: /edit/i })).toBeVisible();
    });

    test('should switch to edit mode when Edit button is clicked (AC-2)', async ({ page }) => {
      // ACTION: Click the Edit button
      // WILL FAIL: No Edit button exists
      await page.getByRole('button', { name: /edit/i }).click();

      // VERIFY: Edit mode is now active
      // WILL FAIL: No edit mode implementation
      await expect(page.getByTestId('profile-edit-mode')).toBeVisible();
    });

    test('should display editable name input field in edit mode (AC-2)', async ({ page }) => {
      // ACTION: Enter edit mode
      await page.getByRole('button', { name: /edit/i }).click();

      // VERIFY: Name input field is visible and editable
      // WILL FAIL: No edit mode with name input
      const nameInput = page.getByTestId('name-input');
      await expect(nameInput).toBeVisible();
      await expect(nameInput).toBeEditable();
    });

    test('should display editable email input field in edit mode (AC-2)', async ({ page }) => {
      // ACTION: Enter edit mode
      await page.getByRole('button', { name: /edit/i }).click();

      // VERIFY: Email input field is visible and editable
      // WILL FAIL: No edit mode with email input
      const emailInput = page.getByTestId('email-input');
      await expect(emailInput).toBeVisible();
      await expect(emailInput).toBeEditable();
    });

    test('should pre-populate input fields with current values in edit mode (AC-2)', async ({ page }) => {
      // First capture current display values
      const currentName = await page.getByTestId('user-name').textContent();
      const currentEmail = await page.getByTestId('user-email').textContent();

      // ACTION: Enter edit mode
      await page.getByRole('button', { name: /edit/i }).click();

      // VERIFY: Input fields contain current values
      // WILL FAIL: No pre-population of edit fields
      await expect(page.getByTestId('name-input')).toHaveValue(currentName ?? '');
      await expect(page.getByTestId('email-input')).toHaveValue(currentEmail ?? '');
    });

    test('should hide Edit button when in edit mode (AC-2)', async ({ page }) => {
      // ACTION: Enter edit mode
      await page.getByRole('button', { name: /edit/i }).click();

      // VERIFY: Edit button is no longer visible (replaced by Save/Cancel)
      // WILL FAIL: No mode switching logic
      await expect(page.getByRole('button', { name: /edit/i })).not.toBeVisible();
    });
  });

  // ==========================================================================
  // AC-3: Save button persists changes
  // ==========================================================================
  test.describe('AC-3: Save button functionality', () => {

    test('should display Save button in edit mode (AC-3)', async ({ page }) => {
      // ACTION: Enter edit mode
      await page.getByRole('button', { name: /edit/i }).click();

      // VERIFY: Save button is visible
      // WILL FAIL: No Save button in edit mode
      await expect(page.getByRole('button', { name: /save/i })).toBeVisible();
    });

    test('should save name changes when Save is clicked (AC-3)', async ({ page }) => {
      // ACTION: Enter edit mode
      await page.getByRole('button', { name: /edit/i }).click();

      // INPUT: Change the name
      const newName = 'Updated Test Name';
      await page.getByTestId('name-input').clear();
      await page.getByTestId('name-input').fill(newName);

      // ACTION: Click Save
      await page.getByRole('button', { name: /save/i }).click();

      // VERIFY: Changes are saved and displayed
      // WILL FAIL: No save functionality
      await expect(page.getByTestId('user-name')).toHaveText(newName);
    });

    test('should save email changes when Save is clicked (AC-3)', async ({ page }) => {
      // ACTION: Enter edit mode
      await page.getByRole('button', { name: /edit/i }).click();

      // INPUT: Change the email
      const newEmail = 'updated@example.com';
      await page.getByTestId('email-input').clear();
      await page.getByTestId('email-input').fill(newEmail);

      // ACTION: Click Save
      await page.getByRole('button', { name: /save/i }).click();

      // VERIFY: Changes are saved and displayed
      // WILL FAIL: No save functionality
      await expect(page.getByTestId('user-email')).toHaveText(newEmail);
    });

    test('should return to view mode after successful save (AC-3)', async ({ page }) => {
      // ACTION: Enter edit mode
      await page.getByRole('button', { name: /edit/i }).click();

      // INPUT: Make a change
      await page.getByTestId('name-input').fill('Any Name');

      // ACTION: Click Save
      await page.getByRole('button', { name: /save/i }).click();

      // VERIFY: Returns to view mode
      // WILL FAIL: No mode transition after save
      await expect(page.getByTestId('profile-view-mode')).toBeVisible();
      await expect(page.getByRole('button', { name: /edit/i })).toBeVisible();
    });

    test('should persist changes after page reload (AC-3)', async ({ page }) => {
      // ACTION: Enter edit mode
      await page.getByRole('button', { name: /edit/i }).click();

      // INPUT: Change both name and email
      const newName = 'Persistent Name';
      const newEmail = 'persistent@example.com';
      await page.getByTestId('name-input').clear();
      await page.getByTestId('name-input').fill(newName);
      await page.getByTestId('email-input').clear();
      await page.getByTestId('email-input').fill(newEmail);

      // ACTION: Save changes
      await page.getByRole('button', { name: /save/i }).click();

      // CRITICAL: Reload the page
      await page.reload();

      // VERIFY PERSISTENCE: Data survived reload
      // WILL FAIL: No persistence mechanism
      await expect(page.getByTestId('user-name')).toHaveText(newName);
      await expect(page.getByTestId('user-email')).toHaveText(newEmail);
    });

    test('should show success feedback after saving (AC-3)', async ({ page }) => {
      // ACTION: Enter edit mode and make changes
      await page.getByRole('button', { name: /edit/i }).click();
      await page.getByTestId('name-input').fill('Success Test');

      // ACTION: Save
      await page.getByRole('button', { name: /save/i }).click();

      // VERIFY: Success message or indicator shown
      // WILL FAIL: No success feedback implemented
      await expect(page.getByText(/saved|success|updated/i)).toBeVisible();
    });
  });

  // ==========================================================================
  // AC-4: Cancel button discards changes
  // ==========================================================================
  test.describe('AC-4: Cancel button functionality', () => {

    test('should display Cancel button in edit mode (AC-4)', async ({ page }) => {
      // ACTION: Enter edit mode
      await page.getByRole('button', { name: /edit/i }).click();

      // VERIFY: Cancel button is visible
      // WILL FAIL: No Cancel button in edit mode
      await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
    });

    test('should discard name changes when Cancel is clicked (AC-4)', async ({ page }) => {
      // Capture original name
      const originalName = await page.getByTestId('user-name').textContent();

      // ACTION: Enter edit mode
      await page.getByRole('button', { name: /edit/i }).click();

      // INPUT: Change the name
      await page.getByTestId('name-input').clear();
      await page.getByTestId('name-input').fill('This Should Be Discarded');

      // ACTION: Click Cancel
      await page.getByRole('button', { name: /cancel/i }).click();

      // VERIFY: Original name is still displayed (change was discarded)
      // WILL FAIL: No cancel functionality
      await expect(page.getByTestId('user-name')).toHaveText(originalName ?? '');
    });

    test('should discard email changes when Cancel is clicked (AC-4)', async ({ page }) => {
      // Capture original email
      const originalEmail = await page.getByTestId('user-email').textContent();

      // ACTION: Enter edit mode
      await page.getByRole('button', { name: /edit/i }).click();

      // INPUT: Change the email
      await page.getByTestId('email-input').clear();
      await page.getByTestId('email-input').fill('discarded@example.com');

      // ACTION: Click Cancel
      await page.getByRole('button', { name: /cancel/i }).click();

      // VERIFY: Original email is still displayed
      // WILL FAIL: No cancel functionality
      await expect(page.getByTestId('user-email')).toHaveText(originalEmail ?? '');
    });

    test('should return to view mode when Cancel is clicked (AC-4)', async ({ page }) => {
      // ACTION: Enter edit mode
      await page.getByRole('button', { name: /edit/i }).click();

      // ACTION: Click Cancel
      await page.getByRole('button', { name: /cancel/i }).click();

      // VERIFY: Returns to view mode
      // WILL FAIL: No mode transition on cancel
      await expect(page.getByTestId('profile-view-mode')).toBeVisible();
      await expect(page.getByRole('button', { name: /edit/i })).toBeVisible();
    });

    test('should not persist cancelled changes after reload (AC-4)', async ({ page }) => {
      // Capture original values
      const originalName = await page.getByTestId('user-name').textContent();
      const originalEmail = await page.getByTestId('user-email').textContent();

      // ACTION: Enter edit mode and make changes
      await page.getByRole('button', { name: /edit/i }).click();
      await page.getByTestId('name-input').fill('Should Not Persist');
      await page.getByTestId('email-input').fill('notpersisted@example.com');

      // ACTION: Cancel changes
      await page.getByRole('button', { name: /cancel/i }).click();

      // CRITICAL: Reload the page
      await page.reload();

      // VERIFY: Original data is still there (cancelled changes were not saved)
      // WILL FAIL: No persistence/cancel logic
      await expect(page.getByTestId('user-name')).toHaveText(originalName ?? '');
      await expect(page.getByTestId('user-email')).toHaveText(originalEmail ?? '');
    });
  });

  // ==========================================================================
  // EDGE CASES AND ERROR SCENARIOS
  // ==========================================================================
  test.describe('Edge Cases', () => {

    test('should handle empty name field on save attempt', async ({ page }) => {
      // ACTION: Enter edit mode
      await page.getByRole('button', { name: /edit/i }).click();

      // INPUT: Clear the name field
      await page.getByTestId('name-input').clear();

      // ACTION: Try to save
      await page.getByRole('button', { name: /save/i }).click();

      // VERIFY: Validation error is shown
      // WILL FAIL: No validation implemented
      await expect(page.getByText(/name.*required|cannot be empty/i)).toBeVisible();
    });

    test('should handle invalid email format on save attempt', async ({ page }) => {
      // ACTION: Enter edit mode
      await page.getByRole('button', { name: /edit/i }).click();

      // INPUT: Enter invalid email
      await page.getByTestId('email-input').clear();
      await page.getByTestId('email-input').fill('not-a-valid-email');

      // ACTION: Try to save
      await page.getByRole('button', { name: /save/i }).click();

      // VERIFY: Email validation error is shown
      // WILL FAIL: No email validation
      await expect(page.getByText(/invalid email|email.*valid/i)).toBeVisible();
    });

    test('should handle whitespace-only name as invalid', async ({ page }) => {
      // ACTION: Enter edit mode
      await page.getByRole('button', { name: /edit/i }).click();

      // INPUT: Enter whitespace-only name
      await page.getByTestId('name-input').clear();
      await page.getByTestId('name-input').fill('   ');

      // ACTION: Try to save
      await page.getByRole('button', { name: /save/i }).click();

      // VERIFY: Treated as empty/invalid
      // WILL FAIL: No whitespace validation
      await expect(page.getByText(/name.*required|cannot be empty/i)).toBeVisible();
    });

    test('should trim whitespace from name before saving', async ({ page }) => {
      // ACTION: Enter edit mode
      await page.getByRole('button', { name: /edit/i }).click();

      // INPUT: Enter name with leading/trailing whitespace
      await page.getByTestId('name-input').clear();
      await page.getByTestId('name-input').fill('  Trimmed Name  ');

      // ACTION: Save
      await page.getByRole('button', { name: /save/i }).click();

      // VERIFY: Name is trimmed
      // WILL FAIL: No trim logic
      await expect(page.getByTestId('user-name')).toHaveText('Trimmed Name');
    });

    test('should preserve special characters in name', async ({ page }) => {
      // ACTION: Enter edit mode
      await page.getByRole('button', { name: /edit/i }).click();

      // INPUT: Enter name with special characters
      const specialName = "O'Brien-Smith Jr.";
      await page.getByTestId('name-input').clear();
      await page.getByTestId('name-input').fill(specialName);

      // ACTION: Save
      await page.getByRole('button', { name: /save/i }).click();

      // VERIFY: Special characters preserved
      // WILL FAIL: No implementation
      await expect(page.getByTestId('user-name')).toHaveText(specialName);
    });

    test('should handle very long name input', async ({ page }) => {
      // ACTION: Enter edit mode
      await page.getByRole('button', { name: /edit/i }).click();

      // INPUT: Enter very long name (over 100 characters)
      const longName = 'A'.repeat(150);
      await page.getByTestId('name-input').clear();
      await page.getByTestId('name-input').fill(longName);

      // ACTION: Try to save
      await page.getByRole('button', { name: /save/i }).click();

      // VERIFY: Either truncated or error shown (implementation choice)
      // WILL FAIL: No length validation
      const savedName = await page.getByTestId('user-name').textContent();
      expect(savedName?.length).toBeLessThanOrEqual(100);
    });

    test('should not allow saving when no changes made', async ({ page }) => {
      // ACTION: Enter edit mode without making changes
      await page.getByRole('button', { name: /edit/i }).click();

      // ACTION: Try to save
      await page.getByRole('button', { name: /save/i }).click();

      // VERIFY: Either Save button disabled or no action taken
      // WILL FAIL: No "no changes" detection
      await expect(page.getByTestId('profile-view-mode')).toBeVisible();
    });
  });

  // ==========================================================================
  // ACCESSIBILITY TESTS
  // ==========================================================================
  test.describe('Accessibility', () => {

    test('should have accessible labels for form inputs', async ({ page }) => {
      // ACTION: Enter edit mode
      await page.getByRole('button', { name: /edit/i }).click();

      // VERIFY: Inputs have proper labels for screen readers
      // WILL FAIL: No accessibility implementation
      await expect(page.getByLabel(/name/i)).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
    });

    test('should be navigable by keyboard', async ({ page }) => {
      // VERIFY: Edit button is focusable
      // WILL FAIL: No profile page
      await page.getByRole('button', { name: /edit/i }).focus();
      await expect(page.getByRole('button', { name: /edit/i })).toBeFocused();

      // ACTION: Press Enter to activate
      await page.keyboard.press('Enter');

      // VERIFY: Edit mode activated
      await expect(page.getByTestId('profile-edit-mode')).toBeVisible();
    });

    test('should announce changes to screen readers', async ({ page }) => {
      // ACTION: Enter edit mode and save
      await page.getByRole('button', { name: /edit/i }).click();
      await page.getByTestId('name-input').fill('Accessibility Test');
      await page.getByRole('button', { name: /save/i }).click();

      // VERIFY: Success message has appropriate ARIA role
      // WILL FAIL: No ARIA implementation
      const successMessage = page.getByRole('status');
      await expect(successMessage).toBeVisible();
    });
  });
});
