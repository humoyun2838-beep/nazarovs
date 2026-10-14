#!/bin/zsh
cd "${0:A:h}"
export PATH="/Users/apple/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
export PORT=3850
export DATA_DIR=runtime-data
export SITE_PUBLIC_READY=0
export NEXT_DIST_DIR=.next-fast-v2
node scripts/serve-sites.cjs
