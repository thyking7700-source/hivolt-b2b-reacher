#!/bin/sh
cd "$(dirname "$0")"
echo
echo " HIVOLT B2B REACHER"
npm run setup:python || exit 1
exec node ./node_modules/vite/bin/vite.js dev --host 0.0.0.0 --port 80
