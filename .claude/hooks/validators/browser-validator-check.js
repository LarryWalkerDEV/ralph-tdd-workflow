#!/usr/bin/env node
/**
 * Browser Validator Check - Runs when browser-validator agent stops
 *
 * Checks:
 * 1. Visual validation was performed
 * 2. Screenshot was taken
 * 3. Checkpoint was created with correct value
 *
 * Outputs to: .claude/hooks/logs/browser-validator-check.log
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join('.claude', 'hooks', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'browser-validator-check.log');

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

function screenshotExists(storyId) {
  const verificationDir = 'verification';
  if (!fs.existsSync(verificationDir)) return false;

  // Check for any screenshot with this story ID
  const files = fs.readdirSync(verificationDir);
  return files.some(f => f.includes(storyId) && (f.endsWith('.png') || f.endsWith('.jpg')));
}

// Main
log(`=== Browser Validator Check ===`);

const storyId = getCurrentStory();
log(`Current story: ${storyId || 'none'}`);

if (!storyId) {
  log(`No story set - skipping validation`);
  console.log(`\nGUIDANCE: No current story set`);
  console.log(`Browser validator requires a story context`);
  process.exit(EXIT_ALLOW);
}

// Check for screenshot
const hasScreenshot = screenshotExists(storyId);
log(`Screenshot exists: ${hasScreenshot}`);

if (!hasScreenshot) {
  log(`WARNING: No screenshot found for ${storyId}`);
  console.log(`\nGUIDANCE: No screenshot found for ${storyId}`);
  console.log(`Expected: verification/${storyId}_verified.png`);
  console.log(`\nBrowser validator should capture visual evidence.`);
}

// Check browser checkpoint
const browserCheckpoint = checkpointExists(storyId, 'browser_validated');
const browserValue = getCheckpointValue(storyId, 'browser_validated');

log(`Browser checkpoint exists: ${browserCheckpoint}`);
log(`Browser checkpoint value: ${browserValue}`);

if (!browserCheckpoint) {
  log(`MISSING: browser_validated checkpoint`);
  console.log(`\nGUIDANCE: Browser validation checkpoint not created for ${storyId}`);
  console.log(`After visual validation, create checkpoint:`);
  console.log(`  node .claude/hooks/ralph-guard.js create-checkpoint browser_validated PASS`);
  console.log(`  OR if checks failed:`);
  console.log(`  node .claude/hooks/ralph-guard.js create-checkpoint browser_validated "FAIL:visual,interaction"`);
} else if (browserValue === 'PASS') {
  log(`SUCCESS: Browser validation passed for ${storyId}`);
  console.log(`\nBrowser validation PASSED for ${storyId}`);
  if (hasScreenshot) {
    console.log(`Screenshot: verification/${storyId}_verified.png`);
  }
} else {
  log(`FAILED: browser_validated = ${browserValue}`);
  console.log(`\nBrowser validation FAILED for ${storyId}`);
  console.log(`Result: ${browserValue}`);
  console.log(`\nBuilder needs to fix these visual/interaction issues.`);
}

log(`---\n`);

process.exit(EXIT_ALLOW);
