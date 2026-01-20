#!/usr/bin/env node
/**
 * Build Validator - Runs after EVERY Edit/Write by builder agent
 *
 * Checks:
 * 1. File is not a test file (BLOCKS if it is)
 * 2. TypeScript compiles (guidance if fails)
 * 3. No lint errors introduced (guidance if fails)
 *
 * Outputs to: .claude/hooks/logs/build-validator.log
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOG_DIR = path.join('.claude', 'hooks', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'build-validator.log');

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

function runTypeCheck() {
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe', timeout: 30000 });
    return { pass: true, output: 'TypeScript compiles' };
  } catch (err) {
    return { pass: false, output: err.stdout?.toString() || err.message };
  }
}

function runLintCheck(filepath) {
  try {
    execSync(`npx eslint "${filepath}" --max-warnings 0`, { stdio: 'pipe', timeout: 15000 });
    return { pass: true, output: 'No lint errors' };
  } catch (err) {
    return { pass: false, output: err.stdout?.toString() || err.message };
  }
}

// Main
const filepath = process.argv[2];

log(`=== Build Validator ===`);
log(`File: ${filepath || 'none'}`);

// Check 1: Is it a test file?
if (filepath && isTestFile(filepath)) {
  log(`BLOCKED: Attempted to modify test file`);
  log(`Builder agent cannot modify test files!`);
  console.log(`\nBLOCKED: Cannot modify test files during build phase`);
  console.log(`File: ${filepath}`);
  console.log(`\nFix the implementation, NOT the tests!`);
  process.exit(EXIT_BLOCK);
}

// Check 2: TypeScript compiles
log(`Running typecheck...`);
const typeResult = runTypeCheck();
log(`TypeCheck: ${typeResult.pass ? 'PASS' : 'FAIL'}`);

if (!typeResult.pass) {
  log(`TypeCheck errors:\n${typeResult.output}`);
  console.log(`\nGUIDANCE: TypeScript compilation failed`);
  console.log(`Fix these errors before continuing:\n`);
  console.log(typeResult.output.substring(0, 500));
  // Don't block, just guide
}

// Check 3: Lint (only for the modified file)
if (filepath && fs.existsSync(filepath)) {
  log(`Running lint on ${filepath}...`);
  const lintResult = runLintCheck(filepath);
  log(`Lint: ${lintResult.pass ? 'PASS' : 'FAIL'}`);

  if (!lintResult.pass) {
    log(`Lint errors:\n${lintResult.output}`);
    console.log(`\nGUIDANCE: Lint errors in ${filepath}`);
    console.log(`Fix these before continuing:\n`);
    console.log(lintResult.output.substring(0, 500));
    // Don't block, just guide
  }
}

log(`Validation complete`);
log(`---\n`);

process.exit(EXIT_ALLOW);
