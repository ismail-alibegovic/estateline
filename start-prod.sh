#!/bin/bash
set -e

if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi

if [ ! -d .next ]; then
  npm run build
fi

npm run start
