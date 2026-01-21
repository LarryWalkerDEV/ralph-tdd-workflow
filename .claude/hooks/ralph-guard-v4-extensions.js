#!/usr/bin/env node
/**
 * Ralph Guard v4.0 Extensions - Add to ralph-guard.js
 *
 * This file contains the v4 commands and functions that extend v3.0
 * Copy these into ralph-guard.js or require this file from ralph-guard.js
 *
 * NEW v4.0 Features:
 *   - External test writing via GLM
 *   - Evidence-based validation
 *   - Mandatory refinement passes
 *   - GLM review before mark-story-pass
 *
 * NEW Commands:
 *   glm-tests <story-id>     - Generate tests via GLM
 *   collect-evidence <id>    - Collect evidence for review
 *   glm-review <story-id>    - Request GLM review
 *   check-refinement <id>    - Check refinement status
 *   require-refinement <id>  - Get refinement prompt
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// v4.0 Version
const VERSION_V4 = '4.0';

// v4.0 Paths
const REFINEMENT_DIR = path.join('.claude', 'refinement');
const EVIDENCE_DIR = path.join('scripts', 'ralph', 'evidence');
const REVIEWS_DIR = path.join('scripts', 'ralph', 'reviews');

// v4.0 Required checkpoints (extends v3.0's 6 to 8)
const V4_CHECKPOINTS = [
  'tests_written',          // GLM writes tests
  'build_complete',         // Tests pass
  'refinement_complete',    // 3 passes done
  'evidence_collected',     // Evidence package ready
  'glm_approved',           // GLM review passed
  'whitebox_validated',     // Code quality check
  'cleanup_complete'        // Final cleanup
];

// ============================================================================
// v4.0 COMMANDS
// ============================================================================

/**
 * Generate tests via GLM (external AI)
 */
function glmWriteTests(storyId) {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`v4.0: GLM TEST GENERATION: ${storyId}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  try {
    execSync(
      `node .claude/hooks/validators/openrouter-reviewer.js write-tests ${storyId}`,
      { stdio: 'inherit' }
    );
  } catch (e) {
    console.error('GLM test generation failed');
    process.exit(1);
  }
}

/**
 * Collect evidence for GLM review
 */
function collectEvidence(storyId, force = false) {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`v4.0: EVIDENCE COLLECTION: ${storyId}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  try {
    const cmd = `node .claude/hooks/validators/evidence-collector.js collect ${storyId}${force ? ' --force' : ''}`;
    execSync(cmd, { stdio: 'inherit' });
  } catch (e) {
    console.error('Evidence collection failed');
    process.exit(1);
  }
}

/**
 * Request GLM review of evidence
 */
function glmReview(storyId) {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`v4.0: GLM REVIEW: ${storyId}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // Check evidence exists
  const evidencePath = path.join(EVIDENCE_DIR, `${storyId}.json`);
  if (!fs.existsSync(evidencePath)) {
    console.error('No evidence package found');
    console.error('Run first: node ralph-guard.js collect-evidence ' + storyId);
    process.exit(1);
  }

  try {
    execSync(
      `node .claude/hooks/validators/openrouter-reviewer.js review ${storyId}`,
      { stdio: 'inherit' }
    );
  } catch (e) {
    // GLM may have rejected - exit with 1 for rejected, 0 for approved
    process.exit(e.status || 1);
  }
}

/**
 * Check refinement status
 */
function checkRefinement(storyId) {
  try {
    execSync(
      `node .claude/hooks/validators/refinement-enforcer.js check ${storyId}`,
      { stdio: 'inherit' }
    );
  } catch (e) {
    process.exit(e.status || 2);
  }
}

/**
 * Get refinement prompt
 */
function requireRefinement(storyId) {
  try {
    execSync(
      `node .claude/hooks/validators/refinement-enforcer.js require ${storyId}`,
      { stdio: 'inherit' }
    );
  } catch (e) {
    process.exit(0);
  }
}

/**
 * Complete a refinement pass
 */
function completeRefinementPass(storyId, passNumber) {
  try {
    execSync(
      `node .claude/hooks/validators/refinement-enforcer.js complete-pass ${storyId} ${passNumber}`,
      { stdio: 'inherit' }
    );
  } catch (e) {
    process.exit(1);
  }
}

/**
 * v4.0 Enhanced mark-story-pass - requires GLM approval
 */
function markStoryPassV4(storyId) {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`v4.0 MARK STORY PASS: ${storyId}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // Check for GLM approval
  const glmReviewPath = path.join('.claude', 'validator-results', `${storyId}_glm_review.json`);

  if (!fs.existsSync(glmReviewPath)) {
    console.log('BLOCKED: No GLM review found');
    console.log('');
    console.log('v4.0 requires GLM approval before marking story as passed.');
    console.log('');
    console.log('Steps:');
    console.log('  1. Collect evidence: node ralph-guard.js collect-evidence ' + storyId);
    console.log('  2. Get GLM review: node ralph-guard.js glm-review ' + storyId);
    console.log('');
    process.exit(2);
  }

  const glmReview = JSON.parse(fs.readFileSync(glmReviewPath, 'utf8'));

  if (glmReview.result !== 'PASS') {
    console.log('BLOCKED: GLM review did not pass');
    console.log('');
    console.log(`GLM Result: ${glmReview.result}`);
    console.log(`Pass Rate: ${glmReview.pass_rate}`);
    if (glmReview.feedback) {
      console.log('');
      console.log('Feedback:');
      console.log(`  ${glmReview.feedback}`);
    }
    console.log('');
    console.log('Fix the issues and re-run GLM review.');
    process.exit(2);
  }

  console.log('✓ GLM approval verified');
  console.log('');
  console.log('Proceeding with v3.0 mark-story-pass verification...');
  console.log('');

  // Call the original v3.0 mark-story-pass
  // This is handled by the main ralph-guard.js file
}

// ============================================================================
// v4.0 WORKFLOW SUMMARY
// ============================================================================

function showV4Workflow() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('RALPH TDD v4.0 WORKFLOW');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('FOR EACH story:');
  console.log('');
  console.log('  1. SET STORY');
  console.log('     node ralph-guard.js set-story US-XXX');
  console.log('');
  console.log('  2. GLM WRITES TESTS (external AI)');
  console.log('     node ralph-guard.js glm-tests US-XXX');
  console.log('');
  console.log('  3. IMPLEMENT - Pass 1: Make it work');
  console.log('     Claude implements until tests pass');
  console.log('     node ralph-guard.js complete-refinement US-XXX 1');
  console.log('');
  console.log('  4. IMPLEMENT - Pass 2: Make it better');
  console.log('     node ralph-guard.js require-refinement US-XXX');
  console.log('     Claude improves code quality');
  console.log('     node ralph-guard.js complete-refinement US-XXX 2');
  console.log('');
  console.log('  5. IMPLEMENT - Pass 3: Make it robust');
  console.log('     node ralph-guard.js require-refinement US-XXX');
  console.log('     Claude adds error handling');
  console.log('     node ralph-guard.js complete-refinement US-XXX 3');
  console.log('');
  console.log('  6. COLLECT EVIDENCE');
  console.log('     node ralph-guard.js collect-evidence US-XXX');
  console.log('     (Screenshots, test output, code snippets)');
  console.log('');
  console.log('  7. GLM REVIEW');
  console.log('     node ralph-guard.js glm-review US-XXX');
  console.log('     If REJECTED → back to step 3');
  console.log('');
  console.log('  8. WHITEBOX VALIDATION');
  console.log('     Run whitebox-validator');
  console.log('');
  console.log('  9. CLEANUP');
  console.log('     node ralph-guard.js cleanup US-XXX');
  console.log('');
  console.log(' 10. MARK COMPLETE');
  console.log('     node ralph-guard.js mark-story-pass US-XXX');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
}

// ============================================================================
// EXPORT FOR USE IN RALPH-GUARD.JS
// ============================================================================

module.exports = {
  VERSION_V4,
  V4_CHECKPOINTS,
  glmWriteTests,
  collectEvidence,
  glmReview,
  checkRefinement,
  requireRefinement,
  completeRefinementPass,
  markStoryPassV4,
  showV4Workflow
};

// ============================================================================
// STANDALONE EXECUTION
// ============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const storyId = args[1];

  switch (command) {
    case 'glm-tests':
      if (!storyId) {
        console.log('Usage: node ralph-guard-v4-extensions.js glm-tests <story-id>');
        process.exit(1);
      }
      glmWriteTests(storyId);
      break;

    case 'collect-evidence':
      if (!storyId) {
        console.log('Usage: node ralph-guard-v4-extensions.js collect-evidence <story-id>');
        process.exit(1);
      }
      collectEvidence(storyId, args.includes('--force'));
      break;

    case 'glm-review':
      if (!storyId) {
        console.log('Usage: node ralph-guard-v4-extensions.js glm-review <story-id>');
        process.exit(1);
      }
      glmReview(storyId);
      break;

    case 'check-refinement':
      if (!storyId) {
        console.log('Usage: node ralph-guard-v4-extensions.js check-refinement <story-id>');
        process.exit(1);
      }
      checkRefinement(storyId);
      break;

    case 'require-refinement':
      if (!storyId) {
        console.log('Usage: node ralph-guard-v4-extensions.js require-refinement <story-id>');
        process.exit(1);
      }
      requireRefinement(storyId);
      break;

    case 'complete-refinement':
      if (!storyId || !args[2]) {
        console.log('Usage: node ralph-guard-v4-extensions.js complete-refinement <story-id> <pass>');
        process.exit(1);
      }
      completeRefinementPass(storyId, args[2]);
      break;

    case 'workflow':
      showV4Workflow();
      break;

    default:
      console.log('Ralph Guard v4.0 Extensions');
      console.log('');
      console.log('New v4.0 Commands:');
      console.log('  glm-tests <story-id>             Generate tests via GLM');
      console.log('  collect-evidence <story-id>      Collect evidence for review');
      console.log('  glm-review <story-id>            Request GLM review');
      console.log('  check-refinement <story-id>      Check refinement status');
      console.log('  require-refinement <story-id>    Get refinement prompt');
      console.log('  complete-refinement <id> <pass>  Complete refinement pass');
      console.log('  workflow                         Show v4.0 workflow');
      console.log('');
      console.log('These commands extend ralph-guard.js v3.0');
      process.exit(0);
  }
}
