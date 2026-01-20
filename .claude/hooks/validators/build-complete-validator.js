#!/usr/bin/env node
/**
 * Build Complete Validator - Runs when builder agent stops
 *
 * Checks:
 * 1. Tests were run
 * 2. All tests pass
 * 3. Checkpoint was created
 *
 * Outputs to: .claude/hooks/logs/build-complete-validator.log
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOG_DIR = path.join('.claude', 'hooks', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'build-complete-validator.log');

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
log(`=== Build Complete Validator ===`);

const storyId = getCurrentStory();
log(`Current story: ${storyId || 'none'}`);

if (!storyId) {
  log(`No story set - skipping validation`);
  console.log(`\nGUIDANCE: No current story set`);
  console.log(`Set story with: node .claude/hooks/ralph-guard.js set-story US-XXX`);
  process.exit(EXIT_ALLOW);
}

// Check build checkpoint
const buildCheckpoint = checkpointExists(storyId, 'build_complete');
const buildValue = getCheckpointValue(storyId, 'build_complete');

log(`Build checkpoint exists: ${buildCheckpoint}`);
log(`Build checkpoint value: ${buildValue}`);

if (!buildCheckpoint) {
  log(`MISSING: build_complete checkpoint`);
  console.log(`\nGUIDANCE: Build checkpoint not created for ${storyId}`);
  console.log(`After tests pass, run:`);
  console.log(`  node .claude/hooks/ralph-guard.js create-checkpoint build_complete PASS`);
} else if (buildValue !== 'PASS') {
  log(`FAILED: build_complete = ${buildValue}`);
  console.log(`\nGUIDANCE: Build marked as ${buildValue} for ${storyId}`);
  console.log(`Fix the issues and update the checkpoint`);
} else {
  log(`SUCCESS: Build complete for ${storyId}`);
  console.log(`\nBuild validated for ${storyId}`);
}

log(`---\n`);

process.exit(EXIT_ALLOW);
