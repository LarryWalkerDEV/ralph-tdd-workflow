#!/usr/bin/env node
/**
 * Migrate prd.json to v3.0 format
 *
 * This script upgrades existing prd.json files to v3.0 schema:
 * - Adds version field
 * - Adds intent section (placeholder)
 * - Adds user_stories array to each story (placeholder)
 * - Adds new checkpoints (whitebox_validated, cleanup_complete)
 * - Adds metrics tracking fields
 * - Adds config section with v3.0 defaults
 *
 * Usage: node migrate-to-v3.js [prd.json path]
 */

const fs = require('fs');
const path = require('path');

const PRD_PATH = process.argv[2] || path.join('scripts', 'ralph', 'prd.json');

function migrate() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Ralph prd.json Migration: v2.x → v3.0');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Check if file exists
  if (!fs.existsSync(PRD_PATH)) {
    console.log(`ERROR: ${PRD_PATH} not found`);
    process.exit(1);
  }

  // Load existing prd.json
  let prd;
  try {
    prd = JSON.parse(fs.readFileSync(PRD_PATH, 'utf8'));
  } catch (e) {
    console.log(`ERROR: Failed to parse ${PRD_PATH}: ${e.message}`);
    process.exit(1);
  }

  // Check current version
  const currentVersion = prd.version || '2.0';
  console.log(`Current version: ${currentVersion}`);

  if (currentVersion === '3.0') {
    console.log('Already at v3.0 - no migration needed');
    process.exit(0);
  }

  // Create backup
  const backupPath = PRD_PATH.replace('.json', `-backup-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(prd, null, 2));
  console.log(`Backup created: ${backupPath}\n`);

  // Start migration
  console.log('Migrating...\n');

  // 1. Set version
  prd.version = '3.0';
  console.log('✓ Set version to 3.0');

  // 2. Add intent section if missing
  if (!prd.intent) {
    prd.intent = {
      problem_statement: '[To be filled via /intent-engineer skill]',
      user_personas: [],
      constraints: {
        technical: [],
        compliance: [],
        business: []
      },
      risks: [],
      success_metrics: {
        quantitative: [],
        qualitative: [],
        business: []
      }
    };
    console.log('✓ Added intent section (placeholder)');
  }

  // 3. Add config section if missing
  if (!prd.config) {
    prd.config = {
      max_attempts_per_story: 5,
      parallel_build: true,
      parallel_validate: true,
      dev_server_url: 'http://localhost:3000',
      test_timeout_ms: 30000,
      enable_whitebox: true,
      enable_learning_enforcer: true,
      cleanup_per_story: true
    };
    console.log('✓ Added config section with v3.0 defaults');
  } else {
    // Add new v3.0 config options
    prd.config.enable_whitebox = prd.config.enable_whitebox ?? true;
    prd.config.enable_learning_enforcer = prd.config.enable_learning_enforcer ?? true;
    prd.config.cleanup_per_story = prd.config.cleanup_per_story ?? true;
    console.log('✓ Updated config with v3.0 options');
  }

  // 4. Migrate stories
  let storiesUpdated = 0;
  for (const task of (prd.tasks || [])) {
    for (const story of (task.stories || [])) {
      // Add user_stories array if missing
      if (!story.user_stories) {
        story.user_stories = [];
      }

      // Add new checkpoints
      if (!story.checkpoints) {
        story.checkpoints = {
          tests_written: false,
          build_complete: false,
          playwright_validated: false,
          browser_validated: false,
          whitebox_validated: false,
          cleanup_complete: false
        };
      } else {
        // Add new v3.0 checkpoints
        story.checkpoints.whitebox_validated = story.checkpoints.whitebox_validated ?? false;
        story.checkpoints.cleanup_complete = story.checkpoints.cleanup_complete ?? false;
      }

      // Add metrics tracking
      if (!story.metrics) {
        story.metrics = {
          iterations: 0,
          git_checkpoint: null,
          started_at: null,
          completed_at: null
        };
      }

      storiesUpdated++;
    }
  }
  console.log(`✓ Updated ${storiesUpdated} stories with v3.0 fields`);

  // 5. Reorder fields for better readability
  const orderedPrd = {
    version: prd.version,
    project: prd.project,
    created: prd.created,
    branchName: prd.branchName,
    description: prd.description,
    intent: prd.intent,
    tech_stack: prd.tech_stack,
    testUser: prd.testUser,
    decisions: prd.decisions,
    completedTasks: prd.completedTasks,
    currentTask: prd.currentTask,
    tasks: prd.tasks,
    config: prd.config
  };

  // Remove undefined keys
  Object.keys(orderedPrd).forEach(key => {
    if (orderedPrd[key] === undefined) {
      delete orderedPrd[key];
    }
  });

  // Save migrated prd.json
  fs.writeFileSync(PRD_PATH, JSON.stringify(orderedPrd, null, 2));
  console.log(`\n✓ Saved migrated prd.json`);

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('Migration Complete!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\nv3.0 Features Added:');
  console.log('  - version: "3.0"');
  console.log('  - intent section (run /intent-engineer to fill)');
  console.log('  - user_stories array per story (run /user-story-generator)');
  console.log('  - whitebox_validated checkpoint');
  console.log('  - cleanup_complete checkpoint');
  console.log('  - metrics tracking per story');
  console.log('  - enable_whitebox config');
  console.log('  - enable_learning_enforcer config');
  console.log('  - cleanup_per_story config');
  console.log(`\nBackup saved to: ${backupPath}`);
  console.log('\nNext steps:');
  console.log('  1. Run /intent-engineer to fill intent section');
  console.log('  2. Run /user-story-generator to create Gherkin scenarios');
  console.log('  3. Ensure LEARNINGS.md exists');
  console.log('  4. Ensure METRICS.json exists');
  console.log('═══════════════════════════════════════════════════════════\n');
}

// Check for --dry-run flag
if (process.argv.includes('--dry-run')) {
  console.log('DRY RUN - no changes will be made');
  console.log(`Would migrate: ${PRD_PATH}`);
  process.exit(0);
}

// Check for --help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: node migrate-to-v3.js [prd.json path] [--dry-run]');
  console.log('');
  console.log('Options:');
  console.log('  --dry-run   Show what would be changed without making changes');
  console.log('  --help, -h  Show this help message');
  console.log('');
  console.log('Default path: scripts/ralph/prd.json');
  process.exit(0);
}

migrate();
