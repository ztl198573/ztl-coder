#!/bin/bash
# E2E 测试运行脚本
# 用途: 启动开发服务器并运行 Playwright 测试
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${1:-.}"
TEST_URL="${2:-http://localhost:3000}"
BROWSER="${3:-chromium}"
HEADLESS="${4:-true}"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 打印函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# 服务器进程 ID
SERVER_PID=""

# 清理函数
cleanup() {
    if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
        log_info "停止开发服务器 (PID: $SERVER_PID)..."
        kill "$SERVER_PID" 2>/dev/null || true
        sleep 2
        if kill -0 "$SERVER_PID" 2>/dev/null; then
            log_warning "强制终止服务器..."
            kill -9 "$SERVER_PID" 2>/dev/null || true
        fi
        log_success "服务器已停止"
    fi
}

# 注册退出处理
trap cleanup EXIT
trap 'echo ""; log_warning "测试被中断"; exit 130' INT TERM

# 检查项目目录
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    log_error "未找到 package.json: $PROJECT_ROOT"
    exit 1
fi

cd "$PROJECT_ROOT"

echo "=========================================="
echo "  E2E 测试运行"
echo "=========================================="
echo ""
echo "配置:"
echo "  - 项目目录: $PROJECT_ROOT"
echo "  - 测试 URL: $TEST_URL"
echo "  - 浏览器: $BROWSER"
echo "  - 无头模式: $HEADLESS"
echo ""

# 1. 检查 Playwright
log_info "检查 Playwright..."
if ! npx playwright --version &> /dev/null; then
    log_error "Playwright 未安装，请先运行: bash scripts/e2e-setup.sh"
    exit 1
fi

# 2. 启动开发服务器
log_info "启动开发服务器..."

# 检测可用的启动命令
START_CMD=""
if grep -q '"dev"' package.json; then
    START_CMD="npm run dev"
elif grep -q '"start"' package.json; then
    START_CMD="npm start"
else
    log_error "未找到 dev 或 start 脚本"
    exit 1
fi

log_info "执行: $START_CMD"
$START_CMD &
SERVER_PID=$!

# 3. 等待服务就绪
log_info "等待服务启动..."
MAX_WAIT=60
WAIT_COUNT=0

while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if curl -s "$TEST_URL" > /dev/null 2>&1; then
        log_success "服务已就绪: $TEST_URL"
        break
    fi
    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
    if [ $((WAIT_COUNT % 10)) -eq 0 ]; then
        log_info "等待中... (${WAIT_COUNT}s / ${MAX_WAIT}s)"
    fi
done

if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
    log_error "服务启动超时 (${MAX_WAIT}s)"
    exit 1
fi

# 4. 运行 Playwright 测试
log_info "运行 Playwright 测试..."
echo ""

PLAYWRIGHT_ARGS=""
if [ "$HEADLESS" = "true" ]; then
    PLAYWRIGHT_ARGS="--headed=false"
else
    PLAYWRIGHT_ARGS="--headed"
fi

# 检查是否有 playwright.config.ts
if [ -f "playwright.config.ts" ]; then
    npx playwright test --project="$BROWSER" $PLAYWRIGHT_ARGS
else
    log_warning "未找到 playwright.config.ts，使用默认配置"
    npx playwright test $PLAYWRIGHT_ARGS
fi

TEST_EXIT_CODE=$?

# 5. 输出结果
echo ""
echo "=========================================="
if [ $TEST_EXIT_CODE -eq 0 ]; then
    log_success "所有测试通过!"
else
    log_error "测试失败，退出码: $TEST_EXIT_CODE"
fi
echo "=========================================="
echo ""

# 6. 输出报告位置
if [ -d "playwright-report" ]; then
    log_info "测试报告: playwright-report/index.html"
fi

if [ -d "test-results" ]; then
    log_info "测试结果: test-results/"
fi

exit $TEST_EXIT_CODE
