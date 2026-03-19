#!/bin/bash
# Artifact Indexer - Indexes written files for future search
# This script is called by the PostToolUse hook for Write operations

# Read stdin for tool input (JSON)
INPUT=$(cat)

# Extract file path from input
FILE_PATH=$(echo "$INPUT" | jq -r '.file_path // .path // empty' 2>/dev/null)

# Only index files in thoughts/ directory
if [[ -n "$FILE_PATH" && "$FILE_PATH" == *"thoughts/"* ]]; then
    # Create index directory if not exists
    INDEX_DIR="${THOUGHTS_DIR:-$HOME/.ztl-coder}/index"
    mkdir -p "$INDEX_DIR"

    # Generate timestamp
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)

    # Create index entry
    INDEX_FILE="$INDEX_DIR/${TIMESTAMP}.json"

    # Get file stats
    if [[ -f "$FILE_PATH" ]]; then
        FILE_SIZE=$(stat -c%s "$FILE_PATH" 2>/dev/null || echo "0")
        FILE_LINES=$(wc -l < "$FILE_PATH" 2>/dev/null || echo "0")

        # Write index entry
        cat > "$INDEX_FILE" << EOF
{
  "path": "$FILE_PATH",
  "timestamp": "$(date -Iseconds)",
  "size": $FILE_SIZE,
  "lines": $FILE_LINES,
  "type": "artifact"
}
EOF
    fi
fi

exit 0
