#!/bin/bash
# Workflow Stop Check - Validates completion before allowing exit
# Works on Unix systems. Windows uses ralph-guard.js

# Check if Ralph workflow is active
if [ ! -f ".claude/workflow_active" ]; then
  exit 0  # Allow - Ralph not active
fi

# Get current story
STORY=""
if [ -f ".claude/current_story" ]; then
  STORY=$(cat .claude/current_story)
fi

if [ -z "$STORY" ]; then
  echo "GUIDANCE: No current story set"
  echo "Set story with: node .claude/hooks/ralph-guard.js set-story US-XXX"
  exit 0  # Guidance, not blocking
fi

# Check required checkpoints
CHECKPOINTS_DIR=".claude/checkpoints"
REQUIRED_CHECKPOINTS="tests_written build_complete playwright_validated browser_validated"
MISSING=""
FAILED=""

for cp in $REQUIRED_CHECKPOINTS; do
  CHECKPOINT_FILE="$CHECKPOINTS_DIR/${STORY}_${cp}"

  if [ ! -f "$CHECKPOINT_FILE" ]; then
    MISSING="$MISSING $cp"
  else
    VALUE=$(head -1 "$CHECKPOINT_FILE")
    if [ "$VALUE" != "PASS" ]; then
      FAILED="$FAILED $cp:$VALUE"
    fi
  fi
done

# Report missing checkpoints
if [ -n "$MISSING" ]; then
  echo "GUIDANCE: Missing checkpoints for $STORY:"
  for m in $MISSING; do
    echo "  - $m"
  done
  echo ""
  echo "Complete these before marking story done."
  exit 0  # Guidance, not blocking
fi

# Report failed checkpoints
if [ -n "$FAILED" ]; then
  echo "GUIDANCE: Failed validations for $STORY:"
  for f in $FAILED; do
    echo "  - $f"
  done
  echo ""
  echo "Fix failures and re-validate."
  exit 0  # Guidance, not blocking
fi

echo "All checkpoints passed for $STORY"
exit 0
