#!/bin/bash
# Think Mode 触发器
# 在关键操作前检测是否需要深度思考

# 读取 stdin 中的 JSON 输入
INPUT=$(cat)

# 提取工具输入
TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input // empty')

# 检测关键词
THINK_KEYWORDS=("critical" "important" "security" "architecture" "refactor" "breaking")

# 检查文件路径或内容中是否包含关键词
for keyword in "${THINK_KEYWORDS[@]}"; do
  if echo "$TOOL_INPUT" | grep -i "$keyword" > /dev/null; then
    echo "🧔 Think Mode 触发: 检测到关键词 '$keyword'"
    echo "建议在继续之前进行深度思考..."
    # 不阻止操作，只是提醒
    exit 0
  fi
done

exit 0
