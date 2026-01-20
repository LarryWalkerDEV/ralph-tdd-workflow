#!/usr/bin/env node
/**
 * Playwright Validator Check - Runs when playwright-validator agent stops
 *
 * Checks:
 * 1. Tests were actually run
 * 2. Results were reported
 * 3. Checkpoint was created with correct value
 *
 * Outputs to: .claude/hooks/logs/playwright-validator-check.log
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join('.claude', 'hooks', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'playwright-validator-check.log');

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

// Main
log(`=== Playwright Validator Check ===`);

const storyId = getCurrentStory();
log(`Current story: ${storyId || 'none'}`);

if (!storyId) {
  log(`No story set - skipping validation`);
  console.log(`\nGUIDANCE: No current story set`);
  console.log(`Playwright validator requires a story context`);
  process.exit(EXIT_ALLOW);
}

// Check playwright checkpoint
const playwrightCheckpoint = checkpointExists(storyId, 'playwright_validated');
const playwrightValue = getCheckpointValue(storyId, 'playwright_validated');

log(`Playwright checkpoint exists: ${playwrightCheckpoint}`);
log(`Playwright checkpoint value: ${playwrightValue}`);

if (!playwrightCheckpoint) {
  log(`MISSING: playwright_validated checkpoint`);
  console.log(`\nGUIDANCE: Playwright validation checkpoint not created for ${storyId}`);
  console.log(`After running tests, create checkpoint:`);
  console.log(`  node .claude/hooks/ralph-guard.js create-checkpoint playwright_validated PASS`);
  console.log(`  OR if tests failed:`);
  console.log(`  node .claude/hooks/ralph-guard.js create-checkpoint playwright_validated "FAIL:X tests failed"`);
} else if (playwrightValue === 'PASS') {
  log(`SUCCESS: Playwright tests passed for ${storyId}`);
  console.log(`\nPlaywright validation PASSED for ${storyId}`);
} else {
  log(`FAILED: playwright_validated = ${playwrightValue}`);
  console.log(`\nPlaywright validation FAILED for ${storyId}`);
  console.log(`Result: ${playwrightValue}`);
  console.log(`\nBuilder needs to fix these failures before story can proceed.`);
}

log(`---\n`);

process.exit(EXIT_ALLOW);
