#!/bin/bash
# E2E 测试环境设置脚本
# 用途：安装 Playwright 浏览器并检查测试环境

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "  E2E 测试环境设置"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印函数
print_success() { echo -e "${GREEN}[✓]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
print_info() { echo -e "    $1"; }

# 1. 检查 Node.js
echo "检查 Node.js 环境..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js 已安装: $NODE_VERSION"
else
    print_error "Node.js 未安装"
    print_info "请访问 https://nodejs.org 安装 Node.js"
    exit 1
fi

# 2. 检查 npm
echo ""
echo "检查 npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "npm 已安装: $NPM_VERSION"
else
    print_error "npm 未安装"
    exit 1
fi

# 3. 检查 Playwright
echo ""
echo "检查 Playwright..."
if npx playwright --version &> /dev/null; then
    PW_VERSION=$(npx playwright --version)
    print_success "Playwright 已安装: $PW_VERSION"
else
    print_warning "Playwright 未安装，正在安装..."
    npm install -D @playwright/test
    print_success "Playwright 安装完成"
fi

# 4. 检查并安装浏览器
echo ""
echo "检查 Playwright 浏览器..."

# 检查 Chromium 是否已安装
PW_BROWSERS_PATH="${HOME}/.cache/ms-playwright"
if [ -d "$PW_BROWSERS_PATH" ] && [ -d "$PW_BROWSERS_PATH/chromium-"* ] 2>/dev/null; then
    print_success "Chromium 浏览器已安装"
else
    print_warning "Chromium 浏览器未安装，正在安装..."
    npx playwright install chromium
    print_success "Chromium 安装完成"
fi

# 5. 检查常用端口
echo ""
echo "检查常用端口..."

check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "端口 $port 已被占用"
        return 1
    else
        print_success "端口 $port 可用"
        return 0
    fi
}

PORTS_OK=true
for port in 3000 3001 5173 8080; do
    if ! check_port $port; then
        PORTS_OK=false
    fi
done

if [ "$PORTS_OK" = false ]; then
    print_warning "部分端口已被占用，请确保在运行测试前关闭占用端口的进程"
fi

# 6. 检查项目依赖
echo ""
echo "检查项目依赖..."

if [ -f "$PROJECT_ROOT/package.json" ]; then
    if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
        print_warning "node_modules 不存在，正在安装依赖..."
        cd "$PROJECT_ROOT" && npm install
        print_success "依赖安装完成"
    else
        print_success "node_modules 已存在"
    fi
else
    print_warning "未找到 package.json，跳过依赖检查"
fi

# 7. 创建必要的目录
echo ""
echo "创建测试输出目录..."

TEST_DIRS=(
    "$PROJECT_ROOT/thoughts/test-reports"
    "$PROJECT_ROOT/test-results"
    "$PROJECT_ROOT/playwright-report"
)

for dir in "${TEST_DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        print_success "创建目录: $dir"
    else
        print_success "目录已存在: $dir"
    fi
done

# 8. 生成环境信息报告
echo ""
echo "=========================================="
echo "  环境设置完成"
echo "=========================================="
echo ""
echo "环境信息:"
echo "  - Node.js: $(node --version)"
echo "  - npm: $(npm --version)"
echo "  - Playwright: $(npx playwright --version 2>/dev/null || echo '未安装')"
echo "  - Chromium: 已安装"
echo ""
echo "下一步:"
echo "  1. 启动开发服务器: npm run dev"
echo "  2. 运行 E2E 测试: npx playwright test"
echo "  或使用: bash scripts/e2e-run.sh"
echo ""
