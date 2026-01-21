#!/usr/bin/env node
/**
 * Metrics Tracker - Records iterations, timestamps, and failure reasons
 *
 * Part of Ralph TDD Workflow v3.0
 *
 * Tracks per-story metrics including:
 * - Start/completion timestamps
 * - Iteration counts
 * - Failure reasons with timestamps
 * - Validator attempts per validator type
 * - Git checkpoint commit hashes
 *
 * Usage:
 *   node metrics-tracker.js start <story-id>           Start tracking a story
 *   node metrics-tracker.js iteration <story-id> [reason]  Record an iteration
 *   node metrics-tracker.js validator <story-id> <type> <result>  Record validator result
 *   node metrics-tracker.js complete <story-id>        Mark story complete
 *   node metrics-tracker.js summary                    Show aggregate metrics
 *   node metrics-tracker.js story <story-id>           Show story metrics
 *   node metrics-tracker.js export                     Export full metrics JSON
 */

const fs = require('fs');
const path = require('path');

// Paths
const METRICS_PATH = path.join('scripts', 'ralph', 'METRICS.json');
const METRICS_DIR = path.dirname(METRICS_PATH);

/**
 * Load metrics from file
 */
function loadMetrics() {
  if (!fs.existsSync(METRICS_PATH)) {
    return {
      version: '3.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      stories: {},
      aggregate: {
        total_stories: 0,
        completed_stories: 0,
        total_iterations: 0,
        total_time_ms: 0,
        avg_iterations: 0,
        common_failures: []
      }
    };
  }

  try {
    return JSON.parse(fs.readFileSync(METRICS_PATH, 'utf8'));
  } catch (e) {
    console.error('Error loading metrics:', e.message);
    return null;
  }
}

/**
 * Save metrics to file
 */
function saveMetrics(metrics) {
  fs.mkdirSync(METRICS_DIR, { recursive: true });
  metrics.updated_at = new Date().toISOString();
  fs.writeFileSync(METRICS_PATH, JSON.stringify(metrics, null, 2));
}

/**
 * Initialize or get story metrics
 */
function getStoryMetrics(metrics, storyId) {
  if (!metrics.stories[storyId]) {
    metrics.stories[storyId] = {
      id: storyId,
      started_at: null,
      completed_at: null,
      status: 'pending',
      iterations: 0,
      failure_reasons: [],
      validators: {
        playwright: { attempts: 0, passes: 0, last_result: null },
        browser: { attempts: 0, passes: 0, last_result: null },
        whitebox: { attempts: 0, passes: 0, last_result: null }
      },
      git_checkpoint: null,
      cleanup_duration_ms: null
    };
  }
  return metrics.stories[storyId];
}

/**
 * Start tracking a story
 */
function startStory(storyId) {
  const metrics = loadMetrics();
  if (!metrics) process.exit(1);

  const story = getStoryMetrics(metrics, storyId);
  story.started_at = new Date().toISOString();
  story.status = 'in_progress';

  saveMetrics(metrics);
  console.log(`Started tracking: ${storyId}`);
  console.log(`Timestamp: ${story.started_at}`);
}

/**
 * Record an iteration
 */
function recordIteration(storyId, reason = null) {
  const metrics = loadMetrics();
  if (!metrics) process.exit(1);

  const story = getStoryMetrics(metrics, storyId);
  story.iterations++;

  if (reason) {
    story.failure_reasons.push({
      iteration: story.iterations,
      reason: reason,
      timestamp: new Date().toISOString()
    });
  }

  saveMetrics(metrics);
  console.log(`Iteration ${story.iterations} recorded for ${storyId}`);
  if (reason) {
    console.log(`Reason: ${reason}`);
  }
}

/**
 * Record validator result
 */
function recordValidatorResult(storyId, validatorType, result) {
  const metrics = loadMetrics();
  if (!metrics) process.exit(1);

  const story = getStoryMetrics(metrics, storyId);

  if (!story.validators[validatorType]) {
    story.validators[validatorType] = { attempts: 0, passes: 0, last_result: null };
  }

  story.validators[validatorType].attempts++;
  if (result === 'PASS') {
    story.validators[validatorType].passes++;
  }
  story.validators[validatorType].last_result = result;
  story.validators[validatorType].last_timestamp = new Date().toISOString();

  saveMetrics(metrics);
  console.log(`${validatorType}: ${result} (attempt ${story.validators[validatorType].attempts})`);
}

/**
 * Mark story complete
 */
function completeStory(storyId) {
  const metrics = loadMetrics();
  if (!metrics) process.exit(1);

  const story = getStoryMetrics(metrics, storyId);
  story.completed_at = new Date().toISOString();
  story.status = 'complete';

  // Calculate duration
  if (story.started_at) {
    const start = new Date(story.started_at);
    const end = new Date(story.completed_at);
    story.duration_ms = end - start;
  }

  // Update aggregate
  updateAggregate(metrics);

  saveMetrics(metrics);

  console.log(`Completed: ${storyId}`);
  console.log(`Iterations: ${story.iterations}`);
  if (story.duration_ms) {
    const minutes = Math.round(story.duration_ms / 60000);
    console.log(`Duration: ${minutes} minutes`);
  }
}

/**
 * Record git checkpoint
 */
function recordGitCheckpoint(storyId, commitHash) {
  const metrics = loadMetrics();
  if (!metrics) process.exit(1);

  const story = getStoryMetrics(metrics, storyId);
  story.git_checkpoint = commitHash;

  saveMetrics(metrics);
  console.log(`Git checkpoint recorded: ${commitHash.substring(0, 7)}`);
}

/**
 * Update aggregate metrics
 */
function updateAggregate(metrics) {
  const stories = Object.values(metrics.stories);

  metrics.aggregate.total_stories = stories.length;
  metrics.aggregate.completed_stories = stories.filter(s => s.status === 'complete').length;
  metrics.aggregate.total_iterations = stories.reduce((sum, s) => sum + s.iterations, 0);

  const completedStories = stories.filter(s => s.status === 'complete' && s.duration_ms);
  metrics.aggregate.total_time_ms = completedStories.reduce((sum, s) => sum + s.duration_ms, 0);

  if (metrics.aggregate.completed_stories > 0) {
    metrics.aggregate.avg_iterations = Math.round(
      metrics.aggregate.total_iterations / metrics.aggregate.completed_stories * 10
    ) / 10;
  }

  // Calculate common failures
  const failureCounts = {};
  for (const story of stories) {
    for (const failure of story.failure_reasons || []) {
      const reason = failure.reason;
      failureCounts[reason] = (failureCounts[reason] || 0) + 1;
    }
  }

  metrics.aggregate.common_failures = Object.entries(failureCounts)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

/**
 * Show story metrics
 */
function showStoryMetrics(storyId) {
  const metrics = loadMetrics();
  if (!metrics) process.exit(1);

  const story = metrics.stories[storyId];
  if (!story) {
    console.log(`No metrics found for ${storyId}`);
    process.exit(1);
  }

  console.log(`\n=== Metrics for ${storyId} ===\n`);
  console.log(`Status: ${story.status}`);
  console.log(`Started: ${story.started_at || 'not started'}`);
  console.log(`Completed: ${story.completed_at || 'not completed'}`);
  console.log(`Iterations: ${story.iterations}`);

  if (story.duration_ms) {
    const minutes = Math.round(story.duration_ms / 60000);
    console.log(`Duration: ${minutes} minutes`);
  }

  if (story.git_checkpoint) {
    console.log(`Git checkpoint: ${story.git_checkpoint}`);
  }

  console.log('\nValidators:');
  for (const [type, data] of Object.entries(story.validators)) {
    if (data.attempts > 0) {
      console.log(`  ${type}: ${data.passes}/${data.attempts} passed (last: ${data.last_result})`);
    }
  }

  if (story.failure_reasons.length > 0) {
    console.log('\nFailure History:');
    story.failure_reasons.forEach((f, i) => {
      console.log(`  ${i + 1}. [Iteration ${f.iteration}] ${f.reason}`);
    });
  }
}

/**
 * Show summary
 */
function showSummary() {
  const metrics = loadMetrics();
  if (!metrics) process.exit(1);

  updateAggregate(metrics);
  saveMetrics(metrics);

  const agg = metrics.aggregate;

  console.log('\n=== Ralph Workflow Metrics Summary ===\n');
  console.log(`Stories: ${agg.completed_stories}/${agg.total_stories} complete`);
  console.log(`Total iterations: ${agg.total_iterations}`);
  console.log(`Average iterations per story: ${agg.avg_iterations}`);

  if (agg.total_time_ms > 0) {
    const hours = Math.floor(agg.total_time_ms / 3600000);
    const minutes = Math.round((agg.total_time_ms % 3600000) / 60000);
    console.log(`Total time: ${hours}h ${minutes}m`);
  }

  if (agg.common_failures.length > 0) {
    console.log('\nCommon Failure Reasons:');
    agg.common_failures.slice(0, 5).forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.reason} (${f.count}x)`);
    });
  }

  // Show in-progress stories
  const inProgress = Object.values(metrics.stories).filter(s => s.status === 'in_progress');
  if (inProgress.length > 0) {
    console.log('\nIn Progress:');
    inProgress.forEach(s => {
      console.log(`  - ${s.id}: ${s.iterations} iterations`);
    });
  }

  // Show stories with high iterations
  const highIteration = Object.values(metrics.stories)
    .filter(s => s.iterations >= 3)
    .sort((a, b) => b.iterations - a.iterations);

  if (highIteration.length > 0) {
    console.log('\nHigh Iteration Stories:');
    highIteration.slice(0, 5).forEach(s => {
      const status = s.status === 'complete' ? '✅' : '⏳';
      console.log(`  ${status} ${s.id}: ${s.iterations} iterations`);
    });
  }
}

/**
 * Export full metrics
 */
function exportMetrics() {
  const metrics = loadMetrics();
  if (!metrics) process.exit(1);

  updateAggregate(metrics);
  console.log(JSON.stringify(metrics, null, 2));
}

/**
 * Initialize empty metrics file
 */
function initMetrics() {
  if (fs.existsSync(METRICS_PATH)) {
    console.log('METRICS.json already exists');
    process.exit(0);
  }

  const metrics = {
    version: '3.0',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    stories: {},
    aggregate: {
      total_stories: 0,
      completed_stories: 0,
      total_iterations: 0,
      total_time_ms: 0,
      avg_iterations: 0,
      common_failures: []
    }
  };

  saveMetrics(metrics);
  console.log(`Created: ${METRICS_PATH}`);
}

// CLI
const args = process.argv.slice(2);
const action = args[0];

switch (action) {
  case 'start':
    if (!args[1]) {
      console.log('Usage: node metrics-tracker.js start <story-id>');
      process.exit(1);
    }
    startStory(args[1]);
    break;

  case 'iteration':
    if (!args[1]) {
      console.log('Usage: node metrics-tracker.js iteration <story-id> [reason]');
      process.exit(1);
    }
    recordIteration(args[1], args[2]);
    break;

  case 'validator':
    if (!args[1] || !args[2] || !args[3]) {
      console.log('Usage: node metrics-tracker.js validator <story-id> <type> <result>');
      console.log('Types: playwright, browser, whitebox');
      console.log('Results: PASS, FAIL');
      process.exit(1);
    }
    recordValidatorResult(args[1], args[2], args[3]);
    break;

  case 'checkpoint':
    if (!args[1] || !args[2]) {
      console.log('Usage: node metrics-tracker.js checkpoint <story-id> <commit-hash>');
      process.exit(1);
    }
    recordGitCheckpoint(args[1], args[2]);
    break;

  case 'complete':
    if (!args[1]) {
      console.log('Usage: node metrics-tracker.js complete <story-id>');
      process.exit(1);
    }
    completeStory(args[1]);
    break;

  case 'story':
    if (!args[1]) {
      console.log('Usage: node metrics-tracker.js story <story-id>');
      process.exit(1);
    }
    showStoryMetrics(args[1]);
    break;

  case 'summary':
    showSummary();
    break;

  case 'export':
    exportMetrics();
    break;

  case 'init':
    initMetrics();
    break;

  default:
    console.log('Metrics Tracker - Ralph TDD Workflow v3.0');
    console.log('\nUsage: node metrics-tracker.js <action> [args]');
    console.log('\nActions:');
    console.log('  init                              Initialize METRICS.json');
    console.log('  start <story-id>                  Start tracking a story');
    console.log('  iteration <story-id> [reason]     Record an iteration');
    console.log('  validator <story-id> <type> <result>  Record validator result');
    console.log('  checkpoint <story-id> <hash>      Record git checkpoint');
    console.log('  complete <story-id>               Mark story complete');
    console.log('  story <story-id>                  Show story metrics');
    console.log('  summary                           Show aggregate summary');
    console.log('  export                            Export full metrics JSON');
    process.exit(0);
}
