#!/usr/bin/env node
/**
 * Cross-Platform Hook Wrapper
 *
 * Detects OS and runs appropriate hook:
 * - Windows: Uses Node.js ralph-guard.js
 * - Unix: Uses bash scripts
 *
 * Usage: node cross-platform-hook.js <action> [args...]
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const isWindows = process.platform === 'win32';
const args = process.argv.slice(2);
const action = args[0];

// Map actions to scripts
const actionMap = {
  'check-edit': {
    node: ['ralph-guard.js', 'check-edit', args[1]],
    bash: ['ralph-edit-check.sh', args[1]]
  },
  'check-completion': {
    node: ['ralph-guard.js', 'check-completion'],
    bash: ['workflow-stop-check.sh']
  },
  'planning-check': {
    node: ['ralph-guard.js', 'check-edit', args[1]],
    bash: ['ralph-edit-check.sh', args[1]]
  }
};

function runNodeScript(scriptArgs) {
  const scriptPath = path.join(__dirname, scriptArgs[0]);
  const fullArgs = ['node', scriptPath, ...scriptArgs.slice(1)];

  try {
    const result = spawnSync('node', [scriptPath, ...scriptArgs.slice(1)], {
      stdio: 'inherit',
      encoding: 'utf8'
    });
    process.exit(result.status || 0);
  } catch (err) {
    console.error(`Error running Node script: ${err.message}`);
    process.exit(1);
  }
}

function runBashScript(scriptArgs) {
  const scriptPath = path.join(__dirname, scriptArgs[0]);

  // Check if bash is available
  try {
    execSync('bash --version', { stdio: 'ignore' });
  } catch {
    // Bash not available, fall back to Node
    console.log('Bash not available, using Node.js fallback');
    const nodeAction = actionMap[action]?.node;
    if (nodeAction) {
      runNodeScript(nodeAction);
    }
    return;
  }

  try {
    const result = spawnSync('bash', [scriptPath, ...scriptArgs.slice(1)], {
      stdio: 'inherit',
      encoding: 'utf8'
    });
    process.exit(result.status || 0);
  } catch (err) {
    console.error(`Error running bash script: ${err.message}`);
    process.exit(1);
  }
}

// Main execution
if (!action || !actionMap[action]) {
  console.log('Cross-Platform Hook Wrapper');
  console.log('');
  console.log('Usage: node cross-platform-hook.js <action> [args]');
  console.log('');
  console.log('Actions:');
  console.log('  check-edit <filepath>   Check if file can be edited');
  console.log('  check-completion        Check if story can be completed');
  console.log('  planning-check <file>   Check planning mode restrictions');
  process.exit(0);
}

const scripts = actionMap[action];

if (isWindows) {
  // Windows: Always use Node.js
  runNodeScript(scripts.node);
} else {
  // Unix: Prefer bash, fall back to Node.js
  const bashScript = path.join(__dirname, scripts.bash[0]);
  if (fs.existsSync(bashScript)) {
    runBashScript(scripts.bash);
  } else {
    runNodeScript(scripts.node);
  }
}
