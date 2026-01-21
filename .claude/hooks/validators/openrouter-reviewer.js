#!/usr/bin/env node
/**
 * OpenRouter Reviewer v4.0 - External AI for test writing and evidence review
 *
 * Uses GLM-4.7-flash via OpenRouter API (very cheap, very fast)
 *
 * Commands:
 *   write-tests <story-id>  - Generate Playwright tests from acceptance criteria
 *   review <story-id>       - Review evidence package and approve/reject
 *   status                  - Check API connection status
 *
 * Environment:
 *   OPENROUTER_API_KEY - Required API key from OpenRouter
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============================================================================
// CONFIGURATION
// ============================================================================

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Available models (can be overridden via --model flag)
const MODELS = {
  'glm': 'z-ai/glm-4.7-flash',           // Very cheap: $0.01/1M tokens
  'gemini': 'google/gemini-2.0-flash-001', // Google Gemini 2.0 Flash
  'gemini-25': 'google/gemini-2.5-flash',  // Gemini 2.5 Flash
  'gemini-3': 'google/gemini-3-flash-preview'  // Gemini 3 Flash Preview (latest)
};

// Default model
let MODEL = MODELS['glm'];

// Paths
const PRD_PATH = path.join('scripts', 'ralph', 'prd.json');
const EVIDENCE_DIR = path.join('scripts', 'ralph', 'evidence');
const REVIEWS_DIR = path.join('scripts', 'ralph', 'reviews');
const TESTS_DIR = path.join('e2e');
const VALIDATOR_RESULTS_DIR = path.join('.claude', 'validator-results');

// Load API key from .env.local
function getApiKey() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('ERROR: .env.local not found');
    console.error('Create it with: OPENROUTER_API_KEY=sk-or-v1-xxx');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/OPENROUTER_API_KEY=(.+)/);

  if (!match) {
    console.error('ERROR: OPENROUTER_API_KEY not found in .env.local');
    process.exit(1);
  }

  return match[1].trim();
}

// ============================================================================
// API HELPERS
// ============================================================================

async function callOpenRouter(messages, maxTokens = 4096) {
  const apiKey = getApiKey();

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/ralph-tdd',
      'X-Title': 'Ralph TDD v4.0'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: messages,
      max_tokens: maxTokens,
      temperature: 0.3  // Lower temperature for consistent output
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Load image as base64 data URL for vision models
 */
function loadImageAsBase64(imagePath) {
  if (!fs.existsSync(imagePath)) {
    return null;
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).toLowerCase();

  let mimeType = 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
  else if (ext === '.gif') mimeType = 'image/gif';
  else if (ext === '.webp') mimeType = 'image/webp';

  return {
    type: 'image_url',
    image_url: {
      url: `data:${mimeType};base64,${imageBuffer.toString('base64')}`
    }
  };
}

/**
 * Build multimodal message content with text and images
 */
function buildMultimodalContent(text, images = []) {
  const content = [{ type: 'text', text }];

  for (const img of images) {
    if (img) content.push(img);
  }

  return content;
}

// ============================================================================
// TEST WRITING
// ============================================================================

async function writeTests(storyId) {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`GLM TEST WRITER: ${storyId}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // Load PRD to get story details
  if (!fs.existsSync(PRD_PATH)) {
    console.error('ERROR: prd.json not found');
    process.exit(1);
  }

  const prd = JSON.parse(fs.readFileSync(PRD_PATH, 'utf8'));

  // Find the story
  let story = null;
  for (const task of prd.tasks || []) {
    for (const s of task.stories || []) {
      if (s.id === storyId) {
        story = s;
        break;
      }
    }
  }

  if (!story) {
    console.error(`ERROR: Story ${storyId} not found in prd.json`);
    process.exit(1);
  }

  console.log(`Story: ${story.title}`);
  console.log(`Acceptance Criteria: ${story.acceptanceCriteria?.length || 0}`);
  console.log('');
  console.log('Generating Playwright tests via GLM...');
  console.log('');

  // Build the prompt for test writing (v4.0 - improved anti-mock rules)
  const systemPrompt = `You are a senior QA engineer writing Playwright E2E tests for a Next.js application.

CRITICAL RULES - VIOLATIONS WILL BE REJECTED:

1. ABSOLUTELY NO MOCKING
   - NEVER use page.route() to mock API responses
   - NEVER use page.setRequestInterception()
   - NEVER fake any data - tests must hit REAL endpoints
   - Tests should verify the ACTUAL system works, not mocked responses

2. REALISTIC DATA ONLY
   - Use UUID format for IDs: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
   - NEVER use 'test-123', 'proj-12345', 'example.com', or similar fake patterns
   - If you need a project ID, use a realistic UUID

3. FLEXIBLE SELECTORS (always provide fallbacks)
   - BAD: page.getByTestId('button')
   - GOOD: page.locator('[data-testid="button"], button[type="submit"]')

4. TEST RESULTS, NOT ACTIONS
   - After clicking a button, verify the RESULT appeared (success message, new element, etc.)
   - NEVER check if page URL became an API URL (that doesn't happen!)
   - BAD: expect(page).toHaveURL(/api\/save/)
   - GOOD: expect(page.locator('.success-message')).toBeVisible()

5. INCLUDE ERROR HANDLING TESTS
   - At least one test should verify error states
   - Test what happens with empty inputs, invalid data, etc.

Output ONLY the test code. Use TypeScript. No explanations.`;

  const userPrompt = `Write Playwright E2E tests for this user story:

STORY ID: ${storyId}
TITLE: ${story.title}

ACCEPTANCE CRITERIA:
${(story.acceptanceCriteria || []).map((ac, i) => `${i + 1}. ${ac}`).join('\n')}

${story.user_stories ? `
USER STORIES (Gherkin):
${story.user_stories.map(us => `
Scenario: ${us.scenario}
Given: ${us.given?.join('\n  And ')}
When: ${us.when?.join('\n  And ')}
Then: ${us.then?.join('\n  And ')}
`).join('\n')}
` : ''}

STRUCTURE REQUIREMENTS:
- import { test, expect } from '@playwright/test'
- test.describe('${storyId} - ${story.title}', () => {...})
- One test per acceptance criterion minimum
- Use beforeEach for navigation only (NOT for mocking!)
- Base URL configured, use relative paths: '/dashboard', '/projects/[id]'

SELECTOR PATTERN (use fallbacks):
page.locator('[data-testid="name"], .fallback-class, element[attr="value"]')

ASSERTION PATTERN:
- For visibility: await expect(element).toBeVisible()
- For text: await expect(element).toContainText('partial')
- For value: const val = await element.inputValue(); expect(val.length).toBeGreaterThan(0)
- For navigation: await expect(page).toHaveURL(/expected-path/)
- For API results: await page.waitForResponse(resp => resp.url().includes('/api/') && resp.status() === 200)

REMEMBER:
- NO page.route() - NO MOCKING!
- NO fake IDs like 'test-123'
- Include at least 1 error/edge case test
- Test the REAL system behavior

Output complete test file only.`;

  try {
    const testCode = await callOpenRouter([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], 8192);

    // Clean up the response (remove markdown code blocks if present)
    let cleanCode = testCode;
    if (cleanCode.includes('```')) {
      cleanCode = cleanCode.replace(/```typescript\n?/g, '').replace(/```\n?/g, '');
    }

    // Write the test file
    fs.mkdirSync(TESTS_DIR, { recursive: true });
    const testPath = path.join(TESTS_DIR, `${storyId}.spec.ts`);
    fs.writeFileSync(testPath, cleanCode.trim() + '\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✓ TESTS GENERATED');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`File: ${testPath}`);
    console.log('');
    console.log('Preview (first 20 lines):');
    console.log('─────────────────────────────────────────────────────────');
    cleanCode.split('\n').slice(0, 20).forEach((line, i) => {
      console.log(`${String(i + 1).padStart(3)}  ${line}`);
    });
    if (cleanCode.split('\n').length > 20) {
      console.log('     ...');
    }
    console.log('─────────────────────────────────────────────────────────');
    console.log('');
    console.log('Next: Claude should implement code to make these tests pass.');
    console.log('═══════════════════════════════════════════════════════════');

    // Create validator result for checkpoint
    const result = {
      story_id: storyId,
      validator: 'glm-test-writer',
      result: 'PASS',
      timestamp: new Date().toISOString(),
      output_file: testPath,
      model: MODEL,
      criteria: (story.acceptanceCriteria || []).map((ac, i) => ({
        id: `AC-${i + 1}`,
        description: ac,
        has_test: true
      }))
    };

    // Add hash for integrity
    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(result))
      .digest('hex').substring(0, 16);
    result.hash = hash;

    fs.mkdirSync(VALIDATOR_RESULTS_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(VALIDATOR_RESULTS_DIR, `${storyId}_glm_tests.json`),
      JSON.stringify(result, null, 2)
    );

    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

// ============================================================================
// EVIDENCE REVIEW (with Vision Support)
// ============================================================================

async function reviewEvidence(storyId) {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`GEMINI EVIDENCE REVIEW: ${storyId}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // Force Gemini 3 for vision support
  const originalModel = MODEL;
  MODEL = MODELS['gemini-3'];
  console.log(`Using vision model: ${MODEL}`);
  console.log('');

  // Load evidence package
  const evidencePath = path.join(EVIDENCE_DIR, `${storyId}.json`);
  if (!fs.existsSync(evidencePath)) {
    console.error(`ERROR: Evidence package not found: ${evidencePath}`);
    console.error('Run: node .claude/hooks/validators/evidence-collector.js collect ' + storyId);
    process.exit(1);
  }

  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));

  // Load screenshots as base64 images
  const screenshots = [];
  const screenshotDescriptions = [];

  if (evidence.screenshots?.length > 0) {
    console.log('Loading screenshots for vision analysis...');
    for (const screenshot of evidence.screenshots) {
      const imgPath = path.join(process.cwd(), screenshot.path);
      const imgData = loadImageAsBase64(imgPath);
      if (imgData) {
        screenshots.push(imgData);
        screenshotDescriptions.push(`[IMAGE ${screenshots.length}] ${screenshot.name}: ${screenshot.description || 'No description'}`);
        console.log(`  ✓ Loaded: ${screenshot.name}`);
      } else {
        console.log(`  ✗ Not found: ${imgPath}`);
      }
    }
    console.log('');
  }

  console.log(`Story: ${evidence.title}`);
  console.log(`Acceptance Criteria: ${evidence.acceptance_criteria?.length || 0}`);
  console.log(`Screenshots loaded: ${screenshots.length}`);
  console.log(`Test Output: ${evidence.playwright_output ? 'YES' : 'NO'}`);
  console.log(`Code Snippets: ${evidence.code_snippets?.length || 0}`);
  console.log('');
  console.log('Sending to Gemini 3 for visual review...');
  console.log('');

  // Build review prompt with vision instructions
  const systemPrompt = `You are a strict QA reviewer with VISION capabilities.
You can SEE screenshots that the developer provides as evidence.

Your job is to:
1. LOOK at the screenshots carefully - verify UI elements exist and look correct
2. READ the test output - verify tests actually passed
3. CHECK the code snippets - verify implementation is real, not mocked
4. DECIDE if the feature is truly complete

BE SKEPTICAL. Look for:
- Screenshots showing placeholder/lorem ipsum text
- Screenshots with error states or missing elements
- Mock data instead of real database data
- Hardcoded values in code snippets
- Test output showing skipped or failing tests
- Missing UI elements that acceptance criteria require

OUTPUT ONLY VALID JSON - no markdown, no explanations before/after.`;

  const userPrompt = `REVIEW THIS EVIDENCE AND DECIDE IF THE FEATURE IS COMPLETE.

══════════════════════════════════════════════════════════════
STORY DETAILS
══════════════════════════════════════════════════════════════
STORY ID: ${evidence.story_id}
TITLE: ${evidence.title}

ACCEPTANCE CRITERIA (you must verify ALL of these):
${(evidence.acceptance_criteria || []).map((ac, i) => `  ${i + 1}. ${ac}`).join('\n')}

══════════════════════════════════════════════════════════════
VISUAL EVIDENCE - SCREENSHOTS
══════════════════════════════════════════════════════════════
${screenshots.length > 0
  ? `I am providing ${screenshots.length} screenshot(s) for you to examine:
${screenshotDescriptions.map((d, i) => `  ${d}`).join('\n')}

LOOK AT EACH IMAGE and verify:
- Does the UI match what the acceptance criteria requires?
- Are there any error messages or broken elements?
- Is there real data displayed (not lorem ipsum or placeholder)?
- Do buttons, forms, and navigation elements exist?`
  : 'NO SCREENSHOTS PROVIDED - This is a RED FLAG. Request screenshots.'}

══════════════════════════════════════════════════════════════
TEST OUTPUT
══════════════════════════════════════════════════════════════
\`\`\`
${evidence.playwright_output || 'NO TEST OUTPUT PROVIDED - This is a RED FLAG.'}
\`\`\`

VERIFY:
- Do ALL tests pass? (Look for "passed" count)
- Are there any "failed" or "skipped" tests?
- Does the test count match the number of acceptance criteria?

══════════════════════════════════════════════════════════════
CODE IMPLEMENTATION
══════════════════════════════════════════════════════════════
${evidence.code_snippets?.length > 0
  ? evidence.code_snippets.map(c => `
FILE: ${c.file} (lines ${c.lines})
\`\`\`typescript
${c.content.substring(0, 800)}${c.content.length > 800 ? '\n... (truncated)' : ''}
\`\`\`
`).join('\n')
  : 'NO CODE SNIPPETS PROVIDED'}

VERIFY:
- Is there real implementation (not TODO comments)?
- Are there any mock: true or fake data patterns?
- Does the code handle errors properly?

══════════════════════════════════════════════════════════════
YOUR VERDICT
══════════════════════════════════════════════════════════════

Analyze ALL evidence and return this EXACT JSON structure:

{
  "verdict": "PASS" or "FAIL",
  "confidence": <number 0-100>,
  "screenshots_analysis": {
    "examined": <number of screenshots you looked at>,
    "findings": ["what you observed in each screenshot"],
    "concerns": ["any visual issues found"]
  },
  "tests_analysis": {
    "all_passed": <boolean>,
    "test_count": <number>,
    "issues": ["any test concerns"]
  },
  "criteria_checklist": [
    {
      "criterion": "<copy the acceptance criterion>",
      "met": <boolean>,
      "evidence_type": "screenshot|test|code|none",
      "reasoning": "<why you believe this is met or not>"
    }
  ],
  "blocking_issues": ["list any issues that MUST be fixed before approval"],
  "suggestions": ["optional improvements, not blocking"],
  "final_feedback": "<one paragraph summary of your decision>"
}

IMPORTANT: Output ONLY the JSON object. No text before or after.`;

  try {
    // Build multimodal message with screenshots
    const userContent = buildMultimodalContent(userPrompt, screenshots);

    const response = await callOpenRouter([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ], 4096);

    // Restore original model
    MODEL = originalModel;

    // Parse JSON response
    let review;
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        review = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (e) {
      console.error('Failed to parse Gemini response as JSON');
      console.error('Raw response:', response.substring(0, 1000));
      process.exit(1);
    }

    // Normalize verdict (support both old and new format)
    const isApproved = review.verdict === 'PASS' || review.approved === true;

    // Save review result
    fs.mkdirSync(REVIEWS_DIR, { recursive: true });
    const reviewPath = path.join(REVIEWS_DIR, `${storyId}.json`);

    const reviewResult = {
      story_id: storyId,
      timestamp: new Date().toISOString(),
      model: MODELS['gemini-3'],
      screenshots_analyzed: screenshots.length,
      review: review
    };

    fs.writeFileSync(reviewPath, JSON.stringify(reviewResult, null, 2));

    // Display result
    console.log('═══════════════════════════════════════════════════════════');
    if (isApproved) {
      console.log('✓ GEMINI APPROVED');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`Confidence: ${review.confidence}%`);
      console.log('');

      // Screenshot analysis
      if (review.screenshots_analysis) {
        console.log(`Screenshots examined: ${review.screenshots_analysis.examined}`);
        if (review.screenshots_analysis.findings?.length > 0) {
          console.log('Visual findings:');
          review.screenshots_analysis.findings.forEach(f => console.log(`  ✓ ${f}`));
        }
        console.log('');
      }

      // Tests analysis
      if (review.tests_analysis) {
        console.log(`Tests passed: ${review.tests_analysis.all_passed ? 'YES' : 'NO'} (${review.tests_analysis.test_count} tests)`);
        console.log('');
      }

      // Criteria checklist
      console.log('Acceptance Criteria:');
      (review.criteria_checklist || []).forEach(c => {
        console.log(`  ${c.met ? '✓' : '✗'} ${c.criterion}`);
        if (c.reasoning) console.log(`      └─ ${c.reasoning}`);
      });

      // Create validator result for checkpoint
      const validatorResult = {
        story_id: storyId,
        validator: 'gemini-reviewer',
        result: 'PASS',
        confidence: review.confidence,
        timestamp: new Date().toISOString(),
        model: MODELS['gemini-3'],
        screenshots_analyzed: screenshots.length,
        criteria: (review.criteria_checklist || []).map(c => ({
          description: c.criterion,
          passed: c.met,
          evidence_type: c.evidence_type,
          reasoning: c.reasoning
        }))
      };

      const hash = crypto.createHash('sha256')
        .update(JSON.stringify(validatorResult))
        .digest('hex').substring(0, 16);
      validatorResult.hash = hash;

      fs.mkdirSync(VALIDATOR_RESULTS_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(VALIDATOR_RESULTS_DIR, `${storyId}_gemini_review.json`),
        JSON.stringify(validatorResult, null, 2)
      );

      console.log('');
      console.log('Next: Run cleanup and mark story as passed.');

    } else {
      console.log('✗ GEMINI REJECTED');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`Confidence: ${review.confidence}%`);
      console.log('');

      // Screenshot concerns
      if (review.screenshots_analysis?.concerns?.length > 0) {
        console.log('Visual concerns:');
        review.screenshots_analysis.concerns.forEach(c => console.log(`  ⚠ ${c}`));
        console.log('');
      }

      // Tests issues
      if (review.tests_analysis?.issues?.length > 0) {
        console.log('Test issues:');
        review.tests_analysis.issues.forEach(i => console.log(`  ⚠ ${i}`));
        console.log('');
      }

      // Criteria checklist
      console.log('Acceptance Criteria:');
      (review.criteria_checklist || []).forEach(c => {
        console.log(`  ${c.met ? '✓' : '✗'} ${c.criterion}`);
        if (!c.met && c.reasoning) console.log(`      └─ ${c.reasoning}`);
      });
      console.log('');

      // Blocking issues
      if (review.blocking_issues?.length > 0) {
        console.log('BLOCKING ISSUES (must fix):');
        review.blocking_issues.forEach(i => console.log(`  ✗ ${i}`));
        console.log('');
      }

      // Final feedback
      if (review.final_feedback) {
        console.log('Feedback:');
        console.log(`  ${review.final_feedback}`);
        console.log('');
      }

      console.log('Next: Fix the issues and re-collect evidence.');

      // Create FAIL validator result
      const validatorResult = {
        story_id: storyId,
        validator: 'gemini-reviewer',
        result: 'FAIL',
        confidence: review.confidence,
        timestamp: new Date().toISOString(),
        model: MODELS['gemini-3'],
        screenshots_analyzed: screenshots.length,
        blocking_issues: review.blocking_issues,
        final_feedback: review.final_feedback,
        criteria: (review.criteria_checklist || []).map(c => ({
          description: c.criterion,
          passed: c.met,
          evidence_type: c.evidence_type,
          reasoning: c.reasoning
        }))
      };

      const hash = crypto.createHash('sha256')
        .update(JSON.stringify(validatorResult))
        .digest('hex').substring(0, 16);
      validatorResult.hash = hash;

      fs.mkdirSync(VALIDATOR_RESULTS_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(VALIDATOR_RESULTS_DIR, `${storyId}_gemini_review.json`),
        JSON.stringify(validatorResult, null, 2)
      );
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Review saved: ${reviewPath}`);

    process.exit(isApproved ? 0 : 1);

  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

// ============================================================================
// STATUS CHECK
// ============================================================================

async function checkStatus() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('OPENROUTER API STATUS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  try {
    const apiKey = getApiKey();
    console.log('API Key: ' + apiKey.substring(0, 20) + '...');
    console.log('Model: ' + MODEL);
    console.log('');

    // Test API connection
    console.log('Testing connection...');
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      const model = data.data?.find(m => m.id === MODEL);

      console.log('');
      console.log('✓ Connection successful');
      console.log('');

      if (model) {
        console.log('Model Info:');
        console.log(`  Name: ${model.name || MODEL}`);
        console.log(`  Context: ${model.context_length || 'unknown'} tokens`);
        console.log(`  Pricing: $${model.pricing?.prompt || '?'}/1K input, $${model.pricing?.completion || '?'}/1K output`);
      } else {
        console.log(`Model ${MODEL} info not found in response`);
      }
    } else {
      console.log('✗ Connection failed: ' + response.status);
    }

  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
}

// ============================================================================
// MAIN
// ============================================================================

const args = process.argv.slice(2);

// Parse --model flag
const modelFlagIndex = args.findIndex(a => a === '--model');
if (modelFlagIndex !== -1 && args[modelFlagIndex + 1]) {
  const modelName = args[modelFlagIndex + 1];
  if (MODELS[modelName]) {
    MODEL = MODELS[modelName];
    console.log(`Using model: ${modelName} (${MODEL})`);
  } else {
    console.log(`Unknown model: ${modelName}`);
    console.log(`Available models: ${Object.keys(MODELS).join(', ')}`);
    process.exit(1);
  }
  // Remove --model and its value from args
  args.splice(modelFlagIndex, 2);
}

const command = args[0];
const storyId = args[1];

switch (command) {
  case 'write-tests':
    if (!storyId) {
      console.log('Usage: node openrouter-reviewer.js write-tests <story-id> [--model glm|gemini|gemini-preview]');
      process.exit(1);
    }
    writeTests(storyId);
    break;

  case 'review':
    if (!storyId) {
      console.log('Usage: node openrouter-reviewer.js review <story-id>');
      process.exit(1);
    }
    reviewEvidence(storyId);
    break;

  case 'status':
    checkStatus();
    break;

  default:
    console.log('OpenRouter Reviewer v4.0');
    console.log('');
    console.log('Usage: node openrouter-reviewer.js <command> [args]');
    console.log('');
    console.log('Commands:');
    console.log('  write-tests <story-id>  Generate Playwright tests from acceptance criteria');
    console.log('  review <story-id>       Review evidence package and approve/reject');
    console.log('  status                  Check API connection status');
    console.log('');
    console.log('Environment:');
    console.log('  OPENROUTER_API_KEY      Required in .env.local');
    console.log('');
    console.log('Model: ' + MODEL + ' (very cheap: $0.01/1M tokens)');
    process.exit(0);
}
