#!/usr/bin/env node
/**
 * Test Validator - Runs after EVERY Edit/Write by test-writer agent
 *
 * Checks:
 * 1. File IS a test file (BLOCKS if modifying source)
 * 2. Test file has valid Playwright syntax
 * 3. Tests are runnable (syntax check)
 *
 * Outputs to: .claude/hooks/logs/test-validator.log
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOG_DIR = path.join('.claude', 'hooks', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'test-validator.log');

const EXIT_ALLOW = 0;
const EXIT_BLOCK = 2;

// Ensure log directory exists
fs.mkdirSync(LOG_DIR, { recursive: true });

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, logMessage);
  console.log(message);
}

function isTestFile(filepath) {
  if (!filepath) return false;
  const normalized = filepath.replace(/\\/g, '/').toLowerCase();
  return (
    normalized.includes('.spec.') ||
    normalized.includes('.test.') ||
    normalized.includes('/e2e/') ||
    normalized.includes('/__tests__/')
  );
}

function isSrcFile(filepath) {
  if (!filepath) return false;
  const normalized = filepath.replace(/\\/g, '/').toLowerCase();
  return (
    normalized.includes('/src/') ||
    normalized.includes('/app/') ||
    normalized.includes('/components/') ||
    normalized.includes('/lib/') ||
    normalized.includes('/pages/')
  );
}

function checkTestSyntax(filepath) {
  try {
    // Try to parse the TypeScript file
    execSync(`npx tsc --noEmit "${filepath}"`, { stdio: 'pipe', timeout: 15000 });
    return { pass: true, output: 'Syntax valid' };
  } catch (err) {
    return { pass: false, output: err.stdout?.toString() || err.message };
  }
}

// Main
const filepath = process.argv[2];

log(`=== Test Validator ===`);
log(`File: ${filepath || 'none'}`);

// Check 1: Is it a source file? (test-writer cannot modify source)
if (filepath && isSrcFile(filepath)) {
  log(`BLOCKED: Attempted to modify source file`);
  log(`Test-writer agent can only write test files!`);
  console.log(`\nBLOCKED: Cannot modify source files during test-write phase`);
  console.log(`File: ${filepath}`);
  console.log(`\nTest writers can only create files in e2e/ directory!`);
  process.exit(EXIT_BLOCK);
}

// Check 2: If it's a test file, verify syntax
if (filepath && isTestFile(filepath) && fs.existsSync(filepath)) {
  log(`Checking test syntax...`);
  const syntaxResult = checkTestSyntax(filepath);
  log(`Syntax check: ${syntaxResult.pass ? 'PASS' : 'FAIL'}`);

  if (!syntaxResult.pass) {
    log(`Syntax errors:\n${syntaxResult.output}`);
    console.log(`\nGUIDANCE: Test file has syntax errors`);
    console.log(`Fix these before continuing:\n`);
    console.log(syntaxResult.output.substring(0, 500));
  } else {
    log(`Test file syntax valid`);
    console.log(`\nTest file validated: ${filepath}`);
  }
}

log(`Validation complete`);
log(`---\n`);

process.exit(EXIT_ALLOW);
