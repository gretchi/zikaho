#!/bin/bash

# mkdir -p "$HOME/.local/bin"
# curl -sS https://starship.rs/install.sh | sh -s -- --bin-dir "$HOME/.local/bin"

# source /mingw64/share/git/completion/git-prompt.sh

if [ -n "$MSYSTEM" ] && [[ "$(uname -s)" == MINGW* ]]; then
    _PS1_TOOL="(Git) "
    _PS1_PF_MARK="ミ🪟"
elif [[ "$(uname -s)" == MSYS* ]]; then
    _PS1_TOOL="$(uname -s) "
    _PS1_PF_MARK="ミ🪟"
elif [[ "$(uname -s)" == CYGWIN* ]]; then
    _PS1_TOOL="(Cygwin) "
    _PS1_PF_MARK="ミ🪟"
fi

if [ "$(uname -s)" == "Linux" ]; then
    _PS1_TOOL=""
    _PS1_PF_MARK="🐧"
fi

if ! type __git_ps1 &>/dev/null; then
    __git_ps1() {
        echo ""
    }
fi

__exit_code_prompt() {
    local ec=$?
    [[ $ec -ne 0 ]] && echo -e "\033[31mx$ec "
}

_hostname=$(uname -n)

__ssh_marker() {
    if [[ -n ${SSH_CONNECTION-} || -n ${SSH_TTY-} ]]; then
        echo -e "\033[33m${USER}\033[0m in 🌐 \033[32m${_hostname}\033[0m "
    fi
}

export PS1='`__ssh_marker`\[\033[35m\]${_PS1_TOOL}\[\033[0m\]- \t ${_PS1_PF_MARK} \[\033[33m\]\w\[\033[36m\]`__git_ps1`\[\033[0m\]\n`__exit_code_prompt`\[\033[0m\]\$ '
export PATH=$PATH:$HOME/.local/bin

if type "starship" > /dev/null 2>&1; then
    eval "$(starship init bash)"
fi

alias ls="ls --color='auto' -h"
alias ll="ls -l"
alias la="ls -la"

alias vi="vim"

# Memo
alias memo="vi ~/Documents/memo.txt"

# Change directory
alias g="cd ~/Git"

alias gti="git"
alias gb="git branch"
alias gba="git branch -a"
alias gcb="git checkout -b "
# alias gpo="git push -u origin $(git symbolic-ref --short HEAD)"
alias gs="git status"
alias gd="git diff"
alias gr="git reset"
alias ga="git add"
alias gA="git add --all"
alias gaa="gA"
alias gaA="gA"
alias gc="git commit -m"
alias gcz="git cz"
alias gp="git pull"
alias gP="git push"
alias gf="git fetch"
alias gl="git log --pretty='format:%C(yellow)%h %C(green)%cd %C(reset)%s %C(red)%d %C(cyan)[%an]' --date=iso"
alias glg="gl --graph"
alias gacp="git pull && git add --all && git commit -m 'Sync by $(uname) in $(whoami)@$(hostname)' && git push"
alias viexclude="vi .git/info/exclude"


# Docker, docker-compose
alias dc="docker-compose"
alias dcup="docker-compose up"
alias dcupd="docker-compose up -d"
alias dcstop="docker-compose stop"
alias dcrm="docker-compose rm"
alias dclog="docker-compose log"
alias dctail="docker-compose log tail"
alias dcexec="docker-compose exec"


alias ssh-keygen="ssh-keygen -t ed25519 -C '' -N ''"

# cd
alias ..="cd ../"
alias ....="cd ../../"
alias ......="cd ../../../../"
alias ........="cd ../../../../../"

alias code="code ."
alias finder="oeen ."

# Terminal commands
alias reset="stty sane"
alias lll="exec ${SHELL} -l"
alias eee="exec ${SHELL} -l"

# Functions
alias upper="/usr/bin/env python -c \"import sys;print(sys.argv[1].upper())\""
alias lower="/usr/bin/env python -c \"import sys;print(sys.argv[1].lower())\""
alias rmpyc='find . | grep -E "(__pycache__|\.pyc|\.pyo$)" | xargs rm -rf'
