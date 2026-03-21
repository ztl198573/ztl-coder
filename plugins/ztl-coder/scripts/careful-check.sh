#!/bin/bash
# Careful Check Hook
# 检测破坏性命令并警告用户

# 破坏性命令模式
DANGEROUS_PATTERNS=(
  "rm -rf"
  "rm -r"
  "git push --force"
  "git push -f"
  "git reset --hard"
  "DROP TABLE"
  "DROP DATABASE"
  "DELETE FROM"
  "TRUNCATE"
  ":w !sudo"
  "chmod -R 777"
  "dd if="
  "mkfs"
  "fdisk"
  "chown -R"
)

# 高风险命令模式
HIGH_RISK_PATTERNS=(
  "git clean -fd"
  "git gc"
  "npm unpublish"
  "docker system prune"
  "docker volume prune"
)

# 获取命令参数
COMMAND="$1"

# 检查是否为破坏性命令
is_dangerous() {
  local cmd="$1"
  for pattern in "${DANGEROUS_PATTERNS[@]}"; do
    if [[ "$cmd" == *"$pattern"* ]]; then
      return 0
    fi
  done
  return 1
}

# 检查是否为高风险命令
is_high_risk() {
  local cmd="$1"
  for pattern in "${HIGH_RISK_PATTERNS[@]}"; do
    if [[ "$cmd" == *"$pattern"* ]]; then
      return 0
    fi
  done
  return 1
}

# 生成警告消息
generate_warning() {
  local cmd="$1"
  local risk_level="$2"
  local suggestion="$3"

  echo ""
  echo "⚠️  安全警告：检测到${risk_level}风险命令"
  echo ""
  echo "命令: $cmd"
  echo ""

  if [ -n "$suggestion" ]; then
    echo "建议替代方案:"
    echo "  $suggestion"
    echo ""
  fi

  echo "影响分析:"
  case "$cmd" in
    *"rm -rf"*)
      echo "  - 将递归删除目录及其所有内容"
      echo "  - 操作不可撤销"
      ;;
    *"git push --force"*)
      echo "  - 将覆盖远程分支"
      echo "  - 可能丢失其他人的提交"
      ;;
    *"git reset --hard"*)
      echo "  - 将丢弃所有未提交的更改"
      echo "  - 操作不可撤销"
      ;;
    *"DROP"*|*"TRUNCATE"*)
      echo "  - 将删除数据库数据"
      echo "  - 操作不可撤销"
      ;;
    *)
      echo "  - 此命令可能造成不可逆的更改"
      ;;
  esac

  echo ""
  echo "是否继续执行？[y/N]"
  read -r response

  if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "CONFIRMED"
    exit 0
  else
    echo "CANCELLED"
    exit 1
  fi
}

# 生成建议
get_suggestion() {
  local cmd="$1"

  case "$cmd" in
    *"rm -rf"*)
      echo "rm -rf \$(ls) # 先列出要删除的内容"
      return
      ;;
    *"git push --force"*)
      echo "git push --force-with-lease # 更安全的强制推送"
      return
      ;;
    *"git reset --hard"*)
      echo "git stash # 先暂存更改"
      return
      ;;
  esac

  echo "请仔细确认操作范围"
}

# 主逻辑
main() {
  local cmd="$COMMAND"

  # 检查破坏性命令
  if is_dangerous "$cmd"; then
    suggestion=$(get_suggestion "$cmd")
    generate_warning "$cmd" "破坏性" "$suggestion"
    exit $?
  fi

  # 检查高风险命令
  if is_high_risk "$cmd"; then
    generate_warning "$cmd" "高" ""
    exit $?
  fi

  # 安全命令，继续执行
  exit 0
}

main "$@"
