# Learned Patterns - YouTube Video Generator

This file contains patterns discovered during implementation.
READ THIS FIRST in every session to avoid repeating mistakes.

---

## Project-Specific Context

### Tech Stack
- **Frontend**: Next.js 14+, TypeScript, Tailwind CSS, Shadcn/ui
- **Backend**: Supabase (PostgreSQL + Storage + Edge Functions)
- **APIs**:
  - kie.ai for TTS (`elevenlabs/text-to-dialogue-v3`)
  - kie.ai for images (`z-image`)
- **Video**: FFmpeg via fluent-ffmpeg

### Environment Variables
```env
KIE_API_KEY=907178952e355c5ade0e16ed065e283c
NEXT_PUBLIC_SUPABASE_URL=https://bijxpepuyfekzpvtwuqi.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_9pWTPsMdgbCx9sVpyAFCJQ_fK6whm8o
```

---

## kie.ai API Patterns

### Image Generation (z-image)
**Endpoint**: `POST https://api.kie.ai/api/v1/jobs/createTask`
**Pattern**:
```typescript
const response = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.KIE_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'z-image',
    input: {
      prompt: 'Cinematic scene description...',
      aspect_ratio: '16:9'  // YouTube standard
    },
    callBackUrl: 'https://bijxpepuyfekzpvtwuqi.supabase.co/functions/v1/kie-callback'
  })
});
```

### Audio Generation (text-to-dialogue-v3)
**Endpoint**: `POST https://api.kie.ai/api/v1/jobs/createTask`
**Pattern**:
```typescript
const response = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.KIE_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'elevenlabs/text-to-dialogue-v3',
    input: {
      text: 'Script with [whispers] audio [laughs] tags...',
      stability: 0.5,
      language_code: 'en'
    },
    callBackUrl: 'https://bijxpepuyfekzpvtwuqi.supabase.co/functions/v1/kie-callback'
  })
});
```

### Callback Payload Structure
**Problem**: Need to map taskId back to correct database record
**Solution**: Store taskId with record type (image/audio/thumbnail)
**Pattern**:
```typescript
// Callback payload from kie.ai:
{
  taskId: "...",
  model: "z-image",
  state: "success" | "fail",
  resultJson: '{"resultUrls":["https://..."]}',
  failCode: null | "error_code",
  failMsg: null | "error message"
}

// Database record should have:
{
  id: uuid,
  task_id: "kie.ai taskId",
  type: "image" | "audio" | "thumbnail",
  project_id: uuid,
  status: "pending" | "processing" | "complete" | "failed"
}
```

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

### Testing Supabase Integration
**Problem**: Real Supabase calls in tests
**Solution**: Mock Supabase client or use test database
**Pattern**:
```typescript
// In test setup:
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ data: [], error: null }),
      insert: vi.fn().mockReturnValue({ data: { id: 'test-id' }, error: null })
    })
  }
}));
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

### Supabase Storage Upload
**Problem**: File upload fails
**Solution**: Use correct bucket name and path format
**Pattern**:
```typescript
const { data, error } = await supabase.storage
  .from('images')  // bucket name
  .upload(`projects/${projectId}/${filename}`, file, {
    contentType: 'image/png',
    upsert: true
  });

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('images')
  .getPublicUrl(`projects/${projectId}/${filename}`);
```

### FFmpeg Ken Burns Effect
**Problem**: Ken Burns zoom looks choppy
**Solution**: Use zoompan filter with smooth interpolation
**Pattern**:
```bash
ffmpeg -i image.png -vf "zoompan=z='min(zoom+0.001,1.1)':d=150:s=1920x1080" output.mp4
```

### Script Parsing for Image Segments
**Problem**: Need consistent ~5 second segments
**Solution**: Split by word count (~12-15 words = 5 seconds at normal pace)
**Pattern**:
```typescript
const WORDS_PER_SEGMENT = 13;  // ~5 seconds
const words = script.split(/\s+/);
const segments: string[] = [];

for (let i = 0; i < words.length; i += WORDS_PER_SEGMENT) {
  segments.push(words.slice(i, i + WORDS_PER_SEGMENT).join(' '));
}
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

### kie.ai Rate Limiting
**Problem**: 429 errors when generating many images
**Solution**: Add delay between requests
**Pattern**:
```typescript
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

for (const segment of segments) {
  await generateImage(segment);
  await delay(500);  // 500ms between requests
}
```

### Supabase Edge Function Timeout
**Problem**: Edge function times out processing callback
**Solution**: Keep edge function lightweight, use queues for heavy work
**Pattern**: Edge function only updates DB, separate worker does heavy processing

---

## Database Schema Reference

```sql
-- projects table
create table projects (
  id uuid default gen_random_uuid() primary key,
  headline text not null,
  duration int not null default 15,
  tone text not null default 'educational',
  status text not null default 'draft',
  video_url text,
  selected_thumbnail_url text,
  created_at timestamp with time zone default now()
);

-- scripts table
create table scripts (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  content text not null,
  clean_content text, -- without audio tags
  word_count int,
  estimated_duration int,
  created_at timestamp with time zone default now()
);

-- images table (for generated scene images)
create table images (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  task_id text unique, -- kie.ai taskId
  prompt text not null,
  url text,
  status text not null default 'pending',
  sequence_order int not null,
  error_message text,
  created_at timestamp with time zone default now()
);

-- audio_segments table
create table audio_segments (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  task_id text unique, -- kie.ai taskId
  url text,
  duration_seconds float,
  status text not null default 'pending',
  error_message text,
  created_at timestamp with time zone default now()
);

-- thumbnails table
create table thumbnails (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  task_id text unique, -- kie.ai taskId
  prompt text not null,
  url text,
  status text not null default 'pending',
  variation_number int not null, -- 1, 2, or 3
  error_message text,
  created_at timestamp with time zone default now()
);

-- seo_metadata table
create table seo_metadata (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  description text,
  titles jsonb, -- array of 3 title variations
  tags jsonb, -- array of tag strings
  created_at timestamp with time zone default now()
);
```

---

## CRITICAL: API Key Safety (2026-01-21 - US-028 $50 Disaster)

### What Happened
During US-028 testing, 5000+ images were generated through kie.ai, burning ~$50 because:

1. **TEST_MODE was NOT in .env.local** - only set in playwright.config.ts
2. **reuseExistingServer: true** in playwright.config.ts - Playwright skipped starting fresh server
3. **No hard limits in code** - loops called API without MAX_ITEMS check

### The Async API Trap

**MONEY IS CHARGED ON createTask, NOT on callback!**

```
POST /api/v1/jobs/createTask → Returns taskId → CHARGED NOW (~$0.01/image)
         ↓
Wait for callback (minutes later)
         ↓
Get resultUrls → Image ready, but you already paid!
```

You CANNOT cancel after createTask. The callback just tells you when processing is done.

### Mandatory Safety Rules

#### 1. Always have TEST_MODE=true in .env.local
```bash
# .env.local - REQUIRED
TEST_MODE=true
```

#### 2. Set reuseExistingServer: false in playwright.config.ts
```typescript
webServer: {
  reuseExistingServer: false,  // ← CRITICAL
  env: { TEST_MODE: 'true' }
}
```

#### 3. Add hard limits in API routes
```typescript
const MAX_IMAGES_DEV = 5;
if (!process.env.PRODUCTION && segments.length > MAX_IMAGES_DEV) {
  segments = segments.slice(0, MAX_IMAGES_DEV);
}
```

#### 4. Test ONE call before enabling loops
```
CORRECT: Single call → Wait callback → Verify → Enable loop
WRONG:   Write loop → Run tests → $50 charge
```

### Pre-Flight Checklist
Before ANY test involving paid APIs:
- [ ] TEST_MODE=true in .env.local?
- [ ] reuseExistingServer: false?
- [ ] Tested single API call manually?
- [ ] Hard limits in loop code?
- [ ] Spending alerts set on API accounts?

---

## Add New Patterns Below

(New patterns will be added here as they are discovered during implementation)
