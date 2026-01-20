import { test, expect } from '@playwright/test';

test.describe('US-001: Contact Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
  });

  // Happy path tests
  test('US-001: should display form with all required fields', async ({ page }) => {
    // Verify form structure
    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Message')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send Message' })).toBeVisible();
  });

  test('US-001: should show success message after valid submission', async ({ page }) => {
    // INPUT: Fill form with valid data
    await page.getByLabel('Name').fill('John Doe');
    await page.getByLabel('Email').fill('john@example.com');
    await page.getByLabel('Message').fill('Hello, I have a question about your services.');

    // ACTION: Submit form
    await page.getByRole('button', { name: 'Send Message' }).click();

    // VERIFY: Success message appears
    await expect(page.getByText("Thank you! We'll be in touch.")).toBeVisible();
  });

  // Error case tests
  test('US-001: should show error when fields are empty', async ({ page }) => {
    // ACTION: Click submit without filling form
    await page.getByRole('button', { name: 'Send Message' }).click();

    // VERIFY: Error message appears
    await expect(page.getByText('Please fill all fields')).toBeVisible();
  });

  test('US-001: should show error when only name is filled', async ({ page }) => {
    // INPUT: Fill only name
    await page.getByLabel('Name').fill('John Doe');

    // ACTION: Submit
    await page.getByRole('button', { name: 'Send Message' }).click();

    // VERIFY: Error for empty fields
    await expect(page.getByText('Please fill all fields')).toBeVisible();
  });

  test('US-001: should show error when email format is invalid', async ({ page }) => {
    // INPUT: Fill form with invalid email
    await page.getByLabel('Name').fill('John Doe');
    await page.getByLabel('Email').fill('invalid-email');
    await page.getByLabel('Message').fill('Test message');

    // ACTION: Submit
    await page.getByRole('button', { name: 'Send Message' }).click();

    // VERIFY: Email validation error
    await expect(page.getByText('Invalid email address')).toBeVisible();
  });

  test('US-001: should show error for email without domain', async ({ page }) => {
    // INPUT: Email missing domain
    await page.getByLabel('Name').fill('Jane Smith');
    await page.getByLabel('Email').fill('jane@');
    await page.getByLabel('Message').fill('Another test');

    // ACTION: Submit
    await page.getByRole('button', { name: 'Send Message' }).click();

    // VERIFY: Email validation error
    await expect(page.getByText('Invalid email address')).toBeVisible();
  });

  // Persistence test - Input → Action → Verify → Reload → Verify
  test('US-001: should persist data after successful submission and reload', async ({ page }) => {
    // INPUT: Fill and submit valid form
    await page.getByLabel('Name').fill('Persistent User');
    await page.getByLabel('Email').fill('persist@example.com');
    await page.getByLabel('Message').fill('This should persist');

    // ACTION: Submit form
    await page.getByRole('button', { name: 'Send Message' }).click();

    // VERIFY: Success message
    await expect(page.getByText("Thank you! We'll be in touch.")).toBeVisible();

    // RELOAD: Fresh page load
    await page.reload();

    // VERIFY PERSISTENCE: Data survived reload
    await expect(page.getByText('Persistent User')).toBeVisible();
  });

  // Edge cases
  test('US-001: should handle whitespace-only input as empty', async ({ page }) => {
    // INPUT: Fill with whitespace only
    await page.getByLabel('Name').fill('   ');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Message').fill('Valid message');

    // ACTION: Submit
    await page.getByRole('button', { name: 'Send Message' }).click();

    // VERIFY: Treated as empty field
    await expect(page.getByText('Please fill all fields')).toBeVisible();
  });

  test('US-001: should accept valid email formats', async ({ page }) => {
    // INPUT: Various valid email formats
    await page.getByLabel('Name').fill('Test User');
    await page.getByLabel('Email').fill('user.name+tag@subdomain.example.com');
    await page.getByLabel('Message').fill('Testing complex email');

    // ACTION: Submit
    await page.getByRole('button', { name: 'Send Message' }).click();

    // VERIFY: Success (no email error)
    await expect(page.getByText("Thank you! We'll be in touch.")).toBeVisible();
  });
});
