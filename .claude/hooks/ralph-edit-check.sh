#!/bin/bash
# Ralph Edit Check - Bash fallback for Unix systems
# Windows uses ralph-guard.js via Node.js

# Check if Ralph workflow is active
if [ ! -f ".claude/workflow_active" ]; then
  exit 0  # Allow - Ralph not active
fi

# Check if planning mode is active (blocks ALL edits)
if [ -f ".claude/planning_mode" ]; then
  echo "BLOCKED: Planning mode active - no code edits allowed"
  echo "Complete the PRD process first"
  exit 2
fi

# Get current phase
PHASE="none"
if [ -f ".claude/workflow_phase" ]; then
  PHASE=$(cat .claude/workflow_phase)
fi

# File being edited (passed as argument or from env)
FILE_PATH="${1:-$CC_TOOL_FILE_PATH}"

# Check phase-based restrictions
case "$PHASE" in
  "test-write")
    # Test writers can only write to e2e/ and test files
    if echo "$FILE_PATH" | grep -qE "(src/|app/|components/|lib/|pages/)" ; then
      echo "BLOCKED: Cannot modify source files during test-write phase"
      echo "File: $FILE_PATH"
      echo "Phase: $PHASE"
      exit 2
    fi
    ;;
  "build")
    # Builders cannot modify test files
    if echo "$FILE_PATH" | grep -qE "\.(spec|test)\.(ts|js)$" ; then
      echo "BLOCKED: Cannot modify test files during build phase"
      echo "File: $FILE_PATH"
      echo "Phase: $PHASE"
      echo ""
      echo "Fix the implementation, NOT the tests!"
      exit 2
    fi
    ;;
  "validate")
    # Validators can only write to checkpoints and verification
    if ! echo "$FILE_PATH" | grep -qE "(\.claude/|verification/|scripts/ralph/)" ; then
      echo "BLOCKED: Validators cannot modify source or test files"
      echo "File: $FILE_PATH"
      exit 2
    fi
    ;;
esac

exit 0  # Allow
