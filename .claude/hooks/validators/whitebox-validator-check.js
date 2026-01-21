#!/usr/bin/env node
/**
 * Whitebox Validator Check - Runs when whitebox-validator agent stops
 *
 * Part of Ralph TDD Workflow v3.0
 *
 * Checks:
 * 1. Analysis was actually performed
 * 2. Results were reported to validator-results
 * 3. Checkpoint was created with correct value
 * 4. Coverage data is recorded
 *
 * Outputs to: .claude/hooks/logs/whitebox-validator-check.log
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Coverage reporter integration
let coverageReporter;
try {
  coverageReporter = require('./coverage-reporter');
} catch (e) {
  coverageReporter = null;
}

const LOG_DIR = path.join('.claude', 'hooks', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'whitebox-validator-check.log');
const VALIDATOR_RESULTS_DIR = path.join('.claude', 'validator-results');

const EXIT_ALLOW = 0;

// Ensure log directory exists
fs.mkdirSync(LOG_DIR, { recursive: true });

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, logMessage);
  console.log(message);
}

function getCurrentStory() {
  const storyFile = path.join('.claude', 'current_story');
  if (!fs.existsSync(storyFile)) return null;
  return fs.readFileSync(storyFile, 'utf8').trim();
}

function checkpointExists(storyId, checkpointName) {
  const checkpointPath = path.join('.claude', 'checkpoints', `${storyId}_${checkpointName}`);
  return fs.existsSync(checkpointPath);
}

function getCheckpointValue(storyId, checkpointName) {
  const checkpointPath = path.join('.claude', 'checkpoints', `${storyId}_${checkpointName}`);
  if (!fs.existsSync(checkpointPath)) return null;
  return fs.readFileSync(checkpointPath, 'utf8').split('\n')[0];
}

function getValidatorResult(storyId) {
  const resultFile = path.join(VALIDATOR_RESULTS_DIR, `${storyId}_whitebox.json`);
  if (!fs.existsSync(resultFile)) return null;

  try {
    const result = JSON.parse(fs.readFileSync(resultFile, 'utf8'));

    // Verify hash integrity
    const { hash, ...dataForHash } = result;
    const expectedHash = crypto.createHash('sha256')
      .update(JSON.stringify(dataForHash))
      .digest('hex').substring(0, 16);

    if (hash !== expectedHash) {
      log(`WARNING: Result file hash mismatch (may be tampered)`);
      return null;
    }

    return result;
  } catch (e) {
    log(`ERROR: Failed to parse validator result: ${e.message}`);
    return null;
  }
}

// Main
log(`=== Whitebox Validator Check ===`);

const storyId = getCurrentStory();
log(`Current story: ${storyId || 'none'}`);

if (!storyId) {
  log(`No story set - skipping validation`);
  console.log(`\nGUIDANCE: No current story set`);
  console.log(`Whitebox validator requires a story context`);
  process.exit(EXIT_ALLOW);
}

// Check if validator result file exists
const validatorResult = getValidatorResult(storyId);
log(`Validator result exists: ${validatorResult !== null}`);

if (validatorResult) {
  log(`Validator result: ${validatorResult.result}`);
  log(`Pass rate: ${validatorResult.pass_rate}`);
  log(`Criteria checked: ${validatorResult.criteria?.length || 0}`);

  // Show category breakdown
  const categories = {};
  (validatorResult.criteria || []).forEach(c => {
    const category = c.description.split(':')[0] || 'other';
    if (!categories[category]) categories[category] = { passed: 0, failed: 0 };
    if (c.passed) categories[category].passed++;
    else categories[category].failed++;
  });

  log(`Category breakdown:`);
  for (const [cat, counts] of Object.entries(categories)) {
    log(`  ${cat}: ${counts.passed}/${counts.passed + counts.failed} passed`);
  }
}

// Check whitebox checkpoint
const whiteboxCheckpoint = checkpointExists(storyId, 'whitebox_validated');
const whiteboxValue = getCheckpointValue(storyId, 'whitebox_validated');

log(`Whitebox checkpoint exists: ${whiteboxCheckpoint}`);
log(`Whitebox checkpoint value: ${whiteboxValue}`);

if (!validatorResult) {
  log(`MISSING: Whitebox validator result file`);
  console.log(`\nGUIDANCE: Whitebox validation result not written for ${storyId}`);
  console.log(`The whitebox-validator agent must write results using:`);
  console.log(`  node .claude/hooks/validators/validator-output-writer.js write whitebox ${storyId} PASS '<criteria>'`);
} else if (!whiteboxCheckpoint) {
  log(`MISSING: whitebox_validated checkpoint`);
  console.log(`\nGUIDANCE: Whitebox validation checkpoint not created for ${storyId}`);
  console.log(`Validator result exists but checkpoint was not created.`);
  console.log(`Create checkpoint:`);
  console.log(`  node .claude/hooks/ralph-guard.js create-checkpoint whitebox_validated ${validatorResult.result}`);
} else if (whiteboxValue === 'PASS') {
  log(`SUCCESS: Whitebox validation passed for ${storyId}`);
  console.log(`\nWhitebox validation PASSED for ${storyId}`);

  // Show what was checked
  if (validatorResult && validatorResult.criteria) {
    console.log(`\nChecks performed:`);
    const passedChecks = validatorResult.criteria.filter(c => c.passed);
    passedChecks.forEach(c => {
      console.log(`  ✓ ${c.description}`);
    });
  }

  // Record coverage data
  if (coverageReporter) {
    try {
      coverageReporter.recordWhiteboxResults(storyId, {
        structure: categories?.Structure || { passed: 0, failed: 0 },
        security: categories?.Security || { passed: 0, failed: 0 },
        performance: categories?.Performance || { passed: 0, failed: 0 },
        errorHandling: categories?.['Error Handling'] || { passed: 0, failed: 0 },
        quality: categories?.Quality || { passed: 0, failed: 0 }
      });
      log(`Coverage data recorded for ${storyId}`);
    } catch (e) {
      log(`Failed to record coverage: ${e.message}`);
    }
  }
} else {
  log(`FAILED: whitebox_validated = ${whiteboxValue}`);
  console.log(`\nWhitebox validation FAILED for ${storyId}`);
  console.log(`Result: ${whiteboxValue}`);

  // Show failed criteria
  if (validatorResult && validatorResult.criteria) {
    const failedChecks = validatorResult.criteria.filter(c => !c.passed);
    if (failedChecks.length > 0) {
      console.log(`\nFailed checks:`);
      failedChecks.forEach(c => {
        console.log(`  ✗ ${c.description}`);
        if (c.evidence) console.log(`    Evidence: ${c.evidence}`);
      });
    }
  }

  console.log(`\nBuilder needs to fix these issues before story can proceed.`);

  // Record failure in coverage
  if (coverageReporter) {
    try {
      const failedCriteria = validatorResult?.criteria?.filter(c => !c.passed) || [];
      coverageReporter.recordWhiteboxFailures(storyId, failedCriteria);
      log(`Failure data recorded for ${storyId}`);
    } catch (e) {
      log(`Failed to record coverage: ${e.message}`);
    }
  }
}

// Print coverage summary
if (coverageReporter) {
  try {
    coverageReporter.printCoverage(storyId);
  } catch (e) {
    // Silent fail on coverage print
  }
}

log(`---\n`);

process.exit(EXIT_ALLOW);
