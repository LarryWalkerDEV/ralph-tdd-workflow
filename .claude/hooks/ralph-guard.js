#!/usr/bin/env node
/**
 * Ralph Guard v3.0 - Cross-platform hook enforcement for Ralph workflow
 *
 * This is the MAIN hook that enforces all rules during Ralph loop.
 * Works on Windows, macOS, and Linux.
 *
 * v3.0 Features:
 *   - Git checkpoints before each story
 *   - 6 checkpoints (added whitebox_validated, cleanup_complete)
 *   - Per-story cleanup phase
 *   - Metrics tracking integration
 *   - Rollback to checkpoints on failure
 *
 * Usage: node ralph-guard.js <action> [args...]
 * Actions:
 *   - check-edit <filepath>     : Check if file can be edited
 *   - check-completion          : Check if story can be marked complete
 *   - check-all-complete        : Check if ALL stories in prd.json are complete
 *   - check-phase <required>    : Check if we're in required phase
 *   - set-phase <phase>         : Set current workflow phase
 *   - create-checkpoint <name>  : Create a checkpoint file
 *   - mark-story-pass <id>      : Mark story as passed in prd.json
 *   - next-story                : Get next pending story
 *   - progress                  : Show completion progress
 *   - status                    : Show current workflow status
 *   - git-checkpoint <id>       : Create git checkpoint before story (v3.0)
 *   - rollback <id>             : Rollback to story's git checkpoint (v3.0)
 *   - cleanup <id>              : Run per-story cleanup (v3.0)
 *   - metrics                   : Show metrics summary (v3.0)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Version
const VERSION = '3.0';

// Validator verification
const VALIDATOR_RESULTS_DIR = path.join('.claude', 'validator-results');

// Paths
const WORKFLOW_FLAG = path.join('.claude', 'workflow_active');
const PHASE_FILE = path.join('.claude', 'workflow_phase');
const CURRENT_STORY_FILE = path.join('.claude', 'current_story');
const CHECKPOINTS_DIR = path.join('.claude', 'checkpoints');
const PRD_PATH = path.join('scripts', 'ralph', 'prd.json');
const STATE_PATH = path.join('scripts', 'ralph', 'STATE.md');
const METRICS_PATH = path.join('scripts', 'ralph', 'METRICS.json');
const GIT_CHECKPOINTS_FILE = path.join('.claude', 'git_checkpoints.json');
const ITERATIONS_FILE = path.join('.claude', 'story_iterations.json');
const CONFLICTS_DIR = path.join('scripts', 'ralph', 'conflicts');

// Configuration
const MAX_ITERATIONS = 5;  // Auto-invoke conflict-resolver after this many failures

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
  return fs.readFileSync(checkpointPath, 'utf8').split('\n')[0].trim();
}

function loadPrd() {
  if (!fs.existsSync(PRD_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(PRD_PATH, 'utf8'));
  } catch (e) {
    return null;
  }
}

function savePrd(prd) {
  fs.writeFileSync(PRD_PATH, JSON.stringify(prd, null, 2));
}

function getAllStories() {
  const prd = loadPrd();
  if (!prd || !prd.tasks) return [];
  const stories = [];
  for (const task of prd.tasks) {
    if (task.stories) {
      stories.push(...task.stories);
    }
  }
  return stories;
}

function getCompletionStatus() {
  const stories = getAllStories();
  const total = stories.length;
  const passed = stories.filter(s => s.passes === true).length;
  const pending = stories.filter(s => s.passes !== true);
  return { total, passed, pending, stories };
}

function areAllStoriesComplete() {
  const { total, passed } = getCompletionStatus();
  return total > 0 && passed === total;
}

// ============================================================================
// ITERATION TRACKING (v3.0)
// ============================================================================

function loadIterations() {
  if (!fs.existsSync(ITERATIONS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(ITERATIONS_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveIterations(iterations) {
  fs.mkdirSync(path.dirname(ITERATIONS_FILE), { recursive: true });
  fs.writeFileSync(ITERATIONS_FILE, JSON.stringify(iterations, null, 2));
}

function getStoryIterations(storyId) {
  const iterations = loadIterations();
  return iterations[storyId] || { count: 0, failures: [] };
}

function recordStoryIteration(storyId, failureReason, validatorResults = {}) {
  const iterations = loadIterations();

  if (!iterations[storyId]) {
    iterations[storyId] = { count: 0, failures: [] };
  }

  iterations[storyId].count++;
  iterations[storyId].failures.push({
    attempt: iterations[storyId].count,
    timestamp: new Date().toISOString(),
    reason: failureReason,
    validators: validatorResults
  });

  saveIterations(iterations);
  return iterations[storyId];
}

function clearStoryIterations(storyId) {
  const iterations = loadIterations();
  if (iterations[storyId]) {
    delete iterations[storyId];
    saveIterations(iterations);
  }
}

function getNextPendingStory() {
  const stories = getAllStories();
  // Find stories where passes !== true and all dependencies are met
  for (const story of stories) {
    if (story.passes === true) continue;

    // Check dependencies
    const depsComplete = (story.depends_on || []).every(depId => {
      const depStory = stories.find(s => s.id === depId);
      return depStory && depStory.passes === true;
    });

    if (depsComplete) {
      return story;
    }
  }
  return null;
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

  // Check required checkpoints (v3.0: 6 checkpoints)
  const requiredCheckpoints = [
    'tests_written',
    'build_complete',
    'playwright_validated',
    'browser_validated',
    'whitebox_validated',    // v3.0: Code quality validation
    'cleanup_complete'       // v3.0: Per-story cleanup
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

  // Silent exit - no output to avoid hook feedback spam
  process.exit(EXIT_ALLOW);
}

function setPhase(phase) {
  const validPhases = ['test-write', 'build', 'validate', 'commit', 'cleanup', 'documentation', 'none'];
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

function setStory(storyId, skipGitCheckpoint = false) {
  fs.mkdirSync(path.dirname(CURRENT_STORY_FILE), { recursive: true });
  fs.writeFileSync(CURRENT_STORY_FILE, storyId);
  console.log(`Current story set to: ${storyId}`);

  // v3.0: Create git checkpoint before starting story
  if (!skipGitCheckpoint) {
    const checkpoint = createGitCheckpoint(storyId);
    if (checkpoint) {
      console.log(`Git checkpoint created: ${checkpoint.substring(0, 7)}`);
    }
  }

  // v3.0: Start metrics tracking
  startMetricsTracking(storyId);

  process.exit(0);
}

// v3.0: Create git checkpoint before story
function createGitCheckpoint(storyId) {
  try {
    // Check if git is available and repo exists
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'pipe' });

    // Stage all changes
    try {
      execSync('git add -A', { stdio: 'pipe' });
    } catch (e) {
      // May fail if nothing to add - continue
    }

    // Check if there are changes to commit
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      if (status.trim()) {
        // Create checkpoint commit
        const message = `checkpoint: before ${storyId}`;
        execSync(`git commit -m "${message}"`, { stdio: 'pipe' });
      }
    } catch (e) {
      // May fail if nothing to commit - continue
    }

    // Get current commit hash
    const hash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

    // Save checkpoint mapping
    let checkpoints = {};
    if (fs.existsSync(GIT_CHECKPOINTS_FILE)) {
      try {
        checkpoints = JSON.parse(fs.readFileSync(GIT_CHECKPOINTS_FILE, 'utf8'));
      } catch (e) {
        checkpoints = {};
      }
    }

    checkpoints[storyId] = {
      hash: hash,
      timestamp: new Date().toISOString()
    };

    fs.mkdirSync(path.dirname(GIT_CHECKPOINTS_FILE), { recursive: true });
    fs.writeFileSync(GIT_CHECKPOINTS_FILE, JSON.stringify(checkpoints, null, 2));

    // Update metrics with checkpoint
    try {
      const metricsCmd = `node .claude/hooks/validators/metrics-tracker.js checkpoint ${storyId} ${hash}`;
      execSync(metricsCmd, { stdio: 'pipe' });
    } catch (e) {
      // Metrics tracking optional - continue
    }

    return hash;
  } catch (e) {
    console.log(`Note: Git checkpoint skipped (${e.message})`);
    return null;
  }
}

// v3.0: Start metrics tracking for story
function startMetricsTracking(storyId) {
  try {
    const metricsCmd = `node .claude/hooks/validators/metrics-tracker.js start ${storyId}`;
    execSync(metricsCmd, { stdio: 'pipe' });
  } catch (e) {
    // Metrics tracking optional - continue silently
  }
}

// v3.0: Rollback to git checkpoint
function rollbackToCheckpoint(storyId) {
  if (!fs.existsSync(GIT_CHECKPOINTS_FILE)) {
    console.log(`No git checkpoints found`);
    process.exit(1);
  }

  const checkpoints = JSON.parse(fs.readFileSync(GIT_CHECKPOINTS_FILE, 'utf8'));
  const checkpoint = checkpoints[storyId];

  if (!checkpoint) {
    console.log(`No checkpoint found for ${storyId}`);
    process.exit(1);
  }

  console.log(`Rolling back ${storyId} to checkpoint ${checkpoint.hash.substring(0, 7)}`);
  console.log(`Checkpoint created: ${checkpoint.timestamp}`);
  console.log('');

  try {
    // Hard reset to checkpoint
    execSync(`git reset --hard ${checkpoint.hash}`, { stdio: 'inherit' });
    console.log('');
    console.log(`✓ Rolled back to checkpoint`);

    // Clear story checkpoints
    if (fs.existsSync(CHECKPOINTS_DIR)) {
      const files = fs.readdirSync(CHECKPOINTS_DIR);
      files.filter(f => f.startsWith(storyId + '_')).forEach(f => {
        fs.unlinkSync(path.join(CHECKPOINTS_DIR, f));
      });
      console.log(`✓ Cleared ${storyId} checkpoints`);
    }

    // Record iteration in metrics
    try {
      const metricsCmd = `node .claude/hooks/validators/metrics-tracker.js iteration ${storyId} "Rollback after 5 failed iterations"`;
      execSync(metricsCmd, { stdio: 'pipe' });
    } catch (e) {
      // Continue
    }

    process.exit(0);
  } catch (e) {
    console.log(`ERROR: Failed to rollback: ${e.message}`);
    process.exit(1);
  }
}

// v3.0: Run per-story cleanup
function runCleanup(storyId) {
  console.log(`=== Running cleanup for ${storyId} ===\n`);

  let hasErrors = false;

  // Step 1: Run ESLint --fix
  console.log('Step 1: Running ESLint --fix...');
  try {
    execSync('npm run lint -- --fix 2>&1 || npx eslint . --fix 2>&1', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    console.log('  ✓ ESLint completed');
  } catch (e) {
    console.log('  ⚠ ESLint had warnings (continuing)');
  }

  // Step 2: Run TypeScript check
  console.log('Step 2: Running TypeScript check...');
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    console.log('  ✓ TypeScript check passed');
  } catch (e) {
    console.log('  ✗ TypeScript errors found');
    hasErrors = true;
  }

  // Step 3: Check for mock patterns
  console.log('Step 3: Checking for mock patterns...');
  const mockPatterns = scanForMockPatterns();
  if (mockPatterns.length > 0) {
    console.log(`  ⚠ Found ${mockPatterns.length} possible mock patterns`);
    mockPatterns.slice(0, 3).forEach(m => console.log(`    - ${m}`));
    if (mockPatterns.length > 3) {
      console.log(`    ... and ${mockPatterns.length - 3} more`);
    }
  } else {
    console.log('  ✓ No mock patterns found');
  }

  // Create cleanup checkpoint if no critical errors
  if (!hasErrors) {
    const checkpointPath = path.join(CHECKPOINTS_DIR, `${storyId}_cleanup_complete`);
    fs.mkdirSync(CHECKPOINTS_DIR, { recursive: true });
    fs.writeFileSync(checkpointPath, `PASS\n${new Date().toISOString()}`);
    console.log(`\n✓ Cleanup checkpoint created: ${storyId}_cleanup_complete`);
  } else {
    console.log(`\n✗ Cleanup failed - fix TypeScript errors first`);
    process.exit(EXIT_BLOCK);
  }

  process.exit(0);
}

// Helper: Scan for mock patterns in source files
function scanForMockPatterns() {
  const patterns = [];
  const dirsToScan = ['app', 'lib', 'components', 'src'].filter(d => fs.existsSync(d));

  const mockRegex = /mock\s*[:=]|fake[-_]?data|stub\s*[:=]/gi;

  for (const dir of dirsToScan) {
    try {
      const files = getAllFilesRecursive(dir, ['.ts', '.tsx', '.js', '.jsx']);
      for (const file of files) {
        if (file.includes('.spec.') || file.includes('.test.') || file.includes('__tests__')) continue;
        const content = fs.readFileSync(file, 'utf8');
        const matches = content.match(mockRegex);
        if (matches) {
          patterns.push(`${file}: ${matches[0]}`);
        }
      }
    } catch (e) {
      // Continue on error
    }
  }

  return patterns;
}

// ============================================================================
// CONFLICT RESOLVER AUTO-INVOCATION (v3.0)
// ============================================================================

function generateConflictReport(storyId, iterationData) {
  // Get story details from prd.json
  const prd = loadPrd();
  let story = null;
  if (prd && prd.tasks) {
    for (const task of prd.tasks) {
      for (const s of task.stories || []) {
        if (s.id === storyId) {
          story = s;
          break;
        }
      }
    }
  }

  // Collect validator results
  const validatorTypes = ['playwright', 'browser', 'whitebox'];
  const validatorSummaries = [];

  for (const vType of validatorTypes) {
    const resultFile = path.join(VALIDATOR_RESULTS_DIR, `${storyId}_${vType}.json`);
    if (fs.existsSync(resultFile)) {
      try {
        const result = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
        validatorSummaries.push({
          type: vType,
          result: result.result,
          passRate: result.pass_rate,
          failedCriteria: (result.criteria || []).filter(c => !c.passed).map(c => ({
            description: c.description,
            evidence: c.evidence
          }))
        });
      } catch (e) {
        validatorSummaries.push({ type: vType, result: 'ERROR', error: e.message });
      }
    } else {
      validatorSummaries.push({ type: vType, result: 'NOT_RUN' });
    }
  }

  // Build failure history
  const failureHistory = iterationData.failures.map(f =>
    `Attempt ${f.attempt} (${f.timestamp}):\n  Reason: ${f.reason}`
  ).join('\n\n');

  // Determine conflict type
  let conflictType = 'iteration_loop_stuck';
  const passedValidators = validatorSummaries.filter(v => v.result === 'PASS');
  const failedValidators = validatorSummaries.filter(v => v.result === 'FAIL');

  if (passedValidators.length > 0 && failedValidators.length > 0) {
    conflictType = 'validator_disagreement';
  }

  // Generate the conflict report markdown
  const report = `# Conflict Report: ${storyId}

## Auto-Generated by Ralph Guard v3.0
**Generated**: ${new Date().toISOString()}
**Reason**: Max iterations (${MAX_ITERATIONS}) reached

---

## CONFLICT_DETECTED: ${conflictType}
**Story**: ${storyId}
**Title**: ${story ? story.title : 'Unknown'}
**Attempts**: ${iterationData.count}

---

## Acceptance Criteria
${story && story.acceptanceCriteria ?
  story.acceptanceCriteria.map((ac, i) => `${i + 1}. ${ac}`).join('\n') :
  'Not available'}

---

## Validator Results

${validatorSummaries.map(v => {
  let output = `### ${v.type.charAt(0).toUpperCase() + v.type.slice(1)} Validator: ${v.result}`;
  if (v.passRate) output += ` (${v.passRate})`;
  if (v.failedCriteria && v.failedCriteria.length > 0) {
    output += '\n\n**Failed Criteria:**';
    v.failedCriteria.forEach(fc => {
      output += `\n- ${fc.description}`;
      if (fc.evidence) output += `\n  Evidence: ${fc.evidence}`;
    });
  }
  if (v.error) output += `\n\nError: ${v.error}`;
  return output;
}).join('\n\n')}

---

## Failure History

${failureHistory || 'No failures recorded'}

---

## Context for Conflict Resolver

\`\`\`
CONFLICT_DETECTED: ${conflictType}
Story: ${storyId}
Attempts: ${iterationData.count}

Details:
${validatorSummaries.map(v => `- ${v.type}: ${v.result}${v.passRate ? ` (${v.passRate})` : ''}`).join('\n')}

History:
${iterationData.failures.slice(-3).map(f => `- Attempt ${f.attempt}: ${f.reason}`).join('\n')}
\`\`\`

---

## Recommended Next Steps

1. **Run conflict-resolver agent** with the context above
2. **Review the analysis** provided by conflict-resolver
3. **Apply the recommended fix** using tdd-implementer
4. **Re-run validation** after fix is applied

---

## Command to Invoke Conflict Resolver

\`\`\`javascript
Task({
  subagent_type: "conflict-resolver",
  description: "Diagnose ${storyId} failures",
  prompt: \`CONFLICT_DETECTED: ${conflictType}
Story: ${storyId}
Attempts: ${iterationData.count}

Details:
${validatorSummaries.map(v => `- ${v.type}: ${v.result}`).join('\n')}

History:
${iterationData.failures.slice(-3).map(f => `- Attempt ${f.attempt}: ${f.reason}`).join('\n')}

Please analyze the conflict and provide resolution strategy.\`
})
\`\`\`
`;

  return report;
}

function recordIteration(storyId, failureReason) {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`RECORDING ITERATION: ${storyId}`);
  console.log('═══════════════════════════════════════════════════════════');

  // Collect current validator results
  const validatorResults = {};
  for (const vType of ['playwright', 'browser', 'whitebox']) {
    const resultFile = path.join(VALIDATOR_RESULTS_DIR, `${storyId}_${vType}.json`);
    if (fs.existsSync(resultFile)) {
      try {
        const result = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
        validatorResults[vType] = result.result;
      } catch (e) {
        validatorResults[vType] = 'ERROR';
      }
    }
  }

  // Record the iteration
  const iterationData = recordStoryIteration(storyId, failureReason, validatorResults);

  console.log(`Attempt: ${iterationData.count}/${MAX_ITERATIONS}`);
  console.log(`Reason: ${failureReason}`);
  console.log(`Validators: ${JSON.stringify(validatorResults)}`);

  // Check if we've hit max iterations
  if (iterationData.count >= MAX_ITERATIONS) {
    console.log('');
    console.log('⚠️  MAX ITERATIONS REACHED ⚠️');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    // Generate conflict report
    fs.mkdirSync(CONFLICTS_DIR, { recursive: true });
    const reportPath = path.join(CONFLICTS_DIR, `CONFLICT-${storyId}.md`);
    const report = generateConflictReport(storyId, iterationData);
    fs.writeFileSync(reportPath, report);

    console.log(`✓ Conflict report generated: ${reportPath}`);
    console.log('');

    // Rollback to git checkpoint
    console.log('Rolling back to git checkpoint...');
    const checkpoints = fs.existsSync(GIT_CHECKPOINTS_FILE)
      ? JSON.parse(fs.readFileSync(GIT_CHECKPOINTS_FILE, 'utf8'))
      : {};

    if (checkpoints[storyId]) {
      try {
        execSync(`git reset --hard ${checkpoints[storyId].hash}`, { stdio: 'pipe' });
        console.log(`✓ Rolled back to ${checkpoints[storyId].hash.substring(0, 7)}`);
      } catch (e) {
        console.log(`⚠ Rollback failed: ${e.message}`);
      }
    }

    // Clear story checkpoints (but keep iteration data for analysis)
    if (fs.existsSync(CHECKPOINTS_DIR)) {
      const files = fs.readdirSync(CHECKPOINTS_DIR);
      files.filter(f => f.startsWith(storyId + '_')).forEach(f => {
        fs.unlinkSync(path.join(CHECKPOINTS_DIR, f));
      });
      console.log(`✓ Cleared ${storyId} checkpoints`);
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('ACTION REQUIRED: Invoke conflict-resolver');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('The iteration loop is stuck. You MUST now invoke the');
    console.log('conflict-resolver subagent to diagnose the issue.');
    console.log('');
    console.log(`Read the conflict report: ${reportPath}`);
    console.log('');
    console.log('Then run:');
    console.log('');
    console.log('Task({');
    console.log('  subagent_type: "conflict-resolver",');
    console.log(`  description: "Diagnose ${storyId} failures",`);
    console.log(`  prompt: "Read ${reportPath} and analyze the conflict..."`);
    console.log('})');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');

    // Exit with special code to indicate conflict-resolver needed
    process.exit(3);  // Exit code 3 = conflict-resolver required
  }

  console.log('');
  console.log(`Iterations remaining: ${MAX_ITERATIONS - iterationData.count}`);
  console.log('Continue with tdd-implementer to fix the issues.');
  console.log('═══════════════════════════════════════════════════════════');

  process.exit(0);
}

// v3.0: Show metrics summary
function showMetrics() {
  try {
    execSync('node .claude/hooks/validators/metrics-tracker.js summary', { stdio: 'inherit' });
  } catch (e) {
    console.log('Metrics tracker not available');
    console.log(`Run: node .claude/hooks/validators/metrics-tracker.js init`);
  }
  process.exit(0);
}

function createCheckpoint(name, value = 'PASS') {
  const storyId = getCurrentStory() || 'global';

  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL: For validator checkpoints, VERIFY actual results
  // The agent cannot self-report - we read the validator's output file
  // ═══════════════════════════════════════════════════════════════════════════
  if (name === 'playwright_validated' || name === 'browser_validated') {
    const validatorType = name === 'playwright_validated' ? 'playwright' : 'browser';
    const resultFile = path.join(VALIDATOR_RESULTS_DIR, `${storyId}_${validatorType}.json`);

    // Check if validator result file exists
    if (!fs.existsSync(resultFile)) {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('BLOCKED: No validator result file found');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`Expected file: ${resultFile}`);
      console.log('');
      console.log('The validator subagent MUST write its results to this file.');
      console.log('Checkpoint cannot be created without verified validator output.');
      console.log('');
      console.log('To fix: Re-run the validator subagent. It should call:');
      console.log('  writeValidatorResult() from validator-output-writer.js');
      console.log('═══════════════════════════════════════════════════════════');
      process.exit(EXIT_BLOCK);
    }

    // Read and parse validator result
    let validatorResult;
    try {
      validatorResult = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
    } catch (e) {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('BLOCKED: Invalid validator result file');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`File: ${resultFile}`);
      console.log(`Error: ${e.message}`);
      console.log('═══════════════════════════════════════════════════════════');
      process.exit(EXIT_BLOCK);
    }

    // Verify hash integrity (detect tampering)
    const { hash, ...dataForHash } = validatorResult;
    const expectedHash = crypto.createHash('sha256')
      .update(JSON.stringify(dataForHash))
      .digest('hex').substring(0, 16);

    if (hash !== expectedHash) {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('BLOCKED: Validator result file has been TAMPERED with');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`File: ${resultFile}`);
      console.log(`Expected hash: ${expectedHash}`);
      console.log(`Actual hash: ${hash}`);
      console.log('');
      console.log('The result file was modified after the validator wrote it.');
      console.log('Re-run the validator to get authentic results.');
      console.log('═══════════════════════════════════════════════════════════');
      process.exit(EXIT_BLOCK);
    }

    // Check timestamp freshness (30 minutes max)
    const resultTime = new Date(validatorResult.timestamp);
    const now = new Date();
    const ageMs = now - resultTime;
    const maxAgeMs = 30 * 60 * 1000; // 30 minutes

    if (ageMs > maxAgeMs) {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('BLOCKED: Validator result is STALE');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`Result timestamp: ${validatorResult.timestamp}`);
      console.log(`Age: ${Math.round(ageMs / 60000)} minutes (max: 30 minutes)`);
      console.log('');
      console.log('Re-run the validator to get fresh results.');
      console.log('═══════════════════════════════════════════════════════════');
      process.exit(EXIT_BLOCK);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // THE KEY CHECK: Use the ACTUAL result, not what the agent claims
    // ═══════════════════════════════════════════════════════════════════════
    const actualValue = validatorResult.result;

    if (value === 'PASS' && actualValue !== 'PASS') {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('BLOCKED: Cannot create PASS checkpoint');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`Story: ${storyId}`);
      console.log(`Validator: ${validatorType}`);
      console.log(`Agent claimed: ${value}`);
      console.log(`Validator reported: ${actualValue}`);
      console.log(`Pass rate: ${validatorResult.pass_rate}`);
      console.log('');
      console.log('Failed criteria:');
      (validatorResult.criteria || [])
        .filter(c => !c.passed)
        .forEach(c => {
          console.log(`  ✗ ${c.description}`);
          if (c.evidence) console.log(`    Evidence: ${c.evidence}`);
        });
      console.log('');
      console.log('Fix the implementation and re-run validation.');
      console.log('═══════════════════════════════════════════════════════════');
      process.exit(EXIT_BLOCK);
    }

    // Write checkpoint with VERIFIED value (from validator, not agent)
    fs.mkdirSync(CHECKPOINTS_DIR, { recursive: true });
    const checkpointPath = path.join(CHECKPOINTS_DIR, `${storyId}_${name}`);
    const content = `${actualValue}\n${validatorResult.timestamp}\nevidence:${resultFile}`;
    fs.writeFileSync(checkpointPath, content);

    console.log('');
    console.log(`Checkpoint created: ${storyId}_${name} = ${actualValue} (VERIFIED)`);
    console.log(`Pass rate: ${validatorResult.pass_rate}`);
    console.log(`Evidence: ${resultFile}`);

    // Exit with appropriate code
    process.exit(actualValue === 'PASS' ? EXIT_ALLOW : EXIT_BLOCK);
  }

  // For non-validator checkpoints (tests_written, build_complete), proceed normally
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

function stopRalph(force = false) {
  // Check if all stories are complete (unless force flag)
  if (!force) {
    const { total, passed, pending } = getCompletionStatus();

    if (total === 0) {
      console.log('BLOCKED: No prd.json found or no stories defined');
      console.log('Cannot exit Ralph loop without completing all stories');
      process.exit(EXIT_BLOCK);
    }

    if (!areAllStoriesComplete()) {
      console.log('BLOCKED: Cannot exit Ralph loop - stories incomplete!');
      console.log(`\nProgress: ${passed}/${total} stories passed`);
      console.log('\nPending stories:');
      pending.slice(0, 5).forEach(s => console.log(`  - ${s.id}: ${s.title}`));
      if (pending.length > 5) {
        console.log(`  ... and ${pending.length - 5} more`);
      }
      console.log('\nTo force exit (not recommended): node ralph-guard.js stop --force');
      process.exit(EXIT_BLOCK);
    }

    console.log(`All ${total} stories completed!`);
  } else {
    console.log('WARNING: Force stopping Ralph workflow');
    console.log('Some stories may be incomplete');
  }

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

function checkAllComplete() {
  const { total, passed, pending } = getCompletionStatus();

  if (areAllStoriesComplete()) {
    console.log(`COMPLETE: All ${total} stories passed`);
    console.log('Ready for cleanup phase and exit');
    process.exit(EXIT_ALLOW);
  } else {
    console.log(`INCOMPLETE: ${passed}/${total} stories passed`);
    console.log('\nPending stories:');
    pending.forEach(s => {
      const deps = s.depends_on?.length ? ` (depends on: ${s.depends_on.join(', ')})` : '';
      console.log(`  - ${s.id}: ${s.title}${deps}`);
    });
    process.exit(EXIT_BLOCK);
  }
}

function markStoryPass(storyId) {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`MARK STORY PASS: ${storyId}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Running verification layers...');
  console.log('');

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER 1: Verify prd.json exists and story is valid
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('[Layer 1] Verifying prd.json...');
  const prd = loadPrd();
  if (!prd) {
    console.log('  ✗ BLOCKED: Could not load prd.json');
    process.exit(1);
  }
  console.log('  ✓ prd.json loaded');

  let targetStory = null;
  for (const task of prd.tasks) {
    for (const story of task.stories) {
      if (story.id === storyId) {
        targetStory = story;
        break;
      }
    }
  }

  if (!targetStory) {
    console.log(`  ✗ BLOCKED: Story ${storyId} not found in prd.json`);
    process.exit(1);
  }
  console.log(`  ✓ Story found: ${targetStory.title}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER 2: Verify ALL validator results exist and are PASS (v3.0: 3 validators)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('');
  console.log('[Layer 2] Verifying validator results...');

  const validators = ['playwright', 'browser', 'whitebox'];  // v3.0: Added whitebox
  const validatorResults = {};

  for (const validatorType of validators) {
    const resultFile = path.join(VALIDATOR_RESULTS_DIR, `${storyId}_${validatorType}.json`);

    if (!fs.existsSync(resultFile)) {
      console.log(`  ✗ BLOCKED: No ${validatorType} validator result`);
      console.log(`    Expected: ${resultFile}`);
      console.log('');
      console.log('Run the validator subagent first. It must call writeValidatorResult().');
      process.exit(EXIT_BLOCK);
    }

    let result;
    try {
      result = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
    } catch (e) {
      console.log(`  ✗ BLOCKED: Invalid ${validatorType} result file`);
      process.exit(EXIT_BLOCK);
    }

    // Verify hash integrity
    const { hash, ...dataForHash } = result;
    const expectedHash = crypto.createHash('sha256')
      .update(JSON.stringify(dataForHash))
      .digest('hex').substring(0, 16);

    if (hash !== expectedHash) {
      console.log(`  ✗ BLOCKED: ${validatorType} result has been TAMPERED`);
      process.exit(EXIT_BLOCK);
    }

    // Check freshness
    const ageMs = Date.now() - new Date(result.timestamp).getTime();
    if (ageMs > 30 * 60 * 1000) {
      console.log(`  ✗ BLOCKED: ${validatorType} result is STALE (${Math.round(ageMs/60000)} min old)`);
      process.exit(EXIT_BLOCK);
    }

    // Check result
    if (result.result !== 'PASS') {
      console.log(`  ✗ BLOCKED: ${validatorType} validator reported ${result.result}`);
      console.log(`    Pass rate: ${result.pass_rate}`);
      console.log('');
      console.log('    Failed criteria:');
      (result.criteria || [])
        .filter(c => !c.passed)
        .forEach(c => {
          console.log(`      ✗ ${c.description}`);
          if (c.evidence) console.log(`        ${c.evidence}`);
        });
      process.exit(EXIT_BLOCK);
    }

    validatorResults[validatorType] = result;
    console.log(`  ✓ ${validatorType}: PASS (${result.pass_rate})`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER 3: Verify checkpoint files match validator results (v3.0: 6 checkpoints)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('');
  console.log('[Layer 3] Verifying checkpoints...');

  const requiredCheckpoints = [
    'tests_written',
    'build_complete',
    'playwright_validated',
    'browser_validated',
    'whitebox_validated',    // v3.0
    'cleanup_complete'       // v3.0
  ];

  for (const cp of requiredCheckpoints) {
    const checkpointPath = path.join(CHECKPOINTS_DIR, `${storyId}_${cp}`);
    if (!fs.existsSync(checkpointPath)) {
      console.log(`  ✗ BLOCKED: Missing checkpoint: ${cp}`);
      console.log(`    Run: node ralph-guard.js create-checkpoint ${cp} PASS`);
      process.exit(EXIT_BLOCK);
    }

    const value = fs.readFileSync(checkpointPath, 'utf8').split('\n')[0].trim();
    if (value !== 'PASS') {
      console.log(`  ✗ BLOCKED: Checkpoint ${cp} = ${value} (expected PASS)`);
      process.exit(EXIT_BLOCK);
    }
    console.log(`  ✓ ${cp}: PASS`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER 4: Check for mock data patterns (optional - warn only for now)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('');
  console.log('[Layer 4] Scanning for mock data...');

  const mockPatterns = [
    /mock\s*[:=]/gi,
    /stub\s*[:=]/gi,
    /fake\s*[:=]/gi,
    /test-project-\d+/gi,
    /dummy[-_]?data/gi
  ];

  let mockWarnings = 0;
  const dirsToScan = ['app', 'lib', 'components'].filter(d => fs.existsSync(d));

  for (const dir of dirsToScan) {
    try {
      const files = getAllFilesRecursive(dir, ['.ts', '.tsx', '.js', '.jsx']);
      for (const file of files) {
        // Skip test files
        if (file.includes('.spec.') || file.includes('.test.') || file.includes('__tests__')) continue;

        const content = fs.readFileSync(file, 'utf8');
        for (const pattern of mockPatterns) {
          if (pattern.test(content)) {
            mockWarnings++;
            if (mockWarnings <= 3) {
              console.log(`  ⚠ Warning: Possible mock data in ${file}`);
            }
          }
        }
      }
    } catch (e) {
      // Directory scan error - continue
    }
  }

  if (mockWarnings > 3) {
    console.log(`  ⚠ ... and ${mockWarnings - 3} more warnings`);
  }

  if (mockWarnings === 0) {
    console.log('  ✓ No obvious mock patterns detected');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ALL LAYERS PASSED - Mark story as complete
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('ALL VERIFICATION LAYERS PASSED');
  console.log('═══════════════════════════════════════════════════════════');

  // Update prd.json (v3.0: 6 checkpoints)
  targetStory.passes = true;
  targetStory.checkpoints = {
    tests_written: true,
    build_complete: true,
    playwright_validated: true,
    browser_validated: true,
    whitebox_validated: true,   // v3.0
    cleanup_complete: true      // v3.0
  };
  targetStory.validated_at = new Date().toISOString();
  targetStory.validation_evidence = {
    playwright: validatorResults.playwright?.pass_rate,
    browser: validatorResults.browser?.pass_rate,
    whitebox: validatorResults.whitebox?.pass_rate  // v3.0
  };

  savePrd(prd);
  console.log(`✓ Marked ${storyId} as PASSED in prd.json`);

  // v3.0: Clear iterations (story completed successfully)
  clearStoryIterations(storyId);
  console.log('✓ Cleared iteration history');

  // v3.0: Record completion in metrics
  try {
    execSync(`node .claude/hooks/validators/metrics-tracker.js complete ${storyId}`, { stdio: 'pipe' });
    console.log('✓ Metrics recorded');
  } catch (e) {
    // Metrics tracking optional
  }

  // Update STATE.md
  updateStateFile(storyId);
  console.log('✓ Updated STATE.md');

  // Show summary
  console.log('');
  console.log(`Story ${storyId} complete!`);
  console.log(`  Playwright: ${validatorResults.playwright?.pass_rate}`);
  console.log(`  Browser: ${validatorResults.browser?.pass_rate}`);
  console.log('═══════════════════════════════════════════════════════════');

  process.exit(0);
}

// Helper function to get all files recursively
function getAllFilesRecursive(dir, extensions) {
  const files = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git') {
          files.push(...getAllFilesRecursive(fullPath, extensions));
        }
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  } catch (e) {
    // Ignore errors
  }
  return files;
}

function updateStateFile(completedStoryId) {
  if (!fs.existsSync(STATE_PATH)) return;

  let content = fs.readFileSync(STATE_PATH, 'utf8');

  // Update the story row to show completed
  const storyPattern = new RegExp(`\\| ${completedStoryId} \\|[^|]*\\|[^|]*\\|[^|]*\\|[^|]*\\|[^|]*\\|[^|]*\\|`, 'g');
  content = content.replace(storyPattern, `| ${completedStoryId} | ✅ | ✅ | ✅ | ✅ | ✅ | - |`);

  // Update resume point
  const nextStory = getNextPendingStory();
  if (nextStory) {
    content = content.replace(
      /\| \*\*Next Story\*\* \|[^|]*\|/,
      `| **Next Story** | ${nextStory.id} (${nextStory.title}) |`
    );
    content = content.replace(
      /\| \*\*Last Story\*\* \|[^|]*\|/,
      `| **Last Story** | ${completedStoryId} |`
    );
  }

  fs.writeFileSync(STATE_PATH, content);
}

function showNextStory() {
  const story = getNextPendingStory();

  if (!story) {
    if (areAllStoriesComplete()) {
      console.log('ALL_COMPLETE: No pending stories - all done!');
    } else {
      console.log('BLOCKED: No stories available - check dependencies');
    }
    process.exit(0);
  }

  console.log(`NEXT: ${story.id}`);
  console.log(`Title: ${story.title}`);
  console.log(`Dependencies: ${story.depends_on?.join(', ') || 'none'}`);
  console.log(`Acceptance Criteria:`);
  story.acceptanceCriteria?.forEach((ac, i) => console.log(`  ${i+1}. ${ac}`));
  process.exit(0);
}

function showProgress() {
  const { total, passed, pending, stories } = getCompletionStatus();
  const prd = loadPrd();

  console.log('=== Ralph Loop Progress ===\n');
  console.log(`Overall: ${passed}/${total} stories (${Math.round(passed/total*100)}%)`);
  console.log('');

  // Show by task
  if (prd && prd.tasks) {
    for (const task of prd.tasks) {
      const taskStories = task.stories || [];
      const taskPassed = taskStories.filter(s => s.passes === true).length;
      const status = taskPassed === taskStories.length ? '✅' : '⏳';
      console.log(`${status} ${task.id}: ${task.name} (${taskPassed}/${taskStories.length})`);

      taskStories.forEach(s => {
        const icon = s.passes === true ? '  ✅' : '  ⬜';
        console.log(`${icon} ${s.id}: ${s.title}`);
      });
      console.log('');
    }
  }

  if (areAllStoriesComplete()) {
    console.log('🎉 ALL STORIES COMPLETE! Ready for cleanup phase.');
  } else {
    const next = getNextPendingStory();
    if (next) {
      console.log(`Next story: ${next.id} - ${next.title}`);
    }
  }

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
  case 'check-all-complete':
    checkAllComplete();
    break;
  case 'set-phase':
    setPhase(args[1]);
    break;
  case 'set-story':
    setStory(args[1], args[2] === '--skip-checkpoint');
    break;
  case 'create-checkpoint':
    createCheckpoint(args[1], args[2] || 'PASS');
    break;
  case 'clear-checkpoints':
    clearCheckpoints();
    break;
  case 'mark-story-pass':
    markStoryPass(args[1]);
    break;
  case 'next-story':
    showNextStory();
    break;
  case 'progress':
    showProgress();
    break;
  case 'status':
    showStatus();
    break;
  case 'start':
    startRalph();
    break;
  case 'stop':
    stopRalph(args[1] === '--force');
    break;

  // v3.0 Commands
  case 'git-checkpoint':
    if (!args[1]) {
      console.log('Usage: node ralph-guard.js git-checkpoint <story-id>');
      process.exit(1);
    }
    const hash = createGitCheckpoint(args[1]);
    if (hash) {
      console.log(`Git checkpoint created: ${hash}`);
    }
    process.exit(0);
    break;
  case 'rollback':
    if (!args[1]) {
      console.log('Usage: node ralph-guard.js rollback <story-id>');
      process.exit(1);
    }
    rollbackToCheckpoint(args[1]);
    break;
  case 'cleanup':
    if (!args[1]) {
      const currentStory = getCurrentStory();
      if (!currentStory) {
        console.log('Usage: node ralph-guard.js cleanup <story-id>');
        console.log('Or set current story first');
        process.exit(1);
      }
      runCleanup(currentStory);
    } else {
      runCleanup(args[1]);
    }
    break;
  case 'metrics':
    showMetrics();
    break;

  // v3.0: Iteration tracking and conflict resolver
  case 'record-iteration':
    if (!args[1]) {
      const currentStory = getCurrentStory();
      if (!currentStory) {
        console.log('Usage: node ralph-guard.js record-iteration <story-id> <failure-reason>');
        process.exit(1);
      }
      recordIteration(currentStory, args[2] || 'Validation failed');
    } else {
      recordIteration(args[1], args.slice(2).join(' ') || 'Validation failed');
    }
    break;

  case 'check-iterations':
    {
      const storyId = args[1] || getCurrentStory();
      if (!storyId) {
        console.log('Usage: node ralph-guard.js check-iterations <story-id>');
        process.exit(1);
      }
      const data = getStoryIterations(storyId);
      console.log(`Story: ${storyId}`);
      console.log(`Iterations: ${data.count}/${MAX_ITERATIONS}`);
      if (data.count >= MAX_ITERATIONS) {
        console.log('STATUS: MAX_REACHED - conflict-resolver required');
        process.exit(3);
      } else {
        console.log(`STATUS: OK - ${MAX_ITERATIONS - data.count} attempts remaining`);
        process.exit(0);
      }
    }
    break;

  case 'clear-iterations':
    {
      const storyId = args[1] || getCurrentStory();
      if (!storyId) {
        console.log('Usage: node ralph-guard.js clear-iterations <story-id>');
        process.exit(1);
      }
      clearStoryIterations(storyId);
      console.log(`Cleared iterations for ${storyId}`);
      process.exit(0);
    }
    break;

  case 'version':
    console.log(`Ralph Guard v${VERSION}`);
    process.exit(0);
    break;

  default:
    console.log(`Ralph Guard v${VERSION} - Workflow Enforcement`);
    console.log('\nUsage: node ralph-guard.js <action> [args]');
    console.log('\nWorkflow Control:');
    console.log('  start                    Start Ralph workflow (activate hooks)');
    console.log('  stop                     Stop workflow (BLOCKED unless all stories pass)');
    console.log('  stop --force             Force stop (not recommended)');
    console.log('  status                   Show current workflow status');
    console.log('  progress                 Show completion progress for all stories');
    console.log('\nPhase Management:');
    console.log('  set-phase <phase>        Set phase (test-write|build|validate|commit)');
    console.log('  set-story <story-id>     Set current story (creates git checkpoint)');
    console.log('  set-story <id> --skip-checkpoint  Set story without git checkpoint');
    console.log('\nCheckpoints (v3.0: 6 required):');
    console.log('  check-edit <filepath>    Check if file can be edited (used by hooks)');
    console.log('  check-completion         Check if current story can be marked complete');
    console.log('  check-all-complete       Check if ALL stories in prd.json are complete');
    console.log('  create-checkpoint <name> [value]  Create checkpoint');
    console.log('  clear-checkpoints        Clear all checkpoints for current story');
    console.log('  Checkpoints: tests_written, build_complete, playwright_validated,');
    console.log('               browser_validated, whitebox_validated, cleanup_complete');
    console.log('\nStory Management:');
    console.log('  mark-story-pass <id>     Mark story as passed in prd.json');
    console.log('  next-story               Get next pending story to work on');
    console.log('\nv3.0 Features:');
    console.log('  git-checkpoint <id>      Create git checkpoint for story');
    console.log('  rollback <id>            Rollback to story git checkpoint');
    console.log('  cleanup [id]             Run per-story cleanup (lint, typecheck)');
    console.log('  metrics                  Show metrics summary');
    console.log('  version                  Show version');
    console.log('\nIteration Tracking (auto conflict-resolver):');
    console.log('  record-iteration <id> <reason>  Record a failed iteration');
    console.log('  check-iterations <id>    Check iteration count for story');
    console.log('  clear-iterations <id>    Reset iteration count for story');
    console.log('');
    console.log('Exit Codes:');
    console.log('  0 = Success');
    console.log('  2 = BLOCKED (cannot proceed)');
    console.log('  3 = CONFLICT_RESOLVER_REQUIRED (max iterations reached)');
    process.exit(0);
}
