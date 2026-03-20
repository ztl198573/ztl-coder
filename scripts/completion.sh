#!/bin/bash
#
# ztl-coder 命令行补全脚本
# 用于 bash 和 zsh
#

# 命令列表
_ZTL_CODER_COMMANDS=(
    "ztl-coder-init"
    "ztl-coder-ledger"
    "ztl-coder-search"
    "ztl-coder-review"
    "ztl-coder-annotate"
    "ztl-coder-last"
)

# 选项列表
_ZTL_CODER_OPTIONS=(
    "--help"
    "-h"
    "--version"
    "-v"
    "--verbose"
    "--quiet"
    "-q"
    "--json"
    "--no-color"
)

# bash 补全函数
_ztl_coder_bash_completion() {
    local cur prev words split
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"

    case ${prev} in
        ztl-coder-init|ztl-coder-ledger|ztl-coder-search|ztl-coder-review|ztl-coder-annotate|ztl-coder-last)
            COMPREPLY=($(compgen -W "${_ZTL_CODER_OPTIONS[*]}" -- "$cur"))
            return
            ;;
    esac

    if [[ ${cur} == -* ]]; then
        COMPREPLY=($(compgen -W "${_ZTL_CODER_OPTIONS[*]}" -- "$cur"))
        return
    fi

    COMPREPLY=($(compgen -W "${_ZTL_CODER_COMMANDS[*]}" -- "$cur"))
}

# zsh 补全函数
_ztl_coder_zsh_completion() {
    local -a commands options
    commands=(
        "ztl-coder-init"
        "ztl-coder-ledger"
        "ztl-coder-search"
        "ztl-coder-review"
        "ztl-coder-annotate"
        "ztl-coder-last"
    )
    options=(
        "--help"
        "-h"
        "--version"
        "-v"
        "--verbose"
        "--quiet"
        "-q"
        "--json"
        "--no-color"
    )

    _describe_commands() {
        _describe_command "ztl-coder-init" "Initialize project with ARCHITECTURE.md and CODE_STYLE.md"
        _describe_command "ztl-coder-ledger" "Create or update session continuity ledger"
        _describe_command "ztl-coder-search" "Search historical handovers, plans, and available ledgers"
        _describe_command "ztl-coder-review" "Interactive code review with visual annotations"
        _describe_command "ztl-coder-annotate" "Annotate any markdown file"
        _describe_command "ztl-coder-last" "Annotate the last agent message"
    }

    _arguments() {
        case $words[1] in
            ztl-coder-init)
                _arguments ':file:_files' && _describe_commands
                ;;
            ztl-coder-ledger)
                _arguments '--name[+]:name' '--type[(type):type:(session|release)' && _describe_commands
                ;;
            ztl-coder-search)
                _arguments '--query[+]:query' '--type[1]:type:(plan|design|ledger)' && _describe_commands
                ;;
            *)
                _describe_commands
                ;;
        esac
    }

    _describe_commands
}

# 检测当前 shell 并加载相应补全
if [[ -n "${ZSH_VERSION:-}" ]]; then
    autoload -U +X bashcompinit && bashcompinit 2>/dev/null || true
    if declare -f _ztl_coder_zsh_completion >/dev/null 2>&1; then
        complete -F _ztl_coder_zsh_completion ztl-coder-init ztl-coder-ledger ztl-coder-search ztl-coder-review ztl-coder-annotate ztl-coder-last
    fi
elif [[ -n "${BASH_VERSION:-}" ]]; then
    complete -F _ztl_coder_bash_completion ztl-coder-init ztl-coder-ledger ztl-coder-search ztl-coder-review ztl-coder-annotate ztl-coder-last
fi

echo "ztl-coder shell completion installed!"
echo "Please restart your shell or run: source ~/.bashrc (or ~/.zshrc)"
