#!/bin/bash
# E2E 测试清理脚本
# 用途: 清理测试环境（停止服务器、删除测试结果)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${1:-.}"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 打印函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "=========================================="
echo "  E2E 测试环境清理"
echo "=========================================="
echo ""

cd "$PROJECT_ROOT"

# 1. 停止可能运行的开发服务器
log_info "检查运行中的开发服务器..."

# 查找占用常用端口的进程
for port in 3000 3001 5173 8080; do
    PID=$(lsof -ti :$port 2>/dev/null || true)
    if [ -n "$PID" ]; then
        log_info "发现占用端口 $port 的进程 (PID: $PID)，正在终止..."
        kill $PID 2>/dev/null || true
        sleep 1
        if kill -0 $PID 2>/dev/null; then
            log_warning "强制终止进程 $PID..."
            kill -9 $PID 2>/dev/null || true
        fi
        log_success "端口 $port 已释放"
    fi
done

# 2. 清理测试结果
log_info "清理测试结果..."

CLEANUP_DIRS=(
    "test-results"
    "playwright-report"
)

for dir in "${CLEANUP_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        rm -rf "$dir"
        log_success "已删除: $dir"
    fi
done

# 3. 清理截图（可选）
SCREENSHOT_DIR="thoughts/test-reports/screenshots"
if [ -d "$SCREENSHOT_DIR" ]; then
    read -p "是否删除截图目录？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$SCREENSHOT_DIR"
        log_success "已删除: $SCREENSHOT_DIR"
    else
        log_info "保留截图目录"
    fi
fi

# 4. 清理临时文件
log_info "清理临时文件..."

TEMP_FILES=(
    "*.log"
    ".DS_Store"
    "npm-debug.log*"
)

for pattern in "${TEMP_FILES[@]}"; do
    find . -name "$pattern" -type f -delete 2>/dev/null || true
done

log_success "临时文件已清理"

echo ""
echo "=========================================="
log_success "清理完成!"
echo "=========================================="
