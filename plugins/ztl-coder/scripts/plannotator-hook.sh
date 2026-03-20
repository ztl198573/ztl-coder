#!/bin/bash
# Plannotator hook for ExitPlanMode
# Reads plan file path from stdin and opens it in Plannotator

set -e

# Read hook input from stdin
HOOK_INPUT=$(cat)

# Extract plan file path from hook input
# The input format is JSON with a planFile field
PLAN_FILE=$(echo "$HOOK_INPUT" | jq -r '.planFile // .plan_file // .file // empty')

# Fallback: try to find the latest plan file in thoughts/shared/plans/
if [ -z "$PLAN_FILE" ] || [ ! -f "$PLAN_FILE" ]; then
    # Check standard plan locations
    for dir in "thoughts/shared/plans" ".claude/plans"; do
        if [ -d "$dir" ]; then
            PLAN_FILE=$(find "$dir" -name "*.md" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
            if [ -n "$PLAN_FILE" ] && [ -f "$PLAN_FILE" ]; then
                break
            fi
        fi
    done
fi

# Check if plannotator is installed
if ! command -v plannotator &> /dev/null; then
    echo "Plannotator 未安装。请运行: curl -fsSL https://plannotator.ai/install.sh | bash"
    echo "或者使用以下命令手动安装:"
    echo "  macOS/Linux: curl -fsSL https://plannotator.ai/install.sh | bash"
    echo "  Windows PowerShell: irm https://plannotator.ai/install.ps1 | iex"
    exit 0
fi

# Run plannotator with the plan file
if [ -n "$PLAN_FILE" ] && [ -f "$PLAN_FILE" ]; then
    echo "正在打开 Plannotator 审查计划: $PLAN_FILE"
    plannotator annotate "$PLAN_FILE"
else
    # If no plan file found, try to annotate the last message
    echo "未找到计划文件，尝试标注最后一条消息..."
    plannotator last
fi
