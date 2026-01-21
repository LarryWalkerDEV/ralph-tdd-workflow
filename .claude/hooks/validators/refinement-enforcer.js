#!/usr/bin/env node
/**
 * Refinement Enforcer v4.0 - Ensures iterative self-refinement before validation
 *
 * ENFORCES:
 *   - 3 mandatory refinement passes after tests pass
 *   - Pass 1: Make it work (tests pass)
 *   - Pass 2: Make it better (code quality)
 *   - Pass 3: Make it robust (error handling, edge cases)
 *
 * WHY:
 *   Claude's first attempt is usually "good enough to pass tests" but not
 *   production-ready. Forcing 2-3 refinement passes produces much better code.
 *
 * Commands:
 *   check <story-id>          - Check if refinement is complete
 *   require <story-id>        - Get next refinement prompt
 *   complete-pass <story-id> <pass>  - Mark a pass as complete
 *   status <story-id>         - Show refinement status
 *   reset <story-id>          - Reset refinement (start over)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============================================================================
// CONFIGURATION
// ============================================================================

const REFINEMENT_DIR = path.join('.claude', 'refinement');
const CHECKPOINTS_DIR = path.join('.claude', 'checkpoints');
const VALIDATOR_RESULTS_DIR = path.join('.claude', 'validator-results');

// Refinement passes
const PASSES = [
  {
    id: 1,
    name: 'tests_passing',
    description: 'Make it work',
    prompt: null  // No prompt needed - just run tests
  },
  {
    id: 2,
    name: 'code_improved',
    description: 'Make it better',
    prompt: `REFINEMENT PASS 2: Make it Better

You've made the tests pass. Now IMPROVE the code:

1. CODE STRUCTURE
   - Are functions doing one thing?
   - Are variable names clear and descriptive?
   - Is the code organized logically?

2. BEST PRACTICES
   - Are you following the project's patterns?
   - Is there unnecessary duplication?
   - Are imports organized?

3. READABILITY
   - Would another developer understand this easily?
   - Are complex parts commented?
   - Is the code self-documenting?

RULES:
- Tests must still pass after changes
- Don't add new features, only improve existing code
- Focus on clarity over cleverness

After improving, run tests again to verify nothing broke.`
  },
  {
    id: 3,
    name: 'code_hardened',
    description: 'Make it robust',
    prompt: `REFINEMENT PASS 3: Make it Robust

You've improved the code. Now HARDEN it:

1. ERROR HANDLING
   - What happens if the API fails?
   - What happens with empty/null inputs?
   - Are errors caught and handled gracefully?

2. EDGE CASES
   - What if the user does something unexpected?
   - What about empty arrays, missing data?
   - Are there race conditions?

3. INPUT VALIDATION
   - Are all inputs validated at the boundaries?
   - Are error messages user-friendly?
   - Do you fail fast on bad input?

4. CLEANUP
   - Remove any debug code (console.log, etc.)
   - Remove commented-out code
   - Remove TODO markers (fix them or remove)

RULES:
- Tests must still pass after changes
- Add error handling, not new features
- Think "what could go wrong?"

After hardening, run tests again to verify nothing broke.`
  }
];

// ============================================================================
// HELPERS
// ============================================================================

function loadRefinementState(storyId) {
  const statePath = path.join(REFINEMENT_DIR, `${storyId}.json`);
  if (fs.existsSync(statePath)) {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  }
  return {
    story_id: storyId,
    started_at: new Date().toISOString(),
    passes: {
      1: { complete: false, completed_at: null },
      2: { complete: false, completed_at: null },
      3: { complete: false, completed_at: null }
    },
    current_pass: 1
  };
}

function saveRefinementState(storyId, state) {
  fs.mkdirSync(REFINEMENT_DIR, { recursive: true });
  const statePath = path.join(REFINEMENT_DIR, `${storyId}.json`);
  state.last_updated = new Date().toISOString();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function isPassComplete(state, passId) {
  return state.passes[passId]?.complete === true;
}

function getNextPass(state) {
  for (let i = 1; i <= 3; i++) {
    if (!isPassComplete(state, i)) {
      return i;
    }
  }
  return null;  // All passes complete
}

// ============================================================================
// COMMANDS
// ============================================================================

function checkRefinement(storyId) {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`REFINEMENT CHECK: ${storyId}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  const state = loadRefinementState(storyId);
  const nextPass = getNextPass(state);

  console.log('Refinement Passes:');
  for (let i = 1; i <= 3; i++) {
    const pass = PASSES.find(p => p.id === i);
    const status = isPassComplete(state, i) ? '✓' : '✗';
    const completedAt = state.passes[i]?.completed_at
      ? ` (${new Date(state.passes[i].completed_at).toLocaleTimeString()})`
      : '';
    console.log(`  ${status} Pass ${i}: ${pass.description}${completedAt}`);
  }

  console.log('');

  if (nextPass === null) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✓ ALL REFINEMENT PASSES COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('Ready for evidence collection and GLM review.');

    // Create refinement checkpoint
    fs.mkdirSync(CHECKPOINTS_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(CHECKPOINTS_DIR, `${storyId}_refinement_complete`),
      `PASS\n${new Date().toISOString()}`
    );

    // Create validator result
    const result = {
      story_id: storyId,
      validator: 'refinement-enforcer',
      result: 'PASS',
      pass_rate: '100%',
      timestamp: new Date().toISOString(),
      passes: state.passes
    };

    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(result))
      .digest('hex').substring(0, 16);
    result.hash = hash;

    fs.mkdirSync(VALIDATOR_RESULTS_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(VALIDATOR_RESULTS_DIR, `${storyId}_refinement.json`),
      JSON.stringify(result, null, 2)
    );

    process.exit(0);
  } else {
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✗ REFINEMENT INCOMPLETE - Pass ${nextPass} required`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('Get next prompt: node refinement-enforcer.js require ' + storyId);
    process.exit(2);  // Exit 2 = blocked
  }
}

function requireRefinement(storyId) {
  const state = loadRefinementState(storyId);
  const nextPassId = getNextPass(state);

  if (nextPassId === null) {
    console.log('All refinement passes complete.');
    process.exit(0);
  }

  const pass = PASSES.find(p => p.id === nextPassId);

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`REFINEMENT REQUIRED: Pass ${nextPassId} - ${pass.description}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  if (pass.prompt) {
    console.log(pass.prompt);
  } else {
    console.log('Run tests and verify they pass.');
    console.log('');
    console.log('  npx playwright test e2e/' + storyId + '.spec.ts');
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('After completing this pass, run:');
  console.log(`  node refinement-enforcer.js complete-pass ${storyId} ${nextPassId}`);
  console.log('');
}

function completePass(storyId, passId) {
  const state = loadRefinementState(storyId);
  const id = parseInt(passId);

  if (id < 1 || id > 3) {
    console.error('Invalid pass ID. Must be 1, 2, or 3.');
    process.exit(1);
  }

  // Check that previous passes are complete
  for (let i = 1; i < id; i++) {
    if (!isPassComplete(state, i)) {
      console.error(`Cannot complete pass ${id} - pass ${i} is not complete`);
      process.exit(1);
    }
  }

  // Mark pass as complete
  state.passes[id] = {
    complete: true,
    completed_at: new Date().toISOString()
  };
  state.current_pass = id + 1;

  saveRefinementState(storyId, state);

  const pass = PASSES.find(p => p.id === id);
  console.log(`✓ Pass ${id} (${pass.description}) marked complete`);

  // Check if all done
  const nextPass = getNextPass(state);
  if (nextPass === null) {
    console.log('');
    console.log('✓ All refinement passes complete!');
    console.log('Ready for evidence collection.');
  } else {
    console.log('');
    console.log(`Next: Pass ${nextPass}`);
    console.log(`Get prompt: node refinement-enforcer.js require ${storyId}`);
  }
}

function showStatus(storyId) {
  const state = loadRefinementState(storyId);

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`REFINEMENT STATUS: ${storyId}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log(`Started: ${state.started_at || 'Not started'}`);
  console.log(`Updated: ${state.last_updated || 'Never'}`);
  console.log('');
  console.log('Passes:');

  for (let i = 1; i <= 3; i++) {
    const pass = PASSES.find(p => p.id === i);
    const complete = isPassComplete(state, i);
    const status = complete ? '✓ COMPLETE' : '✗ PENDING';
    console.log(`  Pass ${i}: ${pass.description}`);
    console.log(`    Status: ${status}`);
    if (state.passes[i]?.completed_at) {
      console.log(`    Completed: ${state.passes[i].completed_at}`);
    }
    console.log('');
  }

  const completedCount = [1, 2, 3].filter(i => isPassComplete(state, i)).length;
  console.log(`Progress: ${completedCount}/3 passes complete`);
  console.log('═══════════════════════════════════════════════════════════');
}

function resetRefinement(storyId) {
  const statePath = path.join(REFINEMENT_DIR, `${storyId}.json`);

  if (fs.existsSync(statePath)) {
    fs.unlinkSync(statePath);
    console.log(`✓ Refinement state reset for ${storyId}`);
  } else {
    console.log(`No refinement state found for ${storyId}`);
  }

  // Also remove checkpoint if exists
  const checkpointPath = path.join(CHECKPOINTS_DIR, `${storyId}_refinement_complete`);
  if (fs.existsSync(checkpointPath)) {
    fs.unlinkSync(checkpointPath);
    console.log('✓ Refinement checkpoint removed');
  }
}

// ============================================================================
// MAIN
// ============================================================================

const args = process.argv.slice(2);
const command = args[0];
const storyId = args[1];

switch (command) {
  case 'check':
    if (!storyId) {
      console.log('Usage: node refinement-enforcer.js check <story-id>');
      process.exit(1);
    }
    checkRefinement(storyId);
    break;

  case 'require':
    if (!storyId) {
      console.log('Usage: node refinement-enforcer.js require <story-id>');
      process.exit(1);
    }
    requireRefinement(storyId);
    break;

  case 'complete-pass':
    if (!storyId || !args[2]) {
      console.log('Usage: node refinement-enforcer.js complete-pass <story-id> <pass-number>');
      process.exit(1);
    }
    completePass(storyId, args[2]);
    break;

  case 'status':
    if (!storyId) {
      console.log('Usage: node refinement-enforcer.js status <story-id>');
      process.exit(1);
    }
    showStatus(storyId);
    break;

  case 'reset':
    if (!storyId) {
      console.log('Usage: node refinement-enforcer.js reset <story-id>');
      process.exit(1);
    }
    resetRefinement(storyId);
    break;

  default:
    console.log('Refinement Enforcer v4.0');
    console.log('');
    console.log('Ensures 3 mandatory refinement passes before validation:');
    console.log('  Pass 1: Make it work (tests pass)');
    console.log('  Pass 2: Make it better (code quality)');
    console.log('  Pass 3: Make it robust (error handling)');
    console.log('');
    console.log('Usage: node refinement-enforcer.js <command> [args]');
    console.log('');
    console.log('Commands:');
    console.log('  check <story-id>                Check if refinement is complete');
    console.log('  require <story-id>              Get next refinement prompt');
    console.log('  complete-pass <story-id> <N>    Mark pass N as complete');
    console.log('  status <story-id>               Show refinement status');
    console.log('  reset <story-id>                Reset refinement (start over)');
    console.log('');
    console.log('State saved to: .claude/refinement/<story-id>.json');
    process.exit(0);
}
