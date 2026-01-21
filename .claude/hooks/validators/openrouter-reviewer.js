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
const MODEL = 'z-ai/glm-4.7-flash';  // Very cheap: $0.01/1M tokens

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

  // Build the prompt for test writing
  const systemPrompt = `You are a senior QA engineer writing Playwright tests for a Next.js application.
Your tests should be:
- Comprehensive (cover all acceptance criteria)
- Independent (don't depend on other tests)
- Realistic (test actual user behavior)
- Focused on PROVING the feature works

Output ONLY the test code, no explanations. Use TypeScript.`;

  const userPrompt = `Write Playwright tests for this user story:

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

REQUIREMENTS:
1. Use Playwright test syntax: import { test, expect } from '@playwright/test'
2. Use describe block with story ID: test.describe('${storyId} - ${story.title}', () => {...})
3. Each acceptance criterion should have at least one test
4. Use realistic test data (not "test123" or "example.com")
5. Include proper async/await
6. Add helpful test descriptions
7. Use data-testid attributes for selectors when possible
8. Include both happy path and error cases
9. Base URL is already configured, use relative paths like '/dashboard'

Output the complete test file content only.`;

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
// EVIDENCE REVIEW
// ============================================================================

async function reviewEvidence(storyId) {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`GLM EVIDENCE REVIEW: ${storyId}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // Load evidence package
  const evidencePath = path.join(EVIDENCE_DIR, `${storyId}.json`);
  if (!fs.existsSync(evidencePath)) {
    console.error(`ERROR: Evidence package not found: ${evidencePath}`);
    console.error('Run: node .claude/hooks/validators/evidence-collector.js collect ' + storyId);
    process.exit(1);
  }

  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));

  console.log(`Story: ${evidence.title}`);
  console.log(`Acceptance Criteria: ${evidence.acceptance_criteria?.length || 0}`);
  console.log(`Screenshots: ${evidence.screenshots?.length || 0}`);
  console.log(`Test Output: ${evidence.playwright_output ? 'YES' : 'NO'}`);
  console.log(`Database Queries: ${evidence.db_queries?.length || 0}`);
  console.log(`Network Logs: ${evidence.network_log?.length || 0}`);
  console.log(`Code Snippets: ${evidence.code_snippets?.length || 0}`);
  console.log('');
  console.log('Sending to GLM for review...');
  console.log('');

  // Build review prompt
  const systemPrompt = `You are a strict QA reviewer. A developer claims their feature is complete.
Your job is to review their EVIDENCE and decide if it's truly working.

Be skeptical. Look for:
- Mock data instead of real data
- Placeholder text
- Skipped tests
- Missing error handling
- Hardcoded values

Output ONLY valid JSON, no explanations.`;

  const userPrompt = `Review this evidence and decide if the feature is complete:

STORY: ${evidence.title}
STORY ID: ${evidence.story_id}

ACCEPTANCE CRITERIA:
${(evidence.acceptance_criteria || []).map((ac, i) => `${i + 1}. ${ac}`).join('\n')}

═══════════════════════════════════════════════════════════
EVIDENCE
═══════════════════════════════════════════════════════════

1. SCREENSHOTS:
${evidence.screenshots?.length > 0
  ? evidence.screenshots.map(s => `   - ${s.name}: ${s.description || 'No description'}`).join('\n')
  : '   (none provided)'}

2. PLAYWRIGHT TEST OUTPUT:
\`\`\`
${evidence.playwright_output || '(not provided)'}
\`\`\`

3. DATABASE QUERIES:
${evidence.db_queries?.length > 0
  ? evidence.db_queries.map(q => `
   Query: ${q.query}
   Result: ${JSON.stringify(q.result, null, 2).substring(0, 500)}
`).join('\n')
  : '   (none provided)'}

4. NETWORK LOG:
${evidence.network_log?.length > 0
  ? evidence.network_log.map(n => `   ${n.method} ${n.url} → ${n.status}`).join('\n')
  : '   (none provided)'}

5. KEY CODE SNIPPETS:
${evidence.code_snippets?.length > 0
  ? evidence.code_snippets.map(c => `
   // ${c.file} (lines ${c.lines})
   ${c.content.substring(0, 500)}
`).join('\n')
  : '   (none provided)'}

═══════════════════════════════════════════════════════════
YOUR REVIEW
═══════════════════════════════════════════════════════════

Analyze each piece of evidence and output JSON:

{
  "approved": boolean,
  "confidence": 0-100,
  "checklist": {
    "tests_pass": boolean,
    "real_data": boolean,
    "no_mocks": boolean,
    "error_handling": boolean,
    "acceptance_met": boolean
  },
  "criteria_review": [
    { "criterion": "...", "met": boolean, "evidence": "..." }
  ],
  "concerns": ["list any issues"],
  "feedback": "what to fix if rejected (empty if approved)"
}`;

  try {
    const response = await callOpenRouter([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], 4096);

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
      console.error('Failed to parse GLM response as JSON');
      console.error('Raw response:', response);
      process.exit(1);
    }

    // Save review result
    fs.mkdirSync(REVIEWS_DIR, { recursive: true });
    const reviewPath = path.join(REVIEWS_DIR, `${storyId}.json`);

    const reviewResult = {
      story_id: storyId,
      timestamp: new Date().toISOString(),
      model: MODEL,
      review: review
    };

    fs.writeFileSync(reviewPath, JSON.stringify(reviewResult, null, 2));

    // Display result
    console.log('═══════════════════════════════════════════════════════════');
    if (review.approved) {
      console.log('✓ GLM APPROVED');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`Confidence: ${review.confidence}%`);
      console.log('');
      console.log('Checklist:');
      Object.entries(review.checklist || {}).forEach(([key, val]) => {
        console.log(`  ${val ? '✓' : '✗'} ${key}`);
      });

      // Create validator result for checkpoint
      const validatorResult = {
        story_id: storyId,
        validator: 'glm-reviewer',
        result: 'PASS',
        pass_rate: `${review.confidence}%`,
        timestamp: new Date().toISOString(),
        model: MODEL,
        criteria: (review.criteria_review || []).map(c => ({
          description: c.criterion,
          passed: c.met,
          evidence: c.evidence
        }))
      };

      const hash = crypto.createHash('sha256')
        .update(JSON.stringify(validatorResult))
        .digest('hex').substring(0, 16);
      validatorResult.hash = hash;

      fs.mkdirSync(VALIDATOR_RESULTS_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(VALIDATOR_RESULTS_DIR, `${storyId}_glm_review.json`),
        JSON.stringify(validatorResult, null, 2)
      );

      console.log('');
      console.log('Next: Run cleanup and mark story as passed.');

    } else {
      console.log('✗ GLM REJECTED');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`Confidence: ${review.confidence}%`);
      console.log('');
      console.log('Checklist:');
      Object.entries(review.checklist || {}).forEach(([key, val]) => {
        console.log(`  ${val ? '✓' : '✗'} ${key}`);
      });
      console.log('');
      if (review.concerns?.length > 0) {
        console.log('Concerns:');
        review.concerns.forEach(c => console.log(`  - ${c}`));
        console.log('');
      }
      console.log('Feedback:');
      console.log(`  ${review.feedback || 'No specific feedback'}`);
      console.log('');
      console.log('Next: Fix the issues and re-collect evidence.');

      // Create FAIL validator result
      const validatorResult = {
        story_id: storyId,
        validator: 'glm-reviewer',
        result: 'FAIL',
        pass_rate: `${review.confidence}%`,
        timestamp: new Date().toISOString(),
        model: MODEL,
        feedback: review.feedback,
        concerns: review.concerns,
        criteria: (review.criteria_review || []).map(c => ({
          description: c.criterion,
          passed: c.met,
          evidence: c.evidence
        }))
      };

      const hash = crypto.createHash('sha256')
        .update(JSON.stringify(validatorResult))
        .digest('hex').substring(0, 16);
      validatorResult.hash = hash;

      fs.mkdirSync(VALIDATOR_RESULTS_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(VALIDATOR_RESULTS_DIR, `${storyId}_glm_review.json`),
        JSON.stringify(validatorResult, null, 2)
      );
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Review saved: ${reviewPath}`);

    process.exit(review.approved ? 0 : 1);

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
const command = args[0];
const storyId = args[1];

switch (command) {
  case 'write-tests':
    if (!storyId) {
      console.log('Usage: node openrouter-reviewer.js write-tests <story-id>');
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
