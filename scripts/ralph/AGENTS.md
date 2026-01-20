# Learned Patterns

This file contains patterns discovered during implementation.
READ THIS FIRST in every session to avoid repeating mistakes.

---

## Testing Patterns

### Playwright Selectors
**Problem**: Tests fail with "element not found"
**Solution**: Use role-based selectors when possible
**Pattern**:
```typescript
// Prefer this:
page.getByRole('button', { name: 'Submit' })

// Over this:
page.locator('button.submit-btn')
```

### Async Operations
**Problem**: Tests flaky due to timing
**Solution**: Use Playwright's auto-waiting, add explicit waits for network
**Pattern**:
```typescript
// Wait for API response
const responsePromise = page.waitForResponse('/api/endpoint');
await page.getByRole('button', { name: 'Submit' }).click();
await responsePromise;
```

### Form Validation
**Problem**: Validation errors not triggering
**Solution**: Trigger blur event after filling input
**Pattern**:
```typescript
await page.getByLabel('Email').fill('invalid');
await page.getByLabel('Email').blur();  // Triggers validation
await expect(page.getByText('Invalid email')).toBeVisible();
```

---

## Implementation Patterns

### API Routes
**Problem**: API endpoint not matching what tests expect
**Solution**: Check test file for exact endpoint path
**Pattern**: Tests define the contract, implementation follows

### Component Structure
**Problem**: Selectors don't match
**Solution**: Add data-testid attributes matching test expectations
**Pattern**:
```tsx
// If test uses: page.getByTestId('contact-form')
<form data-testid="contact-form">
```

---

## Error Recovery Patterns

### Test Changed Instead of Code
**Problem**: Builder modified test file
**Solution**: Hook blocks this automatically now
**Pattern**: If you see "BLOCKED" message, fix code not tests

### Incomplete Validation
**Problem**: Marked complete without all checks passing
**Solution**: Hook checks all checkpoints before allowing completion
**Pattern**: Cannot skip validation steps

---

## Add New Patterns Below

(New patterns will be added here as they are discovered)
