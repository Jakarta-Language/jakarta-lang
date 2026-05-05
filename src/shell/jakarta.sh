#!/usr/bin/env bash
# ============================================================
# Jakarta Language Interpreter (.jkt) - Shell Implementation
# Basic features: variables, conditionals, loops, print, functions
# ============================================================

set -e

# Global state
declare -A JKT_VARS
declare -A JKT_CONSTS
declare -A JKT_FUNCS
declare -a JKT_FUNC_PARAMS
declare -a JKT_FUNC_BODY

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

jkt_error() {
    echo -e "${RED}❌ $1${NC}" >&2
    exit 1
}

# Format value for output
format_value() {
    local val="$1"
    if [[ -z "$val" ]]; then
        echo -n "kosong"
    elif [[ "$val" == "true" ]]; then
        echo -n "benar"
    elif [[ "$val" == "false" ]]; then
        echo -n "salah"
    else
        echo -n "$val"
    fi
}

# Evaluate a simple expression
eval_expr() {
    local expr="$1"
    # Handle string concatenation with +
    if [[ "$expr" == *"+"* ]]; then
        # Simple string concatenation
        local left="${expr%%+*}"
        local right="${expr#*+}"
        left="${left% }"
        right="${right# }"
        echo -n "$(eval_expr "$left")$(eval_expr "$right")"
        return
    fi
    # Variable reference
    if [[ -n "${JKT_VARS[$expr]+x}" ]]; then
        echo -n "${JKT_VARS[$expr]}"
        return
    fi
    # Literal
    echo -n "$expr"
}

# Parse and execute a single line
execute_line() {
    local line="$1"
    line="${line% }"  # trim trailing space
    line="${line# }"  # trim leading space

    # Skip empty lines and comments
    [[ -z "$line" || "$line" == //* ]] && return

    # cetak() - print statement
    if [[ "$line" == cetak* ]]; then
        local inner="${line#cetak(}"
        inner="${inner%)}"
        # Handle string concatenation
        local result=""
        local current=""
        local in_string=0
        local quote_char=""
        local i=0
        while [[ $i -lt ${#inner} ]]; do
            local ch="${inner:$i:1}"
            if [[ $in_string -eq 0 && "$ch" == '"' ]] || [[ $in_string -eq 0 && "$ch" == "'" ]]; then
                quote_char="$ch"
                in_string=1
                i=$((i + 1))
                continue
            fi
            if [[ $in_string -eq 1 && "$ch" == "$quote_char" ]]; then
                in_string=0
                result+="$current"
                current=""
                i=$((i + 1))
                continue
            fi
            if [[ $in_string -eq 1 ]]; then
                current+="$ch"
                i=$((i + 1))
                continue
            fi
            # Outside string
            if [[ "$ch" == "+" ]]; then
                # Check if it's concatenation
                i=$((i + 1))
                continue
            fi
            if [[ "$ch" == " " ]]; then
                i=$((i + 1))
                continue
            fi
            # Variable or function call
            if [[ $in_string -eq 0 ]]; then
                # Collect identifier
                local ident=""
                while [[ $i -lt ${#inner} ]] && [[ "${inner:$i:1}" =~ [a-zA-Z0-9_] ]]; do
                    ident+="${inner:$i:1}"
                    i=$((i + 1))
                done
                if [[ -n "$ident" ]]; then
                    # Check for function call like teks()
                    if [[ "${inner:$i:1}" == "(" ]]; then
                        i=$((i + 1))
                        local arg_inner=""
                        local depth=1
                        while [[ $i -lt ${#inner} ]] && [[ $depth -gt 0 ]]; do
                            ch="${inner:$i:1}"
                            if [[ "$ch" == "(" ]]; then depth=$((depth + 1)); fi
                            if [[ "$ch" == ")" ]]; then depth=$((depth - 1)); fi
                            [[ $depth -gt 0 ]] && arg_inner+="$ch"
                            i=$((i + 1))
                        done
                        result+="$(call_builtin "$ident" "$arg_inner")"
                    elif [[ -n "${JKT_VARS[$ident]+x}" ]]; then
                        result+="${JKT_VARS[$ident]}"
                    else
                        result+="$ident"
                    fi
                fi
                continue
            fi
            i=$((i + 1))
        done
        echo "$result"
        return
    fi

    # var declaration
    if [[ "$line" == var* ]]; then
        local rest="${line#var }"
        local name="${rest%%=*}"
        name="${name% }"
        if [[ "$rest" == *"="* ]]; then
            local val="${rest#*=}"
            val="${val# }"
            val="${val% }"
            val="${val%;}"
            # Remove quotes
            if [[ "$val" == \"*\" ]]; then
                val="${val#\"}"
                val="${val%\"}"
            elif [[ "$val" == \'*\' ]]; then
                val="${val#\'}"
                val="${val%\'}"
            fi
            JKT_VARS["$name"]="$val"
        else
            JKT_VARS["$name"]=""
        fi
        return
    fi

    # konstan declaration
    if [[ "$line" == konstan* ]]; then
        local rest="${line#konstan }"
        local name="${rest%%=*}"
        name="${name% }"
        local val="${rest#*=}"
        val="${val# }"
        val="${val% }"
        val="${val%;}"
        if [[ "$val" == \"*\" ]]; then
            val="${val#\"}"
            val="${val%\"}"
        fi
        JKT_VARS["$name"]="$val"
        JKT_CONSTS["$name"]=1
        return
    fi

    # Assignment
    if [[ "$line" == *=* ]] && [[ "$line" != *==* ]]; then
        local name="${line%%=*}"
        name="${name% }"
        local val="${line#*=}"
        val="${val# }"
        val="${val%;}"
        if [[ "$val" == \"*\" ]]; then
            val="${val#\"}"
            val="${val%\"}"
        fi
        JKT_VARS["$name"]="$val"
        return
    fi
}

# Call built-in function
call_builtin() {
    local func="$1"
    local arg="$2"
    arg="${arg# }"
    arg="${arg% }"

    case "$func" in
        teks)
            # Resolve variable if needed
            if [[ -n "${JKT_VARS[$arg]+x}" ]]; then
                echo -n "${JKT_VARS[$arg]}"
            else
                # Remove quotes if present
                local v="$arg"
                if [[ "$v" == \"*\" ]]; then
                    v="${v#\"}"
                    v="${v%\"}"
                fi
                echo -n "$v"
            fi
            ;;
        panjang)
            if [[ -n "${JKT_VARS[$arg]+x}" ]]; then
                echo -n "${#JKT_VARS[$arg]}"
            else
                echo -n "${#arg}"
            fi
            ;;
        besar)
            if [[ -n "${JKT_VARS[$arg]+x}" ]]; then
                echo -n "${JKT_VARS[$arg]^^}"
            else
                echo -n "${arg^^}"
            fi
            ;;
        kecil)
            if [[ -n "${JKT_VARS[$arg]+x}" ]]; then
                echo -n "${JKT_VARS[$arg],,}"
            else
                echo -n "${arg,,}"
            fi
            ;;
        angka)
            if [[ -n "${JKT_VARS[$arg]+x}" ]]; then
                echo -n "${JKT_VARS[$arg]}"
            else
                echo -n "$arg"
            fi
            ;;
        *)
            echo -n "$arg"
            ;;
    esac
}

# Main execution - process file with block awareness
execute_file() {
    local file="$1"
    local content
    content=$(cat "$file")

    local line_num=0
    local in_block=0
    local block_depth=0
    local block_buffer=""
    local block_type=""
    local block_condition=""

    while IFS= read -r line || [[ -n "$line" ]]; do
        line_num=$((line_num + 1))
        local trimmed="${line# }"
        trimmed="${trimmed% }"

        # Skip empty and comments
        [[ -z "$trimmed" || "$trimmed" == //* ]] && continue

        # Count braces for block tracking
        local open_braces=$(echo "$trimmed" | grep -o '{' | wc -l)
        local close_braces=$(echo "$trimmed" | grep -o '}' | wc -l)

        if [[ $in_block -eq 0 ]]; then
            # Not inside a block - check for block starters
            if [[ "$trimmed" == jika* ]]; then
                in_block=1
                block_depth=$open_braces
                block_type="jika"
                block_condition="$trimmed"
                block_buffer=""
                continue
            elif [[ "$trimmed" == selama* ]]; then
                in_block=1
                block_depth=$open_braces
                block_type="selama"
                block_condition="$trimmed"
                block_buffer=""
                continue
            elif [[ "$trimmed" == untuk* ]]; then
                in_block=1
                block_depth=$open_braces
                block_type="untuk"
                block_condition="$trimmed"
                block_buffer=""
                continue
            elif [[ "$trimmed" == fungsi* ]]; then
                in_block=1
                block_depth=$open_braces
                block_type="fungsi"
                block_condition="$trimmed"
                block_buffer=""
                continue
            else
                execute_line "$trimmed"
            fi
        else
            # Inside a block
            block_depth=$((block_depth + open_braces - close_braces))
            if [[ $block_depth -le 0 ]]; then
                # Block ended
                in_block=0
                # For shell, we do simplified execution
                case "$block_type" in
                    jika)
                        # Simple if execution
                        local cond="${block_condition#jika }"
                        cond="${cond#(}"
                        cond="${cond%)}"
                        cond="${cond# }"
                        cond="${cond% }"
                        # Evaluate simple conditions
                        if eval_condition "$cond"; then
                            echo "$block_buffer" | while IFS= read -r bline; do
                                [[ -n "$bline" ]] && execute_line "$bline"
                            done
                        fi
                        ;;
                    selama)
                        # Simple while - limited iterations
                        local iter=0
                        while [[ $iter -lt 100 ]]; do
                            local cond="${block_condition#selama }"
                            cond="${cond#(}"
                            cond="${cond%)}"
                            eval_condition "$cond" || break
                            echo "$block_buffer" | while IFS= read -r bline; do
                                [[ -n "$bline" ]] && execute_line "$bline"
                            done
                            iter=$((iter + 1))
                        done
                        ;;
                    fungsi)
                        # Store function
                        local fname="${block_condition#fungsi }"
                        fname="${fname%%(*}"
                        JKT_FUNCS["$fname"]="$block_buffer"
                        ;;
                esac
                block_buffer=""
                continue
            fi
            block_buffer+="$trimmed"$'\n'
        fi
    done <<< "$content"
}

# Evaluate simple conditions
eval_condition() {
    local cond="$1"
    cond="${cond# }"
    cond="${cond% }"

    # Variable comparison
    if [[ "$cond" == *">="* ]]; then
        local left="${cond%%>=*}"
        local right="${cond#*>=}"
        left="${left% }"; right="${right# }"
        local lval="${JKT_VARS[$left]:-$left}"
        local rval="${JKT_VARS[$right]:-$right}"
        [[ "$lval" -ge "$rval" ]] 2>/dev/null && return 0 || return 1
    elif [[ "$cond" == *"<="* ]]; then
        local left="${cond%%<=*}"
        local right="${cond#*<=}"
        left="${left% }"; right="${right# }"
        local lval="${JKT_VARS[$left]:-$left}"
        local rval="${JKT_VARS[$right]:-$right}"
        [[ "$lval" -le "$rval" ]] 2>/dev/null && return 0 || return 1
    elif [[ "$cond" == *">"* ]]; then
        local left="${cond%%>*}"
        local right="${cond#*>}"
        left="${left% }"; right="${right# }"
        local lval="${JKT_VARS[$left]:-$left}"
        local rval="${JKT_VARS[$right]:-$right}"
        [[ "$lval" -gt "$rval" ]] 2>/dev/null && return 0 || return 1
    elif [[ "$cond" == *"<"* ]]; then
        local left="${cond%%<*}"
        local right="${cond#*<}"
        left="${left% }"; right="${right# }"
        local lval="${JKT_VARS[$left]:-$left}"
        local rval="${JKT_VARS[$right]:-$right}"
        [[ "$lval" -lt "$rval" ]] 2>/dev/null && return 0 || return 1
    elif [[ "$cond" == *"=="* ]]; then
        local left="${cond%%==*}"
        local right="${cond#*==}"
        left="${left% }"; right="${right# }"
        [[ "$left" == "$right" ]] && return 0 || return 1
    elif [[ "$cond" == "benar" ]] || [[ "$cond" == "true" ]]; then
        return 0
    elif [[ "$cond" == "salah" ]] || [[ "$cond" == "false" ]]; then
        return 1
    fi
    return 1
}

# ============================================================
# MAIN
# ============================================================

if [[ $# -lt 1 ]]; then
    echo "🇮🇩 Jakarta Language Interpreter (Shell) v0.1.0"
    echo "Cara pakai: ./jakarta.sh <file.jkt>"
    echo ""
    echo "Note: Shell version supports basic features only:"
    echo "  - Variables (var, konstan)"
    echo "  - Print (cetak)"
    echo "  - String operations (besar, kecil, teks, panjang)"
    echo "  - Simple conditionals (jika)"
    echo "  - Simple loops (selama)"
    echo "  - Functions (fungsi)"
    exit 0
fi

file_path="$1"
if [[ ! "$file_path" == *.jkt ]]; then
    echo "❌ File harus berekstensi .jkt"
    exit 1
fi

if [[ ! -f "$file_path" ]]; then
    echo "❌ File \"$file_path\" tidak ditemukan"
    exit 1
fi

execute_file "$file_path"