#!/usr/bin/env node
/**
 * Learning Enforcer - Blocks builds with known-bad patterns
 *
 * Part of Ralph TDD Workflow v3.0
 *
 * This hook reads LEARNINGS.md and blocks any edit/write that would
 * introduce patterns marked as BLOCK-PATTERN.
 *
 * Usage: node learning-enforcer.js <filepath> [content]
 *
 * Exit codes:
 *   0 = ALLOW (no blocked patterns found)
 *   2 = BLOCK (blocked pattern detected)
 */

const fs = require('fs');
const path = require('path');

// Exit codes
const EXIT_ALLOW = 0;
const EXIT_BLOCK = 2;

// Paths
const LEARNINGS_PATH = path.join('scripts', 'ralph', 'LEARNINGS.md');
const WORKFLOW_FLAG = path.join('.claude', 'workflow_active');

/**
 * Parse LEARNINGS.md to extract BLOCK-PATTERN sections
 */
function parseBlockPatterns() {
  if (!fs.existsSync(LEARNINGS_PATH)) {
    return [];
  }

  const content = fs.readFileSync(LEARNINGS_PATH, 'utf8');
  const patterns = [];

  // Match BLOCK-PATTERN sections
  const blockPatternRegex = /## BLOCK-PATTERN:\s*(\S+)\s*\n\*\*Signature\*\*:\s*`([^`]+)`\s*\n\*\*Solution\*\*:\s*([^\n]+)/g;

  let match;
  while ((match = blockPatternRegex.exec(content)) !== null) {
    patterns.push({
      id: match[1],
      signature: match[2],
      solution: match[3].trim(),
      regex: new RegExp(match[2], 'gi')
    });
  }

  return patterns;
}

/**
 * Check if file should be scanned (source files only, not tests)
 */
function shouldScanFile(filepath) {
  if (!filepath) return false;

  const normalized = filepath.replace(/\\/g, '/').toLowerCase();

  // Skip test files
  if (normalized.includes('.spec.') ||
      normalized.includes('.test.') ||
      normalized.includes('/__tests__/') ||
      normalized.includes('/e2e/')) {
    return false;
  }

  // Skip non-source files
  if (!normalized.match(/\.(ts|tsx|js|jsx|mjs|cjs)$/)) {
    return false;
  }

  // Skip node_modules and .git
  if (normalized.includes('node_modules') || normalized.includes('.git/')) {
    return false;
  }

  return true;
}

/**
 * Scan content for blocked patterns
 */
function scanForBlockedPatterns(content, patterns) {
  const violations = [];

  for (const pattern of patterns) {
    const matches = content.match(pattern.regex);
    if (matches && matches.length > 0) {
      violations.push({
        patternId: pattern.id,
        signature: pattern.signature,
        solution: pattern.solution,
        matches: matches.slice(0, 3) // Show first 3 matches
      });
    }
  }

  return violations;
}

/**
 * Get line numbers where pattern appears
 */
function getLineNumbers(content, pattern) {
  const lines = content.split('\n');
  const lineNumbers = [];

  for (let i = 0; i < lines.length; i++) {
    if (pattern.regex.test(lines[i])) {
      lineNumbers.push(i + 1);
    }
    // Reset regex state for next iteration
    pattern.regex.lastIndex = 0;
  }

  return lineNumbers;
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const filepath = args[0];

  // Check if Ralph is active
  if (!fs.existsSync(WORKFLOW_FLAG)) {
    // Ralph not active - allow everything
    process.exit(EXIT_ALLOW);
  }

  if (!filepath) {
    console.log('Learning Enforcer - Pattern Blocker');
    console.log('\nUsage: node learning-enforcer.js <filepath>');
    console.log('\nThis hook blocks edits that introduce known-bad patterns.');
    console.log('Patterns are defined in scripts/ralph/LEARNINGS.md');
    console.log('\nExample LEARNINGS.md format:');
    console.log('  ## BLOCK-PATTERN: BP-001');
    console.log('  **Signature**: `mock\\s*[:=]\\s*(true|[\'"])`');
    console.log('  **Solution**: Remove mock flags, use environment variables');
    process.exit(0);
  }

  // Check if file should be scanned
  if (!shouldScanFile(filepath)) {
    process.exit(EXIT_ALLOW);
  }

  // Load patterns
  const patterns = parseBlockPatterns();

  if (patterns.length === 0) {
    // No patterns defined - allow
    process.exit(EXIT_ALLOW);
  }

  // Read file content
  let content;
  if (fs.existsSync(filepath)) {
    content = fs.readFileSync(filepath, 'utf8');
  } else {
    // New file being created - check the content from stdin or args
    content = args[1] || '';
    if (!content && !process.stdin.isTTY) {
      // Try reading from stdin
      content = fs.readFileSync(0, 'utf8');
    }
  }

  if (!content) {
    process.exit(EXIT_ALLOW);
  }

  // Scan for violations
  const violations = scanForBlockedPatterns(content, patterns);

  if (violations.length === 0) {
    process.exit(EXIT_ALLOW);
  }

  // Found violations - BLOCK
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('BLOCKED: Known-bad pattern detected');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`File: ${filepath}`);
  console.log('');

  for (const violation of violations) {
    console.log(`Pattern: ${violation.patternId}`);
    console.log(`Signature: ${violation.signature}`);
    console.log(`Matches found: ${violation.matches.join(', ')}`);
    console.log('');
    console.log(`SOLUTION: ${violation.solution}`);
    console.log('');

    // Get line numbers
    const pattern = patterns.find(p => p.id === violation.patternId);
    if (pattern) {
      const lineNumbers = getLineNumbers(content, pattern);
      if (lineNumbers.length > 0) {
        console.log(`Lines: ${lineNumbers.slice(0, 5).join(', ')}${lineNumbers.length > 5 ? '...' : ''}`);
      }
    }
    console.log('───────────────────────────────────────────────────────────');
  }

  console.log('');
  console.log('This pattern has been identified as problematic in LEARNINGS.md');
  console.log('Fix the code using the solution above, then retry.');
  console.log('═══════════════════════════════════════════════════════════');

  process.exit(EXIT_BLOCK);
}

// CLI commands
if (process.argv[2] === 'list') {
  // List all patterns
  const patterns = parseBlockPatterns();
  if (patterns.length === 0) {
    console.log('No BLOCK-PATTERN entries found in LEARNINGS.md');
    console.log(`Expected path: ${LEARNINGS_PATH}`);
  } else {
    console.log(`Found ${patterns.length} BLOCK-PATTERN entries:\n`);
    patterns.forEach(p => {
      console.log(`  ${p.id}: ${p.signature}`);
      console.log(`    Solution: ${p.solution}\n`);
    });
  }
  process.exit(0);
} else if (process.argv[2] === 'test') {
  // Test a specific pattern
  const patternId = process.argv[3];
  const testContent = process.argv[4];

  if (!patternId || !testContent) {
    console.log('Usage: node learning-enforcer.js test <pattern-id> <test-content>');
    process.exit(1);
  }

  const patterns = parseBlockPatterns();
  const pattern = patterns.find(p => p.id === patternId);

  if (!pattern) {
    console.log(`Pattern ${patternId} not found`);
    process.exit(1);
  }

  const matches = pattern.regex.test(testContent);
  console.log(`Pattern: ${patternId}`);
  console.log(`Test: "${testContent}"`);
  console.log(`Match: ${matches ? 'YES (would BLOCK)' : 'NO (would ALLOW)'}`);
  process.exit(0);
} else {
  main();
}
