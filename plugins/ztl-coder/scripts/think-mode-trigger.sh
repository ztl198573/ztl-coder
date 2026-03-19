#!/bin/bash
# Think Mode Trigger - Prompts Claude to think before writing/editing
# This script is called by the PreToolUse hook for Write|Edit operations

# Read stdin for tool input (JSON)
INPUT=$(cat)

# Extract file path from input
FILE_PATH=$(echo "$INPUT" | jq -r '.file_path // .path // empty' 2>/dev/null)

# Only trigger for significant files (skip .md, .txt, etc.)
if [[ -n "$FILE_PATH" ]]; then
    EXT="${FILE_PATH##*.}"
    case "$EXT" in
        ts|tsx|js|jsx|py|go|rs|java|cs)
            # Trigger think mode for code files
            echo "Before modifying code, briefly consider: edge cases, error handling, type safety."
            ;;
        *)
            # Skip for non-code files
            exit 0
            ;;
    esac
fi

exit 0
