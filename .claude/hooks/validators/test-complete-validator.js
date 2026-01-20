#!/usr/bin/env node
/**
 * Test Complete Validator - Runs when test-writer agent stops
 *
 * Checks:
 * 1. Test file was created
 * 2. Test file has valid structure
 * 3. Checkpoint was created
 *
 * Outputs to: .claude/hooks/logs/test-complete-validator.log
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join('.claude', 'hooks', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'test-complete-validator.log');

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

function testFileExists(storyId) {
  const testPath = path.join('e2e', `${storyId}.spec.ts`);
  return fs.existsSync(testPath);
}

function validateTestFile(storyId) {
  const testPath = path.join('e2e', `${storyId}.spec.ts`);
  if (!fs.existsSync(testPath)) {
    return { valid: false, error: 'Test file does not exist' };
  }

  const content = fs.readFileSync(testPath, 'utf8');

  // Check for basic Playwright structure
  const hasImport = content.includes("from '@playwright/test'");
  const hasDescribe = content.includes('test.describe');
  const hasTest = content.includes('test(');
  const hasExpect = content.includes('expect(');

  if (!hasImport) {
    return { valid: false, error: 'Missing Playwright import' };
  }
  if (!hasDescribe) {
    return { valid: false, error: 'Missing test.describe block' };
  }
  if (!hasTest) {
    return { valid: false, error: 'No test cases found' };
  }
  if (!hasExpect) {
    return { valid: false, error: 'No assertions found' };
  }

  // Count tests
  const testMatches = content.match(/test\(['"]/g);
  const testCount = testMatches ? testMatches.length : 0;

  return { valid: true, testCount };
}

// Main
log(`=== Test Complete Validator ===`);

const storyId = getCurrentStory();
log(`Current story: ${storyId || 'none'}`);

if (!storyId) {
  log(`No story set - skipping validation`);
  console.log(`\nGUIDANCE: No current story set`);
  console.log(`Set story with: node .claude/hooks/ralph-guard.js set-story US-XXX`);
  process.exit(EXIT_ALLOW);
}

// Check test file exists
const hasTestFile = testFileExists(storyId);
log(`Test file exists: ${hasTestFile}`);

if (!hasTestFile) {
  log(`MISSING: Test file for ${storyId}`);
  console.log(`\nGUIDANCE: Test file not created for ${storyId}`);
  console.log(`Expected: e2e/${storyId}.spec.ts`);
  console.log(`\nTest writer must create the test file before stopping.`);
  process.exit(EXIT_ALLOW);
}

// Validate test file structure
const validation = validateTestFile(storyId);
log(`Test file valid: ${validation.valid}`);

if (!validation.valid) {
  log(`INVALID: ${validation.error}`);
  console.log(`\nGUIDANCE: Test file has issues for ${storyId}`);
  console.log(`Issue: ${validation.error}`);
  console.log(`\nFix the test file before continuing.`);
  process.exit(EXIT_ALLOW);
}

log(`Test count: ${validation.testCount}`);

// Check checkpoint
const testsCheckpoint = checkpointExists(storyId, 'tests_written');
const testsValue = getCheckpointValue(storyId, 'tests_written');

log(`Tests checkpoint exists: ${testsCheckpoint}`);
log(`Tests checkpoint value: ${testsValue}`);

if (!testsCheckpoint) {
  log(`MISSING: tests_written checkpoint`);
  console.log(`\nGUIDANCE: Tests checkpoint not created for ${storyId}`);
  console.log(`After writing tests, run:`);
  console.log(`  node .claude/hooks/ralph-guard.js create-checkpoint tests_written PASS`);
} else if (testsValue !== 'PASS') {
  log(`FAILED: tests_written = ${testsValue}`);
  console.log(`\nGUIDANCE: Tests marked as ${testsValue} for ${storyId}`);
  console.log(`Fix the issues and update the checkpoint`);
} else {
  log(`SUCCESS: Tests complete for ${storyId}`);
  console.log(`\nTests validated for ${storyId}`);
  console.log(`Tests: ${validation.testCount} test cases`);
}

log(`---\n`);

process.exit(EXIT_ALLOW);
