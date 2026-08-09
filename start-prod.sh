#!/bin/bash
set -e
if [ ! -d .next ]; then
  npm run build
fi
npm run start
