#!/usr/bin/env node
/**
 * Evidence Collector v4.0 - Collects proof of implementation for GLM review
 *
 * Collects:
 *   - Playwright test output (real terminal output)
 *   - Screenshot descriptions (taken via Chrome automation by Claude)
 *   - Database query results
 *   - Network request logs
 *   - Key code snippets
 *
 * Commands:
 *   collect <story-id>        - Collect all evidence for a story
 *   add-screenshot <story-id> <name> <description>  - Add screenshot metadata
 *   add-db-query <story-id> <query> <result>        - Add database query result
 *   add-network <story-id> <method> <url> <status>  - Add network log entry
 *   add-code <story-id> <file> <lines>              - Add code snippet
 *   show <story-id>           - Show collected evidence
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

// ============================================================================
// CONFIGURATION
// ============================================================================

const PRD_PATH = path.join('scripts', 'ralph', 'prd.json');
const EVIDENCE_DIR = path.join('scripts', 'ralph', 'evidence');
const SCREENSHOTS_DIR = path.join('scripts', 'ralph', 'evidence', 'screenshots');
const TESTS_DIR = path.join('e2e');
const VALIDATOR_RESULTS_DIR = path.join('.claude', 'validator-results');

// ============================================================================
// HELPERS
// ============================================================================

function loadEvidence(storyId) {
  const evidencePath = path.join(EVIDENCE_DIR, `${storyId}.json`);
  if (fs.existsSync(evidencePath)) {
    return JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  }
  return null;
}

function saveEvidence(storyId, evidence) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const evidencePath = path.join(EVIDENCE_DIR, `${storyId}.json`);
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  return evidencePath;
}

function getStoryFromPrd(storyId) {
  if (!fs.existsSync(PRD_PATH)) return null;

  const prd = JSON.parse(fs.readFileSync(PRD_PATH, 'utf8'));
  for (const task of prd.tasks || []) {
    for (const story of task.stories || []) {
      if (story.id === storyId) {
        return story;
      }
    }
  }
  return null;
}

// ============================================================================
// EVIDENCE COLLECTION
// ============================================================================

function collectEvidence(storyId, force = false) {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`EVIDENCE COLLECTION: ${storyId}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // Get story details
  const story = getStoryFromPrd(storyId);
  if (!story) {
    console.error(`ERROR: Story ${storyId} not found in prd.json`);
    process.exit(1);
  }

  // Load existing evidence or create new
  let evidence = loadEvidence(storyId);

  if (evidence && !force) {
    console.log('Existing evidence found. Adding to it.');
    console.log('Use --force to start fresh.');
    console.log('');
  } else {
    evidence = {
      story_id: storyId,
      title: story.title,
      acceptance_criteria: story.acceptanceCriteria || [],
      collected_at: new Date().toISOString(),
      screenshots: [],
      playwright_output: null,
      db_queries: [],
      network_log: [],
      code_snippets: []
    };
    console.log('Starting fresh evidence collection.');
    console.log('');
  }

  // Step 1: Run Playwright tests and capture output
  console.log('[Step 1] Running Playwright tests...');
  const testFile = path.join(TESTS_DIR, `${storyId}.spec.ts`);

  if (fs.existsSync(testFile)) {
    try {
      const testOutput = execSync(
        `npx playwright test ${testFile} --reporter=list 2>&1`,
        { encoding: 'utf8', timeout: 120000 }
      );
      evidence.playwright_output = testOutput;
      console.log('  ✓ Playwright output captured');

      // Parse pass/fail
      const passMatch = testOutput.match(/(\d+) passed/);
      const failMatch = testOutput.match(/(\d+) failed/);
      const passed = passMatch ? parseInt(passMatch[1]) : 0;
      const failed = failMatch ? parseInt(failMatch[1]) : 0;
      console.log(`  Tests: ${passed} passed, ${failed} failed`);
    } catch (e) {
      // Tests may have failed but we still capture output
      evidence.playwright_output = e.stdout || e.message;
      console.log('  ⚠ Tests failed - output still captured');
    }
  } else {
    console.log(`  ⚠ Test file not found: ${testFile}`);
    evidence.playwright_output = '(Test file not found)';
  }

  // Step 2: Extract key code snippets from implementation
  console.log('');
  console.log('[Step 2] Extracting code snippets...');

  const codePatterns = [
    { dir: 'app/api', pattern: `**/*${storyId.toLowerCase()}*.ts` },
    { dir: 'app', pattern: '**/*.tsx' },
    { dir: 'lib', pattern: '**/*.ts' },
    { dir: 'components', pattern: '**/*.tsx' }
  ];

  // Find recently modified files (last 30 minutes)
  const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
  const recentFiles = [];

  for (const cp of codePatterns) {
    if (!fs.existsSync(cp.dir)) continue;

    try {
      const files = getAllFilesRecursive(cp.dir, ['.ts', '.tsx']);
      for (const file of files) {
        const stats = fs.statSync(file);
        if (stats.mtime.getTime() > thirtyMinAgo) {
          recentFiles.push(file);
        }
      }
    } catch (e) {
      // Continue on error
    }
  }

  if (recentFiles.length > 0) {
    console.log(`  Found ${recentFiles.length} recently modified files`);

    // Add top 5 most relevant files
    const snippets = recentFiles.slice(0, 5).map(file => {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      return {
        file: file,
        lines: `1-${Math.min(50, lines.length)}`,
        content: lines.slice(0, 50).join('\n'),
        modified_at: fs.statSync(file).mtime.toISOString()
      };
    });

    evidence.code_snippets = snippets;
    snippets.forEach(s => console.log(`  ✓ ${s.file}`));
  } else {
    console.log('  ⚠ No recently modified files found');
    console.log('    Add manually: node evidence-collector.js add-code <story> <file> <lines>');
  }

  // Step 3: Check for screenshots
  console.log('');
  console.log('[Step 3] Checking for screenshots...');

  const screenshotDir = path.join(SCREENSHOTS_DIR, storyId);
  if (fs.existsSync(screenshotDir)) {
    const screenshots = fs.readdirSync(screenshotDir)
      .filter(f => f.endsWith('.png') || f.endsWith('.jpg'));

    evidence.screenshots = screenshots.map(f => ({
      name: f,
      path: path.join(screenshotDir, f),
      description: '(Add description via Chrome automation)'
    }));

    console.log(`  ✓ Found ${screenshots.length} screenshots`);
  } else {
    console.log('  ⚠ No screenshots found');
    console.log('    Claude should take screenshots via Chrome automation');
    console.log('    Save to: scripts/ralph/evidence/screenshots/' + storyId + '/');
  }

  // Step 4: Database queries (if any were added)
  console.log('');
  console.log('[Step 4] Database queries...');
  if (evidence.db_queries.length > 0) {
    console.log(`  ✓ ${evidence.db_queries.length} queries recorded`);
  } else {
    console.log('  ⚠ No database queries recorded');
    console.log('    Add manually: node evidence-collector.js add-db-query <story> "<query>" "<result>"');
  }

  // Step 5: Network logs (if any were added)
  console.log('');
  console.log('[Step 5] Network logs...');
  if (evidence.network_log.length > 0) {
    console.log(`  ✓ ${evidence.network_log.length} requests recorded`);
  } else {
    console.log('  ⚠ No network logs recorded');
    console.log('    Add manually: node evidence-collector.js add-network <story> <method> <url> <status>');
  }

  // Update timestamp
  evidence.last_updated = new Date().toISOString();

  // Calculate evidence completeness
  const completeness = calculateCompleteness(evidence);
  evidence.completeness = completeness;

  // Save evidence
  const savedPath = saveEvidence(storyId, evidence);

  // Create checkpoint if completeness > 70%
  if (completeness.percent >= 70) {
    fs.mkdirSync(VALIDATOR_RESULTS_DIR, { recursive: true });
    const result = {
      story_id: storyId,
      validator: 'evidence-collector',
      result: 'PASS',
      pass_rate: `${completeness.percent}%`,
      timestamp: new Date().toISOString(),
      completeness: completeness
    };

    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(result))
      .digest('hex').substring(0, 16);
    result.hash = hash;

    fs.writeFileSync(
      path.join(VALIDATOR_RESULTS_DIR, `${storyId}_evidence.json`),
      JSON.stringify(result, null, 2)
    );
  }

  // Summary
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('EVIDENCE SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Story: ${storyId} - ${story.title}`);
  console.log('');
  console.log('Collected:');
  console.log(`  ├── Playwright output: ${evidence.playwright_output ? '✓' : '✗'}`);
  console.log(`  ├── Screenshots: ${evidence.screenshots.length}`);
  console.log(`  ├── Code snippets: ${evidence.code_snippets.length}`);
  console.log(`  ├── Database queries: ${evidence.db_queries.length}`);
  console.log(`  └── Network logs: ${evidence.network_log.length}`);
  console.log('');
  console.log(`Completeness: ${completeness.percent}% (${completeness.status})`);
  console.log('');
  console.log(`Saved: ${savedPath}`);
  console.log('');

  if (completeness.percent < 70) {
    console.log('RECOMMENDATION: Add more evidence before GLM review.');
    console.log('Missing:');
    completeness.missing.forEach(m => console.log(`  - ${m}`));
  } else {
    console.log('Ready for GLM review:');
    console.log('  node .claude/hooks/validators/openrouter-reviewer.js review ' + storyId);
  }

  console.log('═══════════════════════════════════════════════════════════');

  process.exit(completeness.percent >= 70 ? 0 : 1);
}

function calculateCompleteness(evidence) {
  const checks = {
    playwright_output: !!evidence.playwright_output && evidence.playwright_output !== '(Test file not found)',
    has_screenshots: evidence.screenshots.length > 0,
    has_code_snippets: evidence.code_snippets.length > 0,
    has_db_queries: evidence.db_queries.length > 0,
    has_network_logs: evidence.network_log.length > 0,
    tests_pass: evidence.playwright_output?.includes('passed') && !evidence.playwright_output?.includes('failed')
  };

  const weights = {
    playwright_output: 30,
    tests_pass: 25,
    has_code_snippets: 20,
    has_screenshots: 15,
    has_db_queries: 5,
    has_network_logs: 5
  };

  let score = 0;
  const missing = [];

  for (const [key, passed] of Object.entries(checks)) {
    if (passed) {
      score += weights[key];
    } else {
      missing.push(key.replace(/_/g, ' '));
    }
  }

  let status = 'INCOMPLETE';
  if (score >= 90) status = 'EXCELLENT';
  else if (score >= 70) status = 'GOOD';
  else if (score >= 50) status = 'PARTIAL';

  return {
    percent: score,
    status: status,
    checks: checks,
    missing: missing
  };
}

function getAllFilesRecursive(dir, extensions) {
  const files = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== '.next') {
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

// ============================================================================
// ADD EVIDENCE
// ============================================================================

function addScreenshot(storyId, name, description) {
  let evidence = loadEvidence(storyId);
  if (!evidence) {
    const story = getStoryFromPrd(storyId);
    evidence = {
      story_id: storyId,
      title: story?.title || storyId,
      acceptance_criteria: story?.acceptanceCriteria || [],
      collected_at: new Date().toISOString(),
      screenshots: [],
      playwright_output: null,
      db_queries: [],
      network_log: [],
      code_snippets: []
    };
  }

  evidence.screenshots.push({
    name: name,
    description: description,
    added_at: new Date().toISOString()
  });

  saveEvidence(storyId, evidence);
  console.log(`✓ Added screenshot: ${name}`);
  console.log(`  Description: ${description}`);
}

function addDbQuery(storyId, query, result) {
  let evidence = loadEvidence(storyId);
  if (!evidence) {
    const story = getStoryFromPrd(storyId);
    evidence = {
      story_id: storyId,
      title: story?.title || storyId,
      acceptance_criteria: story?.acceptanceCriteria || [],
      collected_at: new Date().toISOString(),
      screenshots: [],
      playwright_output: null,
      db_queries: [],
      network_log: [],
      code_snippets: []
    };
  }

  let parsedResult;
  try {
    parsedResult = JSON.parse(result);
  } catch (e) {
    parsedResult = result;
  }

  evidence.db_queries.push({
    query: query,
    result: parsedResult,
    executed_at: new Date().toISOString()
  });

  saveEvidence(storyId, evidence);
  console.log(`✓ Added database query`);
  console.log(`  Query: ${query}`);
}

function addNetworkLog(storyId, method, url, status) {
  let evidence = loadEvidence(storyId);
  if (!evidence) {
    const story = getStoryFromPrd(storyId);
    evidence = {
      story_id: storyId,
      title: story?.title || storyId,
      acceptance_criteria: story?.acceptanceCriteria || [],
      collected_at: new Date().toISOString(),
      screenshots: [],
      playwright_output: null,
      db_queries: [],
      network_log: [],
      code_snippets: []
    };
  }

  evidence.network_log.push({
    method: method,
    url: url,
    status: parseInt(status),
    logged_at: new Date().toISOString()
  });

  saveEvidence(storyId, evidence);
  console.log(`✓ Added network log: ${method} ${url} → ${status}`);
}

function addCodeSnippet(storyId, file, lines) {
  let evidence = loadEvidence(storyId);
  if (!evidence) {
    const story = getStoryFromPrd(storyId);
    evidence = {
      story_id: storyId,
      title: story?.title || storyId,
      acceptance_criteria: story?.acceptanceCriteria || [],
      collected_at: new Date().toISOString(),
      screenshots: [],
      playwright_output: null,
      db_queries: [],
      network_log: [],
      code_snippets: []
    };
  }

  if (!fs.existsSync(file)) {
    console.error(`ERROR: File not found: ${file}`);
    process.exit(1);
  }

  const content = fs.readFileSync(file, 'utf8');
  const allLines = content.split('\n');

  // Parse lines (e.g., "10-50" or "15")
  let startLine = 0;
  let endLine = allLines.length;

  if (lines.includes('-')) {
    const parts = lines.split('-');
    startLine = parseInt(parts[0]) - 1;
    endLine = parseInt(parts[1]);
  } else {
    startLine = parseInt(lines) - 1;
    endLine = startLine + 30;  // Default 30 lines
  }

  const snippet = allLines.slice(startLine, endLine).join('\n');

  evidence.code_snippets.push({
    file: file,
    lines: `${startLine + 1}-${endLine}`,
    content: snippet,
    added_at: new Date().toISOString()
  });

  saveEvidence(storyId, evidence);
  console.log(`✓ Added code snippet from ${file}`);
  console.log(`  Lines: ${startLine + 1}-${endLine}`);
}

function showEvidence(storyId) {
  const evidence = loadEvidence(storyId);

  if (!evidence) {
    console.log(`No evidence found for ${storyId}`);
    console.log(`Collect first: node evidence-collector.js collect ${storyId}`);
    process.exit(1);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`EVIDENCE: ${storyId}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log(`Title: ${evidence.title}`);
  console.log(`Collected: ${evidence.collected_at}`);
  console.log(`Updated: ${evidence.last_updated || evidence.collected_at}`);
  console.log('');

  console.log('Acceptance Criteria:');
  (evidence.acceptance_criteria || []).forEach((ac, i) => {
    console.log(`  ${i + 1}. ${ac}`);
  });

  console.log('');
  console.log('Screenshots:');
  if (evidence.screenshots.length === 0) {
    console.log('  (none)');
  } else {
    evidence.screenshots.forEach(s => {
      console.log(`  - ${s.name}: ${s.description || '(no description)'}`);
    });
  }

  console.log('');
  console.log('Playwright Output:');
  if (evidence.playwright_output) {
    const lines = evidence.playwright_output.split('\n').slice(0, 15);
    lines.forEach(l => console.log('  ' + l));
    if (evidence.playwright_output.split('\n').length > 15) {
      console.log('  ...');
    }
  } else {
    console.log('  (not collected)');
  }

  console.log('');
  console.log('Database Queries:');
  if (evidence.db_queries.length === 0) {
    console.log('  (none)');
  } else {
    evidence.db_queries.forEach(q => {
      console.log(`  Query: ${q.query}`);
      console.log(`  Result: ${JSON.stringify(q.result).substring(0, 100)}...`);
    });
  }

  console.log('');
  console.log('Network Log:');
  if (evidence.network_log.length === 0) {
    console.log('  (none)');
  } else {
    evidence.network_log.forEach(n => {
      console.log(`  ${n.method} ${n.url} → ${n.status}`);
    });
  }

  console.log('');
  console.log('Code Snippets:');
  if (evidence.code_snippets.length === 0) {
    console.log('  (none)');
  } else {
    evidence.code_snippets.forEach(c => {
      console.log(`  - ${c.file} (lines ${c.lines})`);
    });
  }

  if (evidence.completeness) {
    console.log('');
    console.log(`Completeness: ${evidence.completeness.percent}% (${evidence.completeness.status})`);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
}

// ============================================================================
// MAIN
// ============================================================================

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'collect':
    if (!args[1]) {
      console.log('Usage: node evidence-collector.js collect <story-id> [--force]');
      process.exit(1);
    }
    collectEvidence(args[1], args.includes('--force'));
    break;

  case 'add-screenshot':
    if (!args[1] || !args[2] || !args[3]) {
      console.log('Usage: node evidence-collector.js add-screenshot <story-id> <name> "<description>"');
      process.exit(1);
    }
    addScreenshot(args[1], args[2], args.slice(3).join(' '));
    break;

  case 'add-db-query':
    if (!args[1] || !args[2] || !args[3]) {
      console.log('Usage: node evidence-collector.js add-db-query <story-id> "<query>" "<result-json>"');
      process.exit(1);
    }
    addDbQuery(args[1], args[2], args.slice(3).join(' '));
    break;

  case 'add-network':
    if (!args[1] || !args[2] || !args[3] || !args[4]) {
      console.log('Usage: node evidence-collector.js add-network <story-id> <method> <url> <status>');
      process.exit(1);
    }
    addNetworkLog(args[1], args[2], args[3], args[4]);
    break;

  case 'add-code':
    if (!args[1] || !args[2] || !args[3]) {
      console.log('Usage: node evidence-collector.js add-code <story-id> <file> <lines>');
      console.log('Example: node evidence-collector.js add-code US-005 app/api/generate/route.ts 15-45');
      process.exit(1);
    }
    addCodeSnippet(args[1], args[2], args[3]);
    break;

  case 'show':
    if (!args[1]) {
      console.log('Usage: node evidence-collector.js show <story-id>');
      process.exit(1);
    }
    showEvidence(args[1]);
    break;

  default:
    console.log('Evidence Collector v4.0');
    console.log('');
    console.log('Usage: node evidence-collector.js <command> [args]');
    console.log('');
    console.log('Commands:');
    console.log('  collect <story-id>        Collect all evidence for a story');
    console.log('  show <story-id>           Show collected evidence');
    console.log('');
    console.log('Add Evidence:');
    console.log('  add-screenshot <id> <name> "<description>"');
    console.log('  add-db-query <id> "<query>" "<result-json>"');
    console.log('  add-network <id> <method> <url> <status>');
    console.log('  add-code <id> <file> <lines>');
    console.log('');
    console.log('Evidence is saved to: scripts/ralph/evidence/<story-id>.json');
    process.exit(0);
}
