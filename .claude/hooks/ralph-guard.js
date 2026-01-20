#!/usr/bin/env node
/**
 * Ralph Guard - Cross-platform hook enforcement for Ralph workflow
 *
 * This is the MAIN hook that enforces all rules during Ralph loop.
 * Works on Windows, macOS, and Linux.
 *
 * Usage: node ralph-guard.js <action> [args...]
 * Actions:
 *   - check-edit <filepath>     : Check if file can be edited
 *   - check-completion          : Check if story can be marked complete
 *   - check-phase <required>    : Check if we're in required phase
 *   - set-phase <phase>         : Set current workflow phase
 *   - create-checkpoint <name>  : Create a checkpoint file
 *   - status                    : Show current workflow status
 */

const fs = require('fs');
const path = require('path');

// Paths
const WORKFLOW_FLAG = path.join('.claude', 'workflow_active');
const PHASE_FILE = path.join('.claude', 'workflow_phase');
const CURRENT_STORY_FILE = path.join('.claude', 'current_story');
const CHECKPOINTS_DIR = path.join('.claude', 'checkpoints');

// Exit codes
const EXIT_ALLOW = 0;
const EXIT_BLOCK = 2;  // Claude Code blocks on exit 2

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function isRalphActive() {
  return fs.existsSync(WORKFLOW_FLAG);
}

function getCurrentPhase() {
  if (!fs.existsSync(PHASE_FILE)) return 'none';
  return fs.readFileSync(PHASE_FILE, 'utf8').trim();
}

function getCurrentStory() {
  if (!fs.existsSync(CURRENT_STORY_FILE)) return null;
  return fs.readFileSync(CURRENT_STORY_FILE, 'utf8').trim();
}

function checkpointExists(name) {
  const storyId = getCurrentStory() || 'global';
  const checkpointPath = path.join(CHECKPOINTS_DIR, `${storyId}_${name}`);
  return fs.existsSync(checkpointPath);
}

function getCheckpointValue(name) {
  const storyId = getCurrentStory() || 'global';
  const checkpointPath = path.join(CHECKPOINTS_DIR, `${storyId}_${name}`);
  if (!fs.existsSync(checkpointPath)) return null;
  return fs.readFileSync(checkpointPath, 'utf8').trim();
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

// ============================================================================
// ACTIONS
// ============================================================================

function checkEdit(filepath) {
  // If Ralph not active, allow everything
  if (!isRalphActive()) {
    process.exit(EXIT_ALLOW);
  }

  const phase = getCurrentPhase();
  const storyId = getCurrentStory();

  // Phase-based restrictions
  switch (phase) {
    case 'test-write':
      // Test writers can ONLY write to e2e/ and test files
      if (isSrcFile(filepath)) {
        console.log(`BLOCKED: Cannot modify source files during test-write phase`);
        console.log(`File: ${filepath}`);
        console.log(`Current phase: ${phase}`);
        console.log(`\nTest writers must ONLY create test files in e2e/`);
        process.exit(EXIT_BLOCK);
      }
      break;

    case 'build':
      // Builders CANNOT modify test files
      if (isTestFile(filepath)) {
        console.log(`BLOCKED: Cannot modify test files during build phase`);
        console.log(`File: ${filepath}`);
        console.log(`Current phase: ${phase}`);
        console.log(`\nBuilders must fix code, NOT change tests`);
        process.exit(EXIT_BLOCK);
      }
      break;

    case 'validate':
      // Validators can only write to checkpoints and verification
      const normalized = filepath.replace(/\\/g, '/').toLowerCase();
      const allowedPaths = ['.claude/', 'verification/', 'scripts/ralph/'];
      const isAllowed = allowedPaths.some(p => normalized.includes(p));

      if (!isAllowed) {
        console.log(`BLOCKED: Validators cannot modify source or test files`);
        console.log(`File: ${filepath}`);
        console.log(`Allowed paths: ${allowedPaths.join(', ')}`);
        process.exit(EXIT_BLOCK);
      }
      break;
  }

  process.exit(EXIT_ALLOW);
}

function checkCompletion() {
  // If Ralph not active, allow
  if (!isRalphActive()) {
    process.exit(EXIT_ALLOW);
  }

  const storyId = getCurrentStory();
  if (!storyId) {
    console.log(`BLOCKED: No current story set`);
    console.log(`Set story first: node ralph-guard.js set-story <story-id>`);
    process.exit(EXIT_BLOCK);
  }

  // Check required checkpoints
  const requiredCheckpoints = [
    'tests_written',
    'build_complete',
    'playwright_validated',
    'browser_validated'
  ];

  const missing = [];
  const failed = [];

  for (const cp of requiredCheckpoints) {
    if (!checkpointExists(cp)) {
      missing.push(cp);
    } else {
      const value = getCheckpointValue(cp);
      if (value !== 'PASS') {
        failed.push(`${cp}: ${value}`);
      }
    }
  }

  if (missing.length > 0) {
    console.log(`BLOCKED: Missing checkpoints for ${storyId}:`);
    missing.forEach(m => console.log(`  - ${m}`));
    process.exit(EXIT_BLOCK);
  }

  if (failed.length > 0) {
    console.log(`BLOCKED: Failed validations for ${storyId}:`);
    failed.forEach(f => console.log(`  - ${f}`));
    process.exit(EXIT_BLOCK);
  }

  console.log(`ALLOWED: All checkpoints passed for ${storyId}`);
  process.exit(EXIT_ALLOW);
}

function setPhase(phase) {
  const validPhases = ['test-write', 'build', 'validate', 'commit', 'none'];
  if (!validPhases.includes(phase)) {
    console.log(`Invalid phase: ${phase}`);
    console.log(`Valid phases: ${validPhases.join(', ')}`);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(PHASE_FILE), { recursive: true });
  fs.writeFileSync(PHASE_FILE, phase);
  console.log(`Phase set to: ${phase}`);
  process.exit(0);
}

function setStory(storyId) {
  fs.mkdirSync(path.dirname(CURRENT_STORY_FILE), { recursive: true });
  fs.writeFileSync(CURRENT_STORY_FILE, storyId);
  console.log(`Current story set to: ${storyId}`);
  process.exit(0);
}

function createCheckpoint(name, value = 'PASS') {
  const storyId = getCurrentStory() || 'global';
  fs.mkdirSync(CHECKPOINTS_DIR, { recursive: true });
  const checkpointPath = path.join(CHECKPOINTS_DIR, `${storyId}_${name}`);
  const content = `${value}\n${new Date().toISOString()}`;
  fs.writeFileSync(checkpointPath, content);
  console.log(`Checkpoint created: ${storyId}_${name} = ${value}`);
  process.exit(0);
}

function clearCheckpoints() {
  const storyId = getCurrentStory();
  if (!storyId) {
    console.log('No current story set');
    process.exit(1);
  }

  if (fs.existsSync(CHECKPOINTS_DIR)) {
    const files = fs.readdirSync(CHECKPOINTS_DIR);
    files.filter(f => f.startsWith(storyId + '_')).forEach(f => {
      fs.unlinkSync(path.join(CHECKPOINTS_DIR, f));
      console.log(`Deleted: ${f}`);
    });
  }
  process.exit(0);
}

function showStatus() {
  console.log('=== Ralph Workflow Status ===\n');

  console.log(`Ralph Active: ${isRalphActive() ? 'YES' : 'NO'}`);
  console.log(`Current Phase: ${getCurrentPhase()}`);
  console.log(`Current Story: ${getCurrentStory() || 'none'}`);

  const storyId = getCurrentStory();
  if (storyId && fs.existsSync(CHECKPOINTS_DIR)) {
    console.log(`\nCheckpoints for ${storyId}:`);
    const files = fs.readdirSync(CHECKPOINTS_DIR);
    const storyCheckpoints = files.filter(f => f.startsWith(storyId + '_'));

    if (storyCheckpoints.length === 0) {
      console.log('  (none)');
    } else {
      storyCheckpoints.forEach(f => {
        const value = fs.readFileSync(path.join(CHECKPOINTS_DIR, f), 'utf8').split('\n')[0];
        const name = f.replace(storyId + '_', '');
        console.log(`  ${name}: ${value}`);
      });
    }
  }

  process.exit(0);
}

function startRalph() {
  fs.mkdirSync(path.dirname(WORKFLOW_FLAG), { recursive: true });
  fs.writeFileSync(WORKFLOW_FLAG, `Started: ${new Date().toISOString()}`);
  console.log('Ralph workflow ACTIVATED');
  console.log('Hooks are now enforcing rules');
  process.exit(0);
}

function stopRalph() {
  if (fs.existsSync(WORKFLOW_FLAG)) {
    fs.unlinkSync(WORKFLOW_FLAG);
  }
  if (fs.existsSync(PHASE_FILE)) {
    fs.unlinkSync(PHASE_FILE);
  }
  if (fs.existsSync(CURRENT_STORY_FILE)) {
    fs.unlinkSync(CURRENT_STORY_FILE);
  }
  console.log('Ralph workflow DEACTIVATED');
  process.exit(0);
}

// ============================================================================
// MAIN
// ============================================================================

const args = process.argv.slice(2);
const action = args[0];

switch (action) {
  case 'check-edit':
    checkEdit(args[1]);
    break;
  case 'check-completion':
    checkCompletion();
    break;
  case 'set-phase':
    setPhase(args[1]);
    break;
  case 'set-story':
    setStory(args[1]);
    break;
  case 'create-checkpoint':
    createCheckpoint(args[1], args[2] || 'PASS');
    break;
  case 'clear-checkpoints':
    clearCheckpoints();
    break;
  case 'status':
    showStatus();
    break;
  case 'start':
    startRalph();
    break;
  case 'stop':
    stopRalph();
    break;
  default:
    console.log('Ralph Guard - Workflow Enforcement');
    console.log('\nUsage: node ralph-guard.js <action> [args]');
    console.log('\nActions:');
    console.log('  start                    Start Ralph workflow (activate hooks)');
    console.log('  stop                     Stop Ralph workflow (deactivate hooks)');
    console.log('  status                   Show current workflow status');
    console.log('  set-phase <phase>        Set phase (test-write|build|validate|commit)');
    console.log('  set-story <story-id>     Set current story being worked on');
    console.log('  check-edit <filepath>    Check if file can be edited (used by hooks)');
    console.log('  check-completion         Check if story can be marked complete');
    console.log('  create-checkpoint <name> [value]  Create checkpoint');
    console.log('  clear-checkpoints        Clear all checkpoints for current story');
    process.exit(0);
}
