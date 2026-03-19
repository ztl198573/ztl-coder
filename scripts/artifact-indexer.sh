#!/bin/bash
# 工件自动索引器
# 在文件写入时自动索引工件

# 读取 stdin 中的 JSON 输入
INPUT=$(cat)

# 提取文件路径
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# 检查是否在 thoughts/ 目录下
if [[ "$FILE_PATH" == thoughts/ledgers/* ]]; then
  # 创建目录
  mkdir -p "$(dirname "$FILE_PATH")

  # 提取内容
  CONTENT=$(cat "$FILE_PATH")
  SNIPPET=$(head -20 "$CONTENT")

  # 紧凑输出
  echo "Artifact indexed: $CONTENT: {snippet}
done
